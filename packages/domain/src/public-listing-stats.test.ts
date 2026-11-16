import { describe, expect, it } from 'vitest';

import {
  PUBLIC_LISTING_DEDUPE_MINUTES,
  PUBLIC_LISTING_MAX_EVENTS_PER_MINUTE,
  PublicListingEventGate,
  formatPublicCount,
} from './public-listing-stats';

describe('public listing counters', () => {
  it('counts a visitor once per listing and event type within the window', () => {
    let now = 0;
    const gate = new PublicListingEventGate(() => now);
    expect(gate.allow('v1', 'a', 'VIEW')).toBe(true);
    expect(gate.allow('v1', 'a', 'VIEW')).toBe(false);
    expect(gate.allow('v1', 'a', 'INQUIRY')).toBe(true);
    expect(gate.allow('v1', 'b', 'VIEW')).toBe(true);
    expect(gate.allow('v2', 'a', 'VIEW')).toBe(true);
    now += PUBLIC_LISTING_DEDUPE_MINUTES * 60_000;
    expect(gate.allow('v1', 'a', 'VIEW')).toBe(true);
  });

  it('caps bursts from one visitor', () => {
    let now = 0;
    const gate = new PublicListingEventGate(() => now);
    for (let i = 0; i < PUBLIC_LISTING_MAX_EVENTS_PER_MINUTE; i += 1) {
      expect(gate.allow('v1', `listing-${i}`, 'VIEW')).toBe(true);
    }
    expect(gate.allow('v1', 'one-more', 'VIEW')).toBe(false);
    now += 60_000;
    expect(gate.allow('v1', 'one-more', 'VIEW')).toBe(true);
  });

  it('formats counts plainly', () => {
    expect(formatPublicCount(0, 'view', 'views')).toBe('0 views');
    expect(formatPublicCount(1, 'view', 'views')).toBe('1 view');
    expect(formatPublicCount(1250, 'view', 'views')).toBe('1.2k views');
    expect(formatPublicCount(15400, 'enquiry', 'enquiries')).toBe('15k enquiries');
    expect(formatPublicCount(Number.NaN, 'view', 'views')).toBe('0 views');
  });
});
