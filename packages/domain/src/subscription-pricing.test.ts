import { describe, expect, it } from 'vitest';

import {
  FOUNDING_SUBSCRIPTION_PRICES,
  YEAR_PLAN_MONTHS_PAID,
  formatPlanPrice,
  isFoundingSubscriber,
  parsePriceOverrides,
  quoteSubscription,
} from './subscription-pricing';

const later = { SFC_FOUNDING_UNTIL: '2027-12-01', SFC_PRICES: 'KE:599/1799' };

describe('subscription pricing (owner decision 18/11/26)', () => {
  it('Basic: KES 499 a month, KES 4,990 a year', () => {
    expect(quoteSubscription({ countryCode: 'KE' })?.amount).toBe(499);
    expect(quoteSubscription({ countryCode: 'KE', period: 'YEAR' })?.amount).toBe(4990);
    expect(YEAR_PLAN_MONTHS_PAID).toBe(10);
  });

  it('Pro: KES 1,499 a month, KES 14,990 a year', () => {
    expect(quoteSubscription({ countryCode: 'ke', plan: 'PRO' })?.amount).toBe(1499);
    expect(quoteSubscription({ countryCode: 'KE', plan: 'PRO', period: 'YEAR' })?.amount).toBe(14990);
  });

  it('only Kenya is approved; a country with no row has no price', () => {
    for (const [code, row] of Object.entries(FOUNDING_SUBSCRIPTION_PRICES)) {
      expect(row.approved).toBe(code === 'KE');
      expect(row.pro).toBeGreaterThan(row.basic);
    }
    expect(quoteSubscription({ countryCode: 'UG' })?.approved).toBe(false);
    expect(quoteSubscription({ countryCode: 'ZZ' })).toBeNull();
  });

  it('a founding tenant keeps the founding price while subscribed', () => {
    const q = quoteSubscription({ countryCode: 'KE', startedAt: new Date('2027-02-01'), status: 'ACTIVE_PAID', now: new Date('2029-01-01'), env: later });
    expect(q?.locked).toBe(true);
    expect(q?.amount).toBe(499);
  });

  it('cancelling ends the lock; starting after the window pays the later price', () => {
    const gone = quoteSubscription({ countryCode: 'KE', startedAt: new Date('2027-02-01'), status: 'CANCELED', now: new Date('2029-01-01'), env: later });
    expect(gone?.locked).toBe(false);
    expect(gone?.amount).toBe(599);
    const late = quoteSubscription({ countryCode: 'KE', plan: 'PRO', startedAt: new Date('2028-01-05'), status: 'TRIAL_ACTIVE', env: later });
    expect(late?.amount).toBe(1799);
  });

  it('with no window end set, every tenant is a founding tenant', () => {
    expect(isFoundingSubscriber(new Date('2030-01-01'), {})).toBe(true);
    expect(quoteSubscription({ countryCode: 'KE', env: { SFC_PRICES: 'KE:599/1799' } })?.amount).toBe(499);
  });

  it('ignores bad override entries', () => {
    expect(parsePriceOverrides('KE:0/5,XX,UG:1/abc')).toEqual({});
    expect(parsePriceOverrides('KE:599/1799')).toEqual({ KE: { basic: 599, pro: 1799 } });
  });

  it('formats prices the way people say them', () => {
    expect(formatPlanPrice(14990, 'KES')).toBe('KES 14,990');
    expect(formatPlanPrice(3.99, 'USD')).toBe('USD 3.99');
  });
});
