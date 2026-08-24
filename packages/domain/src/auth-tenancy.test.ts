import { describe, expect, it } from 'vitest';

import {
  activePolicyVersions,
  buildTermsAcceptanceEvidence,
  buildTermsAcceptanceLookup,
  calculateTrialSubscription,
  evaluatePasswordPolicy,
  isCurrentTermsAcceptance,
  presentTermsAcceptanceLookup,
  publicPolicyDocuments,
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
    expect(activePolicyVersions.termsVersion).toBe('terms-2026-08-22');
    expect(activePolicyVersions.subscriptionTermsVersion).toBe('subscription-2026-08-22');
    expect(publicPolicyDocuments.map((document) => document.path)).toEqual([
      '/terms',
      '/privacy',
      '/subscription',
      '/prohibited',
      '/community',
    ]);
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

  it('flags stale policy versions for legal and support lookup', () => {
    const current = buildTermsAcceptanceEvidence({
      accepted: true,
      userId: 'user-1',
      tenantId: 'tenant-1',
      countryCode: 'KE',
      locale: 'en-KE',
      appSurface: 'WEB',
      acceptanceSource: 'SIGNUP',
      acceptedAt: '2026-08-22T12:00:00.000Z',
    });
    expect(current).toBeDefined();
    expect(isCurrentTermsAcceptance(current!)).toBe(true);

    const stale = {
      ...current!,
      termsVersion: 'terms-2026-06-18',
      acceptedAt: '2026-06-18T00:00:00.000Z',
    };
    const presented = presentTermsAcceptanceLookup(stale);
    expect(presented.current).toBe(false);
    expect(presented.stalePolicies).toEqual(['terms']);
    expect(presented).not.toHaveProperty('accepted');
    expect(JSON.stringify(presented)).not.toContain('example.com');
    expect(JSON.stringify(presented)).not.toMatch(/email|ipHash|deviceHash/i);

    const lookup = buildTermsAcceptanceLookup([stale, current!]);
    expect(lookup.currentCount).toBe(1);
    expect(lookup.staleCount).toBe(1);
    expect(lookup.records[0]?.acceptedAt).toBe(current!.acceptedAt);
    expect(lookup.activePolicyVersions).toEqual(activePolicyVersions);
  });
});
