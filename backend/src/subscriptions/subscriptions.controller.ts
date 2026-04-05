import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List available subscription plans with pricing' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('status')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user subscription status' })
  getStatus(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.getStatus(user.id);
  }

  @Get('free-tier/:subjectId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get remaining free questions for a subject' })
  @ApiParam({ name: 'subjectId', type: Number })
  getFreeTierRemaining(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return this.subscriptionsService.getFreeTierRemaining(user.id, subjectId);
  }
}
