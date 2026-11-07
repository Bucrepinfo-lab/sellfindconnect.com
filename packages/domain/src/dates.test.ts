import { describe, expect, it } from 'vitest';

import { formatDayFirstDate, formatDayFirstDateTime } from './dates';

describe('formatDayFirstDate', () => {
  it('shows day first (dd/mm/yy), never month first', () => {
    // 7 November 2026: a month-first locale would show 11/07/26.
    expect(formatDayFirstDate('2026-11-07T09:00:00.000Z')).toBe('07/11/26');
    expect(formatDayFirstDate('2026-03-01T09:00:00.000Z')).toBe('01/03/26');
  });

  it('uses the Nairobi calendar day by default', () => {
    // 22:30 UTC on 6 Nov is already 7 Nov in Nairobi (UTC+3).
    expect(formatDayFirstDate('2026-11-06T22:30:00.000Z')).toBe('07/11/26');
    expect(formatDayFirstDate('2026-11-06T22:30:00.000Z', { timeZone: 'UTC' })).toBe('06/11/26');
  });

  it('supports a four-digit year', () => {
    expect(formatDayFirstDate('2026-11-07T09:00:00.000Z', { fullYear: true })).toBe('07/11/2026');
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatDayFirstDate(undefined)).toBe('');
    expect(formatDayFirstDate(null)).toBe('');
    expect(formatDayFirstDate('')).toBe('');
    expect(formatDayFirstDate('not a date')).toBe('');
  });

  it('does not follow the process locale', () => {
    const original = Intl.DateTimeFormat().resolvedOptions().locale;
    expect(typeof original).toBe('string');
    expect(new Date('2026-11-07T09:00:00.000Z').toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi' })).toBe(
      '11/7/2026',
    );
    expect(formatDayFirstDate('2026-11-07T09:00:00.000Z')).toBe('07/11/26');
  });
});

describe('formatDayFirstDateTime', () => {
  it('shows dd/mm/yy HH:mm in 24-hour Nairobi time', () => {
    expect(formatDayFirstDateTime('2026-11-07T15:05:00.000Z')).toBe('07/11/26 18:05');
    expect(formatDayFirstDateTime('2026-11-06T21:00:00.000Z')).toBe('07/11/26 00:00');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatDayFirstDateTime('nope')).toBe('');
  });
});
