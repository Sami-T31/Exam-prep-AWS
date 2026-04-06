import { UserRole } from '../constants/enums';

/**
 * Represents a registered user in the system.
 * This is the shape returned by the API -- note that
 * password_hash is NEVER included in API responses.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data required to register a new account.
 */
export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

/**
 * Data required to log in.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * What the server returns after a successful login.
 * - accessToken: short-lived (15 min), sent with every API request
 * - refreshToken: long-lived (7 days), used to get a new accessToken
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Summary statistics shown on a user's dashboard.
 */
export interface UserStats {
  totalQuestionsAttempted: number;
  totalCorrect: number;
  overallAccuracy: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Per-subject statistics for the progress page.
 */
export interface SubjectStats {
  subjectId: number;
  subjectName: string;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  completionPercentage: number;
}
