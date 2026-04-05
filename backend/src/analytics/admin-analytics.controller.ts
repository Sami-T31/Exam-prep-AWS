import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { AdminExportQueryDto } from './dto';

@ApiTags('Admin - Analytics')
@Controller('admin/analytics')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('retention')
  @ApiOperation({
    summary: 'Admin: retention and active-user analytics by platform',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getRetention(@Query('days') days?: number) {
    return this.analyticsService.getAdminRetention(days ? Number(days) : 30);
  }

  @Get('aggregates')
  @ApiOperation({
    summary:
      'Admin: privacy-safe institutional analytics (cohort threshold enforced)',
  })
  getAggregates() {
    return this.analyticsService.getAdminAggregates();
  }

  @Get('export')
  @ApiOperation({
    summary: 'Admin: export full collected analytics and governance dataset',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'ndjson'] })
  @ApiQuery({ name: 'includePII', required: false, type: Boolean })
  @ApiQuery({ name: 'gzip', required: false, type: Boolean })
  async exportAllCollectedData(
    @Query() query: AdminExportQueryDto,
    @Res() res: Response,
  ) {
    await this.analyticsService.streamAdminCollectedData(res, query);
  }
}
