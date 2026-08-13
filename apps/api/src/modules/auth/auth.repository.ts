import type { TermsAcceptanceEvidence } from '@telpen/domain';

import type {
  AccessAssignmentRecord,
  AccessDecisionAuditRecord,
  AuthAuditRecord,
  AuthAccountChallengeRecord,
  AuthMfaChallengeRecord,
  AuthSessionRecord,
  AuthTenantRecord,
  AuthTenantInviteRecord,
  AuthUserRecord,
  InvitedTenantUserRecords,
  OwnerRegistrationRecords,
  PasswordUpdateRecord,
  TenantMembershipWithTermsRecords,
  TenantMembershipRecord,
} from './auth.records';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface AuthRepository {
  findUserByEmail(email: string): RepositoryResult<AuthUserRecord | undefined>;
  findUserByPhone(phone: string): RepositoryResult<AuthUserRecord | undefined>;
  findUserById(userId: string): RepositoryResult<AuthUserRecord | undefined>;
  findFirstMembershipForUser(userId: string): RepositoryResult<TenantMembershipRecord | undefined>;
  findMembershipForUserAndTenant(
    userId: string,
    tenantId: string,
  ): RepositoryResult<TenantMembershipRecord | undefined>;
  findTenantById(tenantId: string): RepositoryResult<AuthTenantRecord | undefined>;
  findTermsAcceptance(userId: string, tenantId: string): RepositoryResult<TermsAcceptanceEvidence | undefined>;
  findSessionByTokenHash(tokenHash: string): RepositoryResult<AuthSessionRecord | undefined>;
  findMfaChallengeBySessionId(sessionId: string): RepositoryResult<AuthMfaChallengeRecord | undefined>;
  findAccountChallengeByTokenHash(tokenHash: string): RepositoryResult<AuthAccountChallengeRecord | undefined>;
  findTenantInviteByTokenHash(tokenHash: string): RepositoryResult<AuthTenantInviteRecord | undefined>;
  listAccessAssignmentsForUser(userId: string): RepositoryResult<AccessAssignmentRecord[]>;
  createOwnerRegistration(records: OwnerRegistrationRecords): RepositoryResult<void>;
  createInvitedTenantUser(records: InvitedTenantUserRecords): RepositoryResult<void>;
  createTenantMembershipWithTerms(records: TenantMembershipWithTermsRecords): RepositoryResult<void>;
  createAccessAssignment(record: AccessAssignmentRecord): RepositoryResult<void>;
  createSession(session: AuthSessionRecord): RepositoryResult<void>;
  updateSession(session: AuthSessionRecord): RepositoryResult<void>;
  createMfaChallenge(challenge: AuthMfaChallengeRecord): RepositoryResult<void>;
  updateMfaChallenge(challenge: AuthMfaChallengeRecord): RepositoryResult<void>;
  createAccountChallenge(challenge: AuthAccountChallengeRecord): RepositoryResult<void>;
  updateAccountChallenge(challenge: AuthAccountChallengeRecord): RepositoryResult<void>;
  createTenantInvite(invite: AuthTenantInviteRecord): RepositoryResult<void>;
  updateTenantInvite(invite: AuthTenantInviteRecord): RepositoryResult<void>;
  markUserEmailVerified(userId: string, emailVerifiedAt: string): RepositoryResult<void>;
  markUserPhoneVerified(userId: string, phoneVerifiedAt: string): RepositoryResult<void>;
  updateUserPassword(userId: string, password: PasswordUpdateRecord): RepositoryResult<void>;
  markUserMfaVerified(userId: string, mfaVerifiedAt: string): RepositoryResult<void>;
  revokeSessionsForUser(userId: string, revokedAt: string): RepositoryResult<void>;
  createAuditLog(record: AuthAuditRecord): RepositoryResult<void>;
  createAccessDecisionAudit(record: AccessDecisionAuditRecord): RepositoryResult<void>;
  listAuditLogsForTenant(tenantId: string): RepositoryResult<AuthAuditRecord[]>;
  listTenants(): RepositoryResult<AuthTenantRecord[]>;
}
