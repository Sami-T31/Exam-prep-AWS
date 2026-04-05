import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionsService } from './subscriptions.service';

const FREE_TIER_QUESTIONS_PER_SUBJECT = 10;

function createMockPrisma() {
  return {
    subscription: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    $queryRaw: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: MockPrisma;

  const USER_ID = 'user-abc-123';
  const SUBJECT_ID = 5;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new SubscriptionsService(prisma as never);
  });

  // -----------------------------------------------------------
  // getPlans
  // -----------------------------------------------------------
  describe('getPlans', () => {
    it('returns all available plans', () => {
      const plans = service.getPlans();

      expect(plans).toHaveLength(3);
    });

    it('includes MONTHLY, QUARTERLY, and YEARLY plan ids', () => {
      const plans = service.getPlans();
      const ids = plans.map((p) => p.id);

      expect(ids).toEqual(['MONTHLY', 'QUARTERLY', 'YEARLY']);
    });

    it('each plan has required pricing fields', () => {
      const plans = service.getPlans();

      for (const plan of plans) {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('currency', 'ETB');
        expect(plan).toHaveProperty('durationDays');
        expect(plan).toHaveProperty('description');
        expect(typeof plan.durationDays).toBe('number');
        expect(plan.durationDays).toBeGreaterThan(0);
      }
    });

    it('returns the same reference each call (static data)', () => {
      const first = service.getPlans();
      const second = service.getPlans();

      expect(first).toBe(second);
    });
  });

  // -----------------------------------------------------------
  // getStatus
  // -----------------------------------------------------------
  describe('getStatus', () => {
    it('returns isSubscribed true for an active subscription with future expiresAt', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'MONTHLY',
        expiresAt: futureDate,
        status: 'ACTIVE',
        userId: USER_ID,
      });

      const result = await service.getStatus(USER_ID);

      expect(result.isSubscribed).toBe(true);
    });

    it('returns plan and expiresAt details when subscribed', async () => {
      const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-2',
        plan: 'QUARTERLY',
        expiresAt: futureDate,
        status: 'ACTIVE',
        userId: USER_ID,
      });

      const result = await service.getStatus(USER_ID);

      expect(result.plan).toBe('QUARTERLY');
      expect(result.expiresAt).toBe(futureDate);
      expect(result.subscriptionId).toBe('sub-2');
    });

    it('returns isSubscribed false when no subscription exists', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getStatus(USER_ID);

      expect(result.isSubscribed).toBe(false);
      expect(result.plan).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.subscriptionId).toBeNull();
    });

    it('returns isSubscribed false when subscription is expired (findFirst returns null)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getStatus(USER_ID);

      expect(result.isSubscribed).toBe(false);
    });

    it('queries with correct userId, ACTIVE status, and future expiresAt filter', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await service.getStatus(USER_ID);

      expect(prisma.subscription.findFirst).toHaveBeenCalledTimes(1);
      const callArg = prisma.subscription.findFirst.mock.calls[0]?.[0] as {
        where: { userId: string; status: string; expiresAt: { gt: Date } };
        orderBy: { expiresAt: string };
      };
      expect(callArg.where.userId).toBe(USER_ID);
      expect(callArg.where.status).toBe('ACTIVE');
      expect(callArg.where.expiresAt.gt).toBeInstanceOf(Date);
      expect(callArg.orderBy).toEqual({ expiresAt: 'desc' });
    });
  });

  // -----------------------------------------------------------
  // hasFreeTierAccess
  // -----------------------------------------------------------
  describe('hasFreeTierAccess', () => {
    it('returns true for a subscribed user regardless of question count', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'MONTHLY',
        expiresAt: new Date(Date.now() + 86_400_000),
        status: 'ACTIVE',
        userId: USER_ID,
      });

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(true);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('returns true when distinct question count is below the limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(5) }]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(true);
    });

    it('returns false when distinct question count reaches the limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([
        { count: BigInt(FREE_TIER_QUESTIONS_PER_SUBJECT) },
      ]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(false);
    });

    it('returns false when distinct question count exceeds the limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([
        { count: BigInt(FREE_TIER_QUESTIONS_PER_SUBJECT + 3) },
      ]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(false);
    });

    it('returns true when no attempts exist (count is 0)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(true);
    });

    it('handles missing count gracefully (defaults to 0)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{}]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(true);
    });

    it('handles empty query result array gracefully', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(true);
    });

    it('returns true at exactly one below the limit (boundary)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([
        { count: BigInt(FREE_TIER_QUESTIONS_PER_SUBJECT - 1) },
      ]);

      const hasAccess = await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(hasAccess).toBe(true);
    });

    it('skips the raw query entirely for subscribed users', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'YEARLY',
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
        status: 'ACTIVE',
        userId: USER_ID,
      });

      await service.hasFreeTierAccess(USER_ID, SUBJECT_ID);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(0);
    });
  });

  // -----------------------------------------------------------
  // getFreeTierRemaining
  // -----------------------------------------------------------
  describe('getFreeTierRemaining', () => {
    it('returns -1 for a subscribed user (unlimited access)', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'YEARLY',
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
        status: 'ACTIVE',
        userId: USER_ID,
      });

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(-1);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('returns full limit when no attempts exist', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(FREE_TIER_QUESTIONS_PER_SUBJECT);
    });

    it('returns correct remaining count for partial usage', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(7) }]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(FREE_TIER_QUESTIONS_PER_SUBJECT - 7);
    });

    it('returns 0 when limit is exactly reached', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([
        { count: BigInt(FREE_TIER_QUESTIONS_PER_SUBJECT) },
      ]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(0);
    });

    it('returns 0 (not negative) when limit is exceeded', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([
        { count: BigInt(FREE_TIER_QUESTIONS_PER_SUBJECT + 5) },
      ]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(0);
    });

    it('handles missing count gracefully (defaults to full limit)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{}]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(FREE_TIER_QUESTIONS_PER_SUBJECT);
    });

    it('handles empty query result array gracefully', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(FREE_TIER_QUESTIONS_PER_SUBJECT);
    });

    it('returns 1 when one attempt remains (boundary)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([
        { count: BigInt(FREE_TIER_QUESTIONS_PER_SUBJECT - 1) },
      ]);

      const remaining = await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(remaining).toBe(1);
    });

    it('skips the raw query entirely for subscribed users', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'MONTHLY',
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        status: 'ACTIVE',
        userId: USER_ID,
      });

      await service.getFreeTierRemaining(USER_ID, SUBJECT_ID);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(0);
    });
  });
});
