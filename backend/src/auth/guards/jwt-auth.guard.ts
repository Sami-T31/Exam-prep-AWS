import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators';
import { TokenService } from '../token.service';

/**
 * JwtAuthGuard — the main authentication gate for the entire API.
 *
 * How it works:
 * 1. For every incoming request, NestJS runs this guard BEFORE the controller.
 * 2. The guard checks: is this route marked @Public()? If yes, skip auth.
 * 3. Otherwise, look for an "Authorization: Bearer <token>" header.
 * 4. Verify the JWT signature and expiration.
 * 5. Attach the decoded user info to request.user.
 * 6. If anything fails, throw 401 Unauthorized.
 *
 * This guard is registered GLOBALLY in the AuthModule (via APP_GUARD),
 * meaning every route in the entire application is protected by default.
 * You must explicitly mark public routes with @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route or its controller class is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // Check the specific method first
      context.getClass(), // Then check the controller class
    ]);

    if (isPublic) {
      return true; // No auth needed
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const payload = this.tokenService.verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Attach the user to the request so controllers can access it
    // via @CurrentUser() or request.user
    (request as any).user = { id: payload.sub, role: payload.role };

    return true;
  }

  /**
   * Extract the JWT from the "Authorization: Bearer <token>" header.
   * Returns null if the header is missing or malformed.
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }
}
