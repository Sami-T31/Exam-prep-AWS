import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { TopicsService } from './topics.service';
import { CreateTopicDto, UpdateTopicDto } from './dto';

@ApiTags('Admin - Topics')
@Controller('admin/topics')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
export class AdminTopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list topics (optional subjectId filter)' })
  @ApiQuery({ name: 'subjectId', required: false, type: Number })
  findAll(@Query('subjectId') subjectId?: number) {
    return this.topicsService.findAllAdmin(
      subjectId ? Number(subjectId) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create topic' })
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.createAdmin(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update topic' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.topicsService.updateAdmin(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete topic' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.topicsService.removeAdmin(id);
  }
}
