import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
const FREE_TIER_QUESTIONS_PER_SUBJECT = 10;

/**
 * Subscription plans with pricing in Ethiopian Birr.
 *
 * These are defined in code rather than the database because they
 * rarely change and don't need admin CRUD. If pricing becomes dynamic
 * (e.g., A/B testing different prices), move these to a database table.
 */
const PLANS = [
  {
    id: 'MONTHLY',
    name: 'Monthly',
    price: 0,
    currency: 'ETB',
    durationDays: 30,
    description: 'Unlimited access for 1 month',
  },
  {
    id: 'QUARTERLY',
    name: 'Quarterly',
    price: 0,
    currency: 'ETB',
    durationDays: 90,
    description: 'Unlimited access for 3 months',
  },
  {
    id: 'YEARLY',
    name: 'Yearly',
    price: 0,
    currency: 'ETB',
    durationDays: 365,
    description: 'Unlimited access for 1 year',
  },
];

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  getPlans() {
    return PLANS;
  }

  /**
   * Check a user's current subscription status.
   *
   * A subscription is "active" if:
   * 1. Its status is ACTIVE
   * 2. Its expiresAt is in the future
   *
   * If both conditions are false, the user is on the free tier.
   */
  async getStatus(userId: string) {
    const active = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (active) {
      return {
        isSubscribed: true,
        plan: active.plan,
        expiresAt: active.expiresAt,
        subscriptionId: active.id,
      };
    }

    return {
      isSubscribed: false,
      plan: null,
      expiresAt: null,
      subscriptionId: null,
    };
  }

  /**
   * Check if a user has exceeded the free tier question limit for a subject.
   *
   * This counts DISTINCT questions the user has attempted for the subject.
   * Re-attempts on the same question don't count against the limit.
   */
  async hasFreeTierAccess(userId: string, subjectId: number): Promise<boolean> {
    const sub = await this.getStatus(userId);
    if (sub.isSubscribed) return true;

    const distinctQuestions = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT qa.question_id)::bigint AS count
      FROM question_attempts qa
      JOIN questions q ON qa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      WHERE qa.user_id = ${userId}
        AND t.subject_id = ${subjectId}
    `;

    const count = Number(distinctQuestions[0]?.count ?? 0);
    return count < FREE_TIER_QUESTIONS_PER_SUBJECT;
  }

  /**
   * Get the number of remaining free questions for a subject.
   */
  async getFreeTierRemaining(userId: string, subjectId: number): Promise<number> {
    const sub = await this.getStatus(userId);
    if (sub.isSubscribed) return -1; // -1 means unlimited

    const distinctQuestions = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT qa.question_id)::bigint AS count
      FROM question_attempts qa
      JOIN questions q ON qa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      WHERE qa.user_id = ${userId}
        AND t.subject_id = ${subjectId}
    `;

    const count = Number(distinctQuestions[0]?.count ?? 0);
    return Math.max(0, FREE_TIER_QUESTIONS_PER_SUBJECT - count);
  }
}
