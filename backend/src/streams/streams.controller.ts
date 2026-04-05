import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { StreamsService } from './streams.service';

@ApiTags('Streams')
@Controller('streams')
@Public()
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Get()
  @ApiOperation({ summary: 'List all academic streams with their subjects' })
  findAll() {
    return this.streamsService.findAll();
  }
}
