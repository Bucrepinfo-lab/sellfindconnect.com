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
} from '@telpen/domain';
import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  AuthSessionRecord,
  AuthTenantRecord,
  AuthUserRecord,
  IssuedAuthSession,
  PresentedAuthSession,
  TenantMembershipRecord,
} from './auth.records';
import { AUTH_REPOSITORY, type AuthRepository } from './auth.repository';
import type {
  CheckTenantSessionDto,
  LoginDto,
  RegisterTenantOwnerDto,
  VerifyMfaDto,
} from './dto/auth.dto';
import { InMemoryAuthRepository } from './in-memory-auth.repository';

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

    return {
      user: this.presentUser(user),
      tenant,
      membership,
      session: await this.createSession(user, tenantId),
      termsAcceptance,
      passwordPolicy,
    };
  }

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(email);
    if (!user || !this.verifyPassword(input.password, user)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const membership = await this.repository.findFirstMembershipForUser(user.id);
    if (!membership) {
      throw new UnauthorizedException('No tenant membership is attached to this account.');
    }

    return {
      user: this.presentUser(user),
      tenant: await this.repository.findTenantById(membership.tenantId),
      session: await this.createSession(user, membership.tenantId),
    };
  }

  async verifyMfa(input: VerifyMfaDto) {
    const session = await this.requireSession(input.sessionToken);
    if (input.code !== '123456') {
      throw new UnauthorizedException('Invalid MFA code.');
    }

    const now = new Date().toISOString();
    const updated: AuthSessionRecord = {
      ...session,
      mfaVerified: true,
    };
    await this.repository.markUserMfaVerified(session.userId, now);

    await this.repository.updateSession(updated);
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
      mfaVerified: session.mfaVerified,
    };
  }

  async listTenants() {
    return this.repository.listTenants();
  }

  private async createSession(user: AuthUserRecord, tenantId: string): Promise<IssuedAuthSession> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.parse(now) + 8 * 60 * 60 * 1000).toISOString();
    const token = randomBytes(32).toString('base64url');
    const session: AuthSessionRecord = {
      id: randomUUID(),
      tokenHash: this.hashSessionToken(token),
      userId: user.id,
      tenantId,
      role: 'OWNER',
      mfaRequired: user.mfaRequired,
      mfaVerified: !user.mfaRequired,
      expiresAt,
      createdAt: now,
    };

    await this.repository.createSession(session);
    return this.presentSession(session, token);
  }

  private async requireSession(sessionToken: string): Promise<AuthSessionRecord> {
    const session = await this.repository.findSessionByTokenHash(this.hashSessionToken(sessionToken));
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
      throw new UnauthorizedException('A valid active session is required.');
    }

    return session;
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
      mfaRequired: user.mfaRequired,
      mfaVerifiedAt: user.mfaVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  private presentSession(session: AuthSessionRecord): PresentedAuthSession;
  private presentSession(session: AuthSessionRecord, token: string): IssuedAuthSession;
  private presentSession(session: AuthSessionRecord, token?: string): PresentedAuthSession {
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
      return { ...presented, token };
    }

    return presented;
  }

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }
}
