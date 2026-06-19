import { describe, expect, it } from 'vitest';

import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { AuthService } from './auth.service';

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
});
