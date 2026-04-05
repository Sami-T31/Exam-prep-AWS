import { LeaderboardPeriod } from '../constants/enums';

/**
 * A single entry on the leaderboard.
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  accuracy: number;
}

/**
 * Full leaderboard response including the requesting user's own rank.
 */
export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  subjectId: number | null;
  entries: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
  totalParticipants: number;
}
