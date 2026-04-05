import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { RedisService } from '../redis';
import { PrismaService } from '../prisma';
import { QuestionAttemptedEvent } from '../common/events/question-attempted.event';

/**
 * Redis key naming convention:
 *   leaderboard:{period}:{subjectId|all}
 *
 * Examples:
 *   leaderboard:weekly:all       — weekly overall leaderboard
 *   leaderboard:monthly:3        — monthly leaderboard for subject 3
 *   leaderboard:alltime:all      — all-time overall leaderboard
 *
 * Each key holds a Redis Sorted Set where:
 *   member = userId
 *   score  = number of correct answers in that period
 *
 * Redis Sorted Sets explained:
 * Think of a sorted set as a dictionary where each key (member) has a
 * numeric score. Redis automatically keeps the members ordered by score.
 * This means "who has the highest score?" is always instantly available
 * without scanning the entire dataset.
 *
 * Key commands we use:
 *   ZINCRBY key 1 userId  — Add 1 to this user's score (creates if new)
 *   ZREVRANGE key 0 9     — Get top 10 members (highest score first)
 *   ZREVRANK key userId   — Get this user's rank (0-indexed, highest first)
 *   ZSCORE key userId     — Get this user's score
 *   DEL key               — Delete the entire set (for resets)
 */
@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private buildKey(period: string, subjectId?: number): string {
    return `leaderboard:${period}:${subjectId ?? 'all'}`;
  }

  /**
   * Increment a user's score. Called when a user answers a question correctly.
   *
   * We update three leaderboards at once: weekly, monthly, and all-time.
   * If a subjectId is provided, we also update the subject-specific boards.
   *
   * Redis `pipeline` batches multiple commands into a single network
   * round-trip, which is much faster than sending them individually.
   */
  async incrementScore(userId: string, subjectId?: number) {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    const periods = ['weekly', 'monthly', 'alltime'];
    for (const period of periods) {
      pipeline.zincrby(this.buildKey(period, undefined), 1, userId);
      if (subjectId !== undefined) {
        pipeline.zincrby(this.buildKey(period, subjectId), 1, userId);
      }
    }

    await pipeline.exec();
  }

  /**
   * Event listener: automatically update leaderboard when a user
   * answers a question correctly.
   *
   * @OnEvent listens for the 'question.attempted' event emitted by
   * QuestionsService. This decouples the two modules — the questions
   * module doesn't know (or care) that leaderboards exist.
   */
  @OnEvent(QuestionAttemptedEvent.EVENT_NAME)
  async handleQuestionAttempted(event: QuestionAttemptedEvent) {
    if (event.isCorrect) {
      await this.incrementScore(event.userId, event.subjectId);
    }
  }

  /**
   * Get the leaderboard for a period, optionally filtered by subject.
   *
   * Returns the top N users with their names, scores, and ranks.
   * Also includes the requesting user's own rank and score even if
   * they're not in the top N.
   */
  async getLeaderboard(
    period: string,
    requestingUserId: string,
    subjectId?: number,
    limit: number = 20,
  ) {
    const client = this.redis.getClient();
    const key = this.buildKey(period, subjectId);

    let entries = await this.readTopEntries(client, key, limit);

    if (entries.length === 0) {
      await this.rebuildLeaderboardFromAttempts(period, subjectId);
      entries = await this.readTopEntries(client, key, limit);
    }

    let userIds = entries.map((entry) => entry.userId);
    let users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    let userMap = new Map(users.map((user) => [user.id, user.name]));

    const where = this.buildAttemptWhere(period, subjectId);
    let { totalMap, correctMap } = await this.getAccuracyMaps(userIds, where);

    const hasOnlyZeroAccuracyData =
      entries.length > 0 &&
      entries.every((entry) => (totalMap.get(entry.userId) ?? 0) === 0);

    if (hasOnlyZeroAccuracyData) {
      await this.rebuildLeaderboardFromAttempts(period, subjectId);
      entries = await this.readTopEntries(client, key, limit);
      userIds = entries.map((entry) => entry.userId);
      users = userIds.length
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
      userMap = new Map(users.map((user) => [user.id, user.name]));
      ({ totalMap, correctMap } = await this.getAccuracyMaps(userIds, where));
    }

    const rankedEntries = entries.map((entry) => {
      const totalAttempts = totalMap.get(entry.userId) ?? 0;
      const correctAttempts = correctMap.get(entry.userId) ?? 0;

      return {
        rank: entry.rank,
        userId: entry.userId,
        name: userMap.get(entry.userId) ?? 'Unknown',
        score: entry.score,
        accuracy:
          totalAttempts > 0
            ? Math.round((correctAttempts / totalAttempts) * 10000) / 100
            : 0,
      };
    });

    let currentUserEntry: {
      rank: number | null;
      score: number;
    } = { rank: null, score: 0 };

    const userRank = await client.zrevrank(key, requestingUserId);
    const userScore = await client.zscore(key, requestingUserId);

    if (userRank !== null) {
      currentUserEntry = {
        rank: userRank + 1,
        score: parseInt(userScore ?? '0', 10),
      };
    }

    return {
      period,
      subjectId: subjectId ?? null,
      entries: rankedEntries,
      currentUser: currentUserEntry,
    };
  }

  private async readTopEntries(
    client: ReturnType<RedisService['getClient']>,
    key: string,
    limit: number,
  ): Promise<Array<{ userId: string; score: number; rank: number }>> {
    const topMembers = await client.zrevrange(
      key,
      0,
      Math.max(0, limit - 1),
      'WITHSCORES',
    );

    const entries: Array<{ userId: string; score: number; rank: number }> = [];
    for (let index = 0; index < topMembers.length; index += 2) {
      entries.push({
        userId: topMembers[index]!,
        score: Number(topMembers[index + 1] ?? 0),
        rank: index / 2 + 1,
      });
    }

    return entries;
  }

  private buildAttemptWhere(
    period: string,
    subjectId?: number,
  ): Prisma.QuestionAttemptWhereInput {
    const where: Prisma.QuestionAttemptWhereInput = {};

    if (subjectId !== undefined) {
      where.question = { topic: { subjectId } };
    }

    if (period === 'weekly') {
      where.attemptedAt = { gte: this.getStartOfCurrentWeekUtc() };
    } else if (period === 'monthly') {
      where.attemptedAt = { gte: this.getStartOfCurrentMonthUtc() };
    }

    return where;
  }

  private async getAccuracyMaps(
    userIds: string[],
    where: Prisma.QuestionAttemptWhereInput,
  ): Promise<{
    totalMap: Map<string, number>;
    correctMap: Map<string, number>;
  }> {
    if (userIds.length === 0) {
      return {
        totalMap: new Map<string, number>(),
        correctMap: new Map<string, number>(),
      };
    }

    const [totalByUser, correctByUser] = await Promise.all([
      this.prisma.questionAttempt.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { in: userIds },
        },
        _count: { _all: true },
      }),
      this.prisma.questionAttempt.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { in: userIds },
          isCorrect: true,
        },
        _count: { _all: true },
      }),
    ]);

    return {
      totalMap: new Map(
        totalByUser.map((row) => [row.userId, row._count._all]),
      ),
      correctMap: new Map(
        correctByUser.map((row) => [row.userId, row._count._all]),
      ),
    };
  }

  private async rebuildLeaderboardFromAttempts(
    period: string,
    subjectId?: number,
  ) {
    const client = this.redis.getClient();
    const key = this.buildKey(period, subjectId);
    const where = this.buildAttemptWhere(period, subjectId);

    const correctByUser = await this.prisma.questionAttempt.groupBy({
      by: ['userId'],
      where: {
        ...where,
        isCorrect: true,
      },
      _count: { _all: true },
    });

    await client.del(key);

    if (correctByUser.length === 0) {
      return;
    }

    const pipeline = client.pipeline();
    for (const row of correctByUser) {
      pipeline.zadd(key, row._count._all, row.userId);
    }
    await pipeline.exec();
  }
  private getStartOfCurrentWeekUtc(): Date {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }

  private getStartOfCurrentMonthUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
  }

  /**
   * Reset the weekly leaderboard every Monday at 00:00 UTC.
   *
   * @Cron is NestJS's scheduler decorator. CronExpression.EVERY_WEEK
   * triggers at midnight on Monday. The method scans for all weekly
   * leaderboard keys and deletes them.
   *
   * Before deleting, we persist the final standings to PostgreSQL
   * so historical data is preserved for analytics.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async resetWeekly() {
    this.logger.log('Resetting weekly leaderboard...');
    await this.persistAndReset('weekly');
  }

  /**
   * Reset the monthly leaderboard on the 1st of each month at 00:00 UTC.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthly() {
    this.logger.log('Resetting monthly leaderboard...');
    await this.persistAndReset('monthly');
  }

  /**
   * Persist current leaderboard standings to PostgreSQL, then delete
   * the Redis keys. This way we have a permanent record of past rankings
   * even after the Redis data is cleared.
   */
  private async persistAndReset(period: string) {
    const client = this.redis.getClient();
    const pattern = `leaderboard:${period}:*`;

    let cursor = '0';
    const keys: string[] = [];
    do {
      const [nextCursor, foundKeys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    for (const key of keys) {
      const parts = key.split(':');
      const subjectPart = parts[2];
      const subjectId =
        subjectPart === 'all' ? undefined : parseInt(subjectPart!, 10);

      let readKey = key;
      if (period !== 'alltime') {
        const archiveKey = `${key}:archive:${Date.now()}`;
        await client.rename(key, archiveKey);
        readKey = archiveKey;
      }

      try {
        const members = await client.zrevrange(readKey, 0, -1, 'WITHSCORES');

        const dbPeriod =
          period === 'alltime'
            ? 'ALL_TIME'
            : (period.toUpperCase() as 'WEEKLY' | 'MONTHLY');

        for (let i = 0; i < members.length; i += 2) {
          const userId = members[i]!;
          const score = parseInt(members[i + 1]!, 10);

          if (subjectId !== undefined) {
            await this.prisma.leaderboardEntry.upsert({
              where: {
                userId_subjectId_period: {
                  userId,
                  subjectId,
                  period: dbPeriod,
                },
              },
              update: { score },
              create: { userId, subjectId, score, period: dbPeriod },
            });
          } else {
            const existing = await this.prisma.leaderboardEntry.findFirst({
              where: { userId, subjectId: null, period: dbPeriod },
            });
            if (existing) {
              await this.prisma.leaderboardEntry.update({
                where: { id: existing.id },
                data: { score },
              });
            } else {
              await this.prisma.leaderboardEntry.create({
                data: { userId, subjectId: null, score, period: dbPeriod },
              });
            }
          }
        }
      } finally {
        if (period !== 'alltime') {
          await client.del(readKey);
        }
      }
    }

    this.logger.log(
      `Persisted and reset ${keys.length} ${period} leaderboard keys`,
    );
  }
}
