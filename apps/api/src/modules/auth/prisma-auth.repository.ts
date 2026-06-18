import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  TenantRole,
  TenantStatus,
  type AuthAccountChallenge,
  type AuthMfaChallenge,
  type AuthSession,
  type Country,
  type Tenant,
  type TenantMembership,
  type TermsAcceptanceEvidence as PrismaTermsAcceptanceEvidence,
  type User,
} from '@prisma/client';
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

  async findUserById(userId: string): Promise<AuthUserRecord | undefined> {
    return this.mapUser(await this.prisma.user.findUnique({ where: { id: userId } }));
  }

  async findFirstMembershipForUser(userId: string): Promise<TenantMembershipRecord | undefined> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { userId, role: TenantRole.OWNER },
      orderBy: { createdAt: 'asc' },
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

  async markUserEmailVerified(userId: string, emailVerifiedAt: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(emailVerifiedAt) },
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

  async revokeSessionsForUser(userId: string, revokedAt: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(revokedAt) },
    });
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
      mfaRequired: user.mfaRequired,
      mfaVerifiedAt: user.lastMfaVerifiedAt?.toISOString(),
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
      role: 'OWNER',
      createdAt: membership.createdAt.toISOString(),
    };
  }

  private mapSession(session: AuthSession): AuthSessionRecord {
    return {
      id: session.id,
      tokenHash: session.tokenHash,
      userId: session.userId,
      tenantId: session.tenantId,
      role: 'OWNER',
      mfaRequired: session.mfaRequired,
      mfaVerified: session.mfaVerified,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString(),
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

  private mapAccountChallenge(challenge: AuthAccountChallenge): AuthAccountChallengeRecord {
    return {
      id: challenge.id,
      userId: challenge.userId,
      email: challenge.email,
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
