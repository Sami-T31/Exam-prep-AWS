import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule } from '../redis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './guards';
import { RolesGuard } from './guards';

/**
 * AuthModule — wires together all authentication components.
 *
 * Key design: guards are registered globally via APP_GUARD.
 * NestJS runs global guards in the order they're listed here:
 *   1. JwtAuthGuard runs first — checks if the user is authenticated
 *   2. RolesGuard runs second — checks if the user has the right role
 *
 * This means EVERY route is protected by default. To make a route
 * publicly accessible, you must explicitly add @Public() to it.
 */
@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,

    // Register JwtAuthGuard as a global guard.
    // APP_GUARD is a special NestJS token — any guard provided with
    // this token applies to ALL routes across all modules.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Register RolesGuard as a global guard (runs after JwtAuthGuard).
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [TokenService],
})
export class AuthModule {}
