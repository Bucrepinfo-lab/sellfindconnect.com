import { describe, expect, it } from 'vitest';

import { AccessService } from './access.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '22222222-2222-4222-8222-222222222222';

describe('AccessService', () => {
  it('returns role matrix with MFA requirements', () => {
    const service = new AccessService();
    const matrix = service.getRoleMatrix();

    expect(matrix.roles.some((item) => item.role === 'SUPER_ADMIN' && item.mfaRequired)).toBe(true);
    expect(matrix.operationalRegions.some((region) => region.code === 'EMEA')).toBe(true);
  });

  it('allows tenant owner access to their tenant and records audit evidence', () => {
    const service = new AccessService();
    const result = service.evaluate({
      userId: 'user-1',
      role: 'OWNER',
      mfaVerified: true,
      scopeLevel: 'TENANT',
      tenantIds: [tenantId],
      permission: 'MANAGE_TENANT',
      targetTenantId: tenantId,
      targetCountryCode: 'KE',
    });

    expect(result.decision.allowed).toBe(true);
    expect(result.audit.reason).toBe('ACCESS_GRANTED');
    expect(service.listAudit()).toHaveLength(1);
  });

  it('denies horizontal tenant access', () => {
    const service = new AccessService();
    const result = service.evaluate({
      userId: 'user-1',
      role: 'OWNER',
      mfaVerified: true,
      scopeLevel: 'TENANT',
      tenantIds: [tenantId],
      permission: 'MANAGE_TENANT',
      targetTenantId: otherTenantId,
      targetCountryCode: 'KE',
    });

    expect(result.decision.allowed).toBe(false);
    expect(result.decision.reason).toBe('SCOPE_MISMATCH');
  });

  it('denies privileged access without MFA', () => {
    const service = new AccessService();
    const result = service.evaluate({
      userId: 'country-admin',
      role: 'COUNTRY_ADMIN',
      mfaVerified: false,
      scopeLevel: 'COUNTRY',
      countryCodes: ['KE'],
      permission: 'MANAGE_COUNTRY',
      targetCountryCode: 'KE',
    });

    expect(result.decision.allowed).toBe(false);
    expect(result.decision.reason).toBe('MFA_REQUIRED');
  });
});
