import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { accuracyPercent } from '../progress/progress-metrics';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverall(userId: string, timezoneOffsetMinutes?: number) {
    const todayStart = this.getLocalDayStartUtc(timezoneOffsetMinutes);

    const [totalQuestions, correctAnswers, todayCount, totalTime, streak] =
      await Promise.all([
        this.prisma.questionAttempt.count({ where: { userId } }),
        this.prisma.questionAttempt.count({
          where: { userId, isCorrect: true },
        }),
        this.prisma.questionAttempt.count({
          where: { userId, attemptedAt: { gte: todayStart } },
        }),
        this.prisma.questionAttempt.aggregate({
          where: { userId },
          _sum: { timeSpentSeconds: true },
        }),
        this.calculateStreak(userId, timezoneOffsetMinutes),
      ]);

    return {
      totalQuestions,
      correctAnswers,
      accuracy: accuracyPercent(correctAnswers, totalQuestions),
      totalTimeSeconds: totalTime._sum.timeSpentSeconds ?? 0,
      streakDays: streak,
      questionsToday: todayCount,
    };
  }

  async getSubjects(userId: string) {
    const results = await this.prisma.$queryRaw<
      Array<{
        subject_id: number;
        subject_name: string;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
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

    return results.map((row) => ({
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      totalQuestions: Number(row.total_attempts),
      correctAnswers: Number(row.correct_attempts),
      accuracy: accuracyPercent(
        Number(row.correct_attempts),
        Number(row.total_attempts),
      ),
      topics: null,
    }));
  }

  async getSubjectDetail(userId: string, subjectId: number) {
    const subjectRow = await this.prisma.$queryRaw<
      Array<{
        subject_id: number;
        subject_name: string;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
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
      WHERE s.id = ${subjectId}
      GROUP BY s.id, s.name
    `;

    const topicRows = await this.prisma.$queryRaw<
      Array<{
        topic_id: number;
        topic_name: string;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        COUNT(qa.id)::bigint AS total_attempts,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct_attempts
      FROM topics t
      LEFT JOIN questions q
        ON q.topic_id = t.id
       AND q.status = 'PUBLISHED'
       AND q.deleted_at IS NULL
      LEFT JOIN question_attempts qa
        ON qa.question_id = q.id
       AND qa.user_id = ${userId}
      WHERE t.subject_id = ${subjectId}
      GROUP BY t.id, t.name
      ORDER BY t.name ASC
    `;

    const subject = subjectRow[0];
    if (!subject) {
      return {
        subjectId,
        subjectName: 'Unknown',
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        topics: [],
      };
    }

    return {
      subjectId: subject.subject_id,
      subjectName: subject.subject_name,
      totalQuestions: Number(subject.total_attempts),
      correctAnswers: Number(subject.correct_attempts),
      accuracy: accuracyPercent(
        Number(subject.correct_attempts),
        Number(subject.total_attempts),
      ),
      topics: topicRows.map((row) => ({
        topicId: row.topic_id,
        topicName: row.topic_name,
        totalQuestions: Number(row.total_attempts),
        correctAnswers: Number(row.correct_attempts),
        accuracy: accuracyPercent(
          Number(row.correct_attempts),
          Number(row.total_attempts),
        ),
      })),
    };
  }

  async getGrades(userId: string) {
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

    return results.map((row) => ({
      gradeId: row.grade_id,
      gradeNumber: row.grade_number,
      totalQuestions: Number(row.total),
      correctAnswers: Number(row.correct),
      accuracy: accuracyPercent(Number(row.correct), Number(row.total)),
    }));
  }

  async getGradeDetail(userId: string, gradeId: number) {
    const gradeRow = await this.prisma.$queryRaw<
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
      WHERE qa.user_id = ${userId} AND g.id = ${gradeId}
      GROUP BY g.id, g.grade_number
    `;

    const row = gradeRow[0];
    if (!row) {
      return {
        gradeId,
        gradeNumber: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
      };
    }

    return {
      gradeId: row.grade_id,
      gradeNumber: row.grade_number,
      totalQuestions: Number(row.total),
      correctAnswers: Number(row.correct),
      accuracy: accuracyPercent(Number(row.correct), Number(row.total)),
    };
  }

  async getWeakTopics(
    userId: string,
    threshold: number = 50.0,
    minAttempts: number = 3,
  ) {
    const results = await this.prisma.$queryRaw<
      Array<{
        topic_id: number;
        topic_name: string;
        subject_id: number;
        subject_name: string;
        total_attempts: bigint;
        correct_attempts: bigint;
      }>
    >`
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        s.id AS subject_id,
        s.name AS subject_name,
        COUNT(qa.id)::bigint AS total_attempts,
        COUNT(qa.id) FILTER (WHERE qa.is_correct = true)::bigint AS correct_attempts
      FROM question_attempts qa
      JOIN questions q ON qa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE qa.user_id = ${userId}
      GROUP BY t.id, t.name, s.id, s.name
      HAVING COUNT(qa.id) >= ${minAttempts}
    `;

    return results
      .map((row) => {
        const total = Number(row.total_attempts);
        const correct = Number(row.correct_attempts);
        const accuracy = accuracyPercent(correct, total);
        return {
          topicId: row.topic_id,
          topicName: row.topic_name,
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          totalQuestions: total,
          correctAnswers: correct,
          accuracy,
        };
      })
      .filter((t) => t.accuracy < threshold)
      .sort((a, b) => a.accuracy - b.accuracy);
  }

  async getTrend(userId: string, days: number = 14) {
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
        { total: Number(row.total), correct: Number(row.correct) },
      ]),
    );

    const points: Array<{
      date: string;
      questionsAnswered: number;
      correctAnswers: number;
      accuracy: number;
    }> = [];

    for (let i = 0; i < safeDays; i++) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      const value = byDate.get(key);
      const total = value?.total ?? 0;
      const correct = value?.correct ?? 0;
      points.push({
        date: key,
        questionsAnswered: total,
        correctAnswers: correct,
        accuracy: accuracyPercent(correct, total),
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

  private async calculateStreak(
    userId: string,
    timezoneOffsetMinutes?: number,
  ): Promise<number> {
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

      const diffDays =
        (previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
