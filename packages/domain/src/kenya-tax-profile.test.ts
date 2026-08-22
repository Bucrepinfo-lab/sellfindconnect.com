import { describe, expect, it } from 'vitest';

import {
  describePaidLaunchReadiness,
  evaluatePaidLaunchReadiness,
  kenyaPilotTaxProfileDraft,
} from './kenya-tax-profile';

describe('Kenya pilot tax profile draft', () => {
  it('proposes KRA 16% VAT and stays DRAFT until a human approves it', () => {
    expect(kenyaPilotTaxProfileDraft).toMatchObject({
      countryCode: 'KE',
      taxAuthorityName: 'Kenya Revenue Authority',
      status: 'DRAFT',
      proposedVatRate: 0.16,
      filingFrequency: 'MONTHLY',
      filingDeadlineDayOfMonth: 20,
      taxRegistrationStatus: 'PENDING_REVIEW',
    });
    expect(kenyaPilotTaxProfileDraft.sources[0]).toContain('kra.go.ke');
  });

  it('blocks paid launch when the profile is missing or still a draft', () => {
    expect(evaluatePaidLaunchReadiness('KE')).toEqual({
      countryCode: 'KE',
      allowed: false,
      status: null,
      reason: 'missing_profile',
    });
    expect(
      evaluatePaidLaunchReadiness('KE', {
        countryCode: 'KE',
        status: kenyaPilotTaxProfileDraft.status,
      }),
    ).toEqual({
      countryCode: 'KE',
      allowed: false,
      status: 'DRAFT',
      reason: 'profile_not_approved',
    });
    expect(describePaidLaunchReadiness(evaluatePaidLaunchReadiness('KE', kenyaPilotTaxProfileDraft))).toBe(
      'Draft — not approved',
    );
  });

  it('allows paid launch only after an APPROVED Kenya profile', () => {
    expect(
      evaluatePaidLaunchReadiness('ke', { countryCode: 'KE', status: 'APPROVED' }),
    ).toEqual({
      countryCode: 'KE',
      allowed: true,
      status: 'APPROVED',
      reason: null,
    });
  });
});
