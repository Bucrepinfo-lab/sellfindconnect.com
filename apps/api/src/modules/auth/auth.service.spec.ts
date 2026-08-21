import { describe, expect, it, vi } from 'vitest';

import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { AuthService } from './auth.service';
import type { AuthEmailMessage, AuthEmailSender } from './resend-email';
import { generateTotpCode } from '@telpen/domain';

const strongPassword = 'Strong-owner#2026';

describe('AuthService', () => {
  it('registers an owner, creates a tenant trial, and stores terms evidence', async () => {
    const service = new AuthService();
    const result = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    expect(result.user.email).toBe('owner@example.com');
    expect(result.tenant.status).toBe('TRIAL_ACTIVE');
    expect(result.tenant.monthlyAmount).toBe(10);
    expect(result.membership.role).toBe('OWNER');
    expect(result.termsAcceptance.termsVersion).toContain('terms-');
    expect(result.session.mfaRequired).toBe(true);
    expect(result.session.mfaChallenge?.developmentCode).toMatch(/^\d{6}$/);
    expect(result.emailVerificationChallenge.developmentToken).toBeTruthy();
  });

  it('rejects weak passwords and duplicate emails', async () => {
    const service = new AuthService();

    await expect(
      service.registerTenantOwner({
        email: 'owner@example.com',
        password: 'password',
        displayName: 'Mary Owner',
        tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
        countryCode: 'KE',
        industryCode: 'AGRICULTURE',
        primaryRole: 'SUPPLIER',
        userType: 'ADVERTISER',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();

    await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    await expect(
      service.registerTenantOwner({
        email: 'OWNER@example.com',
        password: 'Another-owner#2026',
        displayName: 'Other Owner',
        tenantDisplayName: 'Other Tenant',
        countryCode: 'KE',
        industryCode: 'AGRICULTURE',
        primaryRole: 'SUPPLIER',
        userType: 'ADVERTISER',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();
  });

  it('logs in with a valid password and rejects the wrong password', async () => {
    const service = new AuthService();
    await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    await expect(service.login({ email: 'owner@example.com', password: strongPassword })).resolves.toMatchObject({
      session: { token: expect.any(String) },
    });
    await expect(service.login({ email: 'owner@example.com', password: 'Wrong-owner#2026' })).rejects.toThrow();
  });

  it('logs in via phone OTP and issues a session for the same account', async () => {
    const service = new AuthService();
    await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      phone: '0712345678',
      acceptedTerms: true,
    });

    // Normalises to E.164 and issues a code for the existing account.
    const requested = await service.requestPhoneOtp({ phone: '+254 712 345 678' });
    expect(requested.requested).toBe(true);
    expect(requested.developmentCode).toMatch(/^\d{6}$/);

    const verified = await service.verifyPhoneOtp({
      phone: '0712345678',
      code: requested.developmentCode as string,
    });
    expect(verified.session.token).toEqual(expect.any(String));
    expect(verified.user.phoneVerifiedAt).toBeTruthy();

    // The code is single-use.
    await expect(
      service.verifyPhoneOtp({ phone: '0712345678', code: requested.developmentCode as string }),
    ).rejects.toThrow();
  });

  it('does not reveal whether an unknown phone exists, and rejects bad codes', async () => {
    const service = new AuthService();
    const requested = await service.requestPhoneOtp({ phone: '0700000000' });
    expect(requested.requested).toBe(true);
    expect(requested.developmentCode).toBeUndefined();

    await expect(service.verifyPhoneOtp({ phone: '0700000000', code: '000000' })).rejects.toThrow();
  });

  it('stores sessions by token hash and never presents the hash to callers', async () => {
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository);
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    const sessionLookup = await service.getSession(registered.session.token);

    expect(registered.session.token).toBeTruthy();
    expect('tokenHash' in registered.session).toBe(false);
    expect('token' in sessionLookup.session).toBe(false);
    expect(sessionLookup.session.token).toBeUndefined();
    expect('tokenHash' in sessionLookup.session).toBe(false);
  });

  it('verifies an owner email using the issued account challenge token', async () => {
    const service = new AuthService();
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    const token = registered.emailVerificationChallenge.developmentToken ?? '';
    const result = await service.confirmEmailVerification({ token });
    const sessionLookup = await service.getSession(registered.session.token);

    expect(result.verified).toBe(true);
    expect(sessionLookup.user?.emailVerifiedAt).toBe(result.emailVerifiedAt);
  });

  it('resets a password with an expiring challenge and revokes old sessions', async () => {
    const service = new AuthService();
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    const request = await service.requestPasswordReset({ email: 'OWNER@example.com' });
    const token = request.passwordResetChallenge?.developmentToken ?? '';
    const result = await service.confirmPasswordReset({
      token,
      newPassword: 'New-owner#2026',
    });

    expect(result.reset).toBe(true);
    await expect(service.getSession(registered.session.token)).rejects.toThrow();
    await expect(service.login({ email: 'owner@example.com', password: strongPassword })).rejects.toThrow();
    await expect(service.login({ email: 'owner@example.com', password: 'New-owner#2026' })).resolves.toMatchObject({
      session: { token: expect.any(String) },
    });
    await expect(
      service.confirmPasswordReset({
        token,
        newPassword: 'Another-owner#2026',
      }),
    ).rejects.toThrow();
  });

  it('verifies MFA for an owner session', async () => {
    const service = new AuthService();
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    const issuedCode = registered.session.mfaChallenge?.developmentCode ?? '';
    expect(issuedCode).toMatch(/^\d{6}$/);

    const result = await service.verifyMfa({
      sessionToken: registered.session.token,
      code: issuedCode,
    });

    expect(result.session.mfaVerified).toBe(true);
  });

  it('records owner auth events in tenant audit logs', async () => {
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository);
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    await service.verifyMfa({
      sessionToken: registered.session.token,
      code: registered.session.mfaChallenge?.developmentCode ?? '',
    });

    const result = await service.listTenantAuditLogs({
      sessionToken: registered.session.token,
      tenantId: registered.tenant.id,
    });
    const actions = result.auditLogs.map((record) => record.action);

    expect(actions).toContain('AUTH_TENANT_OWNER_REGISTERED');
    expect(actions).toContain('AUTH_MFA_VERIFIED');
    expect(result.auditLogs.some((record) => JSON.stringify(record).includes('developmentToken'))).toBe(false);
  });

  it('rejects an invalid MFA challenge code before accepting the issued code', async () => {
    const service = new AuthService();
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    const issuedCode = registered.session.mfaChallenge?.developmentCode ?? '';
    const invalidCode = issuedCode === '000000' ? '000001' : '000000';

    await expect(
      service.verifyMfa({
        sessionToken: registered.session.token,
        code: invalidCode,
      }),
    ).rejects.toThrow();

    await expect(
      service.verifyMfa({
        sessionToken: registered.session.token,
        code: issuedCode,
      }),
    ).resolves.toMatchObject({
      session: { mfaVerified: true },
    });
  });

  it('lets an MFA-verified owner invite and onboard a tenant user', async () => {
    const service = new AuthService();
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    await expect(
      service.createTenantInvite({
        sessionToken: registered.session.token,
        tenantId: registered.tenant.id,
        email: 'agent@example.com',
        role: 'SALES_CHAT_AGENT',
      }),
    ).rejects.toThrow();

    await service.verifyMfa({
      sessionToken: registered.session.token,
      code: registered.session.mfaChallenge?.developmentCode ?? '',
    });

    const invite = await service.createTenantInvite({
      sessionToken: registered.session.token,
      tenantId: registered.tenant.id,
      email: 'agent@example.com',
      role: 'SALES_CHAT_AGENT',
    });
    const accepted = await service.acceptTenantInvite({
      token: invite.invite.developmentToken ?? '',
      displayName: 'Grace Agent',
      password: 'Invited-agent#2026',
      acceptedTerms: true,
    });

    expect(accepted.user.email).toBe('agent@example.com');
    expect(accepted.user.emailVerifiedAt).toBeTruthy();
    expect(accepted.membership.role).toBe('SALES_CHAT_AGENT');
    expect(accepted.session.role).toBe('SALES_CHAT_AGENT');
    await expect(
      service.login({ email: 'agent@example.com', password: 'Invited-agent#2026' }),
    ).resolves.toMatchObject({
      session: { role: 'SALES_CHAT_AGENT', token: expect.any(String) },
    });
    await expect(
      service.acceptTenantInvite({
        token: invite.invite.developmentToken ?? '',
        displayName: 'Second Agent',
        password: 'Invited-agent#2027',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();
  });

  it('lets an existing account accept a tenant invite with its own active session', async () => {
    const service = new AuthService();
    const owner = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });
    const existingUser = await service.registerTenantOwner({
      email: 'agent@example.com',
      password: 'Existing-agent#2026',
      displayName: 'Grace Agent',
      tenantDisplayName: 'Grace Agent Advisory',
      countryCode: 'KE',
      industryCode: 'PROFESSIONAL',
      primaryRole: 'SERVICE_PROVIDER',
      userType: 'BOTH',
      acceptedTerms: true,
    });

    await service.verifyMfa({
      sessionToken: owner.session.token,
      code: owner.session.mfaChallenge?.developmentCode ?? '',
    });

    const invite = await service.createTenantInvite({
      sessionToken: owner.session.token,
      tenantId: owner.tenant.id,
      email: 'agent@example.com',
      role: 'ANALYTICS_VIEWER',
    });

    await expect(
      service.acceptTenantInvite({
        token: invite.invite.developmentToken ?? '',
        sessionToken: owner.session.token,
        acceptedTerms: true,
      }),
    ).rejects.toThrow();

    const accepted = await service.acceptTenantInvite({
      token: invite.invite.developmentToken ?? '',
      sessionToken: existingUser.session.token,
      acceptedTerms: true,
    });

    expect(accepted.user.id).toBe(existingUser.user.id);
    expect(accepted.membership.tenantId).toBe(owner.tenant.id);
    expect(accepted.membership.role).toBe('ANALYTICS_VIEWER');
    expect(accepted.session.tenantId).toBe(owner.tenant.id);
    expect(accepted.session.role).toBe('ANALYTICS_VIEWER');
  });

  it('proves session tenant isolation', async () => {
    const service = new AuthService();
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    await expect(
      service.checkTenantSession({
        sessionToken: registered.session.token,
        tenantId: registered.tenant.id,
      }),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      service.checkTenantSession({
        sessionToken: registered.session.token,
        tenantId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toThrow();
  });

  it('authorizes platform moderation through active scoped access assignments', async () => {
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository);
    const registered = await service.registerTenantOwner({
      email: 'moderator@example.com',
      password: strongPassword,
      displayName: 'Mary Moderator',
      tenantDisplayName: 'Moderator Home Tenant',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });
    await service.verifyMfa({
      sessionToken: registered.session.token,
      code: registered.session.mfaChallenge?.developmentCode ?? '',
    });
    const now = new Date().toISOString();

    repository.createAccessAssignment({
      id: 'assignment-1',
      userId: registered.user.id,
      role: 'COUNTRY_MODERATOR',
      scopeLevel: 'COUNTRY',
      countryCode: 'KE',
      mfaRequired: true,
      assignedBy: 'global-admin',
      createdAt: now,
      updatedAt: now,
    });

    const session = await service.checkPlatformSession({
      sessionToken: registered.session.token,
      permission: 'MODERATE_CONTENT',
    });

    expect(session.assignments).toHaveLength(1);
    await expect(
      service.requirePlatformAccess(session, 'MODERATE_CONTENT', {
        tenantId: registered.tenant.id,
        countryCode: 'KE',
      }),
    ).resolves.toMatchObject({ allowed: true, role: 'COUNTRY_MODERATOR' });
    await expect(
      service.requirePlatformAccess(session, 'MODERATE_CONTENT', {
        tenantId: '22222222-2222-4222-8222-222222222222',
        countryCode: 'UG',
      }),
    ).rejects.toThrow('scope');
  });

  it('blocks prohibited registration text', async () => {
    const service = new AuthService();

    await expect(
      service.registerTenantOwner({
        email: 'owner@example.com',
        password: strongPassword,
        displayName: 'Mary Owner',
        tenantDisplayName: 'Ammunition delivery cooperative',
        countryCode: 'KE',
        industryCode: 'AGRICULTURE',
        primaryRole: 'SUPPLIER',
        userType: 'ADVERTISER',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();
  });

  it('keeps development tokens when no live auth email sender is configured', async () => {
    const service = new AuthService();
    const result = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    expect(result.emailVerificationChallenge.developmentToken).toBeTruthy();
    expect(result.session.mfaChallenge?.developmentCode).toMatch(/^\d{6}$/);
  });

  it('delivers verification, reset, invite, and MFA mail and hides development secrets', async () => {
    const sent: AuthEmailMessage[] = [];
    const sender: AuthEmailSender = {
      async sendAuthEmail(message) {
        sent.push(message);
        return { ok: true, providerRef: 're_test' };
      },
    };
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository, undefined, sender);
    const registered = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    expect(registered.emailVerificationChallenge.developmentToken).toBeUndefined();
    expect(registered.session.mfaChallenge?.developmentCode).toBeUndefined();
    expect(registered.session.mfaChallenge?.deliveryChannel).toBe('EMAIL');

    const verification = sent.find((message) => message.purpose === 'EMAIL_VERIFICATION');
    const mfa = sent.find((message) => message.purpose === 'MFA');
    const verificationToken = verification?.text.match(/verification token: (\S+)/)?.[1] ?? '';
    const mfaCode = mfa?.text.match(/^(\d{6}) /)?.[1] ?? '';

    expect(verification?.to).toBe('owner@example.com');
    expect(verificationToken).toBeTruthy();
    expect(mfaCode).toMatch(/^\d{6}$/);
    await expect(service.confirmEmailVerification({ token: verificationToken })).resolves.toMatchObject({
      verified: true,
    });
    await expect(
      service.verifyMfa({ sessionToken: registered.session.token, code: mfaCode }),
    ).resolves.toMatchObject({ session: { mfaVerified: true } });

    sent.length = 0;
    const reset = await service.requestPasswordReset({ email: 'OWNER@example.com' });
    expect(reset.passwordResetChallenge?.developmentToken).toBeUndefined();
    const resetMail = sent.find((message) => message.purpose === 'PASSWORD_RESET');
    const resetToken = resetMail?.text.match(/reset token: (\S+)/)?.[1] ?? '';
    expect(resetToken).toBeTruthy();
    await expect(
      service.confirmPasswordReset({ token: resetToken, newPassword: 'New-owner#2026' }),
    ).resolves.toMatchObject({ reset: true });

    const relogin = await service.login({ email: 'owner@example.com', password: 'New-owner#2026' });
    const reloginCode =
      sent
        .find(
          (message) =>
            message.purpose === 'MFA' && message.idempotencyKey === relogin.session.mfaChallenge?.id,
        )
        ?.text.match(/^(\d{6}) /)?.[1] ?? '';
    expect(reloginCode).toMatch(/^\d{6}$/);
    await service.verifyMfa({ sessionToken: relogin.session.token, code: reloginCode });

    sent.length = 0;
    const invite = await service.createTenantInvite({
      sessionToken: relogin.session.token,
      tenantId: registered.tenant.id,
      email: 'agent@example.com',
      role: 'SALES_CHAT_AGENT',
    });
    expect(invite.invite.developmentToken).toBeUndefined();
    const inviteMail = sent.find((message) => message.purpose === 'TENANT_INVITE');
    const inviteToken = inviteMail?.text.match(/invite token: (\S+)/)?.[1] ?? '';
    expect(inviteToken).toBeTruthy();
    expect(inviteMail?.to).toBe('agent@example.com');
    expect(inviteMail?.text).toContain('Nairobi Fresh Produce Cooperative');
    await expect(
      service.acceptTenantInvite({
        token: inviteToken,
        displayName: 'Grace Agent',
        password: 'Invited-agent#2026',
        acceptedTerms: true,
      }),
    ).resolves.toMatchObject({ membership: { role: 'SALES_CHAT_AGENT' } });

    const audit = await service.listTenantAuditLogs({
      sessionToken: relogin.session.token,
      tenantId: registered.tenant.id,
    });
    const auditBlob = JSON.stringify(audit.auditLogs);
    expect(auditBlob).not.toContain(verificationToken);
    expect(auditBlob).not.toContain(resetToken);
    expect(auditBlob).not.toContain(inviteToken);
    expect(auditBlob).not.toContain(mfaCode);
    expect(auditBlob).not.toContain('owner@example.com');
    expect(auditBlob).not.toContain('re_test');
  });

  it('keeps development tokens when live auth email delivery fails', async () => {
    const sender: AuthEmailSender = {
      async sendAuthEmail() {
        throw new Error('provider unavailable');
      },
    };
    const service = new AuthService(new InMemoryAuthRepository(), undefined, sender);
    const result = await service.registerTenantOwner({
      email: 'owner@example.com',
      password: strongPassword,
      displayName: 'Mary Owner',
      tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });

    expect(result.emailVerificationChallenge.developmentToken).toBeTruthy();
    expect(result.session.mfaChallenge?.developmentCode).toMatch(/^\d{6}$/);
    expect(result.session.mfaChallenge?.deliveryChannel).toBe('DEVELOPMENT');
  });

  it('enrolls an authenticator and verifies later logins with TOTP', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T18:00:00.000Z'));
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository);
    try {
      const registered = await service.registerTenantOwner({
        email: 'owner@example.com',
        password: strongPassword,
        displayName: 'Mary Owner',
        tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
        countryCode: 'KE',
        industryCode: 'AGRICULTURE',
        primaryRole: 'SUPPLIER',
        userType: 'ADVERTISER',
        acceptedTerms: true,
      });

      await expect(
        service.enrollTotp({ sessionToken: registered.session.token }),
      ).rejects.toThrow('MFA verification is required');

      await service.verifyMfa({
        sessionToken: registered.session.token,
        code: registered.session.mfaChallenge?.developmentCode ?? '',
      });

      const enrollment = await service.enrollTotp({ sessionToken: registered.session.token });
      expect(enrollment.enrollment.secret).toMatch(/^[A-Z2-7]+$/);
      expect(enrollment.enrollment.otpauthUri).toContain('otpauth://totp/');
      expect(enrollment.enrollment.otpauthUri).toContain(enrollment.enrollment.secret);
      expect(registered.user.totpEnrolled).toBe(false);

      const confirmCode = generateTotpCode(enrollment.enrollment.secret);
      const confirmed = await service.confirmTotpEnrollment({
        sessionToken: registered.session.token,
        code: confirmCode,
      });
      expect(confirmed).toMatchObject({ enrolled: true, deliveryChannel: 'AUTHENTICATOR' });

      const sessionLookup = await service.getSession(registered.session.token);
      expect(sessionLookup.user?.totpEnrolled).toBe(true);
      expect(JSON.stringify(sessionLookup.user)).not.toContain(enrollment.enrollment.secret);

      vi.setSystemTime(new Date('2026-08-21T18:00:31.000Z'));
      const login = await service.login({ email: 'owner@example.com', password: strongPassword });
      expect(login.session.mfaChallenge?.deliveryChannel).toBe('AUTHENTICATOR');
      expect(login.session.mfaChallenge?.developmentCode).toBeUndefined();
      expect(login.user.totpEnrolled).toBe(true);

      await expect(
        service.verifyMfa({
          sessionToken: login.session.token,
          code: registered.session.mfaChallenge?.developmentCode ?? '000000',
        }),
      ).rejects.toThrow();

      const totpCode = generateTotpCode(enrollment.enrollment.secret);
      await expect(
        service.verifyMfa({ sessionToken: login.session.token, code: totpCode }),
      ).resolves.toMatchObject({ session: { mfaVerified: true } });

      const audit = await service.listTenantAuditLogs({
        sessionToken: login.session.token,
        tenantId: registered.tenant.id,
      });
      const blob = JSON.stringify(audit.auditLogs);
      expect(audit.auditLogs.map((record) => record.action)).toEqual(
        expect.arrayContaining(['AUTH_TOTP_ENROLLMENT_STARTED', 'AUTH_TOTP_ENROLLED', 'AUTH_MFA_VERIFIED']),
      );
      expect(blob).not.toContain(enrollment.enrollment.secret);
      expect(blob).not.toContain('otpauth://');
      expect(blob).not.toContain('owner@example.com');
    } finally {
      vi.useRealTimers();
    }
  });
});
