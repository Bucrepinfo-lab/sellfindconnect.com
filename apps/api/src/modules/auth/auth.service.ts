import {
  ConflictException,
  Injectable,
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
  type SupplyChainRole,
  type TermsAcceptanceEvidence,
} from '@telpen/domain';
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  CheckTenantSessionDto,
  LoginDto,
  RegisterTenantOwnerDto,
  VerifyMfaDto,
} from './dto/auth.dto';

type AuthUserRecord = {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  mfaRequired: boolean;
  mfaVerifiedAt?: string;
  createdAt: string;
};

type AuthTenantRecord = {
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

type TenantMembershipRecord = {
  id: string;
  userId: string;
  tenantId: string;
  role: 'OWNER';
  createdAt: string;
};

type AuthSessionRecord = {
  id: string;
  token: string;
  userId: string;
  tenantId: string;
  role: 'OWNER';
  mfaRequired: boolean;
  mfaVerified: boolean;
  expiresAt: string;
  createdAt: string;
};

@Injectable()
export class AuthService {
  private readonly usersByEmail = new Map<string, AuthUserRecord>();
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly tenants = new Map<string, AuthTenantRecord>();
  private readonly memberships = new Map<string, TenantMembershipRecord>();
  private readonly sessions = new Map<string, AuthSessionRecord>();
  private readonly termsEvidence = new Map<string, TermsAcceptanceEvidence>();

  registerTenantOwner(input: RegisterTenantOwnerDto) {
    this.assertSafe(input, 'Registration contains blocked content.');

    const email = input.email.trim().toLowerCase();
    if (this.usersByEmail.has(email)) {
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

    this.usersByEmail.set(email, user);
    this.usersById.set(userId, user);
    this.tenants.set(tenantId, tenant);
    this.memberships.set(membership.id, membership);
    this.termsEvidence.set(`${userId}:${tenantId}`, termsAcceptance);

    return {
      user: this.presentUser(user),
      tenant,
      membership,
      session: this.createSession(user, tenantId),
      termsAcceptance,
      passwordPolicy,
    };
  }

  login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();
    const user = this.usersByEmail.get(email);
    if (!user || !this.verifyPassword(input.password, user)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const membership = Array.from(this.memberships.values()).find((item) => item.userId === user.id);
    if (!membership) {
      throw new UnauthorizedException('No tenant membership is attached to this account.');
    }

    return {
      user: this.presentUser(user),
      tenant: this.tenants.get(membership.tenantId),
      session: this.createSession(user, membership.tenantId),
    };
  }

  verifyMfa(input: VerifyMfaDto) {
    const session = this.requireSession(input.sessionToken);
    if (input.code !== '123456') {
      throw new UnauthorizedException('Invalid MFA code.');
    }

    const now = new Date().toISOString();
    const updated: AuthSessionRecord = {
      ...session,
      mfaVerified: true,
    };
    const user = this.usersById.get(session.userId);
    if (user) {
      this.usersById.set(user.id, { ...user, mfaVerifiedAt: now });
      this.usersByEmail.set(user.email, { ...user, mfaVerifiedAt: now });
    }

    this.sessions.set(session.token, updated);
    return {
      session: updated,
      mfaVerifiedAt: now,
    };
  }

  getSession(sessionToken: string) {
    const session = this.requireSession(sessionToken);
    return {
      session,
      user: this.presentUser(this.usersById.get(session.userId)!),
      tenant: this.tenants.get(session.tenantId),
      termsAcceptance: this.termsEvidence.get(`${session.userId}:${session.tenantId}`),
    };
  }

  checkTenantSession(input: CheckTenantSessionDto) {
    const session = this.requireSession(input.sessionToken);
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

  listTenants() {
    return Array.from(this.tenants.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private createSession(user: AuthUserRecord, tenantId: string): AuthSessionRecord {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.parse(now) + 8 * 60 * 60 * 1000).toISOString();
    const session: AuthSessionRecord = {
      id: randomUUID(),
      token: randomBytes(32).toString('base64url'),
      userId: user.id,
      tenantId,
      role: 'OWNER',
      mfaRequired: user.mfaRequired,
      mfaVerified: !user.mfaRequired,
      expiresAt,
      createdAt: now,
    };

    this.sessions.set(session.token, session);
    return session;
  }

  private requireSession(sessionToken: string): AuthSessionRecord {
    const session = this.sessions.get(sessionToken);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
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

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }
}
