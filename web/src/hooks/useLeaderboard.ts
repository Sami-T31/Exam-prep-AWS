import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
  accuracy: number;
}

interface LeaderboardResponse {
  period: string;
  subjectId: number | null;
  entries: LeaderboardEntry[];
  currentUser: {
    rank: number | null;
    score: number;
  };
}

export function useLeaderboard(
  period: string,
  subjectId: number | null,
  limit: number,
) {
  return useQuery({
    queryKey: queryKeys.leaderboard.list(period, subjectId, limit),
    queryFn: async () => {
      const { data } = await apiClient.get<LeaderboardResponse>('/leaderboard', {
        params: {
          period,
          ...(subjectId ? { subjectId } : {}),
          limit,
        },
      });
      return data;
    },
  });
}
