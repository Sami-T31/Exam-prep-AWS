import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
@ApiBearerAuth('access-token')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overall')
  @ApiOperation({ summary: 'Get overall practice statistics' })
  @ApiQuery({ name: 'timezoneOffsetMinutes', required: false, type: Number })
  getOverall(
    @CurrentUser() user: RequestUser,
    @Query('timezoneOffsetMinutes') timezoneOffsetMinutes?: string,
  ) {
    const offset =
      timezoneOffsetMinutes !== undefined
        ? Number(timezoneOffsetMinutes)
        : undefined;
    return this.statsService.getOverall(user.id, offset);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get per-subject statistics' })
  getSubjects(@CurrentUser() user: RequestUser) {
    return this.statsService.getSubjects(user.id);
  }

  @Get('subjects/:subjectId')
  @ApiOperation({ summary: 'Get detailed stats for a single subject' })
  getSubjectDetail(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return this.statsService.getSubjectDetail(user.id, subjectId);
  }

  @Get('grades')
  @ApiOperation({ summary: 'Get stats grouped by grade level' })
  getGrades(@CurrentUser() user: RequestUser) {
    return this.statsService.getGrades(user.id);
  }

  @Get('grades/:gradeId')
  @ApiOperation({ summary: 'Get stats for a single grade' })
  getGradeDetail(
    @CurrentUser() user: RequestUser,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    return this.statsService.getGradeDetail(user.id, gradeId);
  }

  @Get('weak-topics')
  @ApiOperation({ summary: 'Get topics where accuracy is below threshold' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiQuery({ name: 'minAttempts', required: false, type: Number })
  getWeakTopics(
    @CurrentUser() user: RequestUser,
    @Query('threshold') threshold?: string,
    @Query('minAttempts') minAttempts?: string,
  ) {
    return this.statsService.getWeakTopics(
      user.id,
      threshold !== undefined ? Number(threshold) : 50.0,
      minAttempts !== undefined ? Number(minAttempts) : 3,
    );
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get daily practice trend data' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getTrend(
    @CurrentUser() user: RequestUser,
    @Query('days') days?: string,
  ) {
    return this.statsService.getTrend(
      user.id,
      days ? Number(days) : 14,
    );
  }
}
