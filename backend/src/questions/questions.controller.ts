import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { QuestionFilterDto, SubmitAnswerDto } from './dto';
import { QuestionsService } from './questions.service';

/**
 * Student-facing question endpoints.
 *
 * GET /questions — Browse questions (public, no auth required)
 * GET /questions/:id — View a single question (public)
 * POST /questions/:id/attempt — Submit an answer (requires auth)
 *
 * The attempt endpoint requires authentication because we need to
 * know which user is answering (for tracking their progress).
 */
@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List questions with pagination and optional filters' })
  findAll(@Query() filters: QuestionFilterDto) {
    return this.questionsService.findAll(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single question (correct answer hidden)' })
  @ApiParam({ name: 'id', type: String, description: 'Question UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.findOne(id);
  }

  @Post(':id/attempt')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit an answer to a question (auth required)' })
  @ApiParam({ name: 'id', type: String, description: 'Question UUID' })
  submitAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.questionsService.submitAnswer(
      id,
      user.id,
      dto.selectedOptionId,
      dto.timeSpentSeconds,
    );
  }
}
