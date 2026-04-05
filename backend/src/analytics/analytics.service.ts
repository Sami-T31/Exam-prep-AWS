import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AppPlatform, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { once } from 'events';
import { PassThrough } from 'stream';
import { createGzip } from 'zlib';
import { Response } from 'express';
import { PrismaService } from '../prisma';
import {
  AdminExportQueryDto,
  TrackFeatureUsageDto,
  TrackSessionStartDto,
  UpdateConsentDto,
  UpsertVideoProgressDto,
} from './dto';
import {
  buildAnalyticsOptInUserFilter,
  buildStableUserPublicId,
  resolveAdminExportParams,
  ResolvedAdminExportParams,
  toNdjsonLine,
} from './export-utils';

const RAW_EVENT_RETENTION_DAYS = 90;
const PRIVACY_MIN_COHORT_SIZE = 50;
const EXPORT_PAGE_SIZE = 500;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private startOfUtcDay(date: Date): Date {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);
    return day;
  }

  private toPlatform(value: 'WEB' | 'MOBILE' | undefined): AppPlatform {
    if (value === 'MOBILE') return AppPlatform.MOBILE;
    return AppPlatform.WEB;
  }

  private async ensureConsent(userId: string) {
    const existing = await this.prisma.consent.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.consent.create({
      data: {
        userId,
        analyticsOptIn: false,
        personalizationOptIn: false,
        marketingOptIn: false,
      },
    });
  }

  async getMyConsent(userId: string) {
    return this.ensureConsent(userId);
  }

  async updateMyConsent(userId: string, dto: UpdateConsentDto) {
    await this.ensureConsent(userId);

    return this.prisma.consent.update({
      where: { userId },
      data: {
        ...(dto.analyticsOptIn !== undefined
          ? { analyticsOptIn: dto.analyticsOptIn }
          : {}),
        ...(dto.personalizationOptIn !== undefined
          ? { personalizationOptIn: dto.personalizationOptIn }
          : {}),
        ...(dto.marketingOptIn !== undefined
          ? { marketingOptIn: dto.marketingOptIn }
          : {}),
        ...(dto.acceptTermsNow ? { acceptedTermsAt: new Date() } : {}),
        ...(dto.acceptPrivacyNow ? { acceptedPrivacyAt: new Date() } : {}),
      },
    });
  }

  async trackSessionStart(userId: string, dto: TrackSessionStartDto) {
    const consent = await this.ensureConsent(userId);
    if (!consent.analyticsOptIn) {
      return {
        tracked: false,
        reason: 'analytics_opt_out',
      };
    }

    const session = await this.prisma.appSession.create({
      data: {
        userId,
        platform: this.toPlatform(dto.platform),
        appVersion: dto.appVersion?.trim() || null,
      },
      select: {
        id: true,
        startedAt: true,
        platform: true,
      },
    });

    return {
      tracked: true,
      session,
    };
  }

  async trackSessionEnd(userId: string, sessionId: string) {
    const consent = await this.ensureConsent(userId);
    if (!consent.analyticsOptIn) {
      return { tracked: false, reason: 'analytics_opt_out' };
    }

    const session = await this.prisma.appSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, endedAt: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found for current user');
    }

    if (session.endedAt) {
      return { tracked: true, alreadyEnded: true };
    }

    await this.prisma.appSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    return { tracked: true, ended: true };
  }

  async trackFeatureEvent(userId: string, dto: TrackFeatureUsageDto) {
    const consent = await this.ensureConsent(userId);
    if (!consent.analyticsOptIn) {
      return { tracked: false, reason: 'analytics_opt_out' };
    }

    await this.prisma.featureUsageEvent.create({
      data: {
        userId,
        eventName: dto.eventName.trim(),
        platform: this.toPlatform(dto.platform),
        metadata: dto.metadata
          ? (dto.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    return { tracked: true };
  }

  async upsertVideoProgress(userId: string, dto: UpsertVideoProgressDto) {
    const consent = await this.ensureConsent(userId);
    if (!consent.analyticsOptIn) {
      return { tracked: false, reason: 'analytics_opt_out' };
    }

    const completedAt = dto.percentComplete >= 100 ? new Date() : null;

    const progress = await this.prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId: dto.videoId,
        },
      },
      create: {
        userId,
        videoId: dto.videoId,
        secondsWatched: dto.secondsWatched,
        percentComplete: dto.percentComplete,
        lastPositionSec: dto.lastPositionSec,
        completedAt,
      },
      update: {
        secondsWatched: dto.secondsWatched,
        percentComplete: dto.percentComplete,
        lastPositionSec: dto.lastPositionSec,
        completedAt,
      },
      select: {
        id: true,
        videoId: true,
        secondsWatched: true,
        percentComplete: true,
        lastPositionSec: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    return { tracked: true, progress };
  }

  async streamAdminCollectedData(
    res: Response,
    input: AdminExportQueryDto,
  ): Promise<void> {
    const params = resolveAdminExportParams(input);
    const summary = await this.buildExportSummary(params);
    const generatedAt = new Date().toISOString();
    const filenameBase = `admin-analytics-export-${generatedAt.slice(0, 10)}.${params.format}`;
    const filename = params.gzip ? `${filenameBase}.gz` : filenameBase;
    const contentType =
      params.format === 'ndjson'
        ? 'application/x-ndjson; charset=utf-8'
        : 'application/json; charset=utf-8';

    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    const output = new PassThrough();
    output.on('error', (error) => {
      this.logger.error('Error while streaming admin export', error as Error);
    });

    if (params.gzip) {
      res.setHeader('Content-Encoding', 'gzip');
      output.pipe(createGzip()).pipe(res);
    } else {
      output.pipe(res);
    }

    try {
      if (params.format === 'ndjson') {
        await this.streamNdjsonExport(output, params, summary, generatedAt);
      } else {
        await this.streamJsonExport(output, params, summary, generatedAt);
      }
    } finally {
      output.end();
    }
  }

  private async streamJsonExport(
    output: PassThrough,
    params: ResolvedAdminExportParams,
    summary: Record<string, number>,
    generatedAt: string,
  ) {
    await this.writeChunk(
      output,
      JSON.stringify({
        schemaVersion: '1.0.0',
        generatedAt,
        params: {
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          format: params.format,
          includePII: params.includePII,
          gzip: params.gzip,
        },
        summary,
      }).slice(0, -1),
    );
    await this.writeChunk(output, ',"data":{');

    await this.streamJsonSection(output, 'users', () =>
      this.streamUsers(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'consentPreferences', () =>
      this.streamConsentPreferences(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'appSessions', () =>
      this.streamAppSessions(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'featureUsageEvents', () =>
      this.streamFeatureUsageEvents(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'videoProgress', () =>
      this.streamVideoProgress(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'questionAttempts', () =>
      this.streamQuestionAttempts(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'mockExamAttempts', () =>
      this.streamMockExamAttempts(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'bookmarks', () =>
      this.streamBookmarks(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'dailyActiveMetrics', () =>
      this.streamDailyActiveMetrics(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'signupRetentionMetrics', () =>
      this.streamSignupRetentionMetrics(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'topicAccuracyAggregates', () =>
      this.streamTopicAccuracyAggregates(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'questionMissAggregates', () =>
      this.streamQuestionMissAggregates(params),
    );
    await this.writeChunk(output, ',');
    await this.streamJsonSection(output, 'gradeRegionEngagementAggregates', () =>
      this.streamGradeRegionEngagementAggregates(params),
    );
    await this.writeChunk(output, '}}');
  }

  private async streamNdjsonExport(
    output: PassThrough,
    params: ResolvedAdminExportParams,
    summary: Record<string, number>,
    generatedAt: string,
  ) {
    await this.writeChunk(
      output,
      toNdjsonLine({
        type: 'metadata',
        schemaVersion: '1.0.0',
        generatedAt,
        params: {
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          format: params.format,
          includePII: params.includePII,
          gzip: params.gzip,
        },
        summary,
      }),
    );

    await this.streamNdjsonSection(output, 'users', this.streamUsers(params));
    await this.streamNdjsonSection(
      output,
      'consentPreferences',
      this.streamConsentPreferences(params),
    );
    await this.streamNdjsonSection(
      output,
      'appSessions',
      this.streamAppSessions(params),
    );
    await this.streamNdjsonSection(
      output,
      'featureUsageEvents',
      this.streamFeatureUsageEvents(params),
    );
    await this.streamNdjsonSection(
      output,
      'videoProgress',
      this.streamVideoProgress(params),
    );
    await this.streamNdjsonSection(
      output,
      'questionAttempts',
      this.streamQuestionAttempts(params),
    );
    await this.streamNdjsonSection(
      output,
      'mockExamAttempts',
      this.streamMockExamAttempts(params),
    );
    await this.streamNdjsonSection(
      output,
      'bookmarks',
      this.streamBookmarks(params),
    );
    await this.streamNdjsonSection(
      output,
      'dailyActiveMetrics',
      this.streamDailyActiveMetrics(params),
    );
    await this.streamNdjsonSection(
      output,
      'signupRetentionMetrics',
      this.streamSignupRetentionMetrics(params),
    );
    await this.streamNdjsonSection(
      output,
      'topicAccuracyAggregates',
      this.streamTopicAccuracyAggregates(params),
    );
    await this.streamNdjsonSection(
      output,
      'questionMissAggregates',
      this.streamQuestionMissAggregates(params),
    );
    await this.streamNdjsonSection(
      output,
      'gradeRegionEngagementAggregates',
      this.streamGradeRegionEngagementAggregates(params),
    );
  }

  private async streamJsonSection(
    output: PassThrough,
    key: string,
    iteratorFactory: () => AsyncGenerator<Record<string, unknown>>,
  ) {
    await this.writeChunk(output, `"${key}":[`);
    let first = true;
    for await (const row of iteratorFactory()) {
      if (!first) {
        await this.writeChunk(output, ',');
      }
      await this.writeChunk(output, JSON.stringify(row));
      first = false;
    }
    await this.writeChunk(output, ']');
  }

  private async streamNdjsonSection(
    output: PassThrough,
    section: string,
    iterator: AsyncGenerator<Record<string, unknown>>,
  ) {
    for await (const row of iterator) {
      await this.writeChunk(output, toNdjsonLine({ section, data: row }));
    }
  }

  private async writeChunk(output: PassThrough, chunk: string): Promise<void> {
    const canContinue = output.write(chunk);
    if (!canContinue) {
      await once(output, 'drain');
    }
  }

  private exportSalt(): string {
    return process.env.ANALYTICS_EXPORT_SALT || process.env.JWT_ACCESS_SECRET || '';
  }

  private userPublicId(userId: string): string {
    const salt = this.exportSalt();
    if (!salt) {
      throw new BadRequestException(
        'ANALYTICS_EXPORT_SALT or JWT_ACCESS_SECRET must be configured',
      );
    }
    return buildStableUserPublicId(userId, salt);
  }

  private userCreatedWindow(params: ResolvedAdminExportParams): Prisma.UserWhereInput {
    return {
      deletedAt: null,
      createdAt: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };
  }

  private async buildExportSummary(params: ResolvedAdminExportParams) {
    const consentFilter = buildAnalyticsOptInUserFilter();
    const [users, consentPreferences, appSessions, featureUsageEvents, videoProgress, questionAttempts, mockExamAttempts, bookmarks, dailyActiveMetrics, signupRetentionMetrics, topicAccuracyAggregates, questionMissAggregates, gradeRegionEngagementAggregates] =
      await Promise.all([
        this.prisma.user.count({
          where: this.userCreatedWindow(params),
        }),
        this.prisma.consent.count({
          where: {
            updatedAt: { gte: params.startDate, lte: params.endDate },
          },
        }),
        this.prisma.appSession.count({
          where: {
            startedAt: { gte: params.startDate, lte: params.endDate },
            ...consentFilter,
          },
        }),
        this.prisma.featureUsageEvent.count({
          where: {
            createdAt: { gte: params.startDate, lte: params.endDate },
            ...consentFilter,
          },
        }),
        this.prisma.videoProgress.count({
          where: {
            updatedAt: { gte: params.startDate, lte: params.endDate },
            ...consentFilter,
          },
        }),
        this.prisma.questionAttempt.count({
          where: {
            attemptedAt: { gte: params.startDate, lte: params.endDate },
            ...consentFilter,
          },
        }),
        this.prisma.mockExamAttempt.count({
          where: {
            startedAt: { gte: params.startDate, lte: params.endDate },
            ...consentFilter,
          },
        }),
        this.prisma.bookmark.count({
          where: {
            createdAt: { gte: params.startDate, lte: params.endDate },
            ...consentFilter,
          },
        }),
        this.prisma.dailyActiveMetric.count({
          where: { date: { gte: params.startDate, lte: params.endDate } },
        }),
        this.prisma.signupRetentionMetric.count({
          where: { cohortDate: { gte: params.startDate, lte: params.endDate } },
        }),
        this.prisma.topicAccuracyAggregate.count({
          where: { date: { gte: params.startDate, lte: params.endDate } },
        }),
        this.prisma.questionMissAggregate.count({
          where: { date: { gte: params.startDate, lte: params.endDate } },
        }),
        this.prisma.gradeRegionEngagementAggregate.count({
          where: { date: { gte: params.startDate, lte: params.endDate } },
        }),
      ]);

    return {
      users,
      consentPreferences,
      appSessions,
      featureUsageEvents,
      videoProgress,
      questionAttempts,
      mockExamAttempts,
      bookmarks,
      dailyActiveMetrics,
      signupRetentionMetrics,
      topicAccuracyAggregates,
      questionMissAggregates,
      gradeRegionEngagementAggregates,
    };
  }

  private async *streamUsers(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.user.findMany({
        where: this.userCreatedWindow(params),
        include: {
          consent: {
            select: {
              analyticsOptIn: true,
              personalizationOptIn: true,
              marketingOptIn: true,
              acceptedTermsAt: true,
              acceptedPrivacyAt: true,
            },
          },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const user of rows) {
        const consent = user.consent;
        const base = {
          userPublicId: this.userPublicId(user.id),
          role: user.role,
          region: user.region,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          consentPreferences: {
            analyticsOptIn: consent?.analyticsOptIn ?? false,
            personalizationOptIn: consent?.personalizationOptIn ?? false,
            marketingOptIn: consent?.marketingOptIn ?? false,
            acceptedTermsAt: consent?.acceptedTermsAt ?? null,
            acceptedPrivacyAt: consent?.acceptedPrivacyAt ?? null,
          },
        };

        if (params.includePII) {
          yield {
            ...base,
            userId: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          };
        } else {
          yield base;
        }
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamConsentPreferences(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.consent.findMany({
        where: {
          updatedAt: { gte: params.startDate, lte: params.endDate },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        yield {
          userPublicId: this.userPublicId(row.userId),
          analyticsOptIn: row.analyticsOptIn,
          personalizationOptIn: row.personalizationOptIn,
          marketingOptIn: row.marketingOptIn,
          acceptedTermsAt: row.acceptedTermsAt,
          acceptedPrivacyAt: row.acceptedPrivacyAt,
          updatedAt: row.updatedAt,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamAppSessions(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.appSession.findMany({
        where: {
          startedAt: { gte: params.startDate, lte: params.endDate },
          ...buildAnalyticsOptInUserFilter(),
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        yield {
          id: row.id,
          userPublicId: this.userPublicId(row.userId),
          startedAt: row.startedAt,
          endedAt: row.endedAt,
          platform: row.platform,
          appVersion: row.appVersion,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamFeatureUsageEvents(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.featureUsageEvent.findMany({
        where: {
          createdAt: { gte: params.startDate, lte: params.endDate },
          ...buildAnalyticsOptInUserFilter(),
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        yield {
          id: row.id,
          userPublicId: this.userPublicId(row.userId),
          eventName: row.eventName,
          metadata: row.metadata,
          platform: row.platform,
          createdAt: row.createdAt,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamVideoProgress(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.videoProgress.findMany({
        where: {
          updatedAt: { gte: params.startDate, lte: params.endDate },
          ...buildAnalyticsOptInUserFilter(),
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        yield {
          id: row.id,
          userPublicId: this.userPublicId(row.userId),
          videoId: row.videoId,
          secondsWatched: row.secondsWatched,
          percentComplete: row.percentComplete,
          lastPositionSec: row.lastPositionSec,
          completedAt: row.completedAt,
          updatedAt: row.updatedAt,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamQuestionAttempts(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.questionAttempt.findMany({
        where: {
          attemptedAt: { gte: params.startDate, lte: params.endDate },
          ...buildAnalyticsOptInUserFilter(),
        },
        include: {
          selectedOption: {
            select: {
              id: true,
              optionText: true,
            },
          },
          question: {
            select: {
              id: true,
              questionText: true,
              options: {
                select: {
                  id: true,
                  optionText: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        const correctOption = row.question.options.find((option) => option.isCorrect);
        yield {
          id: row.id,
          userPublicId: this.userPublicId(row.userId),
          questionId: row.questionId,
          questionText: row.question.questionText,
          selectedOptionId: row.selectedOptionId,
          selectedOptionText: row.selectedOption.optionText,
          correctOptionId: correctOption?.id ?? null,
          correctOptionText: correctOption?.optionText ?? null,
          isCorrect: row.isCorrect,
          timeSpentSeconds: row.timeSpentSeconds,
          attemptedAt: row.attemptedAt,
          mockExamAttemptId: row.mockExamAttemptId,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamMockExamAttempts(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.mockExamAttempt.findMany({
        where: {
          startedAt: { gte: params.startDate, lte: params.endDate },
          ...buildAnalyticsOptInUserFilter(),
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        yield {
          id: row.id,
          mockExamId: row.mockExamId,
          userPublicId: this.userPublicId(row.userId),
          startedAt: row.startedAt,
          completedAt: row.completedAt,
          score: row.score,
          total: row.total,
          timeSpentSeconds: row.timeSpentSeconds,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamBookmarks(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.bookmark.findMany({
        where: {
          createdAt: { gte: params.startDate, lte: params.endDate },
          ...buildAnalyticsOptInUserFilter(),
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;

      for (const row of rows) {
        yield {
          id: row.id,
          userPublicId: this.userPublicId(row.userId),
          questionId: row.questionId,
          createdAt: row.createdAt,
        };
      }
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamDailyActiveMetrics(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.dailyActiveMetric.findMany({
        where: {
          date: { gte: params.startDate, lte: params.endDate },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;
      for (const row of rows) yield row;
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamSignupRetentionMetrics(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.signupRetentionMetric.findMany({
        where: {
          cohortDate: { gte: params.startDate, lte: params.endDate },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;
      for (const row of rows) yield row;
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamTopicAccuracyAggregates(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.topicAccuracyAggregate.findMany({
        where: {
          date: { gte: params.startDate, lte: params.endDate },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;
      for (const row of rows) yield row;
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamQuestionMissAggregates(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.questionMissAggregate.findMany({
        where: {
          date: { gte: params.startDate, lte: params.endDate },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;
      for (const row of rows) yield row;
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private async *streamGradeRegionEngagementAggregates(
    params: ResolvedAdminExportParams,
  ): AsyncGenerator<Record<string, unknown>> {
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.gradeRegionEngagementAggregate.findMany({
        where: {
          date: { gte: params.startDate, lte: params.endDate },
        },
        orderBy: { id: 'asc' },
        take: EXPORT_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;
      for (const row of rows) yield row;
      cursor = rows[rows.length - 1]?.id;
    }
  }

  async deleteMyAccount(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.featureUsageEvent.deleteMany({ where: { userId } });
      await tx.appSession.deleteMany({ where: { userId } });
      await tx.videoProgress.deleteMany({ where: { userId } });
      await tx.consent.deleteMany({ where: { userId } });

      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });

      await tx.bookmark.deleteMany({ where: { userId } });
      await tx.questionAttempt.deleteMany({ where: { userId } });
      await tx.mockExamAttempt.deleteMany({ where: { userId } });
      await tx.leaderboardEntry.deleteMany({ where: { userId } });

      await tx.payment.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });
    });

    return { deleted: true };
  }

  async getMyReport(userId: string) {
    const [
      activeSubscription,
      consent,
      weakTopicsRows,
      totalAttempts,
      correctAttempts,
    ] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: 'desc' },
        select: {
          id: true,
          plan: true,
          expiresAt: true,
        },
      }),
      this.ensureConsent(userId),
      this.prisma.$queryRaw<
        Array<{
          topic_id: number;
          topic_name: string;
          subject_name: string;
          attempts: bigint;
          accuracy: number;
        }>
      >`
          SELECT
            t.id AS topic_id,
            t.name AS topic_name,
            s.name AS subject_name,
            COUNT(*)::bigint AS attempts,
            ROUND(
              COUNT(*) FILTER (WHERE qa.is_correct = true)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
              2
            ) AS accuracy
          FROM question_attempts qa
          JOIN questions q ON qa.question_id = q.id
          JOIN topics t ON q.topic_id = t.id
          JOIN subjects s ON t.subject_id = s.id
          WHERE qa.user_id = ${userId}
          GROUP BY t.id, t.name, s.name
          HAVING COUNT(*) >= 3
          ORDER BY accuracy ASC
          LIMIT 5
        `,
      this.prisma.questionAttempt.count({ where: { userId } }),
      this.prisma.questionAttempt.count({ where: { userId, isCorrect: true } }),
    ]);

    if (!activeSubscription) {
      throw new ForbiddenException(
        'Active subscription required for personalized report',
      );
    }

    if (!consent.personalizationOptIn) {
      return {
        personalizationEnabled: false,
        message:
          'Enable personalization in Privacy & Data settings to unlock your personalized study report.',
      };
    }

    const accuracy =
      totalAttempts > 0
        ? Math.round((correctAttempts / totalAttempts) * 10000) / 100
        : 0;

    const lowerBound = Math.max(35, Math.round(accuracy - 10));
    const upperBound = Math.min(99, Math.round(accuracy + 10));

    return {
      personalizationEnabled: true,
      weakTopics: weakTopicsRows.map((row) => ({
        topicId: row.topic_id,
        topicName: row.topic_name,
        subjectName: row.subject_name,
        attempts: Number(row.attempts),
        accuracy: Number(row.accuracy),
      })),
      predictedScoreRange: {
        minPercent: lowerBound,
        maxPercent: upperBound,
      },
      recommendedNextActions: [
        'Practice your weakest topics first (at least 10 focused questions each).',
        'Review explanations for every incorrect answer before moving on.',
        'Take one timed mock exam every 3 days and compare weak-topic trend.',
      ],
      suggestedDailyStudyMinutes:
        accuracy < 50 ? 90 : accuracy < 70 ? 75 : accuracy < 85 ? 60 : 45,
    };
  }

  async getAdminRetention(days: number = 30) {
    const safeDays = Math.max(7, Math.min(90, Math.floor(days)));
    const startDate = this.startOfUtcDay(new Date());
    startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));

    const [dailyMetrics, cohortMetrics, wauRows, mauRows] = await Promise.all([
      this.prisma.dailyActiveMetric.findMany({
        where: { date: { gte: startDate } },
        orderBy: [{ date: 'asc' }, { platform: 'asc' }],
      }),
      this.prisma.signupRetentionMetric.findMany({
        where: { cohortDate: { gte: startDate } },
        orderBy: [{ cohortDate: 'asc' }, { platform: 'asc' }],
      }),
      this.prisma.$queryRaw<Array<{ platform: AppPlatform; users: bigint }>>`
        SELECT platform, COUNT(DISTINCT user_id)::bigint AS users
        FROM app_sessions
        WHERE started_at >= NOW() - INTERVAL '7 days'
        GROUP BY platform
      `,
      this.prisma.$queryRaw<Array<{ platform: AppPlatform; users: bigint }>>`
        SELECT platform, COUNT(DISTINCT user_id)::bigint AS users
        FROM app_sessions
        WHERE started_at >= NOW() - INTERVAL '30 days'
        GROUP BY platform
      `,
    ]);

    const wauByPlatform = new Map(
      wauRows.map((row) => [row.platform, Number(row.users)]),
    );
    const mauByPlatform = new Map(
      mauRows.map((row) => [row.platform, Number(row.users)]),
    );

    return {
      generatedAt: new Date().toISOString(),
      retention: {
        daily: dailyMetrics,
        cohorts: cohortMetrics,
      },
      activeUsers: {
        WEB: {
          wau: wauByPlatform.get(AppPlatform.WEB) ?? 0,
          mau: mauByPlatform.get(AppPlatform.WEB) ?? 0,
        },
        MOBILE: {
          wau: wauByPlatform.get(AppPlatform.MOBILE) ?? 0,
          mau: mauByPlatform.get(AppPlatform.MOBILE) ?? 0,
        },
      },
    };
  }

  async getAdminAggregates() {
    const latestDate = await this.prisma.dailyActiveMetric.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!latestDate) {
      return {
        generatedAt: new Date().toISOString(),
        privacyThreshold: PRIVACY_MIN_COHORT_SIZE,
        averageAccuracyPerTopic: [],
        mostMissedQuestions: [],
        engagementByGradeAndRegion: [],
        completionRates: [],
      };
    }

    const date = latestDate.date;

    const [topicAccuracy, mostMissed, engagementRows] = await Promise.all([
      this.prisma.topicAccuracyAggregate.findMany({
        where: {
          date,
          cohortSize: { gte: PRIVACY_MIN_COHORT_SIZE },
        },
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              subject: { select: { name: true } },
            },
          },
          grade: {
            select: { gradeNumber: true },
          },
        },
        orderBy: [{ accuracyPercent: 'asc' }],
        take: 100,
      }),
      this.prisma.questionMissAggregate.findMany({
        where: {
          date,
          cohortSize: { gte: PRIVACY_MIN_COHORT_SIZE },
        },
        include: {
          question: {
            select: {
              id: true,
              questionText: true,
              topic: {
                select: {
                  name: true,
                  subject: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ missRatePercent: 'desc' }, { attemptCount: 'desc' }],
        take: 50,
      }),
      this.prisma.gradeRegionEngagementAggregate.findMany({
        where: {
          date,
          cohortSize: { gte: PRIVACY_MIN_COHORT_SIZE },
        },
        include: {
          grade: { select: { gradeNumber: true } },
        },
        orderBy: [{ grade: { gradeNumber: 'asc' } }, { region: 'asc' }],
      }),
    ]);

    const completionByGrade = new Map<number, Array<number>>();
    for (const row of engagementRows) {
      const list = completionByGrade.get(row.grade.gradeNumber) ?? [];
      list.push(row.completionRatePct);
      completionByGrade.set(row.grade.gradeNumber, list);
    }

    const completionRates = Array.from(completionByGrade.entries())
      .map(([gradeNumber, values]) => ({
        gradeNumber,
        completionRatePct:
          values.length > 0
            ? Math.round(
                (values.reduce((sum, value) => sum + value, 0) /
                  values.length) *
                  100,
              ) / 100
            : 0,
      }))
      .sort((a, b) => a.gradeNumber - b.gradeNumber);

    return {
      generatedAt: new Date().toISOString(),
      date,
      privacyThreshold: PRIVACY_MIN_COHORT_SIZE,
      averageAccuracyPerTopic: topicAccuracy.map((row) => ({
        topicId: row.topicId,
        topicName: row.topic.name,
        subjectName: row.topic.subject.name,
        gradeNumber: row.grade.gradeNumber,
        accuracyPercent: row.accuracyPercent,
        cohortSize: row.cohortSize,
        attempts: row.attemptCount,
      })),
      mostMissedQuestions: mostMissed.map((row) => ({
        questionId: row.questionId,
        questionText: row.question.questionText,
        subjectName: row.question.topic.subject.name,
        topicName: row.question.topic.name,
        missRatePercent: row.missRatePercent,
        missCount: row.missCount,
        attempts: row.attemptCount,
        cohortSize: row.cohortSize,
      })),
      engagementByGradeAndRegion: engagementRows.map((row) => ({
        gradeNumber: row.grade.gradeNumber,
        region: row.region,
        cohortSize: row.cohortSize,
        sessionCount: row.sessionCount,
        completionRatePct: row.completionRatePct,
      })),
      completionRates,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyAnalyticsGovernanceJobs() {
    this.logger.log('Starting daily analytics governance jobs');
    await this.cleanupRawEvents();
    await this.recomputeAggregateTables();
    this.logger.log('Completed daily analytics governance jobs');
  }

  async cleanupRawEvents() {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - RAW_EVENT_RETENTION_DAYS);

    await this.prisma.$transaction([
      this.prisma.appSession.deleteMany({
        where: { startedAt: { lt: cutoff } },
      }),
      this.prisma.featureUsageEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
      this.prisma.videoProgress.deleteMany({
        where: { completedAt: { not: null, lt: cutoff } },
      }),
    ]);

    return { deletedOlderThan: cutoff.toISOString() };
  }

  async recomputeAggregateTables() {
    await Promise.all([
      this.recomputeDailyActiveMetrics(),
      this.recomputeSignupRetentionMetrics(),
      this.recomputeTopicAccuracyAggregates(),
      this.recomputeQuestionMissAggregates(),
      this.recomputeGradeRegionEngagementAggregates(),
    ]);
  }

  private async recomputeDailyActiveMetrics() {
    const start = this.startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - 60);

    const rows = await this.prisma.$queryRaw<
      Array<{
        day: Date;
        platform: AppPlatform;
        total_sessions: bigint;
        unique_users: bigint;
        avg_duration_seconds: number | null;
      }>
    >`
      SELECT
        DATE(started_at AT TIME ZONE 'UTC') AS day,
        platform,
        COUNT(*)::bigint AS total_sessions,
        COUNT(DISTINCT user_id)::bigint AS unique_users,
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, started_at) - started_at))) AS avg_duration_seconds
      FROM app_sessions
      WHERE started_at >= ${start}
      GROUP BY DATE(started_at AT TIME ZONE 'UTC'), platform
    `;

    await this.prisma.dailyActiveMetric.deleteMany({
      where: { date: { gte: start } },
    });

    if (rows.length === 0) return;

    await this.prisma.dailyActiveMetric.createMany({
      data: rows.map((row) => {
        const totalSessions = Number(row.total_sessions);
        const uniqueUsers = Number(row.unique_users);
        const avgSessionsPerUser =
          uniqueUsers > 0
            ? Math.round((totalSessions / uniqueUsers) * 100) / 100
            : 0;

        return {
          date: this.startOfUtcDay(new Date(row.day)),
          platform: row.platform,
          totalSessions,
          uniqueActiveUsers: uniqueUsers,
          averageSessionsPerUser: avgSessionsPerUser,
          averageSessionDurationSec:
            row.avg_duration_seconds !== null
              ? Math.round(row.avg_duration_seconds * 100) / 100
              : 0,
        };
      }),
    });
  }

  private async recomputeSignupRetentionMetrics() {
    const start = this.startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - 90);

    const cohorts = await this.prisma.$queryRaw<
      Array<{ cohort_date: Date; platform: AppPlatform; user_id: string }>
    >`
      SELECT DISTINCT
        DATE(u.created_at AT TIME ZONE 'UTC') AS cohort_date,
        s.platform,
        u.id AS user_id
      FROM users u
      JOIN app_sessions s ON s.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND u.created_at >= ${start}
    `;

    const cohortMap = new Map<string, Set<string>>();
    for (const row of cohorts) {
      const key = `${new Date(row.cohort_date).toISOString().slice(0, 10)}:${row.platform}`;
      const set = cohortMap.get(key) ?? new Set<string>();
      set.add(row.user_id);
      cohortMap.set(key, set);
    }

    await this.prisma.signupRetentionMetric.deleteMany({
      where: { cohortDate: { gte: start } },
    });

    for (const [key, users] of cohortMap.entries()) {
      const [cohortDateText, platformText] = key.split(':');
      if (!cohortDateText || !platformText) continue;
      const platform =
        platformText === AppPlatform.MOBILE
          ? AppPlatform.MOBILE
          : AppPlatform.WEB;
      const cohortDate = this.startOfUtcDay(new Date(cohortDateText));
      const cohortSize = users.size;
      if (cohortSize === 0) continue;

      const ids = Array.from(users);

      const [day1, day7, day30] = await Promise.all([
        this.countRetainedUsers(ids, platform, cohortDate, 1),
        this.countRetainedUsers(ids, platform, cohortDate, 7),
        this.countRetainedUsers(ids, platform, cohortDate, 30),
      ]);

      await this.prisma.signupRetentionMetric.create({
        data: {
          cohortDate,
          platform,
          cohortSize,
          day1RetentionPct: Math.round((day1 / cohortSize) * 10000) / 100,
          day7RetentionPct: Math.round((day7 / cohortSize) * 10000) / 100,
          day30RetentionPct: Math.round((day30 / cohortSize) * 10000) / 100,
        },
      });
    }
  }

  private async countRetainedUsers(
    userIds: string[],
    platform: AppPlatform,
    cohortDate: Date,
    afterDays: number,
  ): Promise<number> {
    const start = new Date(cohortDate);
    start.setUTCDate(start.getUTCDate() + afterDays);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const rows = await this.prisma.appSession.findMany({
      where: {
        userId: { in: userIds },
        platform,
        startedAt: { gte: start, lt: end },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return rows.length;
  }

  private async recomputeTopicAccuracyAggregates() {
    const start = this.startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - 30);

    const rows = await this.prisma.$queryRaw<
      Array<{
        day: Date;
        topic_id: number;
        grade_id: number;
        cohort_size: bigint;
        attempt_count: bigint;
        accuracy_percent: number;
      }>
    >`
      SELECT
        DATE(qa.attempted_at AT TIME ZONE 'UTC') AS day,
        q.topic_id,
        q.grade_id,
        COUNT(DISTINCT qa.user_id)::bigint AS cohort_size,
        COUNT(*)::bigint AS attempt_count,
        ROUND(AVG(CASE WHEN qa.is_correct THEN 100 ELSE 0 END)::numeric, 2) AS accuracy_percent
      FROM question_attempts qa
      JOIN questions q ON qa.question_id = q.id
      WHERE qa.attempted_at >= ${start}
      GROUP BY DATE(qa.attempted_at AT TIME ZONE 'UTC'), q.topic_id, q.grade_id
    `;

    await this.prisma.topicAccuracyAggregate.deleteMany({
      where: { date: { gte: start } },
    });

    if (rows.length === 0) return;

    await this.prisma.topicAccuracyAggregate.createMany({
      data: rows.map((row) => ({
        date: this.startOfUtcDay(new Date(row.day)),
        topicId: row.topic_id,
        gradeId: row.grade_id,
        cohortSize: Number(row.cohort_size),
        attemptCount: Number(row.attempt_count),
        accuracyPercent: Number(row.accuracy_percent),
      })),
    });
  }

  private async recomputeQuestionMissAggregates() {
    const start = this.startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - 30);

    const rows = await this.prisma.$queryRaw<
      Array<{
        day: Date;
        question_id: string;
        cohort_size: bigint;
        attempt_count: bigint;
        miss_count: bigint;
        miss_rate_percent: number;
      }>
    >`
      SELECT
        DATE(qa.attempted_at AT TIME ZONE 'UTC') AS day,
        qa.question_id,
        COUNT(DISTINCT qa.user_id)::bigint AS cohort_size,
        COUNT(*)::bigint AS attempt_count,
        COUNT(*) FILTER (WHERE qa.is_correct = false)::bigint AS miss_count,
        ROUND(
          COUNT(*) FILTER (WHERE qa.is_correct = false)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
          2
        ) AS miss_rate_percent
      FROM question_attempts qa
      WHERE qa.attempted_at >= ${start}
      GROUP BY DATE(qa.attempted_at AT TIME ZONE 'UTC'), qa.question_id
    `;

    await this.prisma.questionMissAggregate.deleteMany({
      where: { date: { gte: start } },
    });

    if (rows.length === 0) return;

    await this.prisma.questionMissAggregate.createMany({
      data: rows.map((row) => ({
        date: this.startOfUtcDay(new Date(row.day)),
        questionId: row.question_id,
        cohortSize: Number(row.cohort_size),
        attemptCount: Number(row.attempt_count),
        missCount: Number(row.miss_count),
        missRatePercent: Number(row.miss_rate_percent),
      })),
    });
  }

  private async recomputeGradeRegionEngagementAggregates() {
    const start = this.startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - 30);

    const rows = await this.prisma.$queryRaw<
      Array<{
        day: Date;
        grade_id: number;
        region: string;
        cohort_size: bigint;
        session_count: bigint;
        completion_rate_pct: number;
      }>
    >`
      SELECT
        DATE(s.started_at AT TIME ZONE 'UTC') AS day,
        q.grade_id,
        COALESCE(NULLIF(u.region, ''), 'UNKNOWN') AS region,
        COUNT(DISTINCT s.user_id)::bigint AS cohort_size,
        COUNT(s.id)::bigint AS session_count,
        ROUND(
          (COUNT(DISTINCT CASE WHEN qa.is_correct = true THEN qa.user_id END)::numeric /
            NULLIF(COUNT(DISTINCT s.user_id)::numeric, 0)) * 100,
          2
        ) AS completion_rate_pct
      FROM app_sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN question_attempts qa ON qa.user_id = s.user_id
        AND DATE(qa.attempted_at AT TIME ZONE 'UTC') = DATE(s.started_at AT TIME ZONE 'UTC')
      LEFT JOIN questions q ON q.id = qa.question_id
      WHERE s.started_at >= ${start}
        AND q.grade_id IS NOT NULL
      GROUP BY DATE(s.started_at AT TIME ZONE 'UTC'), q.grade_id, COALESCE(NULLIF(u.region, ''), 'UNKNOWN')
    `;

    await this.prisma.gradeRegionEngagementAggregate.deleteMany({
      where: { date: { gte: start } },
    });

    if (rows.length === 0) return;

    await this.prisma.gradeRegionEngagementAggregate.createMany({
      data: rows.map((row) => ({
        date: this.startOfUtcDay(new Date(row.day)),
        gradeId: row.grade_id,
        region: row.region,
        cohortSize: Number(row.cohort_size),
        sessionCount: Number(row.session_count),
        completionRatePct: Number(row.completion_rate_pct),
      })),
    });
  }
}
