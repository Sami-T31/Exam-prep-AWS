import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma';

const PLAN_DURATIONS: Record<string, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

const PLAN_PRICES: Record<string, number> = {
  MONTHLY: 0,
  QUARTERLY: 0,
  YEARLY: 0,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!this.webhookSecret) {
      this.logger.warn(
        'PAYMENT_WEBHOOK_SECRET is not set — webhook endpoint will reject all external calls. ' +
        'Set this env var before connecting payment providers.',
      );
    }
  }

  /**
   * Initiate a payment for a subscription plan.
   *
   * Creates:
   * 1. A Subscription record with status PENDING
   * 2. A Payment record with status PENDING
   *
   * For Telebirr/CBE Birr, this would also generate a payment URL
   * or redirect the user to the provider's payment page.
   * For bank transfer, we return our bank details for the user.
   */
  async initiate(
    userId: string,
    plan: string,
    method: string,
  ) {
    if (!PLAN_DURATIONS[plan]) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    if (!['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'].includes(method)) {
      throw new BadRequestException(`Invalid payment method: ${method}`);
    }

    const amount = PLAN_PRICES[plan]!;
    if (amount <= 0) {
      this.logger.warn(
        `Plan "${plan}" has price ${amount} ETB — prices must be configured in PLAN_PRICES before production launch.`,
      );
    }

    const now = new Date();
    const durationDays = PLAN_DURATIONS[plan]!;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          plan: plan as any,
          status: 'PENDING',
          startsAt: now,
          expiresAt,
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amount,
          currency: 'ETB',
          method: method as any,
          status: 'PENDING',
        },
      });

      return { subscription, payment };
    });

    let providerResponse: Record<string, any> = {};

    if (method === 'TELEBIRR') {
      this.logger.warn(
        `[PLACEHOLDER] Telebirr payment initiation for payment ${result.payment.id}. ` +
        `Integrate with Telebirr API when merchant credentials are available.`,
      );
      providerResponse = {
        provider: 'TELEBIRR',
        status: 'PENDING_INTEGRATION',
        message: 'Telebirr integration pending — merchant credentials required.',
      };
    } else if (method === 'CBE_BIRR') {
      this.logger.warn(
        `[PLACEHOLDER] CBE Birr payment initiation for payment ${result.payment.id}. ` +
        `Integrate with CBE Birr API when credentials are available.`,
      );
      providerResponse = {
        provider: 'CBE_BIRR',
        status: 'PENDING_INTEGRATION',
        message: 'CBE Birr integration pending — API credentials required.',
      };
    } else if (method === 'BANK_TRANSFER') {
      providerResponse = {
        provider: 'BANK_TRANSFER',
        status: 'AWAITING_TRANSFER',
        message: 'Please transfer the amount to the bank account below and provide the reference number.',
        bankDetails: {
          bankName: '[PLACEHOLDER — set in production config]',
          accountNumber: '[PLACEHOLDER]',
          accountName: '[PLACEHOLDER]',
        },
      };
    }

    return {
      subscriptionId: result.subscription.id,
      paymentId: result.payment.id,
      plan,
      amount,
      currency: 'ETB',
      method,
      ...providerResponse,
    };
  }

  /**
   * Webhook handler for payment providers (Telebirr, CBE Birr).
   *
   * When a payment provider confirms a payment, they call this endpoint.
   * We verify the payment reference, update the payment status, and
   * activate the subscription.
   *
   * In production, this would also verify the webhook signature to
   * ensure the request really came from the payment provider.
   */
  async handleWebhook(paymentId: string, providerReference: string, signature?: string) {
    this.verifyWebhookSignature(paymentId, providerReference, signature);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'PENDING') {
      this.logger.warn(`Duplicate webhook for payment ${paymentId} — already ${payment.status}`);
      return { status: 'already_processed' };
    }

    await this.activatePayment(paymentId, providerReference);

    return { status: 'confirmed' };
  }

  private verifyWebhookSignature(paymentId: string, providerReference: string, signature?: string) {
    if (!this.webhookSecret) {
      throw new ForbiddenException(
        'Webhook endpoint is not configured — PAYMENT_WEBHOOK_SECRET must be set.',
      );
    }

    if (!signature) {
      throw new ForbiddenException('Missing webhook signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${paymentId}:${providerReference}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for payment ${paymentId}`);
      throw new ForbiddenException('Invalid webhook signature');
    }
  }

  /**
   * Admin: verify a bank transfer payment.
   *
   * The admin reviews the bank receipt/reference and either approves
   * or rejects the payment.
   */
  async adminVerify(paymentId: string, approved: boolean, adminNotes?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    if (approved) {
      await this.activatePayment(paymentId, `admin-approved:${adminNotes ?? ''}`);
      return { status: 'approved', message: 'Payment verified and subscription activated' };
    } else {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'FAILED', providerReference: `admin-rejected:${adminNotes ?? ''}` },
        }),
        this.prisma.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: 'CANCELLED' },
        }),
      ]);
      return { status: 'rejected', message: 'Payment rejected' };
    }
  }

  /**
   * List pending payments for admin review.
   */
  async listPending() {
    return this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        subscription: { select: { plan: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  /**
   * Get payment history for a user.
   */
  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: {
        subscription: { select: { plan: true, status: true, expiresAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private async activatePayment(paymentId: string, providerReference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          providerReference,
          verifiedAt: new Date(),
        },
      }),
      this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    this.logger.log(`Payment ${paymentId} confirmed, subscription activated`);
  }
}
