import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AnalyticsService } from './analytics.service';
import { resolveAdminExportParams } from './export-utils';

describe('AnalyticsService export streaming filters', () => {
  beforeEach(() => {
    process.env.ANALYTICS_EXPORT_SALT = 'unit-test-export-salt';
  });

  afterEach(() => {
    delete process.env.ANALYTICS_EXPORT_SALT;
  });

  it('uses consent filter to exclude opted-out users from app sessions export queries', async () => {
    const findMany: any = jest.fn();
    findMany.mockImplementation(async () => []);
    const prismaMock = {
      appSession: { findMany },
    };
    const service = new AnalyticsService(prismaMock as never);

    const params = resolveAdminExportParams({
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.000Z',
    });

    const iterator = (service as never as { streamAppSessions: (p: unknown) => AsyncGenerator<unknown> }).streamAppSessions(
      params,
    );
    await iterator.next();

    expect(findMany).toHaveBeenCalledTimes(1);
    const firstCall = findMany.mock.calls[0];
    expect(firstCall).toBeDefined();
    const callArg = firstCall?.[0] as { where: unknown };
    expect(callArg.where).toMatchObject({
      startedAt: {
        gte: new Date('2026-02-01T00:00:00.000Z'),
        lte: new Date('2026-02-28T23:59:59.000Z'),
      },
      user: {
        consent: {
          is: {
            analyticsOptIn: true,
          },
        },
      },
    });
  });
});
