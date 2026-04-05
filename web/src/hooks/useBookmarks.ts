import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface BookmarkItem {
  id: string;
  question: {
    id: string;
    questionText: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    topic: {
      id: number;
      name: string;
      subject: { id: number; name: string };
    };
    grade: { id: number; gradeNumber: number };
  };
}

export function useBookmarks(subjectId?: number, gradeId?: number) {
  return useQuery({
    queryKey: queryKeys.bookmarks.list(subjectId, gradeId),
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (subjectId) params.subjectId = subjectId;
      if (gradeId) params.gradeId = gradeId;
      const { data } = await apiClient.get<BookmarkItem[]>('/bookmarks', { params });
      return data;
    },
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { data } = await apiClient.post('/bookmarks', { questionId });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      await apiClient.delete(`/bookmarks/${bookmarkId}`);
      return bookmarkId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}
