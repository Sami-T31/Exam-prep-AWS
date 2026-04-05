import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { AdminVerifyDto, InitiatePaymentDto, WebhookDto } from './dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiate a payment. Returns payment details and provider-specific
   * instructions (payment URL for Telebirr/CBE Birr, bank details
   * for bank transfer).
   */
  @Post('initiate')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Initiate a payment for a subscription plan' })
  initiate(
    @CurrentUser() user: RequestUser,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiate(user.id, dto.plan, dto.method);
  }

  /**
   * Webhook endpoint for payment providers.
   * Public because the provider doesn't have our JWT tokens.
   *
   * In production, this should verify a signature/secret from the
   * provider to prevent fake confirmations.
   */
  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Payment provider webhook (confirms payment)' })
  handleWebhook(
    @Body() dto: WebhookDto,
    @Headers('x-webhook-signature') headerSignature?: string,
  ) {
    return this.paymentsService.handleWebhook(
      dto.paymentId,
      dto.providerReference,
      dto.signature ?? headerSignature,
    );
  }

  /**
   * Admin: verify/reject a bank transfer payment.
   */
  @Post(':id/verify')
  @ApiBearerAuth('access-token')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: verify or reject a bank transfer payment' })
  @ApiParam({ name: 'id', type: String })
  adminVerify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminVerifyDto,
  ) {
    return this.paymentsService.adminVerify(id, dto.isApproved, dto.notes);
  }

  /**
   * Admin: list all pending payments.
   */
  @Get('pending')
  @ApiBearerAuth('access-token')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: list pending payments awaiting verification' })
  listPending() {
    return this.paymentsService.listPending();
  }

  /**
   * User: get their payment history.
   */
  @Get('history')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get payment history for the current user' })
  getHistory(@CurrentUser() user: RequestUser) {
    return this.paymentsService.getUserPayments(user.id);
  }
}
