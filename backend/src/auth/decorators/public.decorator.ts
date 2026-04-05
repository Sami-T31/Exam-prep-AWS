import { SetMetadata } from '@nestjs/common';

/**
 * A special key we use to tag routes that don't require authentication.
 * When the JwtAuthGuard runs, it checks for this metadata. If present,
 * it lets the request through without checking for a token.
 *
 * Usage:
 *   @Public()
 *   @Get('health')
 *   check() { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
