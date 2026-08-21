import { Injectable } from '@nestjs/common';
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
  TotpEnrollmentUpdateRecord,
} from './auth.records';
import type { AuthRepository } from './auth.repository';

@Injectable()
export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersByEmail = new Map<string, AuthUserRecord>();
  private readonly usersByPhone = new Map<string, AuthUserRecord>();
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly tenants = new Map<string, AuthTenantRecord>();
  private readonly memberships = new Map<string, TenantMembershipRecord>();
  private readonly sessionsByTokenHash = new Map<string, AuthSessionRecord>();
  private readonly mfaChallenges = new Map<string, AuthMfaChallengeRecord>();
  private readonly accountChallengesByTokenHash = new Map<string, AuthAccountChallengeRecord>();
  private readonly tenantInvitesByTokenHash = new Map<string, AuthTenantInviteRecord>();
  private readonly accessAssignments = new Map<string, AccessAssignmentRecord>();
  private readonly accessDecisionAudits = new Map<string, AccessDecisionAuditRecord>();
  private readonly termsEvidence = new Map<string, TermsAcceptanceEvidence>();
  private readonly auditLogs = new Map<string, AuthAuditRecord>();

  findUserByEmail(email: string): AuthUserRecord | undefined {
    return this.usersByEmail.get(email);
  }

  findUserByPhone(phone: string): AuthUserRecord | undefined {
    return this.usersByPhone.get(phone);
  }

  findUserById(userId: string): AuthUserRecord | undefined {
    return this.usersById.get(userId);
  }

  findFirstMembershipForUser(userId: string): TenantMembershipRecord | undefined {
    return Array.from(this.memberships.values()).find((item) => item.userId === userId);
  }

  findMembershipForUserAndTenant(userId: string, tenantId: string): TenantMembershipRecord | undefined {
    return Array.from(this.memberships.values()).find(
      (item) => item.userId === userId && item.tenantId === tenantId,
    );
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

  findMfaChallengeBySessionId(sessionId: string): AuthMfaChallengeRecord | undefined {
    return Array.from(this.mfaChallenges.values())
      .filter((challenge) => challenge.sessionId === sessionId && !challenge.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  findAccountChallengeByTokenHash(tokenHash: string): AuthAccountChallengeRecord | undefined {
    return this.accountChallengesByTokenHash.get(tokenHash);
  }

  findTenantInviteByTokenHash(tokenHash: string): AuthTenantInviteRecord | undefined {
    return this.tenantInvitesByTokenHash.get(tokenHash);
  }

  listAccessAssignmentsForUser(userId: string): AccessAssignmentRecord[] {
    return Array.from(this.accessAssignments.values())
      .filter((assignment) => assignment.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createOwnerRegistration(records: OwnerRegistrationRecords): void {
    this.saveUser(records.user);
    this.tenants.set(records.tenant.id, records.tenant);
    this.memberships.set(records.membership.id, records.membership);
    this.termsEvidence.set(
      this.termsEvidenceKey(records.user.id, records.tenant.id),
      records.termsAcceptance,
    );
  }

  createInvitedTenantUser(records: InvitedTenantUserRecords): void {
    this.saveUser(records.user);
    this.memberships.set(records.membership.id, records.membership);
    this.termsEvidence.set(
      this.termsEvidenceKey(records.user.id, records.membership.tenantId),
      records.termsAcceptance,
    );
  }

  createTenantMembershipWithTerms(records: TenantMembershipWithTermsRecords): void {
    this.memberships.set(records.membership.id, records.membership);
    this.termsEvidence.set(
      this.termsEvidenceKey(records.membership.userId, records.membership.tenantId),
      records.termsAcceptance,
    );
  }

  createAccessAssignment(record: AccessAssignmentRecord): void {
    this.accessAssignments.set(record.id, record);
  }

  createSession(session: AuthSessionRecord): void {
    this.sessionsByTokenHash.set(session.tokenHash, session);
  }

  updateSession(session: AuthSessionRecord): void {
    this.sessionsByTokenHash.set(session.tokenHash, session);
  }

  createMfaChallenge(challenge: AuthMfaChallengeRecord): void {
    this.mfaChallenges.set(challenge.id, challenge);
  }

  updateMfaChallenge(challenge: AuthMfaChallengeRecord): void {
    this.mfaChallenges.set(challenge.id, challenge);
  }

  createAccountChallenge(challenge: AuthAccountChallengeRecord): void {
    this.accountChallengesByTokenHash.set(challenge.tokenHash, challenge);
  }

  updateAccountChallenge(challenge: AuthAccountChallengeRecord): void {
    this.accountChallengesByTokenHash.set(challenge.tokenHash, challenge);
  }

  createTenantInvite(invite: AuthTenantInviteRecord): void {
    this.tenantInvitesByTokenHash.set(invite.tokenHash, invite);
  }

  updateTenantInvite(invite: AuthTenantInviteRecord): void {
    this.tenantInvitesByTokenHash.set(invite.tokenHash, invite);
  }

  markUserEmailVerified(userId: string, emailVerifiedAt: string): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    this.saveUser({ ...user, emailVerifiedAt });
  }

  markUserPhoneVerified(userId: string, phoneVerifiedAt: string): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    this.saveUser({ ...user, phoneVerifiedAt });
  }

  updateUserPassword(userId: string, password: PasswordUpdateRecord): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    this.saveUser({ ...user, ...password });
  }

  markUserMfaVerified(userId: string, mfaVerifiedAt: string): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    this.saveUser({ ...user, mfaVerifiedAt });
  }

  updateUserTotpEnrollment(userId: string, enrollment: TotpEnrollmentUpdateRecord): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    this.saveUser({
      ...user,
      totpSecret: enrollment.totpSecret === null ? undefined : (enrollment.totpSecret ?? user.totpSecret),
      totpPendingSecret:
        enrollment.totpPendingSecret === null
          ? undefined
          : (enrollment.totpPendingSecret ?? user.totpPendingSecret),
      totpEnrolledAt:
        enrollment.totpEnrolledAt === null ? undefined : (enrollment.totpEnrolledAt ?? user.totpEnrolledAt),
      totpLastUsedStep:
        enrollment.totpLastUsedStep === null
          ? undefined
          : (enrollment.totpLastUsedStep ?? user.totpLastUsedStep),
    });
  }

  revokeSessionsForUser(userId: string, revokedAt: string): void {
    for (const session of this.sessionsByTokenHash.values()) {
      if (session.userId === userId && !session.revokedAt) {
        this.sessionsByTokenHash.set(session.tokenHash, { ...session, revokedAt });
      }
    }
  }

  createAuditLog(record: AuthAuditRecord): void {
    this.auditLogs.set(record.id, record);
  }

  createAccessDecisionAudit(record: AccessDecisionAuditRecord): void {
    this.accessDecisionAudits.set(record.id, record);
  }

  listAuditLogsForTenant(tenantId: string): AuthAuditRecord[] {
    return Array.from(this.auditLogs.values())
      .filter((record) => record.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listTenants(): AuthTenantRecord[] {
    return Array.from(this.tenants.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private saveUser(user: AuthUserRecord): void {
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    if (user.phone) {
      this.usersByPhone.set(user.phone, user);
    }
  }

  private termsEvidenceKey(userId: string, tenantId: string): string {
    return `${userId}:${tenantId}`;
  }
}
