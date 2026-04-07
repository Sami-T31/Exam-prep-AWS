import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('leaderboard')
@ApiBearerAuth('access-token')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Get leaderboard rankings.
   *
   * Query parameters:
   * - period: 'weekly' | 'monthly' | 'alltime' (default: weekly)
   * - subjectId: optional, filter by subject
   * - limit: how many entries to return (default: 20)
   *
   * The response always includes the requesting user's own rank
   * and score, even if they're not in the top N.
   */
  @Get()
  @ApiOperation({ summary: 'Get leaderboard rankings with your own rank' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'alltime'] })
  @ApiQuery({ name: 'subjectId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLeaderboard(
    @CurrentUser() user: RequestUser,
    @Query('period') period?: string,
    @Query('subjectId') subjectId?: number,
    @Query('limit') limit?: number,
  ) {
    // Normalize period: mobile sends WEEKLY/MONTHLY/ALL_TIME,
    // service expects weekly/monthly/alltime
    const normalized = (period ?? 'weekly')
      .toLowerCase()
      .replace('_', '') as string;
    return this.leaderboardService.getLeaderboard(
      normalized,
      user.id,
      subjectId ? Number(subjectId) : undefined,
      limit ? Number(limit) : 20,
    );
  }
}
