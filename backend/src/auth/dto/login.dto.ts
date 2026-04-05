import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for POST /auth/login
 *
 * We only validate that the fields exist and are the right type.
 * We don't enforce password complexity here — the user already set their
 * password during registration. If they type it wrong, the auth service
 * rejects it with "invalid credentials", not a validation error.
 */
export class LoginDto {
  @ApiProperty({ example: 'abebe@example.com' })
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({ example: 'MyPassword1' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
