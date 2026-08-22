import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_ERASE_CATEGORIES,
  ACCOUNT_RETAIN_CATEGORIES,
  DELETION_GRACE_DAYS,
  addDays,
  isDeletionDue,
  planAccountErase,
} from './privacy';

describe('account deletion plan', () => {
  it('erases commercial account holdings and retains tax/security records', () => {
    expect(planAccountErase()).toEqual({
      erase: ACCOUNT_ERASE_CATEGORIES,
      retain: ACCOUNT_RETAIN_CATEGORIES,
    });
    expect(ACCOUNT_ERASE_CATEGORIES).toEqual(['PROFILE', 'ADVERTS', 'CONVERSATIONS', 'MEDIA']);
    expect(ACCOUNT_RETAIN_CATEGORIES).toEqual(['ANALYTICS', 'BILLING', 'AUTH_LOGS']);
    expect(DELETION_GRACE_DAYS).toBe(30);
  });

  it('treats requested and processing records as due after the scheduled time', () => {
    const scheduledAt = '2026-08-01T00:00:00.000Z';
    expect(isDeletionDue({ status: 'REQUESTED', scheduledAt }, '2026-07-31T23:59:59.000Z')).toBe(
      false,
    );
    expect(isDeletionDue({ status: 'REQUESTED', scheduledAt }, scheduledAt)).toBe(true);
    expect(isDeletionDue({ status: 'PROCESSING', scheduledAt }, '2026-08-02T00:00:00.000Z')).toBe(
      true,
    );
    expect(isDeletionDue({ status: 'CANCELLED', scheduledAt }, '2026-08-02T00:00:00.000Z')).toBe(
      false,
    );
    expect(isDeletionDue({ status: 'COMPLETED', scheduledAt }, '2026-08-02T00:00:00.000Z')).toBe(
      false,
    );
  });

  it('schedules the grace period from the request timestamp', () => {
    expect(addDays('2026-08-01T00:00:00.000Z', DELETION_GRACE_DAYS)).toBe(
      '2026-08-31T00:00:00.000Z',
    );
  });
});
