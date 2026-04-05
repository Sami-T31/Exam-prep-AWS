import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface Subject {
  id: number;
  name: string;
  icon: string | null;
  streams: string[];
}

interface SubjectDetail extends Subject {
  topics: Array<{
    id: number;
    name: string;
    gradeId: number;
    gradeNumber: number;
    sortOrder: number;
  }>;
}

export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.all,
    queryFn: async () => {
      const { data } = await apiClient.get<Subject[]>('/subjects');
      return data;
    },
  });
}

export function useSubjectTopics(subjectId: number) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(subjectId),
    queryFn: async () => {
      const { data } = await apiClient.get<SubjectDetail>(`/subjects/${subjectId}`);
      return data;
    },
    enabled: subjectId > 0,
  });
}
