import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionAttemptedEvent } from '../common/events/question-attempted.event';

// ─── Constants ──────────────────────────────────────────────────────────────

const QUESTION_ID = 'q-uuid-1';
const USER_ID = 'user-uuid-1';
const OPTION_A_ID = 'opt-a-uuid';
const OPTION_B_ID = 'opt-b-uuid';
const OPTION_C_ID = 'opt-c-uuid';
const OPTION_D_ID = 'opt-d-uuid';
const ATTEMPT_ID = 'attempt-uuid-1';
const TOPIC_ID = 1;
const GRADE_ID = 2;
const SUBJECT_ID = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildMockOptions(correctLabel = 'A') {
  return [
    { id: OPTION_A_ID, optionLabel: 'A', optionText: 'Option A text', isCorrect: correctLabel === 'A' },
    { id: OPTION_B_ID, optionLabel: 'B', optionText: 'Option B text', isCorrect: correctLabel === 'B' },
    { id: OPTION_C_ID, optionLabel: 'C', optionText: 'Option C text', isCorrect: correctLabel === 'C' },
    { id: OPTION_D_ID, optionLabel: 'D', optionText: 'Option D text', isCorrect: correctLabel === 'D' },
  ];
}

function buildMockQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: QUESTION_ID,
    questionText: 'What is 2 + 2?',
    explanation: 'Basic addition.',
    difficulty: 'EASY',
    status: 'PUBLISHED',
    topicId: TOPIC_ID,
    gradeId: GRADE_ID,
    year: null,
    createdAt: new Date('2026-01-01'),
    deletedAt: null,
    options: buildMockOptions(),
    topic: { id: TOPIC_ID, name: 'Arithmetic', subjectId: SUBJECT_ID },
    grade: { id: GRADE_ID, gradeNumber: 10 },
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    question: {
      findMany: jest.fn<any>(),
      findFirst: jest.fn<any>(),
      findUnique: jest.fn<any>(),
      count: jest.fn<any>(),
      create: jest.fn<any>(),
      update: jest.fn<any>(),
    },
    questionAttempt: {
      create: jest.fn<any>(),
    },
    questionOption: {
      deleteMany: jest.fn<any>(),
    },
    topic: {
      findUnique: jest.fn<any>(),
    },
    grade: {
      findUnique: jest.fn<any>(),
    },
    $transaction: jest.fn<any>(),
  };
}

function createEventEmitterMock() {
  return { emit: jest.fn() };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    eventEmitter = createEventEmitterMock();
    service = new QuestionsService(prisma as any, eventEmitter as any);
  });

  // ─── findAll ────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results with total count', async () => {
      const mockQuestions = [buildMockQuestion()];
      prisma.question.findMany.mockResolvedValue(mockQuestions);
      prisma.question.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 20, offset: 0 });

      expect(result).toEqual({
        data: mockQuestions,
        total: 1,
        limit: 20,
        offset: 0,
      });
    });

    it('filters by subjectId through the topic relation', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ subjectId: SUBJECT_ID, limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.topic).toEqual({ subjectId: SUBJECT_ID });
    });

    it('filters by gradeId', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ gradeId: GRADE_ID, limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.gradeId).toBe(GRADE_ID);
    });

    it('filters by topicId', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ topicId: TOPIC_ID, limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.topicId).toBe(TOPIC_ID);
    });

    it('filters by difficulty', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ difficulty: 'HARD', limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.difficulty).toBe('HARD');
    });

    it('only returns PUBLISHED questions with no deletedAt', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.status).toBe('PUBLISHED');
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it('does not include isCorrect in the options select', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      const optionsSelect = findManyCall.include.options.select;
      expect(optionsSelect).not.toHaveProperty('isCorrect');
      expect(optionsSelect).toEqual({
        id: true,
        optionLabel: true,
        optionText: true,
      });
    });

    it('applies pagination with limit and offset', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ limit: 10, offset: 30 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.take).toBe(10);
      expect(findManyCall.skip).toBe(30);
    });

    it('applies multiple filters simultaneously', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({
        subjectId: SUBJECT_ID,
        gradeId: GRADE_ID,
        topicId: TOPIC_ID,
        difficulty: 'MEDIUM',
        limit: 5,
        offset: 0,
      });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where).toMatchObject({
        status: 'PUBLISHED',
        deletedAt: null,
        topicId: TOPIC_ID,
        gradeId: GRADE_ID,
        difficulty: 'MEDIUM',
        topic: { subjectId: SUBJECT_ID },
      });
    });

    it('orders results by createdAt descending', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('passes the same where clause to both findMany and count', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAll({ gradeId: GRADE_ID, limit: 20, offset: 0 });

      const findManyWhere = (prisma.question.findMany.mock.calls[0]![0] as any).where;
      const countWhere = (prisma.question.count.mock.calls[0]![0] as any).where;
      expect(findManyWhere).toEqual(countWhere);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a question with options, topic, and grade', async () => {
      const mockQuestion = buildMockQuestion();
      prisma.question.findFirst.mockResolvedValue(mockQuestion);

      const result = await service.findOne(QUESTION_ID);

      expect(result).toEqual(mockQuestion);
      expect(prisma.question.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: QUESTION_ID, deletedAt: null, status: 'PUBLISHED' },
        }),
      );
    });

    it('throws NotFoundException when question does not exist', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for soft-deleted question', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(service.findOne(QUESTION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not include isCorrect in options select', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());

      await service.findOne(QUESTION_ID);

      const call = prisma.question.findFirst.mock.calls[0]![0] as any;
      const optionsSelect = call.include.options.select;
      expect(optionsSelect).not.toHaveProperty('isCorrect');
    });

    it('includes nested topic.subject in the response', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());

      await service.findOne(QUESTION_ID);

      const call = prisma.question.findFirst.mock.calls[0]![0] as any;
      expect(call.include.topic.select.subject).toBeDefined();
    });
  });

  // ─── submitAnswer ───────────────────────────────────────────────────

  describe('submitAnswer', () => {
    const TIME_SPENT_SECONDS = 45;

    it('records a correct attempt and returns the result', async () => {
      const mockQuestion = buildMockQuestion();
      prisma.question.findFirst.mockResolvedValue(mockQuestion);
      prisma.questionAttempt.create.mockResolvedValue({
        id: ATTEMPT_ID,
        userId: USER_ID,
        questionId: QUESTION_ID,
        selectedOptionId: OPTION_A_ID,
        isCorrect: true,
        timeSpentSeconds: TIME_SPENT_SECONDS,
      });

      const result = await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS);

      expect(result).toEqual({
        attemptId: ATTEMPT_ID,
        isCorrect: true,
        correctOptionId: OPTION_A_ID,
        correctOptionLabel: 'A',
        explanation: 'Basic addition.',
      });
    });

    it('records an incorrect attempt and still returns the correct answer', async () => {
      const mockQuestion = buildMockQuestion();
      prisma.question.findFirst.mockResolvedValue(mockQuestion);
      prisma.questionAttempt.create.mockResolvedValue({
        id: ATTEMPT_ID,
        userId: USER_ID,
        questionId: QUESTION_ID,
        selectedOptionId: OPTION_B_ID,
        isCorrect: false,
        timeSpentSeconds: TIME_SPENT_SECONDS,
      });

      const result = await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_B_ID, TIME_SPENT_SECONDS);

      expect(result.isCorrect).toBe(false);
      expect(result.correctOptionId).toBe(OPTION_A_ID);
      expect(result.correctOptionLabel).toBe('A');
    });

    it('saves the attempt with correct data', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.questionAttempt.create.mockResolvedValue({ id: ATTEMPT_ID });

      await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS);

      expect(prisma.questionAttempt.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          questionId: QUESTION_ID,
          selectedOptionId: OPTION_A_ID,
          isCorrect: true,
          timeSpentSeconds: TIME_SPENT_SECONDS,
        },
      });
    });

    it('emits a question.attempted event', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.questionAttempt.create.mockResolvedValue({ id: ATTEMPT_ID });

      await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        QuestionAttemptedEvent.EVENT_NAME,
        expect.objectContaining({
          userId: USER_ID,
          questionId: QUESTION_ID,
          isCorrect: true,
          subjectId: SUBJECT_ID,
        }),
      );
    });

    it('emits event with isCorrect=false for wrong answer', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.questionAttempt.create.mockResolvedValue({ id: ATTEMPT_ID });

      await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_C_ID, TIME_SPENT_SECONDS);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        QuestionAttemptedEvent.EVENT_NAME,
        expect.objectContaining({ isCorrect: false }),
      );
    });

    it('passes timeSpentSeconds through to the attempt record', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.questionAttempt.create.mockResolvedValue({ id: ATTEMPT_ID });

      await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, 120);

      const createCall = prisma.questionAttempt.create.mock.calls[0]![0] as any;
      expect(createCall.data.timeSpentSeconds).toBe(120);
    });

    it('throws NotFoundException when question does not exist', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAnswer('no-such-id', USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when selectedOptionId does not belong to question', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());

      await expect(
        service.submitAnswer(QUESTION_ID, USER_ID, 'invalid-option-id', TIME_SPENT_SECONDS),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not emit event when question is not found', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS),
      ).rejects.toThrow();

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does not create attempt when option validation fails', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());

      await expect(
        service.submitAnswer(QUESTION_ID, USER_ID, 'bad-option', TIME_SPENT_SECONDS),
      ).rejects.toThrow();

      expect(prisma.questionAttempt.create).not.toHaveBeenCalled();
    });

    it('queries only PUBLISHED, non-deleted questions', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.questionAttempt.create.mockResolvedValue({ id: ATTEMPT_ID });

      await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS);

      expect(prisma.question.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: QUESTION_ID, deletedAt: null, status: 'PUBLISHED' },
        }),
      );
    });

    it('includes topic.subjectId in the question query for the event', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.questionAttempt.create.mockResolvedValue({ id: ATTEMPT_ID });

      await service.submitAnswer(QUESTION_ID, USER_ID, OPTION_A_ID, TIME_SPENT_SECONDS);

      const call = prisma.question.findFirst.mock.calls[0]![0] as any;
      expect(call.include.topic.select.subjectId).toBe(true);
    });

    it('does not emit event when option is invalid', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());

      await expect(
        service.submitAnswer(QUESTION_ID, USER_ID, 'bad-option', TIME_SPENT_SECONDS),
      ).rejects.toThrow();

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // ─── findAllAdmin ───────────────────────────────────────────────────

  describe('findAllAdmin', () => {
    it('returns paginated results without requiring PUBLISHED status', async () => {
      const draftQuestion = buildMockQuestion({ status: 'DRAFT' });
      prisma.question.findMany.mockResolvedValue([draftQuestion]);
      prisma.question.count.mockResolvedValue(1);

      const result = await service.findAllAdmin({ limit: 20, offset: 0 });

      expect(result.data).toHaveLength(1);
      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where).not.toHaveProperty('status');
    });

    it('filters by status when provided', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAllAdmin({ status: 'DRAFT', limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.status).toBe('DRAFT');
    });

    it('excludes soft-deleted questions', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAllAdmin({ limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it('applies subjectId, gradeId, topicId, and difficulty filters', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAllAdmin({
        subjectId: SUBJECT_ID,
        gradeId: GRADE_ID,
        topicId: TOPIC_ID,
        difficulty: 'HARD',
        limit: 20,
        offset: 0,
      });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.where).toMatchObject({
        deletedAt: null,
        topicId: TOPIC_ID,
        gradeId: GRADE_ID,
        difficulty: 'HARD',
        topic: { subjectId: SUBJECT_ID },
      });
    });

    it('includes topic.subject in the response', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await service.findAllAdmin({ limit: 20, offset: 0 });

      const findManyCall = prisma.question.findMany.mock.calls[0]![0] as any;
      expect(findManyCall.include.topic.select.subject).toBeDefined();
    });
  });

  // ─── create ─────────────────────────────────────────────────────────

  describe('create', () => {
    const VALID_CREATE_DTO = {
      questionText: 'What is the capital of Ethiopia?',
      explanation: 'Addis Ababa is the capital.',
      difficulty: 'EASY',
      topicId: TOPIC_ID,
      gradeId: GRADE_ID,
      options: [
        { optionLabel: 'A', optionText: 'Addis Ababa', isCorrect: true },
        { optionLabel: 'B', optionText: 'Dire Dawa', isCorrect: false },
        { optionLabel: 'C', optionText: 'Hawassa', isCorrect: false },
        { optionLabel: 'D', optionText: 'Mekelle', isCorrect: false },
      ],
    };

    beforeEach(() => {
      prisma.topic.findUnique.mockResolvedValue({ id: TOPIC_ID, name: 'Geography' });
      prisma.grade.findUnique.mockResolvedValue({ id: GRADE_ID, gradeNumber: 10 });
    });

    it('creates a question with nested options', async () => {
      const createdQuestion = buildMockQuestion({
        questionText: VALID_CREATE_DTO.questionText,
      });
      prisma.question.create.mockResolvedValue(createdQuestion);

      const result = await service.create(VALID_CREATE_DTO as any);

      expect(result).toEqual(createdQuestion);
      expect(prisma.question.create).toHaveBeenCalledTimes(1);
    });

    it('passes sanitized text and correct option structure to prisma', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await service.create(VALID_CREATE_DTO as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.options.create).toHaveLength(4);
      const correctOptions = createCall.data.options.create.filter(
        (o: any) => o.isCorrect,
      );
      expect(correctOptions).toHaveLength(1);
    });

    it('throws BadRequestException when zero options are marked correct', async () => {
      const dtoNoCorrect = {
        ...VALID_CREATE_DTO,
        options: VALID_CREATE_DTO.options.map((o) => ({ ...o, isCorrect: false })),
      };

      await expect(service.create(dtoNoCorrect as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when multiple options are marked correct', async () => {
      const dtoMultiCorrect = {
        ...VALID_CREATE_DTO,
        options: VALID_CREATE_DTO.options.map((o) => ({ ...o, isCorrect: true })),
      };

      await expect(service.create(dtoMultiCorrect as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when topicId does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.create(VALID_CREATE_DTO as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when gradeId does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue({ id: TOPIC_ID });
      prisma.grade.findUnique.mockResolvedValue(null);

      await expect(service.create(VALID_CREATE_DTO as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('defaults status to DRAFT when not specified', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());
      const dtoWithoutStatus = { ...VALID_CREATE_DTO };
      delete (dtoWithoutStatus as any).status;

      await service.create(dtoWithoutStatus as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.status).toBe('DRAFT');
    });

    it('uses provided status when specified', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await service.create({ ...VALID_CREATE_DTO, status: 'PUBLISHED' } as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.status).toBe('PUBLISHED');
    });

    it('stores year as null when not provided', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await service.create(VALID_CREATE_DTO as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.year).toBeNull();
    });

    it('stores year when provided', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await service.create({ ...VALID_CREATE_DTO, year: 2018 } as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.year).toBe(2018);
    });

    it('includes options in the create response', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await service.create(VALID_CREATE_DTO as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.include).toEqual({ options: true });
    });

    it('validates topic and grade before creating', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await expect(service.create(VALID_CREATE_DTO as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.question.create).not.toHaveBeenCalled();
    });

    it('strips HTML tags from questionText', async () => {
      prisma.question.create.mockResolvedValue(buildMockQuestion());

      await service.create({
        ...VALID_CREATE_DTO,
        questionText: '<b>What</b> is the capital?',
      } as any);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.questionText).not.toContain('<b>');
    });

    it('throws BadRequestException for questionText that is empty after sanitization', async () => {
      await expect(
        service.create({
          ...VALID_CREATE_DTO,
          questionText: '<script></script>',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.topic.findUnique.mockResolvedValue({ id: TOPIC_ID });
      prisma.grade.findUnique.mockResolvedValue({ id: GRADE_ID });
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    });

    it('updates question text', async () => {
      const updatedQuestion = buildMockQuestion({ questionText: 'Updated text here.' });
      prisma.question.update.mockResolvedValue(updatedQuestion);

      const result = await service.update(QUESTION_ID, { questionText: 'Updated text here.' } as any);

      expect(result).toEqual(updatedQuestion);
    });

    it('throws NotFoundException when question does not exist', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { questionText: 'Updated text here.' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes old options and creates new ones when options are provided', async () => {
      const newOptions = [
        { optionLabel: 'A', optionText: 'New A option text', isCorrect: true },
        { optionLabel: 'B', optionText: 'New B option text', isCorrect: false },
        { optionLabel: 'C', optionText: 'New C option text', isCorrect: false },
        { optionLabel: 'D', optionText: 'New D option text', isCorrect: false },
      ];
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { options: newOptions } as any);

      expect(prisma.questionOption.deleteMany).toHaveBeenCalledWith({
        where: { questionId: QUESTION_ID },
      });
    });

    it('does not delete options when options are not provided', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { questionText: 'Just a text update.' } as any);

      expect(prisma.questionOption.deleteMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when updated options have no correct answer', async () => {
      const badOptions = [
        { optionLabel: 'A', optionText: 'Option A text', isCorrect: false },
        { optionLabel: 'B', optionText: 'Option B text', isCorrect: false },
        { optionLabel: 'C', optionText: 'Option C text', isCorrect: false },
        { optionLabel: 'D', optionText: 'Option D text', isCorrect: false },
      ];

      await expect(
        service.update(QUESTION_ID, { options: badOptions } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when updated options have multiple correct answers', async () => {
      const badOptions = [
        { optionLabel: 'A', optionText: 'Option A text', isCorrect: true },
        { optionLabel: 'B', optionText: 'Option B text', isCorrect: true },
        { optionLabel: 'C', optionText: 'Option C text', isCorrect: false },
        { optionLabel: 'D', optionText: 'Option D text', isCorrect: false },
      ];

      await expect(
        service.update(QUESTION_ID, { options: badOptions } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates topicId when provided in update', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);

      await expect(
        service.update(QUESTION_ID, { topicId: 999 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates gradeId when provided in update', async () => {
      prisma.topic.findUnique.mockResolvedValue({ id: TOPIC_ID });
      prisma.grade.findUnique.mockResolvedValue(null);

      await expect(
        service.update(QUESTION_ID, { gradeId: 999 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses existing topicId/gradeId for validation when only one is provided', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { topicId: 5 } as any);

      expect(prisma.topic.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(prisma.grade.findUnique).toHaveBeenCalledWith({ where: { id: GRADE_ID } });
    });

    it('runs inside a transaction', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { questionText: 'Updated inside txn.' } as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('updates difficulty without touching options', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion({ difficulty: 'HARD' }));

      await service.update(QUESTION_ID, { difficulty: 'HARD' } as any);

      const updateCall = prisma.question.update.mock.calls[0]![0] as any;
      expect(updateCall.data.difficulty).toBe('HARD');
      expect(prisma.questionOption.deleteMany).not.toHaveBeenCalled();
    });

    it('updates explanation', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { explanation: 'New explanation text.' } as any);

      const updateCall = prisma.question.update.mock.calls[0]![0] as any;
      expect(updateCall.data.explanation).toBeDefined();
    });

    it('updates status', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion({ status: 'PUBLISHED' }));

      await service.update(QUESTION_ID, { status: 'PUBLISHED' } as any);

      const updateCall = prisma.question.update.mock.calls[0]![0] as any;
      expect(updateCall.data.status).toBe('PUBLISHED');
    });

    it('updates year', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion({ year: 2020 }));

      await service.update(QUESTION_ID, { year: 2020 } as any);

      const updateCall = prisma.question.update.mock.calls[0]![0] as any;
      expect(updateCall.data.year).toBe(2020);
    });

    it('sets year to null when explicitly passed as null', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion({ year: null }));

      await service.update(QUESTION_ID, { year: null } as any);

      const updateCall = prisma.question.update.mock.calls[0]![0] as any;
      expect(updateCall.data.year).toBeNull();
    });

    it('does not validate topic/grade when neither is provided', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { questionText: 'Simple text update.' } as any);

      expect(prisma.topic.findUnique).not.toHaveBeenCalled();
      expect(prisma.grade.findUnique).not.toHaveBeenCalled();
    });

    it('includes options in the update response', async () => {
      prisma.question.update.mockResolvedValue(buildMockQuestion());

      await service.update(QUESTION_ID, { questionText: 'Some updated text.' } as any);

      const updateCall = prisma.question.update.mock.calls[0]![0] as any;
      expect(updateCall.include).toEqual({ options: true });
    });

    it('does not call $transaction when question is not found', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { questionText: 'Does not matter.' } as any),
      ).rejects.toThrow();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─── softDelete ─────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets deletedAt on the question', async () => {
      prisma.question.findFirst.mockResolvedValue(buildMockQuestion());
      prisma.question.update.mockResolvedValue({});

      const result = await service.softDelete(QUESTION_ID);

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: QUESTION_ID },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Question deleted successfully' });
    });

    it('throws NotFoundException when question does not exist', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for already-deleted question', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(QUESTION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not call update when question is not found', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(QUESTION_ID)).rejects.toThrow();

      expect(prisma.question.update).not.toHaveBeenCalled();
    });
  });

  // ─── reviewQuestion ─────────────────────────────────────────────────

  describe('reviewQuestion', () => {
    it('publishes a question when action is PUBLISH', async () => {
      prisma.question.findFirst.mockResolvedValue({ id: QUESTION_ID, status: 'DRAFT' });
      prisma.question.update.mockResolvedValue({ id: QUESTION_ID, status: 'PUBLISHED' });

      const result = await service.reviewQuestion(QUESTION_ID, 'PUBLISH');

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: QUESTION_ID },
        data: { status: 'PUBLISHED' },
        select: { id: true, status: true },
      });
      expect(result.message).toContain('published');
      expect(result.question).toEqual({ id: QUESTION_ID, status: 'PUBLISHED' });
    });

    it('reverts a question to DRAFT when action is REQUEST_CHANGES', async () => {
      prisma.question.findFirst.mockResolvedValue({ id: QUESTION_ID, status: 'PUBLISHED' });
      prisma.question.update.mockResolvedValue({ id: QUESTION_ID, status: 'DRAFT' });

      const result = await service.reviewQuestion(QUESTION_ID, 'REQUEST_CHANGES');

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: QUESTION_ID },
        data: { status: 'DRAFT' },
        select: { id: true, status: true },
      });
      expect(result.message).toContain('draft');
    });

    it('throws NotFoundException when question does not exist', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.reviewQuestion('nonexistent', 'PUBLISH'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for soft-deleted question', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.reviewQuestion(QUESTION_ID, 'PUBLISH'),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not call update when question is not found', async () => {
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.reviewQuestion(QUESTION_ID, 'PUBLISH'),
      ).rejects.toThrow();

      expect(prisma.question.update).not.toHaveBeenCalled();
    });

    it('queries with deletedAt: null to exclude soft-deleted questions', async () => {
      prisma.question.findFirst.mockResolvedValue({ id: QUESTION_ID, status: 'DRAFT' });
      prisma.question.update.mockResolvedValue({ id: QUESTION_ID, status: 'PUBLISHED' });

      await service.reviewQuestion(QUESTION_ID, 'PUBLISH');

      expect(prisma.question.findFirst).toHaveBeenCalledWith({
        where: { id: QUESTION_ID, deletedAt: null },
        select: { id: true, status: true },
      });
    });
  });

  // ─── bulkImport ─────────────────────────────────────────────────────

  describe('bulkImport', () => {
    function buildValidRow(overrides: Record<string, unknown> = {}) {
      return {
        questionText: 'What is the largest planet in our solar system?',
        explanation: 'Jupiter is the largest.',
        difficulty: 'EASY',
        topicId: TOPIC_ID,
        gradeId: GRADE_ID,
        optionA: 'Jupiter',
        optionB: 'Saturn',
        optionC: 'Earth',
        optionD: 'Mars',
        correctOption: 'A',
        ...overrides,
      };
    }

    beforeEach(() => {
      prisma.topic.findUnique.mockResolvedValue({ id: TOPIC_ID, name: 'Astronomy' });
      prisma.grade.findUnique.mockResolvedValue({ id: GRADE_ID, gradeNumber: 10 });
      prisma.question.create.mockResolvedValue({ id: 'new-q-id' });
    });

    it('imports valid rows and returns correct summary', async () => {
      const rows = [buildValidRow(), buildValidRow({ questionText: 'Second valid question text here.' })];

      const result = await service.bulkImport(rows);

      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('creates questions with DRAFT status', async () => {
      await service.bulkImport([buildValidRow()]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.status).toBe('DRAFT');
    });

    it('maps correctOption to the correct isCorrect flag on options', async () => {
      await service.bulkImport([buildValidRow({ correctOption: 'C' })]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      const createdOptions = createCall.data.options.create as any[];
      const correctOnes = createdOptions.filter((o) => o.isCorrect);
      expect(correctOnes).toHaveLength(1);
      expect(correctOnes[0].optionLabel).toBe('C');
    });

    it('reports per-row errors for invalid correctOption', async () => {
      const rows = [buildValidRow({ correctOption: 'Z' })];

      const result = await service.bulkImport(rows);

      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.row).toBe(1);
      expect(result.errors[0]!.error).toContain('correctOption');
    });

    it('reports error for questionText shorter than 10 characters', async () => {
      const rows = [buildValidRow({ questionText: 'Short' })];

      const result = await service.bulkImport(rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0]!.error).toContain('10 characters');
    });

    it('reports error for invalid difficulty', async () => {
      const rows = [buildValidRow({ difficulty: 'EXTREME' })];

      const result = await service.bulkImport(rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0]!.error).toContain('difficulty');
    });

    it('reports error when topicId does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue(null);
      const rows = [buildValidRow({ topicId: 9999 })];

      const result = await service.bulkImport(rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0]!.error).toContain('topicId');
    });

    it('reports error when gradeId does not exist', async () => {
      prisma.topic.findUnique.mockResolvedValue({ id: TOPIC_ID });
      prisma.grade.findUnique.mockResolvedValue(null);
      const rows = [buildValidRow({ gradeId: 9999 })];

      const result = await service.bulkImport(rows);

      expect(result.failed).toBe(1);
      expect(result.errors[0]!.error).toContain('gradeId');
    });

    it('continues processing remaining rows after one fails', async () => {
      const rows = [
        buildValidRow({ correctOption: 'Z' }),
        buildValidRow(),
      ];

      const result = await service.bulkImport(rows);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.row).toBe(1);
    });

    it('throws BadRequestException when rows exceed maximum limit', async () => {
      const rows = Array.from({ length: 501 }, () => buildValidRow());

      await expect(service.bulkImport(rows)).rejects.toThrow(BadRequestException);
    });

    it('accepts exactly 500 rows without throwing', async () => {
      const rows = Array.from({ length: 500 }, () => buildValidRow());

      const result = await service.bulkImport(rows);

      expect(result.imported).toBe(500);
    });

    it('stores year as null when not provided in row', async () => {
      await service.bulkImport([buildValidRow()]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.year).toBeNull();
    });

    it('stores year when provided in row', async () => {
      await service.bulkImport([buildValidRow({ year: 2018 })]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.year).toBe(2018);
    });

    it('handles explanation as null when not provided', async () => {
      const row = buildValidRow();
      delete (row as any).explanation;

      await service.bulkImport([row]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.explanation).toBeNull();
    });

    it('uses 1-based row numbers in error reporting', async () => {
      prisma.topic.findUnique
        .mockResolvedValueOnce({ id: TOPIC_ID })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: TOPIC_ID });
      prisma.grade.findUnique.mockResolvedValue({ id: GRADE_ID });

      const rows = [buildValidRow(), buildValidRow(), buildValidRow()];
      const result = await service.bulkImport(rows);

      expect(result.errors[0]!.row).toBe(2);
    });

    it('handles case-insensitive correctOption', async () => {
      await service.bulkImport([buildValidRow({ correctOption: 'b' })]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      const correctOnes = createCall.data.options.create.filter((o: any) => o.isCorrect);
      expect(correctOnes).toHaveLength(1);
      expect(correctOnes[0].optionLabel).toBe('B');
    });

    it('handles case-insensitive difficulty', async () => {
      await service.bulkImport([buildValidRow({ difficulty: 'medium' })]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.difficulty).toBe('MEDIUM');
    });

    it('stores explanation when provided in row', async () => {
      await service.bulkImport([buildValidRow({ explanation: 'The answer is Jupiter.' })]);

      const createCall = prisma.question.create.mock.calls[0]![0] as any;
      expect(createCall.data.explanation).toBeTruthy();
    });

    it('calls prisma.question.create once per valid row', async () => {
      const rows = [buildValidRow(), buildValidRow({ questionText: 'Another valid question here.' })];

      await service.bulkImport(rows);

      expect(prisma.question.create).toHaveBeenCalledTimes(2);
    });

    it('captures non-Error throws as Unknown error', async () => {
      prisma.question.create.mockRejectedValueOnce('string-error');

      const result = await service.bulkImport([buildValidRow()]);

      expect(result.failed).toBe(1);
      expect(result.errors[0]!.error).toBe('Unknown error');
    });

    it('reports multiple errors across different rows', async () => {
      const rows = [
        buildValidRow({ correctOption: 'Z' }),
        buildValidRow(),
        buildValidRow({ difficulty: 'EXTREME' }),
      ];

      const result = await service.bulkImport(rows);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]!.row).toBe(1);
      expect(result.errors[1]!.row).toBe(3);
    });
  });
});
