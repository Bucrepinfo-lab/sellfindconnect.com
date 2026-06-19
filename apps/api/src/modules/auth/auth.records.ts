import type {
  AccessPermission,
  AccessRole,
  AccessScopeLevel,
  SupplyChainRole,
  TenantAccessRole,
  TermsAcceptanceEvidence,
} from '@telpen/domain';

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
  role: TenantAccessRole;
  createdAt: string;
};

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  tenantId: string;
  role: TenantAccessRole;
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

export type AuthTenantInviteRecord = {
  id: string;
  tenantId: string;
  email: string;
  role: Exclude<TenantAccessRole, 'OWNER'>;
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type PresentedTenantInvite = Pick<
  AuthTenantInviteRecord,
  'id' | 'tenantId' | 'email' | 'role' | 'expiresAt' | 'createdAt'
> & {
  developmentToken?: string;
};

export type AuthAuditRecord = {
  id: string;
  tenantId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type AccessAssignmentRecord = {
  id: string;
  userId: string;
  tenantId?: string;
  role: AccessRole;
  scopeLevel: AccessScopeLevel;
  regionCode?: string;
  continentCode?: string;
  countryCode?: string;
  scopedTenantId?: string;
  mfaRequired: boolean;
  assignedBy?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AccessDecisionAuditRecord = {
  id: string;
  tenantId?: string;
  actorUserId: string;
  role: AccessRole;
  permission: AccessPermission;
  scopeLevel: AccessScopeLevel;
  allowed: boolean;
  reason: string;
  targetTenantId?: string;
  targetCountryCode?: string;
  targetContinentCode?: string;
  targetRegionCode?: string;
  createdAt: string;
};

export type PlatformAccessSession = {
  sessionId: string;
  sessionTenantId: string;
  userId: string;
  mfaVerified: boolean;
  assignments: AccessAssignmentRecord[];
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

export type InvitedTenantUserRecords = {
  user: AuthUserRecord;
  membership: TenantMembershipRecord;
  termsAcceptance: TermsAcceptanceEvidence;
};

export type TenantMembershipWithTermsRecords = {
  membership: TenantMembershipRecord;
  termsAcceptance: TermsAcceptanceEvidence;
};

export type PasswordUpdateRecord = Pick<
  AuthUserRecord,
  'passwordHash' | 'passwordSalt' | 'passwordIterations'
>;
