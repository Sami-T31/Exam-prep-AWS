import { z } from 'zod';
import { Difficulty, QuestionStatus } from '../constants/enums';

/**
 * Validation for creating a new question (admin action).
 * Requires question text, exactly 4 options, and one correct answer.
 */
export const createQuestionSchema = z.object({
  questionText: z
    .string()
    .min(10, 'Question text must be at least 10 characters')
    .max(2000, 'Question text must be at most 2000 characters'),
  explanation: z
    .string()
    .max(3000, 'Explanation must be at most 3000 characters')
    .nullable()
    .optional(),
  difficulty: z.nativeEnum(Difficulty),
  topicId: z.number().int().positive('Topic ID must be a positive integer'),
  gradeId: z.number().int().positive('Grade ID must be a positive integer'),
  year: z.number().int().nullable().optional(),
  status: z.nativeEnum(QuestionStatus).optional().default(QuestionStatus.DRAFT),
  options: z
    .array(
      z.object({
        optionLabel: z.string().length(1, 'Option label must be A, B, C, or D'),
        optionText: z
          .string()
          .min(1, 'Option text is required')
          .max(500, 'Option text must be at most 500 characters'),
        isCorrect: z.boolean(),
      }),
    )
    .length(4, 'Each question must have exactly 4 options')
    .refine(
      (options) => options.filter((o) => o.isCorrect).length === 1,
      'Exactly one option must be marked as correct',
    ),
});

/**
 * Validation for submitting an answer to a question.
 */
export const submitAnswerSchema = z.object({
  selectedOptionId: z.string().uuid('Invalid option ID'),
  timeSpentSeconds: z
    .number()
    .int()
    .min(0, 'Time spent cannot be negative')
    .max(3600, 'Time spent cannot exceed 1 hour'),
});

/**
 * Validation for query parameters when fetching questions.
 */
export const questionFilterSchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  gradeId: z.coerce.number().int().positive().optional(),
  topicId: z.coerce.number().int().positive().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
