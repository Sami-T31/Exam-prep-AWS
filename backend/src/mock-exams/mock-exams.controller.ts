import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { MockExamsService } from './mock-exams.service';
import {
  CreateMockExamDto,
  CreateMockExamQuestionDto,
  SubmitMockExamDto,
  UpdateMockExamDto,
  UpdateMockExamQuestionDto,
} from './dto';

@ApiTags('Mock Exams')
@Controller('mock-exams')
@ApiBearerAuth('access-token')
export class MockExamsController {
  constructor(private readonly mockExamsService: MockExamsService) {}

  /**
   * List available mock exams. Public so students can browse
   * before deciding to start one.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List available mock exams' })
  @ApiQuery({ name: 'subjectId', required: false, type: Number })
  @ApiQuery({ name: 'gradeId', required: false, type: Number })
  findAll(
    @Query('subjectId') subjectId?: number,
    @Query('gradeId') gradeId?: number,
  ) {
    return this.mockExamsService.findAll(
      subjectId ? Number(subjectId) : undefined,
      gradeId ? Number(gradeId) : undefined,
    );
  }

  /**
   * Start a mock exam — creates an attempt and returns the questions.
   * Requires auth because we need to track who's taking the exam.
   */
  @Post(':id/start')
  @ApiOperation({
    summary: 'Start a mock exam (creates an attempt, returns questions)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.mockExamsService.start(id, user.id);
  }

  /**
   * Submit all answers for a mock exam attempt.
   * The :id here is the ATTEMPT id, not the exam id.
   */
  @Post('attempts/:id/submit')
  @ApiOperation({ summary: 'Submit all answers for a mock exam attempt' })
  @ApiParam({ name: 'id', type: String, description: 'Attempt UUID' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SubmitMockExamDto,
  ) {
    return this.mockExamsService.submit(id, user.id, dto);
  }

  @Get('attempts/history')
  @ApiOperation({
    summary: 'List current user mock exam attempts (latest first)',
  })
  history(@CurrentUser() user: RequestUser) {
    return this.mockExamsService.findUserAttempts(user.id);
  }

  /**
   * Review a completed attempt with all answers and explanations.
   * Only available after submission.
   */
  @Get('attempts/:id/review')
  @ApiOperation({ summary: 'Review a completed mock exam attempt' })
  @ApiParam({ name: 'id', type: String, description: 'Attempt UUID' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.mockExamsService.review(id, user.id);
  }

  /**
   * Admin: create a new mock exam.
   */
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: create a mock exam' })
  create(@Body() dto: CreateMockExamDto) {
    return this.mockExamsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: update a mock exam' })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMockExamDto,
  ) {
    return this.mockExamsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: soft delete a mock exam' })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mockExamsService.remove(id);
  }

  @Get(':id/questions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: get mock exam question editor data' })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  getQuestionEditorData(@Param('id', ParseUUIDPipe) id: string) {
    return this.mockExamsService.getQuestionEditorData(id);
  }

  @Post(':id/questions')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Admin: create and attach a mock-exam-only question',
  })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMockExamQuestionDto,
  ) {
    return this.mockExamsService.addQuestion(id, dto);
  }

  @Delete(':id/questions/:questionId')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Admin: remove question from mock exam and soft-delete it',
  })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  @ApiParam({ name: 'questionId', type: String, description: 'Question UUID' })
  removeQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.mockExamsService.removeQuestion(id, questionId);
  }

  @Patch(':id/questions/:questionId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: edit a mock exam question' })
  @ApiParam({ name: 'id', type: String, description: 'Mock exam UUID' })
  @ApiParam({ name: 'questionId', type: String, description: 'Question UUID' })
  updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateMockExamQuestionDto,
  ) {
    return this.mockExamsService.updateQuestion(id, questionId, dto);
  }
}
