import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import {
  TrackFeatureUsageDto,
  TrackSessionStartDto,
  UpdateConsentDto,
  UpsertVideoProgressDto,
} from './dto';

@ApiTags('Analytics')
@Controller()
@ApiBearerAuth('access-token')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('users/me/consent')
  @ApiOperation({ summary: 'Get the current user consent preferences' })
  getMyConsent(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getMyConsent(user.id);
  }

  @Put('users/me/consent')
  @ApiOperation({ summary: 'Update the current user consent preferences' })
  updateMyConsent(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateConsentDto,
  ) {
    return this.analyticsService.updateMyConsent(user.id, dto);
  }

  @Post('analytics/sessions/start')
  @ApiOperation({ summary: 'Start a tracked app session (consent-gated)' })
  trackSessionStart(
    @CurrentUser() user: RequestUser,
    @Body() dto: TrackSessionStartDto,
  ) {
    return this.analyticsService.trackSessionStart(user.id, dto);
  }

  @Post('analytics/sessions/:id/end')
  @ApiOperation({ summary: 'End a tracked app session (consent-gated)' })
  @ApiParam({ name: 'id', type: String })
  trackSessionEnd(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.analyticsService.trackSessionEnd(user.id, sessionId);
  }

  @Post('analytics/events')
  @ApiOperation({ summary: 'Track a feature usage event (consent-gated)' })
  trackFeatureEvent(
    @CurrentUser() user: RequestUser,
    @Body() dto: TrackFeatureUsageDto,
  ) {
    return this.analyticsService.trackFeatureEvent(user.id, dto);
  }

  @Put('analytics/video-progress')
  @ApiOperation({
    summary: 'Upsert video progress for the current user (consent-gated)',
  })
  upsertVideoProgress(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertVideoProgressDto,
  ) {
    return this.analyticsService.upsertVideoProgress(user.id, dto);
  }

  @Get('reports/me')
  @ApiOperation({
    summary: 'Get premium personalized study report for current user',
  })
  getMyReport(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getMyReport(user.id);
  }

  @Delete('users/me')
  @ApiOperation({ summary: 'Delete current user account and associated data' })
  deleteMyData(@CurrentUser() user: RequestUser) {
    return this.analyticsService.deleteMyAccount(user.id);
  }
}
