import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for POST /auth/forgot-password
 *
 * The user provides their email. If the email exists, we generate a
 * password reset token and (for now) log it to the console. In production,
 * this would send an email or SMS.
 *
 * We always return a success message even if the email doesn't exist —
 * this prevents attackers from discovering which emails are registered.
 */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'abebe@example.com' })
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
