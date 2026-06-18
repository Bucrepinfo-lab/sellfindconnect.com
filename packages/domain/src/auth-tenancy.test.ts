import { describe, expect, it } from 'vitest';

import {
  activePolicyVersions,
  buildTermsAcceptanceEvidence,
  calculateTrialSubscription,
  evaluatePasswordPolicy,
} from './auth-tenancy';

describe('auth and tenancy policy helpers', () => {
  it('accepts a strong password and rejects a weak one', () => {
    expect(evaluatePasswordPolicy('Strong-owner#2026').allowed).toBe(true);
    const weak = evaluatePasswordPolicy('password');

    expect(weak.allowed).toBe(false);
    expect(weak.score).toBeLessThan(70);
  });

  it('calculates the first-month-free trial billing window', () => {
    const subscription = calculateTrialSubscription({
      startedAt: '2026-06-18T00:00:00.000Z',
      monthlyAmount: 10,
      currencyCode: 'KES',
    });

    expect(subscription.status).toBe('TRIAL_ACTIVE');
    expect(subscription.trialEndsAt).toBe('2026-07-18T00:00:00.000Z');
    expect(subscription.nextBillingAt).toBe('2026-07-18T00:00:00.000Z');
  });

  it('stores active policy versions with terms acceptance evidence', () => {
    const evidence = buildTermsAcceptanceEvidence({
      accepted: true,
      userId: 'user-1',
      tenantId: 'tenant-1',
      countryCode: 'KE',
      locale: 'en-KE',
      appSurface: 'WEB',
      acceptanceSource: 'SIGNUP',
      acceptedAt: '2026-06-18T00:00:00.000Z',
    });

    expect(evidence?.termsVersion).toBe(activePolicyVersions.termsVersion);
    expect(evidence?.prohibitedContentVersion).toBe(activePolicyVersions.prohibitedContentVersion);
  });

  it('does not create acceptance evidence when terms were not accepted', () => {
    expect(
      buildTermsAcceptanceEvidence({
        accepted: false,
        userId: 'user-1',
        tenantId: 'tenant-1',
        countryCode: 'KE',
        locale: 'en-KE',
        appSurface: 'WEB',
        acceptanceSource: 'SIGNUP',
        acceptedAt: '2026-06-18T00:00:00.000Z',
      }),
    ).toBeUndefined();
  });
});
