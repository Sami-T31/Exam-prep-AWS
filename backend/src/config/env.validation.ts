import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsInt()
  @Min(1)
  BACKEND_PORT: number = 3001;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsNotEmpty()
  REDIS_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRY: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRY: string = '7d';

  @IsString()
  CORS_ORIGINS: string = '';

  @IsString()
  @IsOptional()
  PAYMENT_WEBHOOK_SECRET?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'unknown error';
        return `  ${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${messages}\n\nCheck your .env file against .env.example`,
    );
  }

  if (validated.NODE_ENV === Environment.PRODUCTION && !validated.CORS_ORIGINS) {
    throw new Error(
      'CORS_ORIGINS must be set in production (comma-separated list of allowed origins)',
    );
  }

  return validated;
}
