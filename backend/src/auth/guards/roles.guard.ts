import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators';
import { Request } from 'express';

/**
 * RolesGuard — checks if the authenticated user has the required role.
 *
 * How it works:
 * 1. Runs AFTER JwtAuthGuard (so request.user is already set)
 * 2. Reads the @Roles(...) metadata from the route
 * 3. If no @Roles() is set, allows any authenticated user
 * 4. If @Roles('ADMIN') is set, only allows users with role = ADMIN
 * 5. Throws 403 Forbidden (not 401) if the role doesn't match
 *
 * 401 vs 403:
 * - 401 Unauthorized = "I don't know who you are" (no valid token)
 * - 403 Forbidden = "I know who you are, but you're not allowed" (wrong role)
 *
 * This guard is also registered globally via APP_GUARD, so it runs on
 * every route automatically. Routes without @Roles() pass through freely.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator = any authenticated user is allowed
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string; role: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
