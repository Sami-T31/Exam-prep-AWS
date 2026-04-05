import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface MockExam {
  id: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  subject: { id: number; name: string };
  grade: { id: number; gradeNumber: number };
  _count: { mockExamQuestions: number };
}

interface MockExamAttemptHistory {
  id: string;
  startedAt: string;
  completedAt: string | null;
  score: number;
  total: number;
  percentage: number;
  mockExam: {
    id: string;
    title: string;
    durationMinutes: number;
    subject: { id: number; name: string };
    grade: { id: number; gradeNumber: number };
  };
}

export function useMockExams(subjectId?: number, gradeId?: number) {
  return useQuery({
    queryKey: queryKeys.mockExams.list(subjectId, gradeId),
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (subjectId && !Number.isNaN(subjectId)) params.subjectId = subjectId;
      if (gradeId && !Number.isNaN(gradeId)) params.gradeId = gradeId;
      const { data } = await apiClient.get<MockExam[]>('/mock-exams', { params });
      return data;
    },
  });
}

export function useMockExamAttempts() {
  return useQuery({
    queryKey: queryKeys.mockExams.attempts,
    queryFn: async () => {
      const { data } = await apiClient.get<MockExamAttemptHistory[]>(
        '/mock-exams/attempts/history',
      );
      return data;
    },
  });
}
