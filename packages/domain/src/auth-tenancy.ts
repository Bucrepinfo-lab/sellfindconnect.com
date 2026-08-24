import { communityStandardsVersion } from './community-standards';
import type { SupplyChainRole } from './industries';

export const onboardingUserTypes = ['ADVERTISER', 'BUYER_SEARCHER', 'BOTH', 'ADMIN_INVITED'] as const;

export type OnboardingUserType = (typeof onboardingUserTypes)[number];

export const tenantSubscriptionStatuses = [
  'TRIAL_ACTIVE',
  'TRIAL_ENDING',
  'ACTIVE_PAID',
  'PAYMENT_FAILED',
  'GRACE_PERIOD',
  'CANCELED',
  'SUSPENDED',
] as const;

export type TenantSubscriptionStatus = (typeof tenantSubscriptionStatuses)[number];

export type ActivePolicyVersions = {
  termsVersion: string;
  privacyVersion: string;
  prohibitedContentVersion: string;
  subscriptionTermsVersion: string;
};

export type TermsAcceptanceEvidence = ActivePolicyVersions & {
  accepted: true;
  userId: string;
  tenantId: string;
  countryCode: string;
  locale: string;
  appSurface: 'WEB' | 'PWA' | 'ANDROID' | 'IOS' | 'API';
  acceptanceSource: 'SIGNUP' | 'REACCEPTANCE' | 'ADMIN_INVITE' | 'CHECKOUT';
  acceptedAt: string;
};

export type PasswordPolicyDecision =
  | { allowed: true; score: number; checks: string[] }
  | { allowed: false; score: number; checks: string[]; missing: string[] };

export type TenantOnboardingSnapshot = {
  userType: OnboardingUserType;
  tenantDisplayName: string;
  countryCode: string;
  industryCode: string;
  primaryRole: SupplyChainRole;
  subscription: {
    status: TenantSubscriptionStatus;
    trialStartedAt: string;
    trialEndsAt: string;
    nextBillingAt: string;
    monthlyAmount: number;
    currencyCode: string;
  };
};

export const activePolicyVersions: ActivePolicyVersions = {
  termsVersion: 'terms-2026-08-22',
  privacyVersion: 'privacy-2026-06-18',
  prohibitedContentVersion: 'zero-tolerance-2026-06-18',
  subscriptionTermsVersion: 'subscription-2026-08-22',
};

export const publicPolicyDocuments = [
  { slug: 'terms', path: '/terms', version: 'terms-2026-08-22' },
  { slug: 'privacy', path: '/privacy', version: 'privacy-2026-06-18' },
  { slug: 'subscription', path: '/subscription', version: 'subscription-2026-08-22' },
  { slug: 'prohibited', path: '/prohibited', version: 'zero-tolerance-2026-06-18' },
  { slug: 'community', path: '/community', version: communityStandardsVersion },
] as const;

export function evaluatePasswordPolicy(password: string): PasswordPolicyDecision {
  const checks: string[] = [];
  const missing: string[] = [];

  if (password.length >= 12) checks.push('LENGTH_12');
  else missing.push('At least 12 characters.');

  if (/[a-z]/.test(password)) checks.push('LOWERCASE');
  else missing.push('A lowercase letter.');

  if (/[A-Z]/.test(password)) checks.push('UPPERCASE');
  else missing.push('An uppercase letter.');

  if (/[0-9]/.test(password)) checks.push('NUMBER');
  else missing.push('A number.');

  if (/[^A-Za-z0-9]/.test(password)) checks.push('SYMBOL');
  else missing.push('A symbol.');

  const commonFragments = ['password', 'telpen', 'sellfindconnect', '123456', 'qwerty'];
  if (!commonFragments.some((fragment) => password.toLowerCase().includes(fragment))) {
    checks.push('NOT_COMMON');
  } else {
    missing.push('Avoid common words, product names, and simple sequences.');
  }

  const score = Math.round((checks.length / 6) * 100);
  if (missing.length > 0) {
    return { allowed: false, score, checks, missing };
  }

  return { allowed: true, score, checks };
}

export function calculateTrialSubscription(input: {
  startedAt: string;
  monthlyAmount: number;
  currencyCode: string;
}) {
  const start = new Date(input.startedAt);
  const trialEnds = new Date(start);
  trialEnds.setUTCDate(trialEnds.getUTCDate() + 30);

  return {
    status: 'TRIAL_ACTIVE' as const,
    trialStartedAt: start.toISOString(),
    trialEndsAt: trialEnds.toISOString(),
    nextBillingAt: trialEnds.toISOString(),
    monthlyAmount: input.monthlyAmount,
    currencyCode: input.currencyCode,
  };
}

export function buildTermsAcceptanceEvidence(input: {
  accepted: boolean;
  userId: string;
  tenantId: string;
  countryCode: string;
  locale: string;
  appSurface: TermsAcceptanceEvidence['appSurface'];
  acceptanceSource: TermsAcceptanceEvidence['acceptanceSource'];
  acceptedAt: string;
}): TermsAcceptanceEvidence | undefined {
  if (!input.accepted) return undefined;

  return {
    ...activePolicyVersions,
    accepted: true,
    userId: input.userId,
    tenantId: input.tenantId,
    countryCode: input.countryCode,
    locale: input.locale,
    appSurface: input.appSurface,
    acceptanceSource: input.acceptanceSource,
    acceptedAt: input.acceptedAt,
  };
}

export const termsAcceptancePolicyKeys = [
  'terms',
  'privacy',
  'prohibited',
  'subscription',
] as const;

export type TermsAcceptancePolicyKey = (typeof termsAcceptancePolicyKeys)[number];

export type TermsAcceptanceLookupRecord = Omit<TermsAcceptanceEvidence, 'accepted'> & {
  current: boolean;
  stalePolicies: TermsAcceptancePolicyKey[];
};

export type TermsAcceptanceLookup = {
  activePolicyVersions: ActivePolicyVersions;
  currentCount: number;
  staleCount: number;
  records: TermsAcceptanceLookupRecord[];
};

export function staleTermsAcceptancePolicies(
  evidence: Pick<
    TermsAcceptanceEvidence,
    'termsVersion' | 'privacyVersion' | 'prohibitedContentVersion' | 'subscriptionTermsVersion'
  >,
): TermsAcceptancePolicyKey[] {
  const stale: TermsAcceptancePolicyKey[] = [];
  if (evidence.termsVersion !== activePolicyVersions.termsVersion) {
    stale.push('terms');
  }
  if (evidence.privacyVersion !== activePolicyVersions.privacyVersion) {
    stale.push('privacy');
  }
  if (evidence.prohibitedContentVersion !== activePolicyVersions.prohibitedContentVersion) {
    stale.push('prohibited');
  }
  if (evidence.subscriptionTermsVersion !== activePolicyVersions.subscriptionTermsVersion) {
    stale.push('subscription');
  }
  return stale;
}

export function isCurrentTermsAcceptance(
  evidence: Pick<
    TermsAcceptanceEvidence,
    | 'accepted'
    | 'termsVersion'
    | 'privacyVersion'
    | 'prohibitedContentVersion'
    | 'subscriptionTermsVersion'
  >,
): boolean {
  return evidence.accepted === true && staleTermsAcceptancePolicies(evidence).length === 0;
}

export function presentTermsAcceptanceLookup(
  evidence: TermsAcceptanceEvidence,
): TermsAcceptanceLookupRecord {
  const stalePolicies = staleTermsAcceptancePolicies(evidence);
  return {
    userId: evidence.userId,
    tenantId: evidence.tenantId,
    countryCode: evidence.countryCode,
    locale: evidence.locale,
    termsVersion: evidence.termsVersion,
    privacyVersion: evidence.privacyVersion,
    prohibitedContentVersion: evidence.prohibitedContentVersion,
    subscriptionTermsVersion: evidence.subscriptionTermsVersion,
    appSurface: evidence.appSurface,
    acceptanceSource: evidence.acceptanceSource,
    acceptedAt: evidence.acceptedAt,
    current: isCurrentTermsAcceptance(evidence),
    stalePolicies,
  };
}

export function buildTermsAcceptanceLookup(
  records: TermsAcceptanceEvidence[],
): TermsAcceptanceLookup {
  const presented = records
    .map((record) => presentTermsAcceptanceLookup(record))
    .sort((left, right) => right.acceptedAt.localeCompare(left.acceptedAt));

  return {
    activePolicyVersions,
    currentCount: presented.filter((item) => item.current).length,
    staleCount: presented.filter((item) => !item.current).length,
    records: presented,
  };
}
