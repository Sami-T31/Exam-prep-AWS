import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for POST /auth/register
 *
 * class-validator decorators run automatically because we set up a global
 * ValidationPipe in main.ts. If any rule fails, NestJS returns 400 with
 * a list of what went wrong — our code never executes.
 */
export class RegisterDto {
  @ApiProperty({ example: 'Abebe Kebede', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiProperty({ example: 'abebe@example.com' })
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    example: '+251912345678',
    description: 'Ethiopian phone number (+251… or 09… or 07…)',
  })
  @IsString()
  @Matches(/^(\+251[1-9]\d{8}|0[79]\d{8})$/, {
    message:
      'Phone must be a valid Ethiopian number (e.g., +251912345678 or 0912345678)',
  })
  phone!: string;

  @ApiProperty({ example: 'MyPassword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  password!: string;
}
