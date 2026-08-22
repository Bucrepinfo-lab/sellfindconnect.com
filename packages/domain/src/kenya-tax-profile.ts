import type { FilingFrequency, TaxProfileStatus } from './finance';

/**
 * Proposed Kenya (KE) tax profile for the pilot country.
 *
 * This is a DRAFT for owner/CPA review. It must not be treated as an approved
 * country tax profile and must not unlock paid checkout.
 *
 * Sources reviewed 2026-08-22:
 * - KRA VAT: 16% general rate; monthly return and payment due on or before the
 *   20th of the following month via iTax.
 *   https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax
 * - KRA: non-resident digital marketplace / electronic supplies to Kenya must
 *   register for VAT even below the KES 5 million resident threshold.
 *
 * Locked path (see `tax-operating-model.ts`): stay merchant of record; file
 * KRA simplified digital-marketplace VAT on iTax or appoint one Kenyan tax
 * representative. eTIMS is not required on that non-resident path
 * (KRA DMS FAQ Q20 / Q27). See `docs/TAX_COMPLIANCE_RESEARCH.md`.
 *
 * Open questions for the owner/CPA (do not invent answers in code):
 * - Confirm the operator is a non-resident with no Kenyan permanent establishment.
 * - Whether Significant Economic Presence tax (successor to DST; effective 3%
 *   of gross per PwC Kenya 2026 notes) applies to this entity.
 * - Named iTax contact / remote Country Finance Admin (owner + tax agent).
 */
export const kenyaPilotTaxProfileId = 'ke-pilot-country-tax-profile';
export const kenyaPilotVatRuleId = 'ke-vat-sfc-subscription';

export const kenyaPilotTaxProfileDraft = {
  id: kenyaPilotTaxProfileId,
  countryCode: 'KE',
  taxAuthorityName: 'Kenya Revenue Authority',
  taxRegistrationStatus: 'PENDING_REVIEW',
  filingPortalUrl: 'https://itax.kra.go.ke',
  localFinanceOwner: 'Unassigned',
  filingFrequency: 'MONTHLY' as FilingFrequency,
  recordRetentionYears: 7,
  taxInclusivePricing: true,
  status: 'DRAFT' as TaxProfileStatus,
  proposedVatRate: 0.16,
  proposedProductTaxCode: 'SFC_SUBSCRIPTION',
  filingDeadlineDayOfMonth: 20,
  registrationThresholdKes: 0,
  sources: [
    'https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax',
  ],
};

export type PaidLaunchBlockReason = 'missing_profile' | 'profile_not_approved';

export type PaidLaunchReadiness = {
  countryCode: string;
  allowed: boolean;
  status: TaxProfileStatus | null;
  reason: PaidLaunchBlockReason | null;
};

export function evaluatePaidLaunchReadiness(
  countryCode: string,
  profile?: { countryCode: string; status: TaxProfileStatus } | null,
): PaidLaunchReadiness {
  const code = countryCode.trim().toUpperCase();
  if (!profile || profile.countryCode.toUpperCase() !== code) {
    return {
      countryCode: code,
      allowed: false,
      status: null,
      reason: 'missing_profile',
    };
  }

  if (profile.status !== 'APPROVED') {
    return {
      countryCode: code,
      allowed: false,
      status: profile.status,
      reason: 'profile_not_approved',
    };
  }

  return {
    countryCode: code,
    allowed: true,
    status: 'APPROVED',
    reason: null,
  };
}

export function describePaidLaunchReadiness(readiness: PaidLaunchReadiness): string {
  if (readiness.allowed) {
    return 'Approved';
  }
  if (readiness.reason === 'missing_profile') {
    return 'Missing — paid checkout blocked';
  }
  if (readiness.status === 'SUSPENDED') {
    return 'Suspended — paid checkout blocked';
  }
  return 'Draft — not approved';
}
