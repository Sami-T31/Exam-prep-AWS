import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

const SUBSCRIPTION_DURATION_DAYS = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
} as const;

type SubscriptionPlan = keyof typeof SUBSCRIPTION_DURATION_DAYS;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeSubscribers,
      newUsersThisWeek,
      totalQuestions,
      pendingPayments,
      mockExams,
      totalRevenueRaw,
      revenueLast30DaysRaw,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: weekAgo },
        },
      }),
      this.prisma.question.count({ where: { deletedAt: null } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.mockExam.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: monthAgo },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      activeSubscribers,
      newUsersThisWeek,
      totalQuestions,
      pendingPayments,
      mockExams,
      totalRevenueEtb: Number(totalRevenueRaw._sum.amount ?? 0),
      revenueLast30DaysEtb: Number(revenueLast30DaysRaw._sum.amount ?? 0),
    };
  }

  async listUsers(search?: string, limit = 20, offset = 0) {
    const query = search?.trim();
    const where = {
      deletedAt: null as null,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
              { phone: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          subscriptions: {
            where: {
              status: 'ACTIVE',
              expiresAt: { gt: new Date() },
            },
            select: {
              id: true,
              plan: true,
              status: true,
              expiresAt: true,
            },
            orderBy: { expiresAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              questionAttempts: true,
              mockExamAttempts: true,
              bookmarks: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    return {
      total,
      limit,
      offset,
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        activeSubscription: user.subscriptions[0] ?? null,
        counts: user._count,
      })),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            plan: true,
            status: true,
            startsAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            status: true,
            createdAt: true,
            verifiedAt: true,
          },
        },
        questionAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            questionId: true,
            isCorrect: true,
            attemptedAt: true,
            question: {
              select: {
                questionText: true,
                topic: {
                  select: {
                    name: true,
                    subject: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        mockExamAttempts: {
          orderBy: { startedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            score: true,
            total: true,
            startedAt: true,
            completedAt: true,
            mockExam: {
              select: {
                title: true,
                subject: { select: { name: true } },
                grade: { select: { gradeNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      ...user,
      payments: user.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  }

  async updateUserSubscription(
    userId: string,
    action: 'ACTIVATE' | 'DEACTIVATE',
    plan?: SubscriptionPlan,
    durationDays?: number,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (action === 'DEACTIVATE') {
      await this.prisma.subscription.updateMany({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        data: {
          status: 'CANCELLED',
          expiresAt: new Date(),
        },
      });

      return { message: 'Active subscriptions deactivated.' };
    }

    const selectedPlan: SubscriptionPlan = plan ?? 'MONTHLY';
    const selectedDurationDays =
      durationDays ?? SUBSCRIPTION_DURATION_DAYS[selectedPlan];

    if (selectedDurationDays < 1 || selectedDurationDays > 730) {
      throw new BadRequestException('durationDays must be between 1 and 730');
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + selectedDurationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
        data: {
          status: 'CANCELLED',
          expiresAt: now,
        },
      });

      await tx.subscription.create({
        data: {
          userId,
          plan: selectedPlan,
          status: 'ACTIVE',
          startsAt: now,
          expiresAt,
          paymentReference: 'admin-manual-activation',
        },
      });
    });

    return {
      message: 'Subscription activated.',
      plan: selectedPlan,
      expiresAt,
    };
  }
}
