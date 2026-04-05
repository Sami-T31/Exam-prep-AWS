import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  accuracyPercent,
  bayesianAccuracyPercent,
  clampWeakTopicMinAttempts,
  clampWeakTopicThreshold,
  coveragePercent,
  weakTopicConfidence,
  WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS,
  WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT,
} from './progress-metrics';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverallStats(userId: string, timezoneOffsetMinutes?: number) {
    const todayStart = this.getLocalDayStartUtc(timezoneOffsetMinutes);

    const [totalAttempts, correctAttempts, todayAttempts, streak] =
      await Promise.all([
        this.prisma.questionAttempt.count({
          where: { userId },
        }),
        this.prisma.questionAttempt.count({
          where: { userId, isCorrect: true },
        }),
        this.prisma.questionAttempt.count({
          where: {
            userId,
            attemptedAt: { gte: todayStart },
          },
        }),
        this.calculateStreak(userId),
      ]);

    return {
      totalAttempts,
      correctAttempts,
      todayAttempts,
      accuracy: accuracyPercent(correctAttempts, totalAttempts),
      currentStreak: streak,
    };
  }

  async getSubjectStats(userId: string) {
    const results = await this.prisma.$queryRaw<
      Array<{
        subject_id: number;
        subject_name: string;
        total_questions: bigint;
        attempted_questions: bigint;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        COUNT(DISTINCT q.id)::bigint AS total_questions,
        COUNT(DISTINCT qa.question_id)::bigint AS attempted_questions,
        COUNT(qa.id)::bigint AS total_attempts,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct_attempts
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id
      LEFT JOIN questions q
        ON q.topic_id = t.id
       AND q.status = 'PUBLISHED'
       AND q.deleted_at IS NULL
      LEFT JOIN question_attempts qa
        ON qa.question_id = q.id
       AND qa.user_id = ${userId}
      GROUP BY s.id, s.name
      ORDER BY total_attempts DESC, s.name ASC
    `;

    return results.map((row) => {
      const totalQuestions = Number(row.total_questions);
      const attemptedQuestions = Number(row.attempted_questions);
      const totalAttempts = Number(row.total_attempts);
      const correctAttempts = Number(row.correct_attempts);

      return {
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        totalQuestions,
        attemptedQuestions,
        coverage: coveragePercent(attemptedQuestions, totalQuestions),
        totalAttempts,
        correctAttempts,
        accuracy: accuracyPercent(correctAttempts, totalAttempts),
      };
    });
  }

  async getGradeStats(userId: string) {
    const results = await this.prisma.$queryRaw<
      Array<{
        grade_id: number;
        grade_number: number;
        total: bigint;
        correct: bigint;
      }>
    >`
      SELECT
        g.id AS grade_id,
        g.grade_number,
        COUNT(qa.id)::bigint AS total,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct
      FROM question_attempts qa
      JOIN questions q ON qa.question_id = q.id
      JOIN grades g ON q.grade_id = g.id
      WHERE qa.user_id = ${userId}
      GROUP BY g.id, g.grade_number
      ORDER BY g.grade_number ASC
    `;

    return results.map((row) => {
      const totalAttempts = Number(row.total);
      const correctAttempts = Number(row.correct);

      return {
        gradeId: row.grade_id,
        gradeNumber: row.grade_number,
        totalAttempts,
        correctAttempts,
        accuracy: accuracyPercent(correctAttempts, totalAttempts),
      };
    });
  }

  async getGradeDetailStats(userId: string, gradeId: number) {
    const results = await this.prisma.$queryRaw<
      Array<{
        subject_id: number;
        subject_name: string;
        total_questions: bigint;
        attempted_questions: bigint;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        COUNT(DISTINCT q.id)::bigint AS total_questions,
        COUNT(DISTINCT qa.question_id)::bigint AS attempted_questions,
        COUNT(qa.id)::bigint AS total_attempts,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct_attempts
      FROM subjects s
      JOIN topics t
        ON t.subject_id = s.id
       AND t.grade_id = ${gradeId}
      LEFT JOIN questions q
        ON q.topic_id = t.id
       AND q.status = 'PUBLISHED'
       AND q.deleted_at IS NULL
      LEFT JOIN question_attempts qa
        ON qa.question_id = q.id
       AND qa.user_id = ${userId}
      GROUP BY s.id, s.name
      ORDER BY total_attempts DESC, s.name ASC
    `;

    return results.map((row) => {
      const totalQuestions = Number(row.total_questions);
      const attemptedQuestions = Number(row.attempted_questions);
      const totalAttempts = Number(row.total_attempts);
      const correctAttempts = Number(row.correct_attempts);

      return {
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        totalQuestions,
        attemptedQuestions,
        coverage: coveragePercent(attemptedQuestions, totalQuestions),
        totalAttempts,
        correctAttempts,
        accuracy: accuracyPercent(correctAttempts, totalAttempts),
      };
    });
  }
  async getSubjectDetailStats(userId: string, subjectId: number) {
    const results = await this.prisma.$queryRaw<
      Array<{
        topic_id: number;
        topic_name: string;
        grade_id: number;
        grade_number: number;
        total_questions: bigint;
        attempted_questions: bigint;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        g.id AS grade_id,
        g.grade_number,
        COUNT(DISTINCT q.id)::bigint AS total_questions,
        COUNT(DISTINCT qa.question_id)::bigint AS attempted_questions,
        COUNT(qa.id)::bigint AS total_attempts,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct_attempts
      FROM topics t
      JOIN grades g ON t.grade_id = g.id
      LEFT JOIN questions q
        ON q.topic_id = t.id
       AND q.status = 'PUBLISHED'
       AND q.deleted_at IS NULL
      LEFT JOIN question_attempts qa
        ON qa.question_id = q.id
       AND qa.user_id = ${userId}
      WHERE t.subject_id = ${subjectId}
      GROUP BY t.id, t.name, g.id, g.grade_number
      ORDER BY g.grade_number ASC, t.name ASC
    `;

    return results.map((row) => {
      const totalQuestions = Number(row.total_questions);
      const attemptedQuestions = Number(row.attempted_questions);
      const totalAttempts = Number(row.total_attempts);
      const correctAttempts = Number(row.correct_attempts);

      return {
        topicId: row.topic_id,
        topicName: row.topic_name,
        gradeId: row.grade_id,
        gradeNumber: row.grade_number,
        totalQuestions,
        attemptedQuestions,
        coverage: coveragePercent(attemptedQuestions, totalQuestions),
        totalAttempts,
        correctAttempts,
        accuracy: accuracyPercent(correctAttempts, totalAttempts),
      };
    });
  }

  async getWeakTopics(
    userId: string,
    thresholdPercent: number = WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT,
    minAttempts: number = WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS,
  ) {
    const clampedThresholdPercent = clampWeakTopicThreshold(thresholdPercent);
    const clampedMinAttempts = clampWeakTopicMinAttempts(minAttempts);

    const results = await this.prisma.$queryRaw<
      Array<{
        topic_id: number;
        topic_name: string;
        subject_id: number;
        subject_name: string;
        grade_id: number;
        grade_number: number;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        s.id AS subject_id,
        s.name AS subject_name,
        g.id AS grade_id,
        g.grade_number,
        COUNT(qa.id)::bigint AS total_attempts,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct_attempts
      FROM question_attempts qa
      JOIN questions q ON qa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      JOIN grades g ON t.grade_id = g.id
      WHERE qa.user_id = ${userId}
      GROUP BY t.id, t.name, s.id, s.name, g.id, g.grade_number
      HAVING COUNT(qa.id) >= 1
    `;

    const rankedTopics = results
      .map((row) => {
        const totalAttempts = Number(row.total_attempts);
        const correctAttempts = Number(row.correct_attempts);
        const accuracy = accuracyPercent(correctAttempts, totalAttempts);
        const adjustedAccuracy = bayesianAccuracyPercent(
          correctAttempts,
          totalAttempts,
        );

        return {
          topicId: row.topic_id,
          topicName: row.topic_name,
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          gradeId: row.grade_id,
          gradeNumber: row.grade_number,
          totalAttempts,
          correctAttempts,
          accuracy,
          adjustedAccuracy,
          confidence: weakTopicConfidence(totalAttempts),
        };
      })
      .sort((left, right) => {
        if (left.adjustedAccuracy !== right.adjustedAccuracy) {
          return left.adjustedAccuracy - right.adjustedAccuracy;
        }
        return right.totalAttempts - left.totalAttempts;
      });

    const strictWeakTopics = rankedTopics.filter(
      (topic) =>
        topic.totalAttempts >= clampedMinAttempts &&
        topic.adjustedAccuracy < clampedThresholdPercent,
    );

    if (strictWeakTopics.length > 0) {
      return strictWeakTopics;
    }

    return rankedTopics
      .filter((topic) => topic.adjustedAccuracy < clampedThresholdPercent)
      .slice(0, 5);
  }

  async getDailyTrend(userId: string, days: number = 14) {
    const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));

    const rows = await this.prisma.$queryRaw<
      Array<{
        attempt_date: Date;
        total: bigint;
        correct: bigint;
      }>
    >`
      SELECT
        DATE(attempted_at AT TIME ZONE 'UTC') AS attempt_date,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE is_correct = true)::bigint AS correct
      FROM question_attempts
      WHERE user_id = ${userId}
        AND attempted_at >= ${startDate}
      GROUP BY DATE(attempted_at AT TIME ZONE 'UTC')
      ORDER BY attempt_date ASC
    `;

    const byDate = new Map(
      rows.map((row) => [
        new Date(row.attempt_date).toISOString().slice(0, 10),
        {
          total: Number(row.total),
          correct: Number(row.correct),
        },
      ]),
    );

    const points: Array<{
      date: string;
      attempts: number;
      accuracy: number;
    }> = [];

    for (let index = 0; index < safeDays; index++) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const value = byDate.get(key);
      const attempts = value?.total ?? 0;
      const correct = value?.correct ?? 0;
      points.push({
        date: key,
        attempts,
        accuracy: accuracyPercent(correct, attempts),
      });
    }

    return points;
  }

  private getLocalDayStartUtc(timezoneOffsetMinutes?: number): Date {
    if (
      timezoneOffsetMinutes === undefined ||
      !Number.isFinite(timezoneOffsetMinutes)
    ) {
      const utcStart = new Date();
      utcStart.setUTCHours(0, 0, 0, 0);
      return utcStart;
    }

    // JS getTimezoneOffset() format: local = UTC - offsetMinutes.
    const offset = Math.trunc(timezoneOffsetMinutes);
    const nowUtc = new Date();
    const localNowMs = nowUtc.getTime() - offset * 60 * 1000;
    const localNow = new Date(localNowMs);

    const localStartMs = Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
      0,
      0,
      0,
      0,
    );

    return new Date(localStartMs + offset * 60 * 1000);
  }
  private async calculateStreak(userId: string): Promise<number> {
    const dates = await this.prisma.$queryRaw<Array<{ attempt_date: Date }>>`
      SELECT DISTINCT DATE(attempted_at AT TIME ZONE 'UTC') AS attempt_date
      FROM question_attempts
      WHERE user_id = ${userId}
      ORDER BY attempt_date DESC
      LIMIT 365
    `;

    if (dates.length === 0) return 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const firstDate = new Date(dates[0]!.attempt_date);
    firstDate.setUTCHours(0, 0, 0, 0);

    if (
      firstDate.getTime() !== today.getTime() &&
      firstDate.getTime() !== yesterday.getTime()
    ) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]!.attempt_date);
      current.setUTCHours(0, 0, 0, 0);
      const previous = new Date(dates[i - 1]!.attempt_date);
      previous.setUTCHours(0, 0, 0, 0);

      const diffMs = previous.getTime() - current.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
