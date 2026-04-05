import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import {
  AdminQuestionFilterDto,
  QuestionFilterDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto';
import { QuestionAttemptedEvent } from '../common/events/question-attempted.event';
import {
  requireSanitizedText,
  sanitizeNullableTextInput,
} from '../common/utils/sanitize';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Student-Facing ────────────────────────────────────────────────

  /**
   * List published questions with optional filters and pagination.
   *
   * Prisma's `where` clause is built dynamically — each filter is only
   * added if the query parameter was actually provided. This keeps one
   * method handling all combinations (subject-only, grade+topic, etc.).
   *
   * The `topic → subject` join lets us filter by subjectId even though
   * questions don't have a direct subjectId column — the relationship
   * goes Question → Topic → Subject.
   *
   * We return both `data` and `total` so the frontend can build pagination
   * controls (page numbers, "showing X of Y results").
   */
  async findAll(filters: QuestionFilterDto) {
    const where: Prisma.QuestionWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (filters.topicId) {
      where.topicId = filters.topicId;
    }

    if (filters.gradeId) {
      where.gradeId = filters.gradeId;
    }

    if (filters.subjectId) {
      where.topic = { subjectId: filters.subjectId };
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty as Prisma.EnumDifficultyFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          options: {
            select: {
              id: true,
              optionLabel: true,
              optionText: true,
            },
            orderBy: { optionLabel: 'asc' },
          },
          topic: { select: { id: true, name: true } },
          grade: { select: { id: true, gradeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { data, total, limit: filters.limit, offset: filters.offset };
  }

  /**
   * Get a single question by ID.
   *
   * The `isCorrect` field is deliberately excluded from options here.
   * A student should not see which answer is correct before they submit.
   * The correct answer is only revealed in the POST /attempt response.
   */
  async findOne(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      include: {
        options: {
          select: {
            id: true,
            optionLabel: true,
            optionText: true,
          },
          orderBy: { optionLabel: 'asc' },
        },
        topic: {
          select: {
            id: true,
            name: true,
            subject: { select: { id: true, name: true } },
          },
        },
        grade: { select: { id: true, gradeNumber: true } },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  /**
   * Record a user's answer attempt.
   *
   * 1. Load the question with the correct option included (isCorrect: true)
   * 2. Verify the selectedOptionId actually belongs to this question
   * 3. Check if the answer is correct
   * 4. Save the attempt record
   * 5. Return the result with explanation
   *
   * This uses a Prisma transaction (prisma.$transaction) to ensure
   * the attempt record is saved atomically — if anything fails
   * mid-way, no partial data is written.
   */
  async submitAnswer(questionId: string, userId: string, selectedOptionId: string, timeSpentSeconds: number) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null, status: 'PUBLISHED' },
      include: {
        options: true,
        topic: { select: { subjectId: true } },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const selectedOption = question.options.find((o) => o.id === selectedOptionId);
    if (!selectedOption) {
      throw new BadRequestException(
        `Option ${selectedOptionId} does not belong to question ${questionId}`,
      );
    }

    const correctOption = question.options.find((o) => o.isCorrect)!;
    const isCorrect = selectedOption.isCorrect;

    const attempt = await this.prisma.questionAttempt.create({
      data: {
        userId,
        questionId,
        selectedOptionId,
        isCorrect,
        timeSpentSeconds,
      },
    });

    this.eventEmitter.emit(
      QuestionAttemptedEvent.EVENT_NAME,
      new QuestionAttemptedEvent(userId, questionId, isCorrect, question.topic.subjectId),
    );

    return {
      attemptId: attempt.id,
      isCorrect,
      correctOptionId: correctOption.id,
      correctOptionLabel: correctOption.optionLabel,
      explanation: question.explanation,
    };
  }

  // ─── Admin ─────────────────────────────────────────────────────────

  async findAllAdmin(filters: AdminQuestionFilterDto) {
    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
    };

    if (filters.topicId) {
      where.topicId = filters.topicId;
    }
    if (filters.gradeId) {
      where.gradeId = filters.gradeId;
    }
    if (filters.subjectId) {
      where.topic = { subjectId: filters.subjectId };
    }
    if (filters.difficulty) {
      where.difficulty = filters.difficulty as Prisma.EnumDifficultyFilter;
    }
    if (filters.status) {
      where.status = filters.status as Prisma.EnumQuestionStatusFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          options: {
            select: {
              id: true,
              optionLabel: true,
              optionText: true,
            },
            orderBy: { optionLabel: 'asc' },
          },
          topic: {
            select: {
              id: true,
              name: true,
              subject: {
                select: { id: true, name: true },
              },
            },
          },
          grade: { select: { id: true, gradeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data,
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  async reviewQuestion(id: string, action: 'PUBLISH' | 'REQUEST_CHANGES') {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const nextStatus = action === 'PUBLISH' ? 'PUBLISHED' : 'DRAFT';
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    });

    return {
      message:
        action === 'PUBLISH'
          ? 'Question published successfully.'
          : 'Question sent back for changes (kept as draft).',
      question: updated,
    };
  }

  /**
   * Create a new question with its options.
   *
   * Prisma's nested `create` lets us insert the question and all 4
   * options in a single database transaction — either everything
   * succeeds or nothing is written.
   *
   * We validate that exactly one option is marked as correct.
   */
  async create(dto: CreateQuestionDto) {
    const sanitizedQuestionText = requireSanitizedText(
      dto.questionText,
      'Question text',
    );
    const sanitizedExplanation = sanitizeNullableTextInput(dto.explanation);
    const sanitizedOptions = dto.options.map((option) => ({
      ...option,
      optionText: requireSanitizedText(option.optionText, 'Option text'),
    }));

    const correctCount = dto.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Exactly one option must be marked as correct');
    }

    await this.validateTopicAndGrade(dto.topicId, dto.gradeId);

    return this.prisma.question.create({
      data: {
        questionText: sanitizedQuestionText,
        explanation: sanitizedExplanation,
        difficulty: dto.difficulty as any,
        topicId: dto.topicId,
        gradeId: dto.gradeId,
        year: dto.year ?? null,
        status: (dto.status as any) ?? 'DRAFT',
        options: {
          create: sanitizedOptions.map((o) => ({
            optionLabel: o.optionLabel,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
          })),
        },
      },
      include: { options: true },
    });
  }

  /**
   * Update a question. If options are provided, we delete the old
   * ones and create new ones — this is simpler and safer than trying
   * to match and update individual options.
   */
  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    if (dto.topicId || dto.gradeId) {
      await this.validateTopicAndGrade(
        dto.topicId ?? existing.topicId,
        dto.gradeId ?? existing.gradeId,
      );
    }

    if (dto.options) {
      const correctCount = dto.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException('Exactly one option must be marked as correct');
      }
    }

    const sanitizedOptions = dto.options?.map((option) => ({
      ...option,
      optionText: requireSanitizedText(option.optionText, 'Option text'),
    }));

    return this.prisma.$transaction(async (tx) => {
      if (dto.options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
      }

      return tx.question.update({
        where: { id },
        data: {
          ...(dto.questionText !== undefined && {
            questionText: requireSanitizedText(
              dto.questionText,
              'Question text',
            ),
          }),
          ...(dto.explanation !== undefined && {
            explanation: sanitizeNullableTextInput(dto.explanation),
          }),
          ...(dto.difficulty !== undefined && { difficulty: dto.difficulty as any }),
          ...(dto.topicId !== undefined && { topicId: dto.topicId }),
          ...(dto.gradeId !== undefined && { gradeId: dto.gradeId }),
          ...(dto.year !== undefined && { year: dto.year ?? null }),
          ...(dto.status !== undefined && { status: dto.status as any }),
          ...(sanitizedOptions && {
            options: {
              create: sanitizedOptions.map((o) => ({
                optionLabel: o.optionLabel,
                optionText: o.optionText,
                isCorrect: o.isCorrect,
              })),
            },
          }),
        },
        include: { options: true },
      });
    });
  }

  /**
   * Soft delete: set deletedAt instead of removing the row.
   * This preserves data for analytics and allows recovery.
   */
  async softDelete(id: string) {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    await this.prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Question deleted successfully' };
  }

  /**
   * Bulk import questions from parsed CSV data.
   *
   * The controller handles parsing the CSV file — this method receives
   * an array of structured row objects. Each row creates a question
   * with 4 options.
   *
   * We process rows individually so we can report per-row errors
   * without failing the entire import. Successfully imported questions
   * and failed rows are tracked separately.
   */
  private static readonly BULK_IMPORT_MAX_ROWS = 500;

  async bulkImport(
    rows: Array<{
      questionText: string;
      explanation?: string;
      difficulty: string;
      topicId: number;
      gradeId: number;
      year?: number;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
    }>,
  ) {
    if (rows.length > QuestionsService.BULK_IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `CSV exceeds maximum of ${QuestionsService.BULK_IMPORT_MAX_ROWS} rows (got ${rows.length})`,
      );
    }

    const results: { imported: number; failed: number; errors: Array<{ row: number; error: string }> } = {
      imported: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        const correct = row.correctOption.toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) {
          throw new Error(`correctOption must be A, B, C, or D — got "${row.correctOption}"`);
        }

        const sanitizedText = requireSanitizedText(row.questionText, 'questionText');
        if (sanitizedText.length < 10) {
          throw new Error('questionText must be at least 10 characters');
        }

        if (!['EASY', 'MEDIUM', 'HARD'].includes(row.difficulty.toUpperCase())) {
          throw new Error(`difficulty must be EASY, MEDIUM, or HARD — got "${row.difficulty}"`);
        }

        const topic = await this.prisma.topic.findUnique({ where: { id: row.topicId } });
        if (!topic) {
          throw new Error(`topicId ${row.topicId} does not exist`);
        }

        const grade = await this.prisma.grade.findUnique({ where: { id: row.gradeId } });
        if (!grade) {
          throw new Error(`gradeId ${row.gradeId} does not exist`);
        }

        const sanitizedOptions = ['A', 'B', 'C', 'D'].map((label) => ({
          optionLabel: label,
          optionText: requireSanitizedText(
            row[`option${label}` as keyof typeof row] as string,
            `option${label}`,
          ),
          isCorrect: label === correct,
        }));

        await this.prisma.question.create({
          data: {
            questionText: sanitizedText,
            explanation: row.explanation
              ? requireSanitizedText(row.explanation, 'explanation')
              : null,
            difficulty: row.difficulty.toUpperCase() as any,
            topicId: row.topicId,
            gradeId: row.gradeId,
            year: row.year ?? null,
            status: 'DRAFT',
            options: { create: sanitizedOptions },
          },
        });
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private async validateTopicAndGrade(topicId: number, gradeId: number) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new BadRequestException(`Topic with ID ${topicId} does not exist`);
    }

    const grade = await this.prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade) {
      throw new BadRequestException(`Grade with ID ${gradeId} does not exist`);
    }
  }
}
