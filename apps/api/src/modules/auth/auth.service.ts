import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  buildTermsAcceptanceEvidence,
  calculateTrialSubscription,
  evaluatePasswordPolicy,
  evaluateSafetyFields,
  getCountry,
  industryCategories,
  type TenantAccessRole,
} from '@telpen/domain';
import { createHash, pbkdf2Sync, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  AuthAuditRecord,
  AuthAccountChallengePurpose,
  AuthAccountChallengeRecord,
  AuthMfaChallengeRecord,
  AuthSessionRecord,
  AuthTenantRecord,
  AuthTenantInviteRecord,
  AuthUserRecord,
  IssuedAuthSession,
  PresentedAccountChallenge,
  PresentedMfaChallenge,
  PresentedAuthSession,
  PresentedTenantInvite,
  TenantMembershipRecord,
} from './auth.records';
import { AUTH_REPOSITORY, type AuthRepository } from './auth.repository';
import { tenantInviteRoles } from './dto/auth.dto';
import type {
  AcceptTenantInviteDto,
  CheckTenantSessionDto,
  ConfirmEmailVerificationDto,
  ConfirmPasswordResetDto,
  CreateTenantInviteDto,
  LoginDto,
  RegisterTenantOwnerDto,
  RequestEmailVerificationDto,
  RequestPasswordResetDto,
  VerifyMfaDto,
} from './dto/auth.dto';
import { InMemoryAuthRepository } from './in-memory-auth.repository';

const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MFA_MAX_FAILED_ATTEMPTS = 5;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const TENANT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Optional()
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthRepository = new InMemoryAuthRepository(),
  ) {}

  async registerTenantOwner(input: RegisterTenantOwnerDto) {
    this.assertSafe(input, 'Registration contains blocked content.');

    const email = input.email.trim().toLowerCase();
    if (await this.repository.findUserByEmail(email)) {
      throw new ConflictException('An account with this email already exists.');
    }

    const country = getCountry(input.countryCode);
    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (!industryCategories.some((industry) => industry.code === input.industryCode)) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }

    const passwordPolicy = evaluatePasswordPolicy(input.password);
    if (!passwordPolicy.allowed) {
      throw new UnprocessableEntityException({
        message: 'Password does not meet the security policy.',
        passwordPolicy,
      });
    }

    const now = new Date().toISOString();
    const userId = randomUUID();
    const tenantId = randomUUID();
    const password = this.hashPassword(input.password);
    const subscription = calculateTrialSubscription({
      startedAt: now,
      monthlyAmount: country.monthlySubscriptionAmount,
      currencyCode: country.currencyCode,
    });
    const user: AuthUserRecord = {
      id: userId,
      email,
      displayName: input.displayName,
      phone: input.phone,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      passwordIterations: password.iterations,
      mfaRequired: true,
      createdAt: now,
    };
    const tenant: AuthTenantRecord = {
      id: tenantId,
      displayName: input.tenantDisplayName,
      countryCode: country.code,
      industryCode: input.industryCode,
      primaryRole: input.primaryRole,
      userType: input.userType,
      status: subscription.status,
      trialStartedAt: subscription.trialStartedAt,
      trialEndsAt: subscription.trialEndsAt,
      nextBillingAt: subscription.nextBillingAt,
      monthlyAmount: subscription.monthlyAmount,
      currencyCode: subscription.currencyCode,
      createdAt: now,
    };
    const membership: TenantMembershipRecord = {
      id: randomUUID(),
      userId,
      tenantId,
      role: 'OWNER',
      createdAt: now,
    };
    const termsAcceptance = buildTermsAcceptanceEvidence({
      accepted: input.acceptedTerms,
      userId,
      tenantId,
      countryCode: country.code,
      locale: country.locale,
      appSurface: 'WEB',
      acceptanceSource: 'SIGNUP',
      acceptedAt: now,
    });

    if (!termsAcceptance) {
      throw new UnprocessableEntityException('Current terms acceptance is required.');
    }

    await this.repository.createOwnerRegistration({
      user,
      tenant,
      membership,
      termsAcceptance,
    });

    const session = await this.createSession(user, tenantId, 'OWNER');
    const emailVerificationChallenge = await this.createAccountChallenge(
      user,
      'EMAIL_VERIFICATION',
      EMAIL_VERIFICATION_TTL_MS,
    );

    await this.recordAudit({
      tenantId,
      actorUserId: user.id,
      action: 'AUTH_TENANT_OWNER_REGISTERED',
      entityType: 'TENANT',
      entityId: tenantId,
      metadata: {
        countryCode: country.code,
        industryCode: input.industryCode,
        role: 'OWNER',
        termsVersion: termsAcceptance.termsVersion,
      },
    });

    return {
      user: this.presentUser(user),
      tenant,
      membership,
      session,
      emailVerificationChallenge,
      termsAcceptance,
      passwordPolicy,
    };
  }

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(email);
    if (!user || !this.verifyPassword(input.password, user)) {
      await this.recordAudit({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'AUTH',
        metadata: {
          reason: 'INVALID_CREDENTIALS',
          emailHash: this.hashAuditIdentifier(email),
        },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    const membership = await this.repository.findFirstMembershipForUser(user.id);
    if (!membership) {
      await this.recordAudit({
        actorUserId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { reason: 'NO_TENANT_MEMBERSHIP' },
      });
      throw new UnauthorizedException('No tenant membership is attached to this account.');
    }

    const session = await this.createSession(user, membership.tenantId, membership.role);
    await this.recordAudit({
      tenantId: membership.tenantId,
      actorUserId: user.id,
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'AUTH_SESSION',
      entityId: session.id,
      metadata: {
        role: membership.role,
        mfaRequired: session.mfaRequired,
      },
    });

    return {
      user: this.presentUser(user),
      tenant: await this.repository.findTenantById(membership.tenantId),
      session,
    };
  }

  async requestEmailVerification(input: RequestEmailVerificationDto) {
    const user = await this.repository.findUserByEmail(input.email.trim().toLowerCase());
    const emailVerificationChallenge =
      user && !user.emailVerifiedAt
        ? await this.createAccountChallenge(user, 'EMAIL_VERIFICATION', EMAIL_VERIFICATION_TTL_MS)
        : undefined;

    if (user && emailVerificationChallenge) {
      const membership = await this.repository.findFirstMembershipForUser(user.id);
      await this.recordAudit({
        tenantId: membership?.tenantId,
        actorUserId: user.id,
        action: 'AUTH_EMAIL_VERIFICATION_REQUESTED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { emailHash: this.hashAuditIdentifier(user.email) },
      });
    }

    return {
      requested: true,
      emailVerificationChallenge: this.isProductionRuntime() ? undefined : emailVerificationChallenge,
    };
  }

  async confirmEmailVerification(input: ConfirmEmailVerificationDto) {
    const challenge = await this.requireAccountChallenge(input.token, 'EMAIL_VERIFICATION');
    const user = await this.repository.findUserById(challenge.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired account challenge.');
    }

    const now = new Date().toISOString();
    await this.repository.updateAccountChallenge({ ...challenge, consumedAt: now });
    await this.repository.markUserEmailVerified(challenge.userId, now);
    const membership = await this.repository.findFirstMembershipForUser(challenge.userId);
    await this.recordAudit({
      tenantId: membership?.tenantId,
      actorUserId: challenge.userId,
      action: 'AUTH_EMAIL_VERIFIED',
      entityType: 'USER',
      entityId: challenge.userId,
      metadata: { challengeId: challenge.id },
    });

    return {
      verified: true,
      emailVerifiedAt: now,
    };
  }

  async requestPasswordReset(input: RequestPasswordResetDto) {
    const user = await this.repository.findUserByEmail(input.email.trim().toLowerCase());
    const passwordResetChallenge = user
      ? await this.createAccountChallenge(user, 'PASSWORD_RESET', PASSWORD_RESET_TTL_MS)
      : undefined;

    if (user && passwordResetChallenge) {
      const membership = await this.repository.findFirstMembershipForUser(user.id);
      await this.recordAudit({
        tenantId: membership?.tenantId,
        actorUserId: user.id,
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { emailHash: this.hashAuditIdentifier(user.email) },
      });
    }

    return {
      requested: true,
      passwordResetChallenge: this.isProductionRuntime() ? undefined : passwordResetChallenge,
    };
  }

  async confirmPasswordReset(input: ConfirmPasswordResetDto) {
    const passwordPolicy = evaluatePasswordPolicy(input.newPassword);
    if (!passwordPolicy.allowed) {
      throw new UnprocessableEntityException({
        message: 'Password does not meet the security policy.',
        passwordPolicy,
      });
    }

    const challenge = await this.requireAccountChallenge(input.token, 'PASSWORD_RESET');
    const user = await this.repository.findUserById(challenge.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired account challenge.');
    }

    const now = new Date().toISOString();
    const password = this.hashPassword(input.newPassword);
    await this.repository.updateAccountChallenge({ ...challenge, consumedAt: now });
    await this.repository.updateUserPassword(user.id, {
      passwordHash: password.hash,
      passwordSalt: password.salt,
      passwordIterations: password.iterations,
    });
    await this.repository.revokeSessionsForUser(user.id, now);
    const membership = await this.repository.findFirstMembershipForUser(user.id);
    await this.recordAudit({
      tenantId: membership?.tenantId,
      actorUserId: user.id,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { challengeId: challenge.id, sessionsRevoked: true },
    });

    return {
      reset: true,
      sessionsRevokedAt: now,
      passwordPolicy,
    };
  }

  async createTenantInvite(input: CreateTenantInviteDto) {
    const session = await this.requireSession(input.sessionToken);
    if (session.tenantId !== input.tenantId || session.role !== 'OWNER') {
      throw new UnauthorizedException('Only a tenant owner can create invites for this tenant.');
    }

    if (!session.mfaVerified) {
      throw new UnauthorizedException('MFA verification is required before creating tenant invites.');
    }

    if (!tenantInviteRoles.includes(input.role)) {
      throw new UnprocessableEntityException('Unsupported tenant invite role.');
    }

    const tenant = await this.repository.findTenantById(input.tenantId);
    if (!tenant) {
      throw new UnprocessableEntityException('Unsupported tenant.');
    }

    const email = input.email.trim().toLowerCase();
    if (await this.repository.findUserByEmail(email)) {
      throw new ConflictException('An account with this email already exists.');
    }

    const invite = await this.createTenantInviteRecord({
      tenantId: tenant.id,
      email,
      role: input.role,
      invitedByUserId: session.userId,
    });
    await this.recordAudit({
      tenantId: tenant.id,
      actorUserId: session.userId,
      action: 'AUTH_TENANT_INVITE_CREATED',
      entityType: 'TENANT_INVITE',
      entityId: invite.id,
      metadata: {
        invitedEmailHash: this.hashAuditIdentifier(email),
        invitedRole: input.role,
      },
    });

    return {
      invite,
    };
  }

  async acceptTenantInvite(input: AcceptTenantInviteDto) {
    this.assertSafe(
      {
        displayName: input.displayName,
        phone: input.phone,
      },
      'Invite acceptance contains blocked content.',
    );

    const invite = await this.requireTenantInvite(input.token);
    if (await this.repository.findUserByEmail(invite.email)) {
      throw new ConflictException('An account with this email already exists.');
    }

    const tenant = await this.repository.findTenantById(invite.tenantId);
    const country = tenant ? getCountry(tenant.countryCode) : undefined;
    if (!tenant || !country) {
      throw new UnprocessableEntityException('Unsupported tenant.');
    }

    const passwordPolicy = evaluatePasswordPolicy(input.password);
    if (!passwordPolicy.allowed) {
      throw new UnprocessableEntityException({
        message: 'Password does not meet the security policy.',
        passwordPolicy,
      });
    }

    const now = new Date().toISOString();
    const userId = randomUUID();
    const password = this.hashPassword(input.password);
    const user: AuthUserRecord = {
      id: userId,
      email: invite.email,
      displayName: input.displayName,
      phone: input.phone,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      passwordIterations: password.iterations,
      emailVerifiedAt: now,
      mfaRequired: true,
      createdAt: now,
    };
    const membership: TenantMembershipRecord = {
      id: randomUUID(),
      userId,
      tenantId: invite.tenantId,
      role: invite.role,
      createdAt: now,
    };
    const termsAcceptance = buildTermsAcceptanceEvidence({
      accepted: input.acceptedTerms,
      userId,
      tenantId: invite.tenantId,
      countryCode: country.code,
      locale: country.locale,
      appSurface: 'WEB',
      acceptanceSource: 'ADMIN_INVITE',
      acceptedAt: now,
    });

    if (!termsAcceptance) {
      throw new UnprocessableEntityException('Current terms acceptance is required.');
    }

    await this.repository.updateTenantInvite({ ...invite, acceptedAt: now });
    await this.repository.createInvitedTenantUser({
      user,
      membership,
      termsAcceptance,
    });
    await this.recordAudit({
      tenantId: invite.tenantId,
      actorUserId: user.id,
      action: 'AUTH_TENANT_INVITE_ACCEPTED',
      entityType: 'TENANT_INVITE',
      entityId: invite.id,
      metadata: {
        invitedByUserId: invite.invitedByUserId,
        acceptedRole: invite.role,
        termsVersion: termsAcceptance.termsVersion,
      },
    });

    return {
      user: this.presentUser(user),
      tenant,
      membership,
      session: await this.createSession(user, invite.tenantId, invite.role),
      termsAcceptance,
      passwordPolicy,
    };
  }

  async verifyMfa(input: VerifyMfaDto) {
    const session = await this.requireSession(input.sessionToken);
    if (!session.mfaRequired || session.mfaVerified) {
      return {
        session: this.presentSession(session),
      };
    }

    const challenge = await this.repository.findMfaChallengeBySessionId(session.id);
    if (!challenge || challenge.consumedAt || Date.parse(challenge.expiresAt) <= Date.now()) {
      await this.recordAudit({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'AUTH_MFA_FAILED',
        entityType: 'AUTH_SESSION',
        entityId: session.id,
        metadata: { reason: 'CHALLENGE_UNAVAILABLE' },
      });
      throw new UnauthorizedException('MFA challenge expired or unavailable.');
    }

    if (challenge.failedAttempts >= MFA_MAX_FAILED_ATTEMPTS) {
      await this.recordAudit({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'AUTH_MFA_FAILED',
        entityType: 'AUTH_SESSION',
        entityId: session.id,
        metadata: { reason: 'CHALLENGE_LOCKED', challengeId: challenge.id },
      });
      throw new UnauthorizedException('MFA challenge locked after too many attempts.');
    }

    if (!this.verifyMfaCode(session.id, input.code, challenge.codeHash)) {
      await this.repository.updateMfaChallenge({
        ...challenge,
        failedAttempts: challenge.failedAttempts + 1,
      });
      await this.recordAudit({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'AUTH_MFA_FAILED',
        entityType: 'AUTH_SESSION',
        entityId: session.id,
        metadata: {
          reason: 'INVALID_CODE',
          challengeId: challenge.id,
          failedAttempts: challenge.failedAttempts + 1,
        },
      });
      throw new UnauthorizedException('Invalid MFA code.');
    }

    const now = new Date().toISOString();
    const updated: AuthSessionRecord = {
      ...session,
      mfaVerified: true,
    };
    await this.repository.updateMfaChallenge({
      ...challenge,
      consumedAt: now,
    });
    await this.repository.markUserMfaVerified(session.userId, now);

    await this.repository.updateSession(updated);
    await this.recordAudit({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: 'AUTH_MFA_VERIFIED',
      entityType: 'AUTH_SESSION',
      entityId: session.id,
      metadata: { challengeId: challenge.id },
    });
    return {
      session: this.presentSession(updated),
      mfaVerifiedAt: now,
    };
  }

  async getSession(sessionToken: string) {
    const session = await this.requireSession(sessionToken);
    const user = await this.repository.findUserById(session.userId);
    return {
      session: this.presentSession(session),
      user: user ? this.presentUser(user) : undefined,
      tenant: await this.repository.findTenantById(session.tenantId),
      termsAcceptance: await this.repository.findTermsAcceptance(session.userId, session.tenantId),
    };
  }

  async checkTenantSession(input: CheckTenantSessionDto) {
    const session = await this.requireSession(input.sessionToken);
    const allowed = session.tenantId === input.tenantId;

    if (!allowed) {
      throw new UnauthorizedException('Session is not authorized for this tenant.');
    }

    return {
      allowed: true,
      tenantId: session.tenantId,
      userId: session.userId,
      role: session.role,
      mfaVerified: session.mfaVerified,
    };
  }

  async listTenants() {
    return this.repository.listTenants();
  }

  async listTenantAuditLogs(input: CheckTenantSessionDto) {
    const session = await this.requireSession(input.sessionToken);
    if (session.tenantId !== input.tenantId || session.role !== 'OWNER') {
      throw new UnauthorizedException('Only a tenant owner can view audit logs for this tenant.');
    }

    if (!session.mfaVerified) {
      throw new UnauthorizedException('MFA verification is required before viewing audit logs.');
    }

    return {
      tenantId: input.tenantId,
      auditLogs: await this.repository.listAuditLogsForTenant(input.tenantId),
    };
  }

  private async createSession(
    user: AuthUserRecord,
    tenantId: string,
    role: TenantAccessRole,
  ): Promise<IssuedAuthSession> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.parse(now) + 8 * 60 * 60 * 1000).toISOString();
    const token = randomBytes(32).toString('base64url');
    const session: AuthSessionRecord = {
      id: randomUUID(),
      tokenHash: this.hashSessionToken(token),
      userId: user.id,
      tenantId,
      role,
      mfaRequired: user.mfaRequired,
      mfaVerified: !user.mfaRequired,
      expiresAt,
      createdAt: now,
    };

    await this.repository.createSession(session);
    return this.presentSession(session, token, await this.createMfaChallenge(session));
  }

  private async requireSession(sessionToken: string): Promise<AuthSessionRecord> {
    const session = await this.repository.findSessionByTokenHash(this.hashSessionToken(sessionToken));
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
      throw new UnauthorizedException('A valid active session is required.');
    }

    return session;
  }

  private async requireAccountChallenge(
    token: string,
    purpose: AuthAccountChallengePurpose,
  ): Promise<AuthAccountChallengeRecord> {
    const challenge = await this.repository.findAccountChallengeByTokenHash(
      this.hashAccountChallengeToken(purpose, token),
    );

    if (
      !challenge ||
      challenge.purpose !== purpose ||
      challenge.consumedAt ||
      Date.parse(challenge.expiresAt) <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired account challenge.');
    }

    return challenge;
  }

  private async requireTenantInvite(token: string): Promise<AuthTenantInviteRecord> {
    const invite = await this.repository.findTenantInviteByTokenHash(this.hashTenantInviteToken(token));

    if (
      !invite ||
      invite.acceptedAt ||
      invite.revokedAt ||
      Date.parse(invite.expiresAt) <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired tenant invite.');
    }

    return invite;
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const iterations = 210_000;
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
    return { salt, iterations, hash };
  }

  private hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('base64url');
  }

  private hashAuditIdentifier(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('base64url');
  }

  private hashAccountChallengeToken(purpose: AuthAccountChallengePurpose, token: string): string {
    return createHash('sha256').update(`${purpose}:${token}`).digest('base64url');
  }

  private hashTenantInviteToken(token: string): string {
    return createHash('sha256').update(`TENANT_INVITE:${token}`).digest('base64url');
  }

  private hashMfaCode(sessionId: string, code: string): string {
    return createHash('sha256').update(`${sessionId}:${code}`).digest('base64url');
  }

  private verifyMfaCode(sessionId: string, code: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashMfaCode(sessionId, code));
    const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private verifyPassword(password: string, user: AuthUserRecord): boolean {
    const actual = Buffer.from(
      pbkdf2Sync(password, user.passwordSalt, user.passwordIterations, 32, 'sha256').toString('base64url'),
    );
    const expected = Buffer.from(user.passwordHash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private presentUser(user: AuthUserRecord) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      emailVerifiedAt: user.emailVerifiedAt,
      mfaRequired: user.mfaRequired,
      mfaVerifiedAt: user.mfaVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  private async createMfaChallenge(
    session: AuthSessionRecord,
  ): Promise<PresentedMfaChallenge | undefined> {
    if (!session.mfaRequired || session.mfaVerified) {
      return undefined;
    }

    const now = new Date().toISOString();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge: AuthMfaChallengeRecord = {
      id: randomUUID(),
      sessionId: session.id,
      userId: session.userId,
      tenantId: session.tenantId,
      codeHash: this.hashMfaCode(session.id, code),
      deliveryChannel: this.isProductionRuntime() ? 'EMAIL' : 'DEVELOPMENT',
      expiresAt: new Date(Date.parse(now) + MFA_CHALLENGE_TTL_MS).toISOString(),
      failedAttempts: 0,
      createdAt: now,
    };

    await this.repository.createMfaChallenge(challenge);
    return this.presentMfaChallenge(challenge, code);
  }

  private async createAccountChallenge(
    user: AuthUserRecord,
    purpose: AuthAccountChallengePurpose,
    ttlMs: number,
  ): Promise<PresentedAccountChallenge> {
    const now = new Date().toISOString();
    const token = randomBytes(32).toString('base64url');
    const challenge: AuthAccountChallengeRecord = {
      id: randomUUID(),
      userId: user.id,
      email: user.email,
      purpose,
      tokenHash: this.hashAccountChallengeToken(purpose, token),
      expiresAt: new Date(Date.parse(now) + ttlMs).toISOString(),
      createdAt: now,
    };

    await this.repository.createAccountChallenge(challenge);
    return this.presentAccountChallenge(challenge, token);
  }

  private async createTenantInviteRecord(input: {
    tenantId: string;
    email: string;
    role: Exclude<TenantAccessRole, 'OWNER'>;
    invitedByUserId: string;
  }): Promise<PresentedTenantInvite> {
    const now = new Date().toISOString();
    const token = randomBytes(32).toString('base64url');
    const invite: AuthTenantInviteRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      email: input.email,
      role: input.role,
      tokenHash: this.hashTenantInviteToken(token),
      invitedByUserId: input.invitedByUserId,
      expiresAt: new Date(Date.parse(now) + TENANT_INVITE_TTL_MS).toISOString(),
      createdAt: now,
    };

    await this.repository.createTenantInvite(invite);
    return this.presentTenantInvite(invite, token);
  }

  private presentSession(session: AuthSessionRecord): PresentedAuthSession;
  private presentSession(
    session: AuthSessionRecord,
    token: string,
    mfaChallenge?: PresentedMfaChallenge,
  ): IssuedAuthSession;
  private presentSession(
    session: AuthSessionRecord,
    token?: string,
    mfaChallenge?: PresentedMfaChallenge,
  ): PresentedAuthSession | IssuedAuthSession {
    const presented: PresentedAuthSession = {
      id: session.id,
      userId: session.userId,
      tenantId: session.tenantId,
      role: session.role,
      mfaRequired: session.mfaRequired,
      mfaVerified: session.mfaVerified,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };

    if (token) {
      return { ...presented, token, mfaChallenge };
    }

    return presented;
  }

  private presentMfaChallenge(
    challenge: AuthMfaChallengeRecord,
    developmentCode?: string,
  ): PresentedMfaChallenge {
    const presented: PresentedMfaChallenge = {
      id: challenge.id,
      deliveryChannel: challenge.deliveryChannel,
      expiresAt: challenge.expiresAt,
      createdAt: challenge.createdAt,
    };

    if (challenge.deliveryChannel === 'DEVELOPMENT' && !this.isProductionRuntime()) {
      return { ...presented, developmentCode };
    }

    return presented;
  }

  private presentAccountChallenge(
    challenge: AuthAccountChallengeRecord,
    developmentToken?: string,
  ): PresentedAccountChallenge {
    const presented: PresentedAccountChallenge = {
      id: challenge.id,
      purpose: challenge.purpose,
      expiresAt: challenge.expiresAt,
      createdAt: challenge.createdAt,
    };

    if (!this.isProductionRuntime()) {
      return { ...presented, developmentToken };
    }

    return presented;
  }

  private presentTenantInvite(
    invite: AuthTenantInviteRecord,
    developmentToken?: string,
  ): PresentedTenantInvite {
    const presented: PresentedTenantInvite = {
      id: invite.id,
      tenantId: invite.tenantId,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };

    if (!this.isProductionRuntime()) {
      return { ...presented, developmentToken };
    }

    return presented;
  }

  private isProductionRuntime(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private async recordAudit(input: Omit<AuthAuditRecord, 'id' | 'createdAt'>): Promise<void> {
    await this.repository.createAuditLog({
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    });
  }

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }
}
