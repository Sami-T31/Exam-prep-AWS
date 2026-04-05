import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  CreateMockExamDto,
  CreateMockExamQuestionDto,
  SubmitMockExamDto,
  UpdateMockExamDto,
  UpdateMockExamQuestionDto,
} from './dto';

const GRACE_BUFFER_SECONDS = 30;

@Injectable()
export class MockExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Student-Facing ────────────────────────────────────────────────

  /**
   * List available mock exams, optionally filtered by subject and/or grade.
   * Only non-deleted exams are shown.
   */
  async findAll(subjectId?: number, gradeId?: number) {
    return this.prisma.mockExam.findMany({
      where: {
        deletedAt: null,
        ...(subjectId ? { subjectId } : {}),
        ...(gradeId ? { gradeId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
        _count: { select: { mockExamQuestions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Start a mock exam attempt.
   *
   * This creates a MockExamAttempt record (score=0, completedAt=null)
   * and returns the exam's questions WITHOUT correct answers.
   *
   * The startedAt timestamp is recorded — we'll compare it to the
   * submission time to enforce the duration limit.
   *
   * Returning questions without `isCorrect` prevents the student from
   * seeing answers in the network tab of their browser's dev tools.
   */
  async start(mockExamId: string, userId: string) {
    const exam = await this.prisma.mockExam.findFirst({
      where: { id: mockExamId, deletedAt: null },
      include: {
        mockExamQuestions: {
          include: {
            question: {
              include: {
                options: {
                  select: {
                    id: true,
                    optionLabel: true,
                    optionText: true,
                  },
                  orderBy: { optionLabel: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Mock exam ${mockExamId} not found`);
    }

    const attempt = await this.prisma.mockExamAttempt.create({
      data: {
        userId,
        mockExamId,
        score: 0,
        total: exam.mockExamQuestions.length,
        timeSpentSeconds: 0,
      },
    });

    return {
      attemptId: attempt.id,
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        grade: exam.grade,
        durationMinutes: exam.durationMinutes,
      },
      startedAt: attempt.startedAt,
      questions: exam.mockExamQuestions.map((meq) => ({
        questionId: meq.question.id,
        questionText: meq.question.questionText,
        difficulty: meq.question.difficulty,
        options: meq.question.options,
        sortOrder: meq.sortOrder,
      })),
    };
  }

  /**
   * Submit all answers for a mock exam attempt.
   *
   * Server-side time enforcement:
   * 1. Calculate elapsed time since startedAt
   * 2. If elapsed > durationMinutes + grace buffer → reject
   * 3. Otherwise → score the exam
   *
   * Scoring:
   * - For each submitted answer, look up the correct option
   * - Create a QuestionAttempt for each (linked to this MockExamAttempt)
   * - Count correct answers → store as score
   *
   * Everything happens in a single database transaction so either
   * all attempts are recorded or none are.
   */
  async submit(attemptId: string, userId: string, dto: SubmitMockExamDto) {
    const attempt = await this.prisma.mockExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        mockExam: {
          include: {
            mockExamQuestions: {
              include: { question: { include: { options: true } } },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('This attempt does not belong to you');
    }

    if (attempt.completedAt) {
      throw new BadRequestException('This attempt has already been submitted');
    }

    const elapsedSeconds = (Date.now() - attempt.startedAt.getTime()) / 1000;
    const allowedSeconds =
      attempt.mockExam.durationMinutes * 60 + GRACE_BUFFER_SECONDS;

    if (elapsedSeconds > allowedSeconds) {
      throw new BadRequestException(
        `Time limit exceeded. Allowed: ${attempt.mockExam.durationMinutes} minutes + ${GRACE_BUFFER_SECONDS}s grace. Elapsed: ${Math.round(elapsedSeconds)}s`,
      );
    }

    const questionMap = new Map(
      attempt.mockExam.mockExamQuestions.map((meq) => [
        meq.question.id,
        meq.question,
      ]),
    );

    const seenQuestionIds = new Set<string>();
    const deduplicatedAnswers = dto.answers.filter((answer) => {
      if (seenQuestionIds.has(answer.questionId)) return false;
      seenQuestionIds.add(answer.questionId);
      return true;
    });

    let score = 0;
    const attemptRecords: Array<{
      userId: string;
      questionId: string;
      selectedOptionId: string;
      isCorrect: boolean;
      timeSpentSeconds: number;
      mockExamAttemptId: string;
    }> = [];

    const answerCount = deduplicatedAnswers.length || 1;
    for (const answer of deduplicatedAnswers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const selectedOption = question.options.find(
        (o) => o.id === answer.selectedOptionId,
      );
      if (!selectedOption) continue;

      const isCorrect = selectedOption.isCorrect;
      if (isCorrect) score++;

      attemptRecords.push({
        userId,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect,
        timeSpentSeconds: Math.round(dto.timeSpentSeconds / answerCount),
        mockExamAttemptId: attemptId,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (attemptRecords.length > 0) {
        await tx.questionAttempt.createMany({ data: attemptRecords });
      }

      await tx.mockExamAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          total: attempt.mockExam.mockExamQuestions.length,
          timeSpentSeconds: dto.timeSpentSeconds,
          completedAt: new Date(),
        },
      });
    });

    const total = attempt.mockExam.mockExamQuestions.length;
    return {
      attemptId,
      score,
      total,
      percentage: total > 0
        ? Math.round((score / total) * 10000) / 100
        : 0,
      timeSpentSeconds: dto.timeSpentSeconds,
    };
  }

  /**
   * Review a completed attempt: show each question, the user's answer,
   * the correct answer, and the explanation.
   *
   * This is only available after submission so the student can't peek
   * at answers mid-exam.
   */
  async review(attemptId: string, userId: string) {
    const attempt = await this.prisma.mockExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        mockExam: {
          select: { id: true, title: true, durationMinutes: true },
        },
        questionAttempts: {
          include: {
            question: {
              include: {
                options: {
                  select: {
                    id: true,
                    optionLabel: true,
                    optionText: true,
                    isCorrect: true,
                  },
                  orderBy: { optionLabel: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('This attempt does not belong to you');
    }

    if (!attempt.completedAt) {
      throw new BadRequestException(
        'This attempt has not been submitted yet. Complete the exam first.',
      );
    }

    const aggregate = await this.prisma.mockExamAttempt.aggregate({
      where: {
        mockExamId: attempt.mockExamId,
        completedAt: { not: null },
      },
      _sum: {
        score: true,
        total: true,
      },
      _count: {
        id: true,
      },
    });

    const completedAttemptCount = aggregate._count.id ?? 0;
    const sumScore = aggregate._sum.score ?? 0;
    const sumTotal = aggregate._sum.total ?? 0;
    const averagePercentage =
      sumTotal > 0 ? Math.round((sumScore / sumTotal) * 10000) / 100 : null;

    return {
      attemptId: attempt.id,
      exam: attempt.mockExam,
      score: attempt.score,
      total: attempt.total,
      percentage: attempt.total > 0
        ? Math.round((attempt.score / attempt.total) * 10000) / 100
        : 0,
      timeSpentSeconds: attempt.timeSpentSeconds,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      benchmark:
        completedAttemptCount >= 3
          ? {
              completedAttemptCount,
              averagePercentage,
            }
          : null,
      questions: attempt.questionAttempts.map((qa) => ({
        questionId: qa.questionId,
        questionText: qa.question.questionText,
        explanation: qa.question.explanation,
        selectedOptionId: qa.selectedOptionId,
        isCorrect: qa.isCorrect,
        options: qa.question.options,
      })),
    };
  }

  async findUserAttempts(userId: string) {
    const attempts = await this.prisma.mockExamAttempt.findMany({
      where: { userId },
      include: {
        mockExam: {
          include: {
            subject: { select: { id: true, name: true } },
            grade: { select: { id: true, gradeNumber: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      score: attempt.score,
      total: attempt.total,
      percentage:
        attempt.total > 0
          ? Math.round((attempt.score / attempt.total) * 10000) / 100
          : 0,
      mockExam: {
        id: attempt.mockExam.id,
        title: attempt.mockExam.title,
        durationMinutes: attempt.mockExam.durationMinutes,
        subject: attempt.mockExam.subject,
        grade: attempt.mockExam.grade,
      },
    }));
  }

  // ─── Admin ─────────────────────────────────────────────────────────

  /**
   * Create a mock exam.
   *
   * If questionIds are provided, use those exact questions.
   * Otherwise, randomly select `questionCount` published questions
   * from the specified subject and grade.
   *
   * Prisma's `$queryRaw` with ORDER BY RANDOM() is the simplest
   * way to get random rows from PostgreSQL. For very large tables,
   * more efficient algorithms exist, but for our scale this is fine.
   */
  async create(dto: CreateMockExamDto) {
    let questionIds: string[];

    if (dto.questionIds && dto.questionIds.length > 0) {
      const existing = await this.prisma.question.findMany({
        where: {
          id: { in: dto.questionIds },
          deletedAt: null,
          status: 'PUBLISHED',
        },
        select: { id: true },
      });

      if (existing.length !== dto.questionIds.length) {
        const found = new Set(existing.map((q) => q.id));
        const missing = dto.questionIds.filter((id) => !found.has(id));
        throw new BadRequestException(
          `These question IDs are invalid or not published: ${missing.join(', ')}`,
        );
      }

      questionIds = dto.questionIds;
    } else if (dto.shouldAutoGenerateQuestions === false) {
      questionIds = [];
    } else {
      if (dto.questionCount < 5) {
        throw new BadRequestException(
          'questionCount must be at least 5 when auto-generating mock exam questions',
        );
      }

      const randomQuestions = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT q.id
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
        WHERE q.status = 'PUBLISHED'
          AND q.deleted_at IS NULL
          AND t.subject_id = ${dto.subjectId}
          AND q.grade_id = ${dto.gradeId}
        ORDER BY RANDOM()
        LIMIT ${dto.questionCount}
      `;

      if (randomQuestions.length < dto.questionCount) {
        throw new BadRequestException(
          `Only ${randomQuestions.length} published questions available for this subject/grade. Need ${dto.questionCount}.`,
        );
      }

      questionIds = randomQuestions.map((q) => q.id);
    }

    const exam = await this.prisma.mockExam.create({
      data: {
        title: dto.title,
        subjectId: dto.subjectId,
        gradeId: dto.gradeId,
        durationMinutes: dto.durationMinutes,
        questionCount:
          dto.shouldAutoGenerateQuestions === false
            ? dto.questionCount
            : questionIds.length,
        mockExamQuestions: {
          create: questionIds.map((qId, index) => ({
            questionId: qId,
            sortOrder: index + 1,
          })),
        },
      },
      include: {
        mockExamQuestions: true,
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
      },
    });

    return exam;
  }

  async getQuestionEditorData(mockExamId: string) {
    const exam = await this.prisma.mockExam.findFirst({
      where: { id: mockExamId, deletedAt: null },
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
        mockExamQuestions: {
          include: {
            question: {
              include: {
                topic: { select: { id: true, name: true } },
                options: {
                  select: {
                    id: true,
                    optionLabel: true,
                    optionText: true,
                    isCorrect: true,
                  },
                  orderBy: { optionLabel: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Mock exam ${mockExamId} not found`);
    }

    const questions = exam.mockExamQuestions.map((item, index) => ({
      questionId: item.question.id,
      sortOrder: index + 1,
      questionText: item.question.questionText,
      explanation: item.question.explanation,
      difficulty: item.question.difficulty,
      topic: item.question.topic,
      options: item.question.options,
    }));

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        targetQuestionCount: exam.questionCount,
        currentQuestionCount: questions.length,
        subject: exam.subject,
        grade: exam.grade,
      },
      questions,
    };
  }

  async addQuestion(mockExamId: string, dto: CreateMockExamQuestionDto) {
    const exam = await this.prisma.mockExam.findFirst({
      where: { id: mockExamId, deletedAt: null },
      select: {
        id: true,
        subjectId: true,
        gradeId: true,
        questionCount: true,
      },
    });
    if (!exam) {
      throw new NotFoundException(`Mock exam ${mockExamId} not found`);
    }

    const linkedQuestionCount = await this.prisma.mockExamQuestion.count({
      where: { mockExamId },
    });
    if (linkedQuestionCount >= exam.questionCount) {
      throw new BadRequestException(
        `Question limit reached (${exam.questionCount}). Remove a question before adding another.`,
      );
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
      select: {
        id: true,
        subjectId: true,
        gradeId: true,
      },
    });
    if (!topic) {
      throw new BadRequestException(`Topic ${dto.topicId} not found`);
    }
    if (topic.subjectId !== exam.subjectId || topic.gradeId !== exam.gradeId) {
      throw new BadRequestException(
        'Selected topic must belong to this mock exam subject and grade',
      );
    }

    const correctCount = dto.options.filter(
      (option) => option.isCorrect,
    ).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        'Exactly one option must be marked as correct',
      );
    }

    const uniqueLabels = new Set(
      dto.options.map((option) => option.optionLabel),
    );
    if (uniqueLabels.size !== 4) {
      throw new BadRequestException(
        'Options must contain unique labels A, B, C, and D',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const maxSortOrder = await tx.mockExamQuestion.aggregate({
        where: { mockExamId },
        _max: { sortOrder: true },
      });
      const nextSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;

      const question = await tx.question.create({
        data: {
          questionText: dto.questionText,
          explanation: dto.explanation ?? null,
          difficulty: dto.difficulty as any,
          status: 'DRAFT',
          topicId: dto.topicId,
          gradeId: exam.gradeId,
          year: dto.year ?? null,
          options: {
            create: dto.options.map((option) => ({
              optionLabel: option.optionLabel,
              optionText: option.optionText,
              isCorrect: option.isCorrect,
            })),
          },
        },
        include: {
          topic: { select: { id: true, name: true } },
          options: {
            select: {
              id: true,
              optionLabel: true,
              optionText: true,
              isCorrect: true,
            },
            orderBy: { optionLabel: 'asc' },
          },
        },
      });

      await tx.mockExamQuestion.create({
        data: {
          mockExamId,
          questionId: question.id,
          sortOrder: nextSortOrder,
        },
      });

      return {
        questionId: question.id,
        sortOrder: nextSortOrder,
        questionText: question.questionText,
        explanation: question.explanation,
        difficulty: question.difficulty,
        topic: question.topic,
        options: question.options,
      };
    });

    return result;
  }

  async removeQuestion(mockExamId: string, questionId: string) {
    const link = await this.prisma.mockExamQuestion.findFirst({
      where: { mockExamId, questionId },
      select: { id: true, sortOrder: true },
    });
    if (!link) {
      throw new NotFoundException('Question is not linked to this mock exam');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mockExamQuestion.delete({ where: { id: link.id } });

      const remaining = await tx.mockExamQuestion.findMany({
        where: { mockExamId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      });
      for (let index = 0; index < remaining.length; index++) {
        await tx.mockExamQuestion.update({
          where: { id: remaining[index]!.id },
          data: { sortOrder: index + 1 },
        });
      }

      await tx.question.update({
        where: { id: questionId },
        data: { deletedAt: new Date() },
      });
    });

    return { message: 'Mock exam question removed' };
  }

  async updateQuestion(
    mockExamId: string,
    questionId: string,
    dto: UpdateMockExamQuestionDto,
  ) {
    const link = await this.prisma.mockExamQuestion.findFirst({
      where: { mockExamId, questionId },
      include: {
        mockExam: {
          select: {
            id: true,
            subjectId: true,
            gradeId: true,
          },
        },
      },
    });
    if (!link) {
      throw new NotFoundException('Question is not linked to this mock exam');
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
      select: {
        id: true,
        subjectId: true,
        gradeId: true,
      },
    });
    if (!topic) {
      throw new BadRequestException(`Topic ${dto.topicId} not found`);
    }
    if (
      topic.subjectId !== link.mockExam.subjectId ||
      topic.gradeId !== link.mockExam.gradeId
    ) {
      throw new BadRequestException(
        'Selected topic must belong to this mock exam subject and grade',
      );
    }

    const correctCount = dto.options.filter(
      (option) => option.isCorrect,
    ).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        'Exactly one option must be marked as correct',
      );
    }

    const uniqueLabels = new Set(
      dto.options.map((option) => option.optionLabel),
    );
    if (uniqueLabels.size !== 4) {
      throw new BadRequestException(
        'Options must contain unique labels A, B, C, and D',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({ where: { questionId } });
      return tx.question.update({
        where: { id: questionId },
        data: {
          questionText: dto.questionText,
          explanation: dto.explanation ?? null,
          difficulty: dto.difficulty as any,
          topicId: dto.topicId,
          gradeId: link.mockExam.gradeId,
          year: dto.year ?? null,
          options: {
            create: dto.options.map((option) => ({
              optionLabel: option.optionLabel,
              optionText: option.optionText,
              isCorrect: option.isCorrect,
            })),
          },
        },
        include: {
          topic: { select: { id: true, name: true } },
          options: {
            select: {
              id: true,
              optionLabel: true,
              optionText: true,
              isCorrect: true,
            },
            orderBy: { optionLabel: 'asc' },
          },
        },
      });
    });
  }

  async update(id: string, dto: UpdateMockExamDto) {
    const existing = await this.prisma.mockExam.findFirst({
      where: { id, deletedAt: null },
      include: {
        mockExamQuestions: { select: { questionId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Mock exam ${id} not found`);
    }

    let questionIds: string[] | undefined;
    if (dto.questionIds && dto.questionIds.length > 0) {
      const foundQuestions = await this.prisma.question.findMany({
        where: {
          id: { in: dto.questionIds },
          deletedAt: null,
          status: 'PUBLISHED',
        },
        select: { id: true },
      });
      if (foundQuestions.length !== dto.questionIds.length) {
        throw new BadRequestException(
          'One or more provided questionIds are invalid',
        );
      }
      questionIds = dto.questionIds;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const exam = await tx.mockExam.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId } : {}),
          ...(dto.gradeId !== undefined ? { gradeId: dto.gradeId } : {}),
          ...(dto.durationMinutes !== undefined
            ? { durationMinutes: dto.durationMinutes }
            : {}),
          ...(dto.questionCount !== undefined
            ? { questionCount: dto.questionCount }
            : {}),
        },
      });

      if (questionIds) {
        await tx.mockExamQuestion.deleteMany({ where: { mockExamId: id } });
        await tx.mockExamQuestion.createMany({
          data: questionIds.map((questionId, index) => ({
            mockExamId: id,
            questionId,
            sortOrder: index + 1,
          })),
        });

        await tx.mockExam.update({
          where: { id },
          data: { questionCount: questionIds.length },
        });
      }

      return exam;
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.mockExam.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Mock exam ${id} not found`);
    }

    await this.prisma.mockExam.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Mock exam deleted successfully' };
  }
}
