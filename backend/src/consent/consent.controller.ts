import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from '../analytics/analytics.service';
import { UpdateConsentDto } from '../analytics/dto';

@ApiTags('Consent')
@Controller('consent')
@ApiBearerAuth('access-token')
export class ConsentController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user consent settings' })
  getConsent(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getMyConsent(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user consent settings' })
  updateConsent(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateConsentDto,
  ) {
    return this.analyticsService.updateMyConsent(user.id, dto);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account and all associated data' })
  deleteAccount(@CurrentUser() user: RequestUser) {
    return this.analyticsService.deleteMyAccount(user.id);
  }
}
