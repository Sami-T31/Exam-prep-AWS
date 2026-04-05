import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

/**
 * PartialType takes CreateQuestionDto and makes every field optional.
 * This is the standard NestJS pattern for PATCH endpoints — you only
 * send the fields you want to change, everything else stays the same.
 *
 * Under the hood, PartialType copies all the validation decorators
 * from CreateQuestionDto but wraps each with @IsOptional().
 */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
