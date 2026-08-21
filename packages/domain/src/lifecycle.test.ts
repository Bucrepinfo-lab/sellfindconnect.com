import { describe, expect, it } from 'vitest';

import { calculateAdvertLifecycle } from './lifecycle';

describe('advert lifecycle', () => {
  it('keeps a future publish date scheduled and out of the live window', () => {
    const state = calculateAdvertLifecycle(
      '2026-08-28T00:00:00.000Z',
      '2026-08-21T00:00:00.000Z',
    );

    expect(state.status).toBe('SCHEDULED');
    expect(state.isScheduled).toBe(true);
    expect(state.shouldAutoDelete).toBe(false);
    expect(state.daysLive).toBe(0);
    expect(state.expiresAt).toBe('2026-10-07T00:00:00.000Z');
  });

  it('starts the 40-day live window when the scheduled time arrives', () => {
    const state = calculateAdvertLifecycle(
      '2026-08-21T00:00:00.000Z',
      '2026-08-21T00:00:00.000Z',
    );

    expect(state.status).toBe('LIVE');
    expect(state.isScheduled).toBe(false);
    expect(state.daysRemaining).toBe(40);
  });
});
