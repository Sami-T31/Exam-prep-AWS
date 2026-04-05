import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertVideoProgressDto {
  @IsString()
  @MaxLength(120)
  videoId!: string;

  @IsInt()
  @Min(0)
  secondsWatched!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete!: number;

  @IsInt()
  @Min(0)
  lastPositionSec!: number;

  @IsOptional()
  @IsEnum(['WEB', 'MOBILE'])
  platform?: 'WEB' | 'MOBILE';
}
