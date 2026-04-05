/**
 * User roles control what actions someone can perform.
 * - STUDENT: default role, can practice questions and take exams
 * - ADMIN: can manage content, verify payments, view analytics
 */
export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

/**
 * Academic streams in the Ethiopian education system.
 * After grade 10, students choose one of these tracks.
 * Each stream has different subjects.
 */
export enum Stream {
  NATURAL_SCIENCE = 'NATURAL_SCIENCE',
  SOCIAL_SCIENCE = 'SOCIAL_SCIENCE',
}

/**
 * Grade levels the app covers. Content is organized by grade
 * so students can study material appropriate to their level.
 */
export enum GradeLevel {
  GRADE_9 = 9,
  GRADE_10 = 10,
  GRADE_11 = 11,
  GRADE_12 = 12,
}

/**
 * Question difficulty helps students progress gradually:
 * - EASY: foundational concepts, direct recall
 * - MEDIUM: application of concepts, moderate reasoning
 * - HARD: multi-step problems, analytical thinking
 */
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/**
 * Subscription plan durations. Longer plans can be priced
 * at a discount to encourage commitment.
 */
export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Tracks where a subscription is in its lifecycle.
 * - PENDING: payment initiated but not confirmed
 * - ACTIVE: paid and within the valid date range
 * - EXPIRED: past the expiry date, needs renewal
 * - CANCELLED: manually cancelled by user or admin
 */
export enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Payment methods available in Ethiopia.
 * - TELEBIRR: Ethio Telecom's mobile money (most widely used)
 * - CBE_BIRR: Commercial Bank of Ethiopia's mobile banking
 * - BANK_TRANSFER: direct bank deposit with receipt verification
 */
export enum PaymentMethod {
  TELEBIRR = 'TELEBIRR',
  CBE_BIRR = 'CBE_BIRR',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

/**
 * Payment verification status for the admin workflow.
 * Bank transfers require manual admin verification.
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Leaderboard time periods. Users are ranked within these windows.
 * Weekly and monthly boards reset automatically.
 */
export enum LeaderboardPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

/**
 * Question publish status for the admin content workflow.
 * New questions start as DRAFT and must be reviewed before
 * students can see them.
 */
export enum QuestionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
