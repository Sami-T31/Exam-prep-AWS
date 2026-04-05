import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * The shape of the user object that the JwtAuthGuard attaches to the request.
 * This is a "lean" version — just the fields from the JWT payload plus
 * the database lookup. No sensitive data like passwordHash.
 */
export interface RequestUser {
  id: string;
  role: string;
}

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * How it works:
 * 1. The JwtAuthGuard verifies the JWT and attaches the user to request.user
 * 2. This decorator pulls request.user out and passes it to your method parameter
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: RequestUser) {
 *     return { userId: user.id };
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as RequestUser;
  },
);
