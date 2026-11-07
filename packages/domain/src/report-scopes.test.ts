import { describe, expect, it } from 'vitest';

import { reportScopeLevelsForRole } from './report-scopes';

describe('reportScopeLevelsForRole', () => {
  it('keeps the full view for global staff', () => {
    expect(reportScopeLevelsForRole('SUPER_ADMIN')).toEqual(['GLOBAL', 'REGIONAL', 'CONTINENT', 'COUNTRY', 'TENANT']);
    expect(reportScopeLevelsForRole('GLOBAL_ANALYTICS_VIEWER')).toContain('GLOBAL');
  });

  it('limits regional, continental and country staff to their own reach', () => {
    expect(reportScopeLevelsForRole('REGIONAL_ADMIN')).not.toContain('GLOBAL');
    expect(reportScopeLevelsForRole('CONTINENTAL_ADMIN')).toEqual(['CONTINENT', 'COUNTRY', 'TENANT']);
    expect(reportScopeLevelsForRole('COUNTRY_MODERATOR')).toEqual(['COUNTRY', 'TENANT']);
  });

  it('offers nothing to business (tenant) roles or unknown roles', () => {
    expect(reportScopeLevelsForRole('OWNER')).toEqual([]);
    expect(reportScopeLevelsForRole(undefined)).toEqual([]);
  });

  it('never lists a scope twice', () => {
    for (const role of ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'COUNTRY_ADMIN']) {
      const scopes = reportScopeLevelsForRole(role);
      expect(new Set(scopes).size).toBe(scopes.length);
    }
  });
});
