import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'] })
  @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY'])
  plan!: string;

  @ApiProperty({ enum: ['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'] })
  @IsEnum(['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'])
  method!: string;
}
