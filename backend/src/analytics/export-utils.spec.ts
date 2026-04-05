import { describe, expect, it } from '@jest/globals';
import {
  buildAnalyticsOptInUserFilter,
  buildStableUserPublicId,
  resolveAdminExportParams,
  toNdjsonLine,
} from './export-utils';

describe('analytics export utils', () => {
  it('defaults includePII to false and date range to last 30 days', () => {
    const now = new Date('2026-03-03T12:00:00.000Z');
    const params = resolveAdminExportParams({}, now);

    expect(params.includePII).toBe(false);
    expect(params.format).toBe('json');
    expect(params.gzip).toBe(true);
    expect(params.endDate.toISOString()).toBe('2026-03-03T12:00:00.000Z');
    expect(params.startDate.toISOString()).toBe('2026-02-01T12:00:00.000Z');
  });

  it('resolves provided date filtering values', () => {
    const params = resolveAdminExportParams({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T23:59:59.000Z',
      format: 'ndjson',
      includePII: true,
      gzip: false,
    });

    expect(params.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(params.endDate.toISOString()).toBe('2026-01-31T23:59:59.000Z');
    expect(params.format).toBe('ndjson');
    expect(params.includePII).toBe(true);
    expect(params.gzip).toBe(false);
  });

  it('produces valid ndjson lines', () => {
    const line = toNdjsonLine({
      section: 'questionAttempts',
      data: { id: 'a1', isCorrect: true },
    });

    expect(line.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(line.trim());
    expect(parsed.section).toBe('questionAttempts');
    expect(parsed.data.id).toBe('a1');
  });

  it('builds analytics opt-in relation filter', () => {
    expect(buildAnalyticsOptInUserFilter()).toEqual({
      user: {
        consent: {
          is: {
            analyticsOptIn: true,
          },
        },
      },
    });
  });

  it('builds deterministic pseudonymous user id', () => {
    const first = buildStableUserPublicId('user_123', 'secret-salt');
    const second = buildStableUserPublicId('user_123', 'secret-salt');
    const third = buildStableUserPublicId('user_123', 'other-salt');

    expect(first).toEqual(second);
    expect(first).toMatch(/^usr_[a-f0-9]{24}$/);
    expect(first).not.toEqual(third);
  });
});
