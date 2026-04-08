import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Abebe Kebede' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    example: '+251912345678',
    description: 'Ethiopian phone number (+251… or 09… or 07…)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+251[1-9]\d{8}|0[79]\d{8})$/, {
    message:
      'Phone must be a valid Ethiopian number (e.g., +251912345678 or 0912345678)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  region?: string;
}
