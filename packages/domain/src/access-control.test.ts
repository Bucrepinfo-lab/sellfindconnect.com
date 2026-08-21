import { describe, expect, it } from 'vitest';

import { evaluateAccess, getRolePermissions, normalizeResourceScope, requiresMfa } from './access-control';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '22222222-2222-4222-8222-222222222222';

describe('access control policy', () => {
  it('allows a tenant owner to manage only their tenant when MFA is verified', () => {
    const allowed = evaluateAccess({
      subject: {
        userId: 'user-1',
        role: 'OWNER',
        mfaVerified: true,
        scope: { level: 'TENANT', tenantIds: [tenantId] },
      },
      permission: 'MANAGE_TENANT',
      resource: { tenantId, countryCode: 'KE' },
    });
    const denied = evaluateAccess({
      subject: {
        userId: 'user-1',
        role: 'OWNER',
        mfaVerified: true,
        scope: { level: 'TENANT', tenantIds: [tenantId] },
      },
      permission: 'MANAGE_TENANT',
      resource: { tenantId: otherTenantId, countryCode: 'KE' },
    });

    expect(allowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('SCOPE_MISMATCH');
  });

  it('requires MFA for privileged roles', () => {
    const decision = evaluateAccess({
      subject: {
        userId: 'user-1',
        role: 'COUNTRY_ADMIN',
        mfaVerified: false,
        scope: { level: 'COUNTRY', countryCodes: ['KE'] },
      },
      permission: 'MANAGE_COUNTRY',
      resource: { countryCode: 'KE' },
    });

    expect(requiresMfa('COUNTRY_ADMIN')).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('MFA_REQUIRED');
  });

  it('prevents country admins from reaching another assigned country', () => {
    const decision = evaluateAccess({
      subject: {
        userId: 'user-1',
        role: 'COUNTRY_ADMIN',
        mfaVerified: true,
        scope: { level: 'COUNTRY', countryCodes: ['UG'] },
      },
      permission: 'MANAGE_COUNTRY',
      resource: { countryCode: 'KE' },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('SCOPE_MISMATCH');
  });

  it('allows global finance admins to view billing but not moderate content', () => {
    expect(getRolePermissions('GLOBAL_FINANCE_ADMIN')).toContain('VIEW_BILLING');
    expect(getRolePermissions('GLOBAL_FINANCE_ADMIN')).not.toContain('MODERATE_CONTENT');
  });

  it('lets country finance admins manage finance after MFA', () => {
    const allowed = evaluateAccess({
      subject: {
        userId: 'finance-1',
        role: 'COUNTRY_FINANCE_ADMIN',
        mfaVerified: true,
        scope: { level: 'COUNTRY', countryCodes: ['KE'] },
      },
      permission: 'MANAGE_FINANCE',
      resource: { countryCode: 'KE' },
    });
    const denied = evaluateAccess({
      subject: {
        userId: 'finance-1',
        role: 'COUNTRY_FINANCE_ADMIN',
        mfaVerified: true,
        scope: { level: 'COUNTRY', countryCodes: ['KE'] },
      },
      permission: 'MANAGE_FINANCE',
      resource: { countryCode: 'UG' },
    });

    expect(requiresMfa('COUNTRY_FINANCE_ADMIN')).toBe(true);
    expect(getRolePermissions('COUNTRY_FINANCE_ADMIN')).toContain('MANAGE_FINANCE');
    expect(allowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('SCOPE_MISMATCH');
  });

  it('allows country moderators to moderate only their country after MFA', () => {
    const allowed = evaluateAccess({
      subject: {
        userId: 'moderator-1',
        role: 'COUNTRY_MODERATOR',
        mfaVerified: true,
        scope: { level: 'COUNTRY', countryCodes: ['KE'] },
      },
      permission: 'MODERATE_CONTENT',
      resource: { countryCode: 'KE' },
    });
    const deniedWithoutMfa = evaluateAccess({
      subject: {
        userId: 'moderator-1',
        role: 'COUNTRY_MODERATOR',
        mfaVerified: false,
        scope: { level: 'COUNTRY', countryCodes: ['KE'] },
      },
      permission: 'MODERATE_CONTENT',
      resource: { countryCode: 'KE' },
    });
    const deniedOtherCountry = evaluateAccess({
      subject: {
        userId: 'moderator-1',
        role: 'COUNTRY_MODERATOR',
        mfaVerified: true,
        scope: { level: 'COUNTRY', countryCodes: ['UG'] },
      },
      permission: 'MODERATE_CONTENT',
      resource: { countryCode: 'KE' },
    });

    expect(requiresMfa('COUNTRY_MODERATOR')).toBe(true);
    expect(allowed.allowed).toBe(true);
    expect(deniedWithoutMfa.reason).toBe('MFA_REQUIRED');
    expect(deniedOtherCountry.reason).toBe('SCOPE_MISMATCH');
  });

  it('normalizes country resources into continent and operational region scope', () => {
    const resource = normalizeResourceScope({ countryCode: 'KE' });

    expect(resource.countryCode).toBe('KE');
    expect(resource.continentCode).toBe('AF');
    expect(resource.regionCode).toBe('EMEA');
  });
});
