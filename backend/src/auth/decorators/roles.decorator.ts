import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for the allowed roles on a route.
 * The RolesGuard reads this to decide if the user's role is permitted.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator that specifies which roles can access a route.
 *
 * Usage:
 *   @Roles('ADMIN')
 *   @Delete('users/:id')
 *   deleteUser() { ... }
 *
 *   @Roles('ADMIN', 'STUDENT')  // either role is allowed
 *   @Get('dashboard')
 *   getDashboard() { ... }
 *
 * If no @Roles() decorator is present, the RolesGuard allows any
 * authenticated user through (the JwtAuthGuard already verified them).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
