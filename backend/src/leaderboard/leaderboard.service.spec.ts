import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LeaderboardService } from './leaderboard.service';
import { QuestionAttemptedEvent } from '../common/events/question-attempted.event';

// ─── Constants ──────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';
const SUBJECT_ID = 3;

// ─── Mock Factories ─────────────────────────────────────────────────────────

type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

function asyncFn(): AsyncMock {
  return jest.fn<(...args: unknown[]) => Promise<unknown>>();
}

function createMockPipeline() {
  const pipeline = {
    zincrby: jest.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
    exec: asyncFn().mockResolvedValue([]),
  };
  return pipeline;
}

function createMockRedisClient() {
  const pipeline = createMockPipeline();
  const client = {
    zincrby: asyncFn(),
    zrevrange: asyncFn().mockResolvedValue([]),
    zrevrank: asyncFn().mockResolvedValue(null),
    zscore: asyncFn().mockResolvedValue(null),
    del: asyncFn().mockResolvedValue(1),
    scan: asyncFn().mockResolvedValue(['0', []]),
    rename: asyncFn().mockResolvedValue('OK'),
    pipeline: jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(pipeline),
  };
  return { client, pipeline };
}

function createMockRedisService(client: ReturnType<typeof createMockRedisClient>['client']) {
  return {
    getClient: jest.fn<() => unknown>().mockReturnValue(client),
  };
}

function createMockPrismaService() {
  return {
    user: {
      findMany: asyncFn().mockResolvedValue([]),
    },
    questionAttempt: {
      groupBy: asyncFn().mockResolvedValue([]),
    },
    leaderboardEntry: {
      upsert: asyncFn(),
      findFirst: asyncFn(),
      create: asyncFn(),
      update: asyncFn(),
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let redisClient: ReturnType<typeof createMockRedisClient>['client'];
  let redisPipeline: ReturnType<typeof createMockPipeline>;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    const redis = createMockRedisClient();
    redisClient = redis.client;
    redisPipeline = redis.pipeline;
    const redisService = createMockRedisService(redisClient);
    prisma = createMockPrismaService();

    service = new LeaderboardService(redisService as never, prisma as never);
  });

  // ─── incrementScore ─────────────────────────────────────────────

  describe('incrementScore', () => {
    it('increments score on weekly, monthly, and alltime overall keys', async () => {
      await service.incrementScore(USER_ID);

      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:weekly:all', 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:monthly:all', 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:alltime:all', 1, USER_ID,
      );
      expect(redisPipeline.exec).toHaveBeenCalledTimes(1);
    });

    it('also increments subject-specific keys when subjectId provided', async () => {
      await service.incrementScore(USER_ID, SUBJECT_ID);

      expect(redisPipeline.zincrby).toHaveBeenCalledTimes(6);
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:weekly:all', 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        `leaderboard:weekly:${SUBJECT_ID}`, 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:monthly:all', 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        `leaderboard:monthly:${SUBJECT_ID}`, 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:alltime:all', 1, USER_ID,
      );
      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        `leaderboard:alltime:${SUBJECT_ID}`, 1, USER_ID,
      );
    });

    it('only increments 3 overall keys when subjectId is undefined', async () => {
      await service.incrementScore(USER_ID, undefined);

      expect(redisPipeline.zincrby).toHaveBeenCalledTimes(3);
    });

    it('executes pipeline exactly once regardless of key count', async () => {
      await service.incrementScore(USER_ID, SUBJECT_ID);

      expect(redisPipeline.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ─── handleQuestionAttempted ──────────────────────────────────────

  describe('handleQuestionAttempted', () => {
    it('increments score when answer is correct', async () => {
      const event = new QuestionAttemptedEvent(USER_ID, 'q-1', true, SUBJECT_ID);

      await service.handleQuestionAttempted(event);

      expect(redisPipeline.zincrby).toHaveBeenCalled();
      expect(redisPipeline.exec).toHaveBeenCalled();
    });

    it('does not increment score when answer is incorrect', async () => {
      const event = new QuestionAttemptedEvent(USER_ID, 'q-1', false, SUBJECT_ID);

      await service.handleQuestionAttempted(event);

      expect(redisPipeline.zincrby).not.toHaveBeenCalled();
    });

    it('passes subjectId from event to incrementScore', async () => {
      const event = new QuestionAttemptedEvent(USER_ID, 'q-1', true, 7);

      await service.handleQuestionAttempted(event);

      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:weekly:7', 1, USER_ID,
      );
    });
  });

  // ─── getLeaderboard ───────────────────────────────────────────────

  describe('getLeaderboard', () => {
    it('returns ranked entries with user names from Redis sorted set', async () => {
      redisClient.zrevrange.mockResolvedValue([
        USER_ID, '15',
        OTHER_USER_ID, '10',
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: USER_ID, name: 'Alice' },
        { id: OTHER_USER_ID, name: 'Bob' },
      ]);
      prisma.questionAttempt.groupBy
        .mockResolvedValueOnce([
          { userId: USER_ID, _count: { _all: 20 } },
          { userId: OTHER_USER_ID, _count: { _all: 15 } },
        ])
        .mockResolvedValueOnce([
          { userId: USER_ID, _count: { _all: 15 } },
          { userId: OTHER_USER_ID, _count: { _all: 10 } },
        ]);
      redisClient.zrevrank.mockResolvedValue(0);
      redisClient.zscore.mockResolvedValue('15');

      const result = await service.getLeaderboard('weekly', USER_ID);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]!.rank).toBe(1);
      expect(result.entries[0]!.name).toBe('Alice');
      expect(result.entries[0]!.score).toBe(15);
      expect(result.entries[1]!.rank).toBe(2);
      expect(result.entries[1]!.name).toBe('Bob');
      expect(result.entries[1]!.score).toBe(10);
    });

    it('returns "Unknown" for users not found in database', async () => {
      redisClient.zrevrange.mockResolvedValue([USER_ID, '5']);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('alltime', USER_ID);

      expect(result.entries[0]!.name).toBe('Unknown');
    });

    it('includes currentUser rank and score when user has entries', async () => {
      redisClient.zrevrange.mockResolvedValue([]);
      redisClient.zrevrank.mockResolvedValue(4);
      redisClient.zscore.mockResolvedValue('7');

      const result = await service.getLeaderboard('monthly', USER_ID);

      expect(result.currentUser.rank).toBe(5);
      expect(result.currentUser.score).toBe(7);
    });

    it('returns null rank and 0 score when user has no entries', async () => {
      redisClient.zrevrange.mockResolvedValue([]);
      redisClient.zrevrank.mockResolvedValue(null);
      redisClient.zscore.mockResolvedValue(null);

      const result = await service.getLeaderboard('weekly', USER_ID);

      expect(result.currentUser.rank).toBeNull();
      expect(result.currentUser.score).toBe(0);
    });

    it('uses correct Redis key for subject-specific leaderboard', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      await service.getLeaderboard('weekly', USER_ID, SUBJECT_ID);

      expect(redisClient.zrevrange).toHaveBeenCalledWith(
        `leaderboard:weekly:${SUBJECT_ID}`, 0, 19, 'WITHSCORES',
      );
    });

    it('uses correct Redis key for overall leaderboard', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      await service.getLeaderboard('monthly', USER_ID);

      expect(redisClient.zrevrange).toHaveBeenCalledWith(
        'leaderboard:monthly:all', 0, 19, 'WITHSCORES',
      );
    });

    it('respects custom limit parameter', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      await service.getLeaderboard('alltime', USER_ID, undefined, 5);

      expect(redisClient.zrevrange).toHaveBeenCalledWith(
        'leaderboard:alltime:all', 0, 4, 'WITHSCORES',
      );
    });

    it('returns period and subjectId in response', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      const result = await service.getLeaderboard('weekly', USER_ID, SUBJECT_ID);

      expect(result.period).toBe('weekly');
      expect(result.subjectId).toBe(SUBJECT_ID);
    });

    it('returns null subjectId when not filtered by subject', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      const result = await service.getLeaderboard('weekly', USER_ID);

      expect(result.subjectId).toBeNull();
    });

    it('returns empty entries when no scores exist', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      const result = await service.getLeaderboard('alltime', USER_ID);

      expect(result.entries).toEqual([]);
    });

    it('calculates accuracy as correct/total percentage', async () => {
      redisClient.zrevrange.mockResolvedValue([USER_ID, '8']);
      prisma.user.findMany.mockResolvedValue([
        { id: USER_ID, name: 'Alice' },
      ]);
      prisma.questionAttempt.groupBy
        .mockResolvedValueOnce([{ userId: USER_ID, _count: { _all: 10 } }])
        .mockResolvedValueOnce([{ userId: USER_ID, _count: { _all: 8 } }]);

      const result = await service.getLeaderboard('weekly', USER_ID);

      expect(result.entries[0]!.accuracy).toBe(80);
    });
  });

  // ─── resetWeekly ──────────────────────────────────────────────────

  describe('resetWeekly', () => {
    it('calls persistAndReset with "weekly" period', async () => {
      redisClient.scan.mockResolvedValue(['0', []]);

      await service.resetWeekly();

      expect(redisClient.scan).toHaveBeenCalledWith(
        '0', 'MATCH', 'leaderboard:weekly:*', 'COUNT', 100,
      );
    });

    it('persists standings to PostgreSQL before clearing Redis', async () => {
      redisClient.scan.mockResolvedValue([
        '0',
        ['leaderboard:weekly:all'],
      ]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([
        USER_ID, '10',
        OTHER_USER_ID, '5',
      ]);
      prisma.leaderboardEntry.findFirst.mockResolvedValue(null);
      prisma.leaderboardEntry.create.mockResolvedValue({});

      await service.resetWeekly();

      expect(prisma.leaderboardEntry.create).toHaveBeenCalledTimes(2);
      expect(prisma.leaderboardEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          subjectId: null,
          score: 10,
          period: 'WEEKLY',
        }),
      });
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('renames key to archive before reading for non-alltime periods', async () => {
      redisClient.scan.mockResolvedValue([
        '0',
        ['leaderboard:weekly:all'],
      ]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([]);

      await service.resetWeekly();

      expect(redisClient.rename).toHaveBeenCalledWith(
        'leaderboard:weekly:all',
        expect.stringContaining('leaderboard:weekly:all:archive:'),
      );
    });

    it('upserts with subject-specific composite key when subjectId present', async () => {
      redisClient.scan.mockResolvedValue([
        '0',
        [`leaderboard:weekly:${SUBJECT_ID}`],
      ]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([USER_ID, '12']);

      await service.resetWeekly();

      expect(prisma.leaderboardEntry.upsert).toHaveBeenCalledWith({
        where: {
          userId_subjectId_period: {
            userId: USER_ID,
            subjectId: SUBJECT_ID,
            period: 'WEEKLY',
          },
        },
        update: { score: 12 },
        create: {
          userId: USER_ID,
          subjectId: SUBJECT_ID,
          score: 12,
          period: 'WEEKLY',
        },
      });
    });

    it('handles multiple scan iterations (pagination)', async () => {
      redisClient.scan
        .mockResolvedValueOnce(['42', ['leaderboard:weekly:all']])
        .mockResolvedValueOnce(['0', [`leaderboard:weekly:${SUBJECT_ID}`]]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([]);

      await service.resetWeekly();

      expect(redisClient.scan).toHaveBeenCalledTimes(2);
    });

    it('updates existing leaderboard entry for overall (null subjectId)', async () => {
      redisClient.scan.mockResolvedValue([
        '0',
        ['leaderboard:weekly:all'],
      ]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([USER_ID, '20']);
      prisma.leaderboardEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        userId: USER_ID,
        score: 15,
      });

      await service.resetWeekly();

      expect(prisma.leaderboardEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { score: 20 },
      });
    });
  });

  // ─── resetMonthly ─────────────────────────────────────────────────

  describe('resetMonthly', () => {
    it('calls persistAndReset with "monthly" period', async () => {
      redisClient.scan.mockResolvedValue(['0', []]);

      await service.resetMonthly();

      expect(redisClient.scan).toHaveBeenCalledWith(
        '0', 'MATCH', 'leaderboard:monthly:*', 'COUNT', 100,
      );
    });

    it('persists standings with MONTHLY period label', async () => {
      redisClient.scan.mockResolvedValue([
        '0',
        ['leaderboard:monthly:all'],
      ]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([USER_ID, '30']);
      prisma.leaderboardEntry.findFirst.mockResolvedValue(null);
      prisma.leaderboardEntry.create.mockResolvedValue({});

      await service.resetMonthly();

      expect(prisma.leaderboardEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          period: 'MONTHLY',
          score: 30,
        }),
      });
    });

    it('cleans up archive keys after persisting', async () => {
      redisClient.scan.mockResolvedValue([
        '0',
        ['leaderboard:monthly:all'],
      ]);
      redisClient.rename.mockResolvedValue('OK');
      redisClient.zrevrange.mockResolvedValue([]);

      await service.resetMonthly();

      expect(redisClient.del).toHaveBeenCalled();
    });
  });

  // ─── buildKey (via public methods) ─────────────────────────────────

  describe('key format (via incrementScore)', () => {
    it('uses "all" suffix when no subjectId', async () => {
      await service.incrementScore(USER_ID);

      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:weekly:all', 1, USER_ID,
      );
    });

    it('uses numeric subjectId suffix', async () => {
      await service.incrementScore(USER_ID, 42);

      expect(redisPipeline.zincrby).toHaveBeenCalledWith(
        'leaderboard:weekly:42', 1, USER_ID,
      );
    });
  });
});
