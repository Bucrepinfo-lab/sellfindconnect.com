import type { TermsAcceptanceEvidence } from '@telpen/domain';

import type {
  AuthSessionRecord,
  AuthTenantRecord,
  AuthUserRecord,
  OwnerRegistrationRecords,
  TenantMembershipRecord,
} from './auth.records';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthRepository {
  findUserByEmail(email: string): AuthUserRecord | undefined;
  findUserById(userId: string): AuthUserRecord | undefined;
  findFirstMembershipForUser(userId: string): TenantMembershipRecord | undefined;
  findTenantById(tenantId: string): AuthTenantRecord | undefined;
  findTermsAcceptance(userId: string, tenantId: string): TermsAcceptanceEvidence | undefined;
  findSessionByTokenHash(tokenHash: string): AuthSessionRecord | undefined;
  createOwnerRegistration(records: OwnerRegistrationRecords): void;
  createSession(session: AuthSessionRecord): void;
  updateSession(session: AuthSessionRecord): void;
  markUserMfaVerified(userId: string, mfaVerifiedAt: string): void;
  listTenants(): AuthTenantRecord[];
}
