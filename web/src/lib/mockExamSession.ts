export interface MockExamOption {
  id: string;
  optionLabel: string;
  optionText: string;
}

export interface MockExamQuestion {
  questionId: string;
  questionText: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: MockExamOption[];
  sortOrder: number;
}

export interface MockExamSessionState {
  attemptId: string;
  mockExamId: string;
  examTitle: string;
  durationMinutes: number;
  startedAt: string;
  questions: MockExamQuestion[];
  answersByQuestionId: Record<string, string>;
  flaggedQuestionIds: string[];
  submitted: boolean;
}

const PREFIX = 'mockExamSession:';
const FLAG_PREFIX = 'mockExamFlags:';

export function getSessionKey(attemptId: string): string {
  return `${PREFIX}${attemptId}`;
}

export function saveSession(state: MockExamSessionState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSessionKey(state.attemptId), JSON.stringify(state));
}

export function loadSession(attemptId: string): MockExamSessionState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getSessionKey(attemptId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MockExamSessionState;
  } catch {
    return null;
  }
}

export function clearSession(attemptId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getSessionKey(attemptId));
}

export function saveFlaggedQuestionIds(attemptId: string, questionIds: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${FLAG_PREFIX}${attemptId}`, JSON.stringify(questionIds));
}

export function loadFlaggedQuestionIds(attemptId: string): string[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(`${FLAG_PREFIX}${attemptId}`);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
