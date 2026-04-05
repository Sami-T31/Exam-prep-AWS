import { Question } from './content';

/**
 * A mock exam that simulates real national exam conditions.
 * Created by admins with a specific subject, grade, time limit,
 * and question count.
 */
export interface MockExam {
  id: string;
  title: string;
  subjectId: number;
  gradeId: number;
  durationMinutes: number;
  questionCount: number;
}

/**
 * A user's attempt at a mock exam. Tracks start/end time and score.
 */
export interface MockExamAttempt {
  id: string;
  userId: string;
  mockExamId: string;
  score: number;
  total: number;
  timeSpentSeconds: number;
  startedAt: string;
  completedAt: string | null;
}

/**
 * Returned when a user starts a mock exam.
 * Contains the questions (without correct answers) and the attempt ID.
 */
export interface StartExamResponse {
  attemptId: string;
  questions: Question[];
  durationMinutes: number;
  startedAt: string;
}

/**
 * Request body when submitting a completed mock exam.
 * Maps each question ID to the selected option ID.
 */
export interface SubmitExamRequest {
  answers: Record<string, string>;
}

/**
 * Detailed results returned after submitting a mock exam.
 */
export interface ExamResultResponse {
  attemptId: string;
  score: number;
  total: number;
  timeSpentSeconds: number;
  perQuestion: Array<{
    questionId: string;
    selectedOptionId: string | null;
    correctOptionId: string;
    isCorrect: boolean;
    explanation: string | null;
  }>;
}
