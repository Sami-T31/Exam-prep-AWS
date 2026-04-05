import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import {
  WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS,
  WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT,
} from './progress-metrics';

@ApiTags('Progress & Stats')
@Controller('users/me/stats')
@ApiBearerAuth('access-token')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({
    summary: 'Get overall stats: accuracy, total attempts, streak',
  })
  @ApiQuery({
    name: 'timezoneOffsetMinutes',
    required: false,
    type: Number,
    description: 'Browser timezone offset in minutes (Date.getTimezoneOffset)',
  })
  getOverall(
    @CurrentUser() user: RequestUser,
    @Query('timezoneOffsetMinutes') timezoneOffsetMinutes?: string,
  ) {
    const parsedOffset =
      timezoneOffsetMinutes !== undefined
        ? Number(timezoneOffsetMinutes)
        : undefined;
    return this.progressService.getOverallStats(user.id, parsedOffset);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get per-subject progress, coverage, and accuracy' })
  getSubjects(@CurrentUser() user: RequestUser) {
    return this.progressService.getSubjectStats(user.id);
  }

  @Get('grades')
  @ApiOperation({ summary: 'Get grade-level accuracy and attempt counts' })
  getGrades(@CurrentUser() user: RequestUser) {
    return this.progressService.getGradeStats(user.id);
  }

  @Get('grades/:gradeId')
  @ApiOperation({ summary: 'Get per-subject breakdown for a specific grade' })
  @ApiParam({ name: 'gradeId', type: Number })
  getGradeDetail(
    @CurrentUser() user: RequestUser,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    return this.progressService.getGradeDetailStats(user.id, gradeId);
  }

  @Get('subjects/:subjectId')
  @ApiOperation({
    summary: 'Get per-topic progress and coverage within a subject',
  })
  @ApiParam({ name: 'subjectId', type: Number })
  getSubjectDetail(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return this.progressService.getSubjectDetailStats(user.id, subjectId);
  }

  @Get('weak-topics')
  @ApiOperation({
    summary: 'Get statistically weak topics (smoothed) below threshold',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    description: `Adjusted accuracy threshold percentage (default ${WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT})`,
  })
  @ApiQuery({
    name: 'minAttempts',
    required: false,
    type: Number,
    description: `Minimum attempts required per topic (default ${WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS})`,
  })
  getWeakTopics(
    @CurrentUser() user: RequestUser,
    @Query('threshold') threshold?: number,
    @Query('minAttempts') minAttempts?: number,
  ) {
    return this.progressService.getWeakTopics(
      user.id,
      threshold !== undefined
        ? Number(threshold)
        : WEAK_TOPIC_DEFAULT_THRESHOLD_PERCENT,
      minAttempts !== undefined
        ? Number(minAttempts)
        : WEAK_TOPIC_DEFAULT_MIN_ATTEMPTS,
    );
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get daily trend (attempt volume + accuracy)' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days back from today (default 14, max 90)',
  })
  getTrend(@CurrentUser() user: RequestUser, @Query('days') days?: number) {
    return this.progressService.getDailyTrend(
      user.id,
      days ? Number(days) : 14,
    );
  }
}
