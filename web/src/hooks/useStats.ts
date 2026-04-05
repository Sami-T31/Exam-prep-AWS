import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface OverallStats {
  totalAttempts: number;
  correctAttempts: number;
  todayAttempts: number;
  accuracy: number;
  currentStreak: number;
}

interface SubjectStat {
  subjectId: number;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  coverage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

interface WeakTopic {
  topicId: number;
  topicName: string;
  subjectId: number;
  subjectName: string;
  gradeId: number;
  gradeNumber: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  adjustedAccuracy: number;
  confidence: number;
}

interface TrendPoint {
  date: string;
  attempts: number;
  accuracy: number;
}

interface GradeStat {
  gradeId: number;
  gradeNumber: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

interface GradeDetailStat {
  subjectId: number;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  coverage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}
interface SubjectTopicStat {
  topicId: number;
  topicName: string;
  gradeId: number;
  gradeNumber: number;
  totalQuestions: number;
  attemptedQuestions: number;
  coverage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
}

export function useOverallStats() {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();

  return useQuery({
    queryKey: [...queryKeys.stats.overall, timezoneOffsetMinutes],
    queryFn: async () => {
      const { data } = await apiClient.get<OverallStats>('/users/me/stats', {
        params: { timezoneOffsetMinutes },
      });
      return data;
    },
  });
}

export function useSubjectStats() {
  return useQuery({
    queryKey: queryKeys.stats.subjects,
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectStat[]>('/users/me/stats/subjects');
      return data;
    },
  });
}

export function useWeakTopics(threshold = 60, minAttempts = 5) {
  return useQuery({
    queryKey: queryKeys.stats.weakTopics(threshold, minAttempts),
    queryFn: async () => {
      const { data } = await apiClient.get<WeakTopic[]>(
        `/users/me/stats/weak-topics?threshold=${threshold}&minAttempts=${minAttempts}`,
      );
      return data;
    },
  });
}

export function useDailyTrend(days = 14) {
  return useQuery({
    queryKey: queryKeys.stats.trend(days),
    queryFn: async () => {
      const { data } = await apiClient.get<TrendPoint[]>(
        `/users/me/stats/trend?days=${days}`,
      );
      return data;
    },
  });
}

export function useGradeStats() {
  return useQuery({
    queryKey: queryKeys.stats.grades,
    queryFn: async () => {
      const { data } = await apiClient.get<GradeStat[]>('/users/me/stats/grades');
      return data;
    },
  });
}


export function useGradeDetailStats(gradeId: number | null) {
  return useQuery({
    queryKey: queryKeys.stats.gradeDetail(gradeId ?? 0),
    queryFn: async () => {
      const { data } = await apiClient.get<GradeDetailStat[]>(
        `/users/me/stats/grades/${gradeId}`,
      );
      return data;
    },
    enabled: gradeId !== null && gradeId > 0,
  });
}
export function useSubjectDetailStats(subjectId: number | null) {
  return useQuery({
    queryKey: queryKeys.stats.subjectDetail(subjectId ?? 0),
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectTopicStat[]>(
        `/users/me/stats/subjects/${subjectId}`,
      );
      return data;
    },
    enabled: subjectId !== null && subjectId > 0,
  });
}



