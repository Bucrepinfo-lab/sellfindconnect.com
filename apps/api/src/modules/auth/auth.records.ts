import type { SupplyChainRole, TermsAcceptanceEvidence } from '@telpen/domain';

export type AuthUserRecord = {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  emailVerifiedAt?: string;
  mfaRequired: boolean;
  mfaVerifiedAt?: string;
  createdAt: string;
};

export type AuthTenantRecord = {
  id: string;
  displayName: string;
  countryCode: string;
  industryCode: string;
  primaryRole: SupplyChainRole;
  userType: string;
  status: string;
  trialStartedAt: string;
  trialEndsAt: string;
  nextBillingAt: string;
  monthlyAmount: number;
  currencyCode: string;
  createdAt: string;
};

export type TenantMembershipRecord = {
  id: string;
  userId: string;
  tenantId: string;
  role: 'OWNER';
  createdAt: string;
};

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  tenantId: string;
  role: 'OWNER';
  mfaRequired: boolean;
  mfaVerified: boolean;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
};

export type AuthMfaDeliveryChannel = 'DEVELOPMENT' | 'EMAIL' | 'SMS' | 'AUTHENTICATOR';

export type AuthMfaChallengeRecord = {
  id: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  codeHash: string;
  deliveryChannel: AuthMfaDeliveryChannel;
  expiresAt: string;
  consumedAt?: string;
  failedAttempts: number;
  createdAt: string;
};

export type PresentedMfaChallenge = Pick<
  AuthMfaChallengeRecord,
  'id' | 'deliveryChannel' | 'expiresAt' | 'createdAt'
> & {
  developmentCode?: string;
};

export type AuthAccountChallengePurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export type AuthAccountChallengeRecord = {
  id: string;
  userId: string;
  email: string;
  purpose: AuthAccountChallengePurpose;
  tokenHash: string;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
};

export type PresentedAccountChallenge = Pick<
  AuthAccountChallengeRecord,
  'id' | 'purpose' | 'expiresAt' | 'createdAt'
> & {
  developmentToken?: string;
};

export type PresentedAuthSession = Omit<AuthSessionRecord, 'tokenHash' | 'revokedAt'> & {
  token?: string;
};

export type IssuedAuthSession = PresentedAuthSession & {
  token: string;
  mfaChallenge?: PresentedMfaChallenge;
};

export type OwnerRegistrationRecords = {
  user: AuthUserRecord;
  tenant: AuthTenantRecord;
  membership: TenantMembershipRecord;
  termsAcceptance: TermsAcceptanceEvidence;
};

export type PasswordUpdateRecord = Pick<
  AuthUserRecord,
  'passwordHash' | 'passwordSalt' | 'passwordIterations'
>;
