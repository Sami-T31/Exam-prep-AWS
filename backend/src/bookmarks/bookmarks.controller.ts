import {
  Body,
  Controller,
  Delete,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto';

/**
 * All bookmark endpoints require authentication because bookmarks
 * are personal — each user has their own list.
 *
 * No @Public() decorator here means the global JwtAuthGuard
 * will require a valid access token on every request.
 */
@ApiTags('Bookmarks')
@Controller('bookmarks')
@ApiBearerAuth('access-token')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'List bookmarked questions for the current user' })
  @ApiQuery({ name: 'subjectId', required: false, type: Number })
  @ApiQuery({ name: 'gradeId', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('subjectId') subjectId?: number,
    @Query('gradeId') gradeId?: number,
  ) {
    return this.bookmarksService.findAll(
      user.id,
      subjectId ? Number(subjectId) : undefined,
      gradeId ? Number(gradeId) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Bookmark a question' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.create(user.id, dto.questionId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a bookmark' })
  @ApiParam({ name: 'id', type: String, description: 'Bookmark UUID' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookmarksService.remove(user.id, id);
  }
}
