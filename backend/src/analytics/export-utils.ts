import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import type { AdminExportQueryDto } from './dto';

export interface ResolvedAdminExportParams {
  startDate: Date;
  endDate: Date;
  format: 'json' | 'ndjson';
  includePII: boolean;
  gzip: boolean;
}

export function resolveAdminExportParams(
  input: AdminExportQueryDto,
  now: Date = new Date(),
): ResolvedAdminExportParams {
  const resolvedEndDate = input.endDate ? new Date(input.endDate) : new Date(now);
  const resolvedStartDate = input.startDate
    ? new Date(input.startDate)
    : new Date(resolvedEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(resolvedStartDate.getTime())) {
    throw new BadRequestException('Invalid startDate');
  }
  if (Number.isNaN(resolvedEndDate.getTime())) {
    throw new BadRequestException('Invalid endDate');
  }
  if (resolvedStartDate > resolvedEndDate) {
    throw new BadRequestException('startDate must be earlier than endDate');
  }

  return {
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
    format: input.format ?? 'json',
    includePII: input.includePII ?? false,
    gzip: input.gzip ?? true,
  };
}

export function buildAnalyticsOptInUserFilter() {
  return {
    user: {
      consent: {
        is: {
          analyticsOptIn: true,
        },
      },
    },
  };
}

export function buildStableUserPublicId(
  userId: string,
  salt: string,
): string {
  const digest = createHmac('sha256', salt).update(userId).digest('hex');
  return `usr_${digest.slice(0, 24)}`;
}

export function toNdjsonLine(record: unknown): string {
  return `${JSON.stringify(record)}\n`;
}

