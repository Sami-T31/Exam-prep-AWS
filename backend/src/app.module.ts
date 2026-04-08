import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { resolve } from 'path';
import { validateEnvironment } from './config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AdminAuditInterceptor } from './common/interceptors/admin-audit.interceptor';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { CacheModule } from './common/cache';
import { AuthModule } from './auth/auth.module';
import { StreamsModule } from './streams/streams.module';
import { SubjectsModule } from './subjects/subjects.module';
import { GradesModule } from './grades/grades.module';
import { TopicsModule } from './topics/topics.module';
import { QuestionsModule } from './questions/questions.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { ProgressModule } from './progress/progress.module';
import { MockExamsModule } from './mock-exams/mock-exams.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StatsModule } from './stats/stats.module';
import { ConsentModule } from './consent/consent.module';
import { UsersModule } from './users/users.module';

const ROOT_ENV_PATH = resolve(__dirname, '..', '..', '.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: ROOT_ENV_PATH,
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    PrismaModule,
    RedisModule,
    CacheModule,

    AuthModule,

    StreamsModule,
    SubjectsModule,
    GradesModule,
    TopicsModule,
    QuestionsModule,
    BookmarksModule,
    ProgressModule,
    MockExamsModule,
    LeaderboardModule,
    SubscriptionsModule,
    PaymentsModule,
    AdminModule,
    AnalyticsModule,
    StatsModule,
    ConsentModule,
    UsersModule,

    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminAuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
