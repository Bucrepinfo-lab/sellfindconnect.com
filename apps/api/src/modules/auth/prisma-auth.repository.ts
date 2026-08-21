import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  TenantRole,
  TenantStatus,
  type AccessAssignment,
  type AuditLog,
  type AuthAccountChallenge,
  type AuthMfaChallenge,
  type AuthSession,
  type Country,
  type Tenant,
  type TenantInvite,
  type TenantMembership,
  type TermsAcceptanceEvidence as PrismaTermsAcceptanceEvidence,
  type User,
} from '@prisma/client';
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

type TenantWithCountry = Tenant & { country: Country };

export function createAuthPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | undefined> {
    return this.mapUser(await this.prisma.user.findUnique({ where: { email } }));
  }

  async findUserByPhone(phone: string): Promise<AuthUserRecord | undefined> {
    return this.mapUser(await this.prisma.user.findFirst({ where: { phone } }));
  }

  async findUserById(userId: string): Promise<AuthUserRecord | undefined> {
    return this.mapUser(await this.prisma.user.findUnique({ where: { id: userId } }));
  }

  async findFirstMembershipForUser(userId: string): Promise<TenantMembershipRecord | undefined> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return membership ? this.mapMembership(membership) : undefined;
  }

  async findMembershipForUserAndTenant(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembershipRecord | undefined> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    return membership ? this.mapMembership(membership) : undefined;
  }

  async findTenantById(tenantId: string): Promise<AuthTenantRecord | undefined> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { country: true },
    });
    return tenant ? this.mapTenant(tenant) : undefined;
  }

  async findTermsAcceptance(
    userId: string,
    tenantId: string,
  ): Promise<TermsAcceptanceEvidence | undefined> {
    const evidence = await this.prisma.termsAcceptanceEvidence.findFirst({
      where: { userId, tenantId },
      orderBy: { acceptedAt: 'desc' },
    });
    return evidence ? this.mapTermsEvidence(evidence) : undefined;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AuthSessionRecord | undefined> {
    const session = await this.prisma.authSession.findUnique({ where: { tokenHash } });
    return session ? this.mapSession(session) : undefined;
  }

  async findMfaChallengeBySessionId(sessionId: string): Promise<AuthMfaChallengeRecord | undefined> {
    const challenge = await this.prisma.authMfaChallenge.findFirst({
      where: { sessionId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return challenge ? this.mapMfaChallenge(challenge) : undefined;
  }

  async findAccountChallengeByTokenHash(tokenHash: string): Promise<AuthAccountChallengeRecord | undefined> {
    const challenge = await this.prisma.authAccountChallenge.findUnique({
      where: { tokenHash },
    });
    return challenge ? this.mapAccountChallenge(challenge) : undefined;
  }

  async findTenantInviteByTokenHash(tokenHash: string): Promise<AuthTenantInviteRecord | undefined> {
    const invite = await this.prisma.tenantInvite.findUnique({ where: { tokenHash } });
    return invite ? this.mapTenantInvite(invite) : undefined;
  }

  async listAccessAssignmentsForUser(userId: string): Promise<AccessAssignmentRecord[]> {
    const now = new Date();
    const assignments = await this.prisma.accessAssignment.findMany({
      where: {
        userId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return assignments.map((assignment) => this.mapAccessAssignment(assignment));
  }

  async createOwnerRegistration(records: OwnerRegistrationRecords): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          id: records.user.id,
          email: records.user.email,
          displayName: records.user.displayName,
          phone: records.user.phone,
          passwordHash: records.user.passwordHash,
          passwordSalt: records.user.passwordSalt,
          passwordIterations: records.user.passwordIterations,
          emailVerifiedAt: records.user.emailVerifiedAt
            ? new Date(records.user.emailVerifiedAt)
            : undefined,
          mfaRequired: records.user.mfaRequired,
          createdAt: new Date(records.user.createdAt),
        },
      }),
      this.prisma.tenant.create({
        data: {
          id: records.tenant.id,
          displayName: records.tenant.displayName,
          countryCode: records.tenant.countryCode,
          primaryIndustryCode: records.tenant.industryCode,
          primaryRole: records.tenant.primaryRole,
          onboardingUserType: records.tenant.userType,
          status: records.tenant.status as TenantStatus,
          trialStartedAt: new Date(records.tenant.trialStartedAt),
          trialEndsAt: new Date(records.tenant.trialEndsAt),
          renewalDate: new Date(records.tenant.nextBillingAt),
          createdAt: new Date(records.tenant.createdAt),
        },
      }),
      this.prisma.tenantMembership.create({
        data: {
          id: records.membership.id,
          userId: records.membership.userId,
          tenantId: records.membership.tenantId,
          role: TenantRole.OWNER,
          createdAt: new Date(records.membership.createdAt),
        },
      }),
      this.prisma.termsAcceptanceEvidence.create({
        data: {
          userId: records.termsAcceptance.userId,
          tenantId: records.termsAcceptance.tenantId,
          countryCode: records.termsAcceptance.countryCode,
          locale: records.termsAcceptance.locale,
          termsVersion: records.termsAcceptance.termsVersion,
          privacyVersion: records.termsAcceptance.privacyVersion,
          prohibitedContentVersion: records.termsAcceptance.prohibitedContentVersion,
          subscriptionTermsVersion: records.termsAcceptance.subscriptionTermsVersion,
          appSurface: records.termsAcceptance.appSurface,
          acceptanceSource: records.termsAcceptance.acceptanceSource,
          acceptedAt: new Date(records.termsAcceptance.acceptedAt),
        },
      }),
    ]);
  }

  async createInvitedTenantUser(records: InvitedTenantUserRecords): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          id: records.user.id,
          email: records.user.email,
          displayName: records.user.displayName,
          phone: records.user.phone,
          passwordHash: records.user.passwordHash,
          passwordSalt: records.user.passwordSalt,
          passwordIterations: records.user.passwordIterations,
          emailVerifiedAt: records.user.emailVerifiedAt
            ? new Date(records.user.emailVerifiedAt)
            : undefined,
          mfaRequired: records.user.mfaRequired,
          createdAt: new Date(records.user.createdAt),
        },
      }),
      this.prisma.tenantMembership.create({
        data: {
          id: records.membership.id,
          userId: records.membership.userId,
          tenantId: records.membership.tenantId,
          role: records.membership.role as TenantRole,
          createdAt: new Date(records.membership.createdAt),
        },
      }),
      this.prisma.termsAcceptanceEvidence.create({
        data: {
          userId: records.termsAcceptance.userId,
          tenantId: records.termsAcceptance.tenantId,
          countryCode: records.termsAcceptance.countryCode,
          locale: records.termsAcceptance.locale,
          termsVersion: records.termsAcceptance.termsVersion,
          privacyVersion: records.termsAcceptance.privacyVersion,
          prohibitedContentVersion: records.termsAcceptance.prohibitedContentVersion,
          subscriptionTermsVersion: records.termsAcceptance.subscriptionTermsVersion,
          appSurface: records.termsAcceptance.appSurface,
          acceptanceSource: records.termsAcceptance.acceptanceSource,
          acceptedAt: new Date(records.termsAcceptance.acceptedAt),
        },
      }),
    ]);
  }

  async createTenantMembershipWithTerms(records: TenantMembershipWithTermsRecords): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.tenantMembership.create({
        data: {
          id: records.membership.id,
          userId: records.membership.userId,
          tenantId: records.membership.tenantId,
          role: records.membership.role as TenantRole,
          createdAt: new Date(records.membership.createdAt),
        },
      }),
      this.prisma.termsAcceptanceEvidence.create({
        data: {
          userId: records.termsAcceptance.userId,
          tenantId: records.termsAcceptance.tenantId,
          countryCode: records.termsAcceptance.countryCode,
          locale: records.termsAcceptance.locale,
          termsVersion: records.termsAcceptance.termsVersion,
          privacyVersion: records.termsAcceptance.privacyVersion,
          prohibitedContentVersion: records.termsAcceptance.prohibitedContentVersion,
          subscriptionTermsVersion: records.termsAcceptance.subscriptionTermsVersion,
          appSurface: records.termsAcceptance.appSurface,
          acceptanceSource: records.termsAcceptance.acceptanceSource,
          acceptedAt: new Date(records.termsAcceptance.acceptedAt),
        },
      }),
    ]);
  }

  async createAccessAssignment(record: AccessAssignmentRecord): Promise<void> {
    await this.prisma.accessAssignment.create({
      data: {
        id: record.id,
        userId: record.userId,
        tenantId: record.tenantId,
        role: record.role,
        scopeLevel: record.scopeLevel,
        regionCode: record.regionCode,
        continentCode: record.continentCode,
        countryCode: record.countryCode,
        scopedTenantId: record.scopedTenantId,
        mfaRequired: record.mfaRequired,
        assignedBy: record.assignedBy,
        expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
        revokedAt: record.revokedAt ? new Date(record.revokedAt) : undefined,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
  }

  async createSession(session: AuthSessionRecord): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        id: session.id,
        userId: session.userId,
        tenantId: session.tenantId,
        tokenHash: session.tokenHash,
        role: session.role,
        mfaRequired: session.mfaRequired,
        mfaVerified: session.mfaVerified,
        expiresAt: new Date(session.expiresAt),
        createdAt: new Date(session.createdAt),
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : undefined,
      },
    });
  }

  async updateSession(session: AuthSessionRecord): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        mfaRequired: session.mfaRequired,
        mfaVerified: session.mfaVerified,
        expiresAt: new Date(session.expiresAt),
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
      },
    });
  }

  async createMfaChallenge(challenge: AuthMfaChallengeRecord): Promise<void> {
    await this.prisma.authMfaChallenge.create({
      data: {
        id: challenge.id,
        sessionId: challenge.sessionId,
        userId: challenge.userId,
        tenantId: challenge.tenantId,
        codeHash: challenge.codeHash,
        deliveryChannel: challenge.deliveryChannel,
        expiresAt: new Date(challenge.expiresAt),
        consumedAt: challenge.consumedAt ? new Date(challenge.consumedAt) : undefined,
        failedAttempts: challenge.failedAttempts,
        createdAt: new Date(challenge.createdAt),
      },
    });
  }

  async updateMfaChallenge(challenge: AuthMfaChallengeRecord): Promise<void> {
    await this.prisma.authMfaChallenge.update({
      where: { id: challenge.id },
      data: {
        codeHash: challenge.codeHash,
        deliveryChannel: challenge.deliveryChannel,
        expiresAt: new Date(challenge.expiresAt),
        consumedAt: challenge.consumedAt ? new Date(challenge.consumedAt) : null,
        failedAttempts: challenge.failedAttempts,
      },
    });
  }

  async createAccountChallenge(challenge: AuthAccountChallengeRecord): Promise<void> {
    await this.prisma.authAccountChallenge.create({
      data: {
        id: challenge.id,
        userId: challenge.userId,
        email: challenge.email,
        phone: challenge.phone ?? undefined,
        purpose: challenge.purpose,
        tokenHash: challenge.tokenHash,
        expiresAt: new Date(challenge.expiresAt),
        consumedAt: challenge.consumedAt ? new Date(challenge.consumedAt) : undefined,
        createdAt: new Date(challenge.createdAt),
      },
    });
  }

  async updateAccountChallenge(challenge: AuthAccountChallengeRecord): Promise<void> {
    await this.prisma.authAccountChallenge.update({
      where: { id: challenge.id },
      data: {
        expiresAt: new Date(challenge.expiresAt),
        consumedAt: challenge.consumedAt ? new Date(challenge.consumedAt) : null,
      },
    });
  }

  async createTenantInvite(invite: AuthTenantInviteRecord): Promise<void> {
    await this.prisma.tenantInvite.create({
      data: {
        id: invite.id,
        tenantId: invite.tenantId,
        email: invite.email,
        role: invite.role,
        tokenHash: invite.tokenHash,
        invitedByUserId: invite.invitedByUserId,
        expiresAt: new Date(invite.expiresAt),
        acceptedAt: invite.acceptedAt ? new Date(invite.acceptedAt) : undefined,
        revokedAt: invite.revokedAt ? new Date(invite.revokedAt) : undefined,
        createdAt: new Date(invite.createdAt),
      },
    });
  }

  async updateTenantInvite(invite: AuthTenantInviteRecord): Promise<void> {
    await this.prisma.tenantInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: invite.acceptedAt ? new Date(invite.acceptedAt) : null,
        revokedAt: invite.revokedAt ? new Date(invite.revokedAt) : null,
        expiresAt: new Date(invite.expiresAt),
      },
    });
  }

  async markUserEmailVerified(userId: string, emailVerifiedAt: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(emailVerifiedAt) },
    });
  }

  async markUserPhoneVerified(userId: string, phoneVerifiedAt: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date(phoneVerifiedAt) },
    });
  }

  async updateUserPassword(userId: string, password: PasswordUpdateRecord): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: password.passwordHash,
        passwordSalt: password.passwordSalt,
        passwordIterations: password.passwordIterations,
      },
    });
  }

  async markUserMfaVerified(userId: string, mfaVerifiedAt: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastMfaVerifiedAt: new Date(mfaVerifiedAt) },
    });
  }

  async updateUserTotpEnrollment(userId: string, enrollment: TotpEnrollmentUpdateRecord): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: enrollment.totpSecret === undefined ? undefined : enrollment.totpSecret,
        totpPendingSecret:
          enrollment.totpPendingSecret === undefined ? undefined : enrollment.totpPendingSecret,
        totpLastUsedStep:
          enrollment.totpLastUsedStep === undefined ? undefined : enrollment.totpLastUsedStep,
        mfaEnrolledAt:
          enrollment.totpEnrolledAt === undefined
            ? undefined
            : enrollment.totpEnrolledAt
              ? new Date(enrollment.totpEnrolledAt)
              : null,
      },
    });
  }

  async revokeSessionsForUser(userId: string, revokedAt: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(revokedAt) },
    });
  }

  async createAuditLog(record: AuthAuditRecord): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: record.id,
        tenantId: record.tenantId,
        actorUserId: record.actorUserId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        metadata: record.metadata as Prisma.InputJsonObject | undefined,
        createdAt: new Date(record.createdAt),
      },
    });
  }

  async createAccessDecisionAudit(record: AccessDecisionAuditRecord): Promise<void> {
    await this.prisma.accessDecisionAudit.create({
      data: {
        id: record.id,
        tenantId: record.tenantId,
        actorUserId: record.actorUserId,
        role: record.role,
        permission: record.permission,
        scopeLevel: record.scopeLevel,
        allowed: record.allowed,
        reason: record.reason,
        targetTenantId: record.targetTenantId,
        targetCountryCode: record.targetCountryCode,
        targetContinentCode: record.targetContinentCode,
        targetRegionCode: record.targetRegionCode,
        createdAt: new Date(record.createdAt),
      },
    });
  }

  async listAuditLogsForTenant(tenantId: string): Promise<AuthAuditRecord[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.mapAuditLog(record));
  }

  async listTenants(): Promise<AuthTenantRecord[]> {
    const tenants = await this.prisma.tenant.findMany({
      include: { country: true },
      orderBy: { createdAt: 'desc' },
    });
    return tenants.map((tenant) => this.mapTenant(tenant));
  }

  private mapUser(user: User | null): AuthUserRecord | undefined {
    if (!user?.passwordHash || !user.passwordSalt || !user.passwordIterations) {
      return undefined;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone ?? undefined,
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      passwordIterations: user.passwordIterations,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString(),
      mfaRequired: user.mfaRequired,
      mfaVerifiedAt: user.lastMfaVerifiedAt?.toISOString(),
      totpSecret: user.totpSecret ?? undefined,
      totpPendingSecret: user.totpPendingSecret ?? undefined,
      totpEnrolledAt: user.mfaEnrolledAt?.toISOString(),
      totpLastUsedStep: user.totpLastUsedStep ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private mapTenant(tenant: TenantWithCountry): AuthTenantRecord {
    const trialStartedAt = tenant.trialStartedAt ?? tenant.createdAt;
    const trialEndsAt = tenant.trialEndsAt ?? tenant.renewalDate ?? tenant.createdAt;
    const nextBillingAt = tenant.renewalDate ?? trialEndsAt;

    return {
      id: tenant.id,
      displayName: tenant.displayName,
      countryCode: tenant.countryCode,
      industryCode: tenant.primaryIndustryCode ?? 'UNKNOWN',
      primaryRole: (tenant.primaryRole ?? 'SUPPLIER') as AuthTenantRecord['primaryRole'],
      userType: tenant.onboardingUserType ?? 'ADVERTISER',
      status: tenant.status,
      trialStartedAt: trialStartedAt.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
      nextBillingAt: nextBillingAt.toISOString(),
      monthlyAmount: this.decimalToNumber(tenant.country.monthlySubscriptionAmount),
      currencyCode: tenant.country.currencyCode,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  private mapMembership(membership: TenantMembership): TenantMembershipRecord {
    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  private mapSession(session: AuthSession): AuthSessionRecord {
    return {
      id: session.id,
      tokenHash: session.tokenHash,
      userId: session.userId,
      tenantId: session.tenantId,
      role: session.role as AuthSessionRecord['role'],
      mfaRequired: session.mfaRequired,
      mfaVerified: session.mfaVerified,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString(),
    };
  }

  private mapAccessAssignment(assignment: AccessAssignment): AccessAssignmentRecord {
    return {
      id: assignment.id,
      userId: assignment.userId,
      tenantId: assignment.tenantId ?? undefined,
      role: assignment.role as AccessAssignmentRecord['role'],
      scopeLevel: assignment.scopeLevel as AccessAssignmentRecord['scopeLevel'],
      regionCode: assignment.regionCode ?? undefined,
      continentCode: assignment.continentCode ?? undefined,
      countryCode: assignment.countryCode ?? undefined,
      scopedTenantId: assignment.scopedTenantId ?? undefined,
      mfaRequired: assignment.mfaRequired,
      assignedBy: assignment.assignedBy ?? undefined,
      expiresAt: assignment.expiresAt?.toISOString(),
      revokedAt: assignment.revokedAt?.toISOString(),
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }

  private mapTenantInvite(invite: TenantInvite): AuthTenantInviteRecord {
    return {
      id: invite.id,
      tenantId: invite.tenantId,
      email: invite.email,
      role: invite.role as AuthTenantInviteRecord['role'],
      tokenHash: invite.tokenHash,
      invitedByUserId: invite.invitedByUserId,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString(),
      revokedAt: invite.revokedAt?.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }

  private mapMfaChallenge(challenge: AuthMfaChallenge): AuthMfaChallengeRecord {
    return {
      id: challenge.id,
      sessionId: challenge.sessionId,
      userId: challenge.userId,
      tenantId: challenge.tenantId,
      codeHash: challenge.codeHash,
      deliveryChannel: challenge.deliveryChannel as AuthMfaChallengeRecord['deliveryChannel'],
      expiresAt: challenge.expiresAt.toISOString(),
      consumedAt: challenge.consumedAt?.toISOString(),
      failedAttempts: challenge.failedAttempts,
      createdAt: challenge.createdAt.toISOString(),
    };
  }

  private mapAuditLog(record: AuditLog): AuthAuditRecord {
    return {
      id: record.id,
      tenantId: record.tenantId ?? undefined,
      actorUserId: record.actorUserId ?? undefined,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId ?? undefined,
      metadata: record.metadata as AuthAuditRecord['metadata'],
      createdAt: record.createdAt.toISOString(),
    };
  }

  private mapAccountChallenge(challenge: AuthAccountChallenge): AuthAccountChallengeRecord {
    return {
      id: challenge.id,
      userId: challenge.userId,
      email: challenge.email,
      phone: challenge.phone ?? undefined,
      purpose: challenge.purpose as AuthAccountChallengeRecord['purpose'],
      tokenHash: challenge.tokenHash,
      expiresAt: challenge.expiresAt.toISOString(),
      consumedAt: challenge.consumedAt?.toISOString(),
      createdAt: challenge.createdAt.toISOString(),
    };
  }

  private mapTermsEvidence(evidence: PrismaTermsAcceptanceEvidence): TermsAcceptanceEvidence {
    return {
      accepted: true,
      userId: evidence.userId,
      tenantId: evidence.tenantId,
      countryCode: evidence.countryCode,
      locale: evidence.locale,
      termsVersion: evidence.termsVersion,
      privacyVersion: evidence.privacyVersion,
      prohibitedContentVersion: evidence.prohibitedContentVersion,
      subscriptionTermsVersion: evidence.subscriptionTermsVersion,
      appSurface: evidence.appSurface as TermsAcceptanceEvidence['appSurface'],
      acceptanceSource: evidence.acceptanceSource as TermsAcceptanceEvidence['acceptanceSource'],
      acceptedAt: evidence.acceptedAt.toISOString(),
    };
  }

  private decimalToNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }

    return Number(value);
  }
}
