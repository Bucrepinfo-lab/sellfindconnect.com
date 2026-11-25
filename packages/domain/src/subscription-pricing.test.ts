import { describe, expect, it } from 'vitest';

import {
  FOUNDING_SUBSCRIPTION_PRICES,
  YEAR_PLAN_MONTHS_PAID,
  formatPlanPrice,
  isFoundingSubscriber,
  normalizePlan,
  parsePriceOverrides,
  planEntitlements,
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

  it('the owner-approved African prices; USD stays unapproved; a country with no row has no price', () => {
    const approved = ['KE', 'UG', 'TZ', 'RW', 'NG', 'GH', 'ZA',
      'ZM', 'MW', 'MZ', 'CM', 'CG', 'GA', 'CI', 'SN', 'BJ', 'BF', 'CD', 'LS', 'SL', 'ZW', 'ET'];
    for (const [code, row] of Object.entries(FOUNDING_SUBSCRIPTION_PRICES)) {
      expect(row.approved).toBe(approved.includes(code));
      expect(row.pro).toBeGreaterThan(row.basic);
    }
    expect(quoteSubscription({ countryCode: 'UG' })).toMatchObject({ approved: true, amount: 14000, currencyCode: 'UGX' });
    expect(quoteSubscription({ countryCode: 'ZA', plan: 'PRO' })).toMatchObject({ approved: true, amount: 210, currencyCode: 'ZAR' });
    expect(quoteSubscription({ countryCode: 'ZW' })).toMatchObject({ approved: true, amount: 3.99, currencyCode: 'USD' });
    expect(quoteSubscription({ countryCode: 'US' })?.approved).toBe(false);
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

  it('plan entitlements: Basic 15 media, Pro 30 (owner 25/11/26), RFQs on both', () => {
    expect(planEntitlements('BASIC')).toEqual({ maxMediaPerListing: 15, sourceFinderPriority: false, rfqs: true });
    expect(planEntitlements('PRO')).toEqual({ maxMediaPerListing: 30, sourceFinderPriority: true, rfqs: true });
  });

  it('an unknown or missing plan falls back to Basic', () => {
    expect(normalizePlan(undefined)).toBe('BASIC');
    expect(normalizePlan('gold')).toBe('BASIC');
    expect(normalizePlan(' pro ')).toBe('PRO');
    expect(planEntitlements(null).maxMediaPerListing).toBe(15);
  });
});
