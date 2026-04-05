import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from './subscriptions.service';

export const PREMIUM_KEY = 'isPremium';

/**
 * Guard that checks if the user has an active subscription.
 *
 * Applied to routes using @Premium() decorator. If the user is not
 * subscribed, returns 403 Forbidden with a message directing them
 * to subscribe.
 *
 * This runs AFTER JwtAuthGuard (authentication) so we're guaranteed
 * to have request.user available.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPremium = this.reflector.getAllAndOverride<boolean>(PREMIUM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPremium) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const status = await this.subscriptionsService.getStatus(user.id);

    if (!status.isSubscribed) {
      throw new ForbiddenException(
        'This feature requires an active subscription. Visit /subscriptions/plans to see available options.',
      );
    }

    return true;
  }
}
