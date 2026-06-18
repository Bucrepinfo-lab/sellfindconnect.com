import type { TermsAcceptanceEvidence } from '@telpen/domain';

import type {
  AuthAccountChallengeRecord,
  AuthMfaChallengeRecord,
  AuthSessionRecord,
  AuthTenantRecord,
  AuthUserRecord,
  OwnerRegistrationRecords,
  PasswordUpdateRecord,
  TenantMembershipRecord,
} from './auth.records';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface AuthRepository {
  findUserByEmail(email: string): RepositoryResult<AuthUserRecord | undefined>;
  findUserById(userId: string): RepositoryResult<AuthUserRecord | undefined>;
  findFirstMembershipForUser(userId: string): RepositoryResult<TenantMembershipRecord | undefined>;
  findTenantById(tenantId: string): RepositoryResult<AuthTenantRecord | undefined>;
  findTermsAcceptance(userId: string, tenantId: string): RepositoryResult<TermsAcceptanceEvidence | undefined>;
  findSessionByTokenHash(tokenHash: string): RepositoryResult<AuthSessionRecord | undefined>;
  findMfaChallengeBySessionId(sessionId: string): RepositoryResult<AuthMfaChallengeRecord | undefined>;
  findAccountChallengeByTokenHash(tokenHash: string): RepositoryResult<AuthAccountChallengeRecord | undefined>;
  createOwnerRegistration(records: OwnerRegistrationRecords): RepositoryResult<void>;
  createSession(session: AuthSessionRecord): RepositoryResult<void>;
  updateSession(session: AuthSessionRecord): RepositoryResult<void>;
  createMfaChallenge(challenge: AuthMfaChallengeRecord): RepositoryResult<void>;
  updateMfaChallenge(challenge: AuthMfaChallengeRecord): RepositoryResult<void>;
  createAccountChallenge(challenge: AuthAccountChallengeRecord): RepositoryResult<void>;
  updateAccountChallenge(challenge: AuthAccountChallengeRecord): RepositoryResult<void>;
  markUserEmailVerified(userId: string, emailVerifiedAt: string): RepositoryResult<void>;
  updateUserPassword(userId: string, password: PasswordUpdateRecord): RepositoryResult<void>;
  markUserMfaVerified(userId: string, mfaVerifiedAt: string): RepositoryResult<void>;
  revokeSessionsForUser(userId: string, revokedAt: string): RepositoryResult<void>;
  listTenants(): RepositoryResult<AuthTenantRecord[]>;
}
