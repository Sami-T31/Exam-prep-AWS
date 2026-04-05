import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { GradesService } from './grades.service';

@ApiTags('Grades')
@Controller('grades')
@Public()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  @ApiOperation({ summary: 'List all grade levels (9, 10, 11, 12)' })
  findAll() {
    return this.gradesService.findAll();
  }
}
