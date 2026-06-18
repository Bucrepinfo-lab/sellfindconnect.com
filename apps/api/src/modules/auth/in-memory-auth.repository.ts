import { Injectable } from '@nestjs/common';
import type { TermsAcceptanceEvidence } from '@telpen/domain';

import type {
  AuthSessionRecord,
  AuthTenantRecord,
  AuthUserRecord,
  OwnerRegistrationRecords,
  TenantMembershipRecord,
} from './auth.records';
import type { AuthRepository } from './auth.repository';

@Injectable()
export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersByEmail = new Map<string, AuthUserRecord>();
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly tenants = new Map<string, AuthTenantRecord>();
  private readonly memberships = new Map<string, TenantMembershipRecord>();
  private readonly sessionsByTokenHash = new Map<string, AuthSessionRecord>();
  private readonly termsEvidence = new Map<string, TermsAcceptanceEvidence>();

  findUserByEmail(email: string): AuthUserRecord | undefined {
    return this.usersByEmail.get(email);
  }

  findUserById(userId: string): AuthUserRecord | undefined {
    return this.usersById.get(userId);
  }

  findFirstMembershipForUser(userId: string): TenantMembershipRecord | undefined {
    return Array.from(this.memberships.values()).find((item) => item.userId === userId);
  }

  findTenantById(tenantId: string): AuthTenantRecord | undefined {
    return this.tenants.get(tenantId);
  }

  findTermsAcceptance(userId: string, tenantId: string): TermsAcceptanceEvidence | undefined {
    return this.termsEvidence.get(this.termsEvidenceKey(userId, tenantId));
  }

  findSessionByTokenHash(tokenHash: string): AuthSessionRecord | undefined {
    return this.sessionsByTokenHash.get(tokenHash);
  }

  createOwnerRegistration(records: OwnerRegistrationRecords): void {
    this.usersByEmail.set(records.user.email, records.user);
    this.usersById.set(records.user.id, records.user);
    this.tenants.set(records.tenant.id, records.tenant);
    this.memberships.set(records.membership.id, records.membership);
    this.termsEvidence.set(
      this.termsEvidenceKey(records.user.id, records.tenant.id),
      records.termsAcceptance,
    );
  }

  createSession(session: AuthSessionRecord): void {
    this.sessionsByTokenHash.set(session.tokenHash, session);
  }

  updateSession(session: AuthSessionRecord): void {
    this.sessionsByTokenHash.set(session.tokenHash, session);
  }

  markUserMfaVerified(userId: string, mfaVerifiedAt: string): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    const updated = { ...user, mfaVerifiedAt };
    this.usersById.set(userId, updated);
    this.usersByEmail.set(updated.email, updated);
  }

  listTenants(): AuthTenantRecord[] {
    return Array.from(this.tenants.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private termsEvidenceKey(userId: string, tenantId: string): string {
    return `${userId}:${tenantId}`;
  }
}
