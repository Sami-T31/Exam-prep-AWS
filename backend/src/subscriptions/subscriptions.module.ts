import { Global, Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionGuard } from './subscription.guard';

/**
 * @Global because the SubscriptionGuard needs SubscriptionsService
 * and may be used in any module. Without @Global, every module that
 * uses @Premium() would need to import SubscriptionsModule.
 */
@Global()
@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionGuard],
  exports: [SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
