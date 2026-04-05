import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class TrackFeatureUsageDto {
  @IsString()
  @MaxLength(100)
  eventName!: string;

  @IsEnum(['WEB', 'MOBILE'])
  platform!: 'WEB' | 'MOBILE';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
