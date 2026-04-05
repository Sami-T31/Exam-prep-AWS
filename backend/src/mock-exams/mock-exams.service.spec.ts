import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MockExamsService } from './mock-exams.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';
const MOCK_EXAM_ID = 'exam-uuid-1';
const ATTEMPT_ID = 'attempt-uuid-1';
const QUESTION_ID_1 = 'question-uuid-1';
const QUESTION_ID_2 = 'question-uuid-2';
const OPTION_CORRECT_1 = 'option-correct-1';
const OPTION_WRONG_1 = 'option-wrong-1';
const OPTION_CORRECT_2 = 'option-correct-2';
const OPTION_WRONG_2 = 'option-wrong-2';
const GRACE_BUFFER_SECONDS = 30;
const DURATION_MINUTES = 60;

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildExamWithQuestions() {
  return {
    id: MOCK_EXAM_ID,
    title: 'Grade 12 Physics Mock 1',
    durationMinutes: DURATION_MINUTES,
    deletedAt: null,
    subjectId: 1,
    gradeId: 1,
    questionCount: 2,
    subject: { id: 1, name: 'Physics' },
    grade: { id: 1, gradeNumber: 12 },
    mockExamQuestions: [
      {
        sortOrder: 1,
        question: {
          id: QUESTION_ID_1,
          questionText: 'What is Newton\'s first law?',
          difficulty: 'MEDIUM',
          explanation: 'An object at rest stays at rest.',
          options: [
            { id: OPTION_CORRECT_1, optionLabel: 'A', optionText: 'Inertia', isCorrect: true },
            { id: OPTION_WRONG_1, optionLabel: 'B', optionText: 'Gravity', isCorrect: false },
          ],
        },
      },
      {
        sortOrder: 2,
        question: {
          id: QUESTION_ID_2,
          questionText: 'What is the SI unit of force?',
          difficulty: 'EASY',
          explanation: 'Newton is the SI unit.',
          options: [
            { id: OPTION_CORRECT_2, optionLabel: 'A', optionText: 'Newton', isCorrect: true },
            { id: OPTION_WRONG_2, optionLabel: 'B', optionText: 'Joule', isCorrect: false },
          ],
        },
      },
    ],
  };
}

function buildAttempt(overrides: Record<string, unknown> = {}) {
  const startedAt = new Date(Date.now() - 10 * 60 * 1000);
  return {
    id: ATTEMPT_ID,
    userId: USER_ID,
    mockExamId: MOCK_EXAM_ID,
    score: 0,
    total: 2,
    timeSpentSeconds: 0,
    startedAt,
    completedAt: null,
    mockExam: buildExamWithQuestions(),
    ...overrides,
  };
}

// ─── Mock Factory ───────────────────────────────────────────────────────────

function mockFn(): any {
  return jest.fn();
}

function createPrismaMock() {
  let prismaMock: any;

  const transactionFn = mockFn();
  transactionFn.mockImplementation(async (cb: any) => cb(prismaMock));

  prismaMock = {
    mockExam: {
      findMany: mockFn(),
      findFirst: mockFn(),
      create: mockFn(),
      update: mockFn(),
    },
    mockExamAttempt: {
      create: mockFn(),
      findUnique: mockFn(),
      findMany: mockFn(),
      update: mockFn(),
      aggregate: mockFn(),
    },
    mockExamQuestion: {
      count: mockFn(),
      findFirst: mockFn(),
      findMany: mockFn(),
      create: mockFn(),
      createMany: mockFn(),
      delete: mockFn(),
      deleteMany: mockFn(),
      update: mockFn(),
      aggregate: mockFn(),
    },
    question: {
      findMany: mockFn(),
      create: mockFn(),
      update: mockFn(),
    },
    questionAttempt: {
      createMany: mockFn(),
    },
    questionOption: {
      deleteMany: mockFn(),
    },
    topic: {
      findUnique: mockFn(),
    },
    $transaction: transactionFn,
    $queryRaw: mockFn(),
  };
  return prismaMock;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MockExamsService', () => {
  let service: MockExamsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MockExamsService(prisma as never);
  });

  // ─── findAll ──────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all non-deleted exams when no filters provided', async () => {
      const mockExams = [{ id: MOCK_EXAM_ID, title: 'Test Exam' }];
      prisma.mockExam.findMany.mockResolvedValue(mockExams);

      const result = await service.findAll();

      expect(result).toEqual(mockExams);
      expect(prisma.mockExam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('applies subjectId filter when provided', async () => {
      prisma.mockExam.findMany.mockResolvedValue([]);

      await service.findAll(3);

      const callArg = prisma.mockExam.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(callArg.where).toMatchObject({ subjectId: 3 });
    });

    it('applies gradeId filter when provided', async () => {
      prisma.mockExam.findMany.mockResolvedValue([]);

      await service.findAll(undefined, 2);

      const callArg = prisma.mockExam.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(callArg.where).toMatchObject({ gradeId: 2 });
    });

    it('applies both subjectId and gradeId filters', async () => {
      prisma.mockExam.findMany.mockResolvedValue([]);

      await service.findAll(3, 2);

      const callArg = prisma.mockExam.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(callArg.where).toMatchObject({ subjectId: 3, gradeId: 2 });
    });
  });

  // ─── start ────────────────────────────────────────────────────────

  describe('start', () => {
    it('creates an attempt and returns questions with exam metadata', async () => {
      const exam = buildExamWithQuestions();
      prisma.mockExam.findFirst.mockResolvedValue(exam);
      prisma.mockExamAttempt.create.mockResolvedValue({
        id: ATTEMPT_ID,
        startedAt: new Date('2026-03-01T10:00:00Z'),
      });

      const result = await service.start(MOCK_EXAM_ID, USER_ID);

      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(result.exam.id).toBe(MOCK_EXAM_ID);
      expect(result.exam.durationMinutes).toBe(DURATION_MINUTES);
      expect(result.questions).toHaveLength(2);

      for (const question of result.questions) {
        expect(question).toHaveProperty('questionId');
        expect(question).toHaveProperty('questionText');
        expect(question).toHaveProperty('options');
      }
    });

    it('queries options without isCorrect field via Prisma select', async () => {
      const exam = buildExamWithQuestions();
      prisma.mockExam.findFirst.mockResolvedValue(exam);
      prisma.mockExamAttempt.create.mockResolvedValue({
        id: ATTEMPT_ID,
        startedAt: new Date(),
      });

      await service.start(MOCK_EXAM_ID, USER_ID);

      const findFirstCall = prisma.mockExam.findFirst.mock.calls[0][0];
      const optionsSelect =
        findFirstCall.include.mockExamQuestions.include.question.include.options.select;
      expect(optionsSelect).toEqual({
        id: true,
        optionLabel: true,
        optionText: true,
      });
      expect(optionsSelect).not.toHaveProperty('isCorrect');
    });

    it('throws NotFoundException when exam does not exist', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(null);

      await expect(service.start('nonexistent-id', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('records correct total from question count', async () => {
      const exam = buildExamWithQuestions();
      prisma.mockExam.findFirst.mockResolvedValue(exam);
      prisma.mockExamAttempt.create.mockResolvedValue({
        id: ATTEMPT_ID,
        startedAt: new Date(),
      });

      await service.start(MOCK_EXAM_ID, USER_ID);

      expect(prisma.mockExamAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 2,
            score: 0,
            userId: USER_ID,
            mockExamId: MOCK_EXAM_ID,
          }),
        }),
      );
    });

    it('returns questions sorted by sortOrder', async () => {
      const exam = buildExamWithQuestions();
      prisma.mockExam.findFirst.mockResolvedValue(exam);
      prisma.mockExamAttempt.create.mockResolvedValue({
        id: ATTEMPT_ID,
        startedAt: new Date(),
      });

      const result = await service.start(MOCK_EXAM_ID, USER_ID);

      expect(result.questions[0]!.sortOrder).toBe(1);
      expect(result.questions[1]!.sortOrder).toBe(2);
    });
  });

  // ─── submit ───────────────────────────────────────────────────────

  describe('submit', () => {
    const validDto = {
      answers: [
        { questionId: QUESTION_ID_1, selectedOptionId: OPTION_CORRECT_1 },
        { questionId: QUESTION_ID_2, selectedOptionId: OPTION_WRONG_2 },
      ],
      timeSpentSeconds: 600,
    };

    it('scores the exam correctly — counts only correct answers', async () => {
      const attempt = buildAttempt();
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const result = await service.submit(ATTEMPT_ID, USER_ID, validDto);

      expect(result.score).toBe(1);
      expect(result.total).toBe(2);
      expect(result.percentage).toBe(50);
      expect(result.timeSpentSeconds).toBe(600);
    });

    it('returns 100% when all answers are correct', async () => {
      const attempt = buildAttempt();
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const allCorrectDto = {
        answers: [
          { questionId: QUESTION_ID_1, selectedOptionId: OPTION_CORRECT_1 },
          { questionId: QUESTION_ID_2, selectedOptionId: OPTION_CORRECT_2 },
        ],
        timeSpentSeconds: 500,
      };

      const result = await service.submit(ATTEMPT_ID, USER_ID, allCorrectDto);

      expect(result.score).toBe(2);
      expect(result.total).toBe(2);
      expect(result.percentage).toBe(100);
    });

    it('throws NotFoundException when attempt does not exist', async () => {
      prisma.mockExamAttempt.findUnique.mockResolvedValue(null);

      await expect(
        service.submit('nonexistent', USER_ID, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when attempt belongs to another user', async () => {
      const attempt = buildAttempt({ userId: OTHER_USER_ID });
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      await expect(
        service.submit(ATTEMPT_ID, USER_ID, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when attempt already completed', async () => {
      const attempt = buildAttempt({ completedAt: new Date() });
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      await expect(
        service.submit(ATTEMPT_ID, USER_ID, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when time limit exceeded (duration + grace)', async () => {
      const exceededMs = (DURATION_MINUTES * 60 + GRACE_BUFFER_SECONDS + 10) * 1000;
      const startedAt = new Date(Date.now() - exceededMs);
      const attempt = buildAttempt({ startedAt });
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      await expect(
        service.submit(ATTEMPT_ID, USER_ID, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows submission within grace buffer period', async () => {
      const withinGraceMs = (DURATION_MINUTES * 60 + GRACE_BUFFER_SECONDS - 5) * 1000;
      const startedAt = new Date(Date.now() - withinGraceMs);
      const attempt = buildAttempt({ startedAt });
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const result = await service.submit(ATTEMPT_ID, USER_ID, validDto);

      expect(result.attemptId).toBe(ATTEMPT_ID);
    });

    it('deduplicates answers for the same question (keeps first)', async () => {
      const attempt = buildAttempt();
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const duplicateDto = {
        answers: [
          { questionId: QUESTION_ID_1, selectedOptionId: OPTION_CORRECT_1 },
          { questionId: QUESTION_ID_1, selectedOptionId: OPTION_WRONG_1 },
          { questionId: QUESTION_ID_2, selectedOptionId: OPTION_CORRECT_2 },
        ],
        timeSpentSeconds: 300,
      };

      const result = await service.submit(ATTEMPT_ID, USER_ID, duplicateDto);

      expect(result.score).toBe(2);
      expect(result.total).toBe(2);
    });

    it('skips answers referencing questions not in the exam', async () => {
      const attempt = buildAttempt();
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const dto = {
        answers: [
          { questionId: 'nonexistent-question', selectedOptionId: OPTION_CORRECT_1 },
        ],
        timeSpentSeconds: 100,
      };

      const result = await service.submit(ATTEMPT_ID, USER_ID, dto);

      expect(result.score).toBe(0);
    });

    it('skips answers referencing options not belonging to the question', async () => {
      const attempt = buildAttempt();
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const dto = {
        answers: [
          { questionId: QUESTION_ID_1, selectedOptionId: 'nonexistent-option' },
        ],
        timeSpentSeconds: 100,
      };

      const result = await service.submit(ATTEMPT_ID, USER_ID, dto);

      expect(result.score).toBe(0);
    });

    it('creates questionAttempt records and updates the attempt in a transaction', async () => {
      const attempt = buildAttempt();
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      await service.submit(ATTEMPT_ID, USER_ID, validDto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.questionAttempt.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.mockExamAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ATTEMPT_ID },
          data: expect.objectContaining({
            score: 1,
            total: 2,
            timeSpentSeconds: 600,
          }),
        }),
      );
    });

    it('returns 0 percentage when exam has no questions', async () => {
      const attempt = buildAttempt();
      attempt.mockExam.mockExamQuestions = [];
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      const dto = { answers: [], timeSpentSeconds: 0 };
      const result = await service.submit(ATTEMPT_ID, USER_ID, dto);

      expect(result.percentage).toBe(0);
    });
  });

  // ─── review ───────────────────────────────────────────────────────

  describe('review', () => {
    function buildCompletedAttempt() {
      return {
        id: ATTEMPT_ID,
        userId: USER_ID,
        mockExamId: MOCK_EXAM_ID,
        score: 1,
        total: 2,
        timeSpentSeconds: 600,
        startedAt: new Date('2026-03-01T10:00:00Z'),
        completedAt: new Date('2026-03-01T10:10:00Z'),
        mockExam: {
          id: MOCK_EXAM_ID,
          title: 'Grade 12 Physics Mock 1',
          durationMinutes: DURATION_MINUTES,
        },
        questionAttempts: [
          {
            questionId: QUESTION_ID_1,
            selectedOptionId: OPTION_CORRECT_1,
            isCorrect: true,
            question: {
              questionText: 'What is Newton\'s first law?',
              explanation: 'An object at rest stays at rest.',
              options: [
                { id: OPTION_CORRECT_1, optionLabel: 'A', optionText: 'Inertia', isCorrect: true },
                { id: OPTION_WRONG_1, optionLabel: 'B', optionText: 'Gravity', isCorrect: false },
              ],
            },
          },
          {
            questionId: QUESTION_ID_2,
            selectedOptionId: OPTION_WRONG_2,
            isCorrect: false,
            question: {
              questionText: 'What is the SI unit of force?',
              explanation: 'Newton is the SI unit.',
              options: [
                { id: OPTION_CORRECT_2, optionLabel: 'A', optionText: 'Newton', isCorrect: true },
                { id: OPTION_WRONG_2, optionLabel: 'B', optionText: 'Joule', isCorrect: false },
              ],
            },
          },
        ],
      };
    }

    it('returns review with correct answers and explanations', async () => {
      prisma.mockExamAttempt.findUnique.mockResolvedValue(
        buildCompletedAttempt(),
      );
      prisma.mockExamAttempt.aggregate.mockResolvedValue({
        _sum: { score: 5, total: 10 },
        _count: { id: 5 },
      });

      const result = await service.review(ATTEMPT_ID, USER_ID);

      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(result.score).toBe(1);
      expect(result.total).toBe(2);
      expect(result.percentage).toBe(50);
      expect(result.questions).toHaveLength(2);

      const firstQuestion = result.questions[0]!;
      expect(firstQuestion.isCorrect).toBe(true);
      expect(firstQuestion.explanation).toBeDefined();
      expect(firstQuestion.options.some((o: { isCorrect: boolean }) => o.isCorrect)).toBe(true);
    });

    it('includes benchmark when 3 or more completed attempts exist', async () => {
      prisma.mockExamAttempt.findUnique.mockResolvedValue(
        buildCompletedAttempt(),
      );
      prisma.mockExamAttempt.aggregate.mockResolvedValue({
        _sum: { score: 6, total: 10 },
        _count: { id: 5 },
      });

      const result = await service.review(ATTEMPT_ID, USER_ID);

      expect(result.benchmark).not.toBeNull();
      expect(result.benchmark!.completedAttemptCount).toBe(5);
      expect(result.benchmark!.averagePercentage).toBe(60);
    });

    it('returns null benchmark when fewer than 3 completed attempts', async () => {
      prisma.mockExamAttempt.findUnique.mockResolvedValue(
        buildCompletedAttempt(),
      );
      prisma.mockExamAttempt.aggregate.mockResolvedValue({
        _sum: { score: 2, total: 4 },
        _count: { id: 2 },
      });

      const result = await service.review(ATTEMPT_ID, USER_ID);

      expect(result.benchmark).toBeNull();
    });

    it('throws NotFoundException when attempt does not exist', async () => {
      prisma.mockExamAttempt.findUnique.mockResolvedValue(null);

      await expect(service.review('nonexistent', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when attempt belongs to another user', async () => {
      const attempt = buildCompletedAttempt();
      (attempt as Record<string, unknown>).userId = OTHER_USER_ID;
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      await expect(service.review(ATTEMPT_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when attempt not yet completed', async () => {
      const attempt = buildCompletedAttempt();
      (attempt as Record<string, unknown>).completedAt = null;
      prisma.mockExamAttempt.findUnique.mockResolvedValue(attempt);

      await expect(service.review(ATTEMPT_ID, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── findUserAttempts ─────────────────────────────────────────────

  describe('findUserAttempts', () => {
    it('returns formatted attempts for the user', async () => {
      const rawAttempts = [
        {
          id: ATTEMPT_ID,
          startedAt: new Date('2026-03-01T10:00:00Z'),
          completedAt: new Date('2026-03-01T10:10:00Z'),
          score: 8,
          total: 10,
          mockExam: {
            id: MOCK_EXAM_ID,
            title: 'Physics Mock 1',
            durationMinutes: DURATION_MINUTES,
            subject: { id: 1, name: 'Physics' },
            grade: { id: 1, gradeNumber: 12 },
          },
        },
      ];
      prisma.mockExamAttempt.findMany.mockResolvedValue(rawAttempts);

      const result = await service.findUserAttempts(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.percentage).toBe(80);
      expect(result[0]!.mockExam.title).toBe('Physics Mock 1');
    });

    it('returns 0 percentage when total is 0', async () => {
      const rawAttempts = [
        {
          id: ATTEMPT_ID,
          startedAt: new Date(),
          completedAt: null,
          score: 0,
          total: 0,
          mockExam: {
            id: MOCK_EXAM_ID,
            title: 'Empty Mock',
            durationMinutes: 30,
            subject: { id: 1, name: 'Physics' },
            grade: { id: 1, gradeNumber: 12 },
          },
        },
      ];
      prisma.mockExamAttempt.findMany.mockResolvedValue(rawAttempts);

      const result = await service.findUserAttempts(USER_ID);

      expect(result[0]!.percentage).toBe(0);
    });

    it('returns empty array when user has no attempts', async () => {
      prisma.mockExamAttempt.findMany.mockResolvedValue([]);

      const result = await service.findUserAttempts(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── create (admin) ───────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      title: 'New Physics Mock Exam',
      subjectId: 1,
      gradeId: 1,
      durationMinutes: 60,
      questionCount: 10,
    };

    it('creates exam with provided questionIds', async () => {
      const questionIds = [QUESTION_ID_1, QUESTION_ID_2];
      const dto = { ...baseDto, questionIds, questionCount: 2 };

      prisma.question.findMany.mockResolvedValue(
        questionIds.map((id) => ({ id })),
      );
      prisma.mockExam.create.mockResolvedValue({
        id: MOCK_EXAM_ID,
        ...dto,
        mockExamQuestions: [],
      });

      const result = await service.create(dto);

      expect(result.id).toBe(MOCK_EXAM_ID);
      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: questionIds },
            deletedAt: null,
            status: 'PUBLISHED',
          }),
        }),
      );
    });

    it('throws BadRequestException when some questionIds are invalid', async () => {
      const dto = {
        ...baseDto,
        questionIds: [QUESTION_ID_1, 'nonexistent-id'],
        questionCount: 2,
      };
      prisma.question.findMany.mockResolvedValue([
        { id: QUESTION_ID_1 },
      ]);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('creates empty exam when shouldAutoGenerateQuestions is false', async () => {
      const dto = { ...baseDto, shouldAutoGenerateQuestions: false as const };
      prisma.mockExam.create.mockResolvedValue({
        id: MOCK_EXAM_ID,
        ...dto,
        mockExamQuestions: [],
      });

      await service.create(dto);

      const createCall = prisma.mockExam.create.mock.calls[0]![0] as {
        data: { mockExamQuestions: { create: unknown[] } };
      };
      expect(createCall.data.mockExamQuestions.create).toHaveLength(0);
    });

    it('auto-generates questions from random published questions', async () => {
      const dto = { ...baseDto, questionCount: 5 };
      const randomIds = Array.from({ length: 5 }, (_, i) => ({ id: `rand-${i}` }));
      prisma.$queryRaw.mockResolvedValue(randomIds);
      prisma.mockExam.create.mockResolvedValue({
        id: MOCK_EXAM_ID,
        mockExamQuestions: [],
      });

      await service.create(dto);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('throws BadRequestException when questionCount < 5 for auto-generation', async () => {
      const dto = { ...baseDto, questionCount: 3 };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when not enough published questions available', async () => {
      const dto = { ...baseDto, questionCount: 10 };
      prisma.$queryRaw.mockResolvedValue([
        { id: 'q1' },
        { id: 'q2' },
      ]);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── update (admin) ───────────────────────────────────────────────

  describe('update', () => {
    it('updates exam metadata', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        deletedAt: null,
        mockExamQuestions: [],
      });
      prisma.mockExam.update.mockResolvedValue({
        id: MOCK_EXAM_ID,
        title: 'Updated Title',
      });

      const result = await service.update(MOCK_EXAM_ID, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('replaces question set when questionIds provided', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        deletedAt: null,
        mockExamQuestions: [{ questionId: 'old-q' }],
      });
      prisma.question.findMany.mockResolvedValue([
        { id: QUESTION_ID_1 },
        { id: QUESTION_ID_2 },
      ]);
      prisma.mockExam.update.mockResolvedValue({
        id: MOCK_EXAM_ID,
      });

      await service.update(MOCK_EXAM_ID, {
        questionIds: [QUESTION_ID_1, QUESTION_ID_2],
      });

      expect(prisma.mockExamQuestion.deleteMany).toHaveBeenCalled();
      expect(prisma.mockExamQuestion.createMany).toHaveBeenCalled();
    });

    it('throws NotFoundException when exam does not exist', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when replacement questionIds are invalid', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        deletedAt: null,
        mockExamQuestions: [],
      });
      prisma.question.findMany.mockResolvedValue([
        { id: QUESTION_ID_1 },
      ]);

      await expect(
        service.update(MOCK_EXAM_ID, {
          questionIds: [QUESTION_ID_1, 'invalid-id'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove (admin soft delete) ───────────────────────────────────

  describe('remove', () => {
    it('soft-deletes the exam by setting deletedAt', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        deletedAt: null,
      });
      prisma.mockExam.update.mockResolvedValue({
        id: MOCK_EXAM_ID,
        deletedAt: new Date(),
      });

      const result = await service.remove(MOCK_EXAM_ID);

      expect(result.message).toBe('Mock exam deleted successfully');
      expect(prisma.mockExam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_EXAM_ID },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('throws NotFoundException when exam does not exist', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── getQuestionEditorData (admin) ────────────────────────────────

  describe('getQuestionEditorData', () => {
    it('returns exam info and formatted questions', async () => {
      const exam = {
        id: MOCK_EXAM_ID,
        title: 'Physics Mock',
        durationMinutes: DURATION_MINUTES,
        questionCount: 2,
        deletedAt: null,
        subject: { id: 1, name: 'Physics' },
        grade: { id: 1, gradeNumber: 12 },
        mockExamQuestions: [
          {
            sortOrder: 1,
            question: {
              id: QUESTION_ID_1,
              questionText: 'Q1?',
              explanation: 'Explanation 1',
              difficulty: 'MEDIUM',
              topic: { id: 1, name: 'Mechanics' },
              options: [
                { id: 'o1', optionLabel: 'A', optionText: 'Opt A', isCorrect: true },
              ],
            },
          },
        ],
      };
      prisma.mockExam.findFirst.mockResolvedValue(exam);

      const result = await service.getQuestionEditorData(MOCK_EXAM_ID);

      expect(result.exam.id).toBe(MOCK_EXAM_ID);
      expect(result.exam.targetQuestionCount).toBe(2);
      expect(result.exam.currentQuestionCount).toBe(1);
      expect(result.questions[0]!.questionId).toBe(QUESTION_ID_1);
    });

    it('throws NotFoundException when exam does not exist', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(null);

      await expect(
        service.getQuestionEditorData('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── addQuestion (admin) ──────────────────────────────────────────

  describe('addQuestion', () => {
    const addQuestionDto = {
      topicId: 1,
      questionText: 'New question text for testing?',
      explanation: 'Because reasons.',
      difficulty: 'EASY' as const,
      options: [
        { optionLabel: 'A' as const, optionText: 'Option A', isCorrect: true },
        { optionLabel: 'B' as const, optionText: 'Option B', isCorrect: false },
        { optionLabel: 'C' as const, optionText: 'Option C', isCorrect: false },
        { optionLabel: 'D' as const, optionText: 'Option D', isCorrect: false },
      ],
    };

    it('throws NotFoundException when exam does not exist', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(null);

      await expect(
        service.addQuestion('nonexistent', addQuestionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when question limit reached', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        subjectId: 1,
        gradeId: 1,
        questionCount: 2,
      });
      prisma.mockExamQuestion.count.mockResolvedValue(2);

      await expect(
        service.addQuestion(MOCK_EXAM_ID, addQuestionDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when topic not found', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        subjectId: 1,
        gradeId: 1,
        questionCount: 10,
      });
      prisma.mockExamQuestion.count.mockResolvedValue(0);
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(
        service.addQuestion(MOCK_EXAM_ID, addQuestionDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when topic subject/grade mismatch', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        subjectId: 1,
        gradeId: 1,
        questionCount: 10,
      });
      prisma.mockExamQuestion.count.mockResolvedValue(0);
      prisma.topic.findUnique.mockResolvedValue({
        id: 1,
        subjectId: 2,
        gradeId: 1,
      });

      await expect(
        service.addQuestion(MOCK_EXAM_ID, addQuestionDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when not exactly one correct option', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        subjectId: 1,
        gradeId: 1,
        questionCount: 10,
      });
      prisma.mockExamQuestion.count.mockResolvedValue(0);
      prisma.topic.findUnique.mockResolvedValue({
        id: 1,
        subjectId: 1,
        gradeId: 1,
      });

      const badDto = {
        ...addQuestionDto,
        options: addQuestionDto.options.map((o) => ({ ...o, isCorrect: false })),
      };

      await expect(
        service.addQuestion(MOCK_EXAM_ID, badDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when option labels are not unique', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        subjectId: 1,
        gradeId: 1,
        questionCount: 10,
      });
      prisma.mockExamQuestion.count.mockResolvedValue(0);
      prisma.topic.findUnique.mockResolvedValue({
        id: 1,
        subjectId: 1,
        gradeId: 1,
      });

      const badDto = {
        ...addQuestionDto,
        options: [
          { optionLabel: 'A' as const, optionText: 'O1', isCorrect: true },
          { optionLabel: 'A' as const, optionText: 'O2', isCorrect: false },
          { optionLabel: 'B' as const, optionText: 'O3', isCorrect: false },
          { optionLabel: 'C' as const, optionText: 'O4', isCorrect: false },
        ],
      };

      await expect(
        service.addQuestion(MOCK_EXAM_ID, badDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates question and links it with next sortOrder', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({
        id: MOCK_EXAM_ID,
        subjectId: 1,
        gradeId: 1,
        questionCount: 10,
      });
      prisma.mockExamQuestion.count.mockResolvedValue(3);
      prisma.topic.findUnique.mockResolvedValue({
        id: 1,
        subjectId: 1,
        gradeId: 1,
      });
      prisma.mockExamQuestion.aggregate.mockResolvedValue({
        _max: { sortOrder: 3 },
      });
      prisma.question.create.mockResolvedValue({
        id: 'new-question-id',
        questionText: addQuestionDto.questionText,
        explanation: addQuestionDto.explanation,
        difficulty: addQuestionDto.difficulty,
        topic: { id: 1, name: 'Topic' },
        options: addQuestionDto.options,
      });

      const result = await service.addQuestion(MOCK_EXAM_ID, addQuestionDto);

      expect(result.sortOrder).toBe(4);
      expect(result.questionId).toBe('new-question-id');
    });
  });

  // ─── removeQuestion (admin) ───────────────────────────────────────

  describe('removeQuestion', () => {
    it('throws NotFoundException when link does not exist', async () => {
      prisma.mockExamQuestion.findFirst.mockResolvedValue(null);

      await expect(
        service.removeQuestion(MOCK_EXAM_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes link, reorders remaining, and soft-deletes the question', async () => {
      prisma.mockExamQuestion.findFirst.mockResolvedValue({
        id: 'link-1',
        sortOrder: 1,
      });
      prisma.mockExamQuestion.delete.mockResolvedValue({});
      prisma.mockExamQuestion.findMany.mockResolvedValue([
        { id: 'link-2' },
        { id: 'link-3' },
      ]);
      prisma.mockExamQuestion.update.mockResolvedValue({});
      prisma.question.update.mockResolvedValue({});

      const result = await service.removeQuestion(MOCK_EXAM_ID, QUESTION_ID_1);

      expect(result.message).toBe('Mock exam question removed');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateQuestion (admin) ───────────────────────────────────────

  describe('updateQuestion', () => {
    const updateDto = {
      topicId: 1,
      questionText: 'Updated question text here?',
      explanation: 'Updated explanation.',
      difficulty: 'HARD' as const,
      options: [
        { optionLabel: 'A' as const, optionText: 'New A', isCorrect: false },
        { optionLabel: 'B' as const, optionText: 'New B', isCorrect: true },
        { optionLabel: 'C' as const, optionText: 'New C', isCorrect: false },
        { optionLabel: 'D' as const, optionText: 'New D', isCorrect: false },
      ],
    };

    it('throws NotFoundException when link does not exist', async () => {
      prisma.mockExamQuestion.findFirst.mockResolvedValue(null);

      await expect(
        service.updateQuestion(MOCK_EXAM_ID, QUESTION_ID_1, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when topic mismatch', async () => {
      prisma.mockExamQuestion.findFirst.mockResolvedValue({
        id: 'link-1',
        mockExam: { id: MOCK_EXAM_ID, subjectId: 1, gradeId: 1 },
      });
      prisma.topic.findUnique.mockResolvedValue({
        id: 1,
        subjectId: 99,
        gradeId: 1,
      });

      await expect(
        service.updateQuestion(MOCK_EXAM_ID, QUESTION_ID_1, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('replaces options and updates question in a transaction', async () => {
      prisma.mockExamQuestion.findFirst.mockResolvedValue({
        id: 'link-1',
        mockExam: { id: MOCK_EXAM_ID, subjectId: 1, gradeId: 1 },
      });
      prisma.topic.findUnique.mockResolvedValue({
        id: 1,
        subjectId: 1,
        gradeId: 1,
      });
      prisma.questionOption.deleteMany.mockResolvedValue({});
      prisma.question.update.mockResolvedValue({
        id: QUESTION_ID_1,
        questionText: updateDto.questionText,
      });

      const result = await service.updateQuestion(
        MOCK_EXAM_ID,
        QUESTION_ID_1,
        updateDto,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.questionOption.deleteMany).toHaveBeenCalledWith({
        where: { questionId: QUESTION_ID_1 },
      });
      expect(result.questionText).toBe('Updated question text here?');
    });
  });
});
