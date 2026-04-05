import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebhookDto {
  @ApiProperty()
  @IsUUID()
  paymentId!: string;

  @ApiProperty()
  @IsString()
  providerReference!: string;

  @ApiProperty({ description: 'HMAC signature for webhook verification' })
  @IsString()
  @IsOptional()
  signature?: string;
}
