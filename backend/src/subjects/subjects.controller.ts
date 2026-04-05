import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { SubjectsService } from './subjects.service';

/**
 * ParseIntPipe: NestJS converts the `:id` URL parameter from a string
 * to an integer automatically. If someone passes "abc", it returns 400.
 */
@ApiTags('Subjects')
@Controller('subjects')
@Public()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all subjects with their stream memberships' })
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subject by ID with its topics grouped by grade' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.findOne(id);
  }
}
