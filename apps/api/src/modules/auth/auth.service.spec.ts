import { describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';

const strongPassword = 'Strong-owner#2026';

describe('AuthService', () => {
  it('registers an owner, creates a tenant trial, and stores terms evidence', () => {
    const service = new AuthService();
    const result = service.registerTenantOwner({
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
  });

  it('rejects weak passwords and duplicate emails', () => {
    const service = new AuthService();

    expect(() =>
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
    ).toThrow();

    service.registerTenantOwner({
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

    expect(() =>
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
    ).toThrow();
  });

  it('logs in with a valid password and rejects the wrong password', () => {
    const service = new AuthService();
    service.registerTenantOwner({
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

    expect(service.login({ email: 'owner@example.com', password: strongPassword }).session.token).toBeTruthy();
    expect(() => service.login({ email: 'owner@example.com', password: 'Wrong-owner#2026' })).toThrow();
  });

  it('verifies MFA for an owner session', () => {
    const service = new AuthService();
    const registered = service.registerTenantOwner({
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

    const result = service.verifyMfa({
      sessionToken: registered.session.token,
      code: '123456',
    });

    expect(result.session.mfaVerified).toBe(true);
  });

  it('proves session tenant isolation', () => {
    const service = new AuthService();
    const registered = service.registerTenantOwner({
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

    expect(
      service.checkTenantSession({
        sessionToken: registered.session.token,
        tenantId: registered.tenant.id,
      }).allowed,
    ).toBe(true);
    expect(() =>
      service.checkTenantSession({
        sessionToken: registered.session.token,
        tenantId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toThrow();
  });

  it('blocks prohibited registration text', () => {
    const service = new AuthService();

    expect(() =>
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
    ).toThrow();
  });
});
