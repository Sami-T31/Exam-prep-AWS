import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
} from 'class-validator';

function toBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}

export class AdminExportQueryDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsIn(['json', 'ndjson'])
  format?: 'json' | 'ndjson';

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includePII?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  gzip?: boolean;
}
