import { SetMetadata } from '@nestjs/common';
import { PREMIUM_KEY } from './subscription.guard';

/**
 * Marks a route as requiring an active subscription.
 *
 * Usage:
 *   @Premium()
 *   @Get('advanced-analytics')
 *   getAdvancedAnalytics() { ... }
 *
 * When the SubscriptionGuard sees this metadata, it checks if the
 * requesting user has an active subscription. Free-tier users get
 * a 403 Forbidden response.
 */
export const Premium = () => SetMetadata(PREMIUM_KEY, true);
