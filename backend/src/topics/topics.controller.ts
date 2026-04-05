import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { TopicsService } from './topics.service';

/**
 * Topics are nested under subjects: GET /subjects/:subjectId/topics
 * The optional ?grade=12 query parameter lets the frontend filter
 * topics for a specific grade level.
 *
 * @Query('grade') reads the value from the URL query string.
 * ParseIntPipe converts it from string to number.
 * Making it optional (with `required: false`) means the parameter
 * can be omitted entirely — in that case all grades are returned.
 */
@ApiTags('Topics')
@Controller('subjects/:subjectId/topics')
@Public()
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({ summary: 'List topics for a subject, optionally filtered by grade' })
  @ApiParam({ name: 'subjectId', type: Number })
  @ApiQuery({ name: 'grade', required: false, type: Number, description: 'Grade ID to filter by' })
  findBySubject(
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @Query('grade') grade?: number,
  ) {
    const gradeId = grade !== undefined ? Number(grade) : undefined;
    return this.topicsService.findBySubject(subjectId, gradeId);
  }
}
