import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';

@ApiTags('Admin - Subjects')
@Controller('admin/subjects')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
export class AdminSubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all subjects with stream IDs' })
  findAll() {
    return this.subjectsService.findAllAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create subject' })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.createAdmin(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update subject' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.updateAdmin(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete subject' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.removeAdmin(id);
  }
}
