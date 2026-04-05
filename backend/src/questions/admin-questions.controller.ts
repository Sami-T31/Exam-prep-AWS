import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminQuestionFilterDto, CreateQuestionDto, ReviewQuestionDto, UpdateQuestionDto } from './dto';
import { QuestionsService } from './questions.service';

/**
 * Admin-only question management endpoints.
 *
 * @Roles('ADMIN') on the controller means every endpoint here
 * requires the user to have the ADMIN role. The global RolesGuard
 * checks this automatically — if a regular STUDENT user hits these
 * endpoints, they get a 403 Forbidden response.
 *
 * The route prefix 'admin/questions' clearly separates these from
 * student endpoints in the URL structure.
 */
@ApiTags('Admin - Questions')
@Controller('admin/questions')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
export class AdminQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List questions (all statuses) for admin review and management' })
  findAll(@Query() filters: AdminQuestionFilterDto) {
    return this.questionsService.findAllAdmin(filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new question with 4 options' })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question (partial update allowed)' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a question (sets deletedAt)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.softDelete(id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review a question: publish or request changes' })
  @ApiParam({ name: 'id', type: String })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewQuestionDto,
  ) {
    return this.questionsService.reviewQuestion(id, dto.action);
  }

  /**
   * Bulk import questions from a CSV file.
   *
   * @UseInterceptors(FileInterceptor('file')) tells NestJS to use
   * multer (a middleware library) to handle file uploads. The 'file'
   * parameter matches the form field name the client uses.
   *
   * @UploadedFile() gives us the uploaded file as a Buffer in memory.
   * We parse the CSV ourselves — no external CSV library needed for
   * this simple columnar format.
   *
   * The CSV format is documented in the API docs and the README.
   */
  @Post('bulk-import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file' },
      },
    },
  })
  @ApiOperation({ summary: 'Bulk import questions from CSV file' })
  async bulkImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a .csv file');
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Upload a CSV file only');
    }

    const content = file.buffer.toString('utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const header = lines[0]!.split(',').map((h) => h.trim().toLowerCase());

    const requiredColumns = [
      'questiontext',
      'difficulty',
      'topicid',
      'gradeid',
      'optiona',
      'optionb',
      'optionc',
      'optiond',
      'correctoption',
    ];

    const missing = requiredColumns.filter((col) => !header.includes(col));
    if (missing.length > 0) {
      throw new BadRequestException(`CSV is missing required columns: ${missing.join(', ')}`);
    }

    const rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      header.forEach((col, i) => {
        row[col] = values[i]?.trim() ?? '';
      });
      return {
        questionText: row['questiontext'] ?? '',
        explanation: row['explanation'] || undefined,
        difficulty: row['difficulty'] ?? '',
        topicId: parseInt(row['topicid'] ?? '0', 10),
        gradeId: parseInt(row['gradeid'] ?? '0', 10),
        year: row['year'] ? parseInt(row['year'], 10) : undefined,
        optionA: row['optiona'] ?? '',
        optionB: row['optionb'] ?? '',
        optionC: row['optionc'] ?? '',
        optionD: row['optiond'] ?? '',
        correctOption: row['correctoption'] ?? '',
      };
    });

    return this.questionsService.bulkImport(rows);
  }
}

/**
 * Simple CSV line parser that handles quoted fields.
 * Example: `"Hello, world",foo,bar` → ["Hello, world", "foo", "bar"]
 *
 * Production note: for very large files (10k+ rows), a streaming
 * CSV parser library would be more memory-efficient.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
