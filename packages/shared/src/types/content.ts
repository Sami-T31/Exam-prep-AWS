import {
  Stream,
  GradeLevel,
  Difficulty,
  QuestionStatus,
} from '../constants/enums';

/**
 * Academic stream (Natural Science / Social Science).
 * Subjects are grouped under streams.
 */
export interface StreamInfo {
  id: number;
  name: string;
  slug: Stream;
}

/**
 * A subject within a stream (e.g., Physics under Natural Science).
 */
export interface Subject {
  id: number;
  name: string;
  icon: string | null;
  streams: Stream[];
}

/**
 * A grade level (9, 10, 11, or 12).
 */
export interface Grade {
  id: number;
  gradeNumber: GradeLevel;
}

/**
 * A topic is a specific area within a subject at a given grade.
 * Example: "Quadratic Equations" under Mathematics, Grade 10.
 */
export interface Topic {
  id: number;
  name: string;
  subjectId: number;
  gradeId: number;
  sortOrder: number;
}

/**
 * A single answer option for a question.
 * optionLabel is A, B, C, or D.
 * isCorrect is only included AFTER the user has submitted their answer.
 */
export interface QuestionOption {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect?: boolean;
}

/**
 * A practice question. The core content unit of the app.
 *
 * - Before answering: options do NOT include isCorrect
 * - After answering: options include isCorrect, explanation is shown
 * - year: optional, indicates which national exam this came from (Ethiopian calendar)
 */
export interface Question {
  id: string;
  questionText: string;
  imageUrl: string | null;
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  topicId: number;
  gradeId: number;
  year: number | null;
  options: QuestionOption[];
  createdAt: string;
}

/**
 * Records a user's answer to a specific question.
 */
export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attemptedAt: string;
}

/**
 * Request body when submitting an answer to a question.
 */
export interface SubmitAnswerRequest {
  selectedOptionId: string;
  timeSpentSeconds: number;
}

/**
 * Response after submitting an answer. Includes the correct answer
 * and explanation so the user can learn from mistakes.
 */
export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string | null;
}
