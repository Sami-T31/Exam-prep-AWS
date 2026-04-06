import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './queryKeys';

export type LeaderboardTier = 'bronze' | 'silver' | 'gold';

export interface LeaderboardBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface LeaderboardReward {
  type: 'badge' | 'streak_boost';
  badge?: LeaderboardBadge;
  streakBoostDays?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
  tier: LeaderboardTier;
  rankChange: number;
  scoreChange: number;
  streak: number;
  badges: LeaderboardBadge[];
}

export interface LeaderboardResponse {
  period: string;
  subjectId: number | null;
  entries: LeaderboardEntry[];
  currentUser: {
    rank: number | null;
    score: number;
    tier: LeaderboardTier;
    rankChange: number;
    scoreChange: number;
    streak: number;
    badges: LeaderboardBadge[];
    rewards: LeaderboardReward[];
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
