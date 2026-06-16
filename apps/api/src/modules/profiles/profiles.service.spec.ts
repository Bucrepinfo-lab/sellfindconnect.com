import { describe, expect, it } from 'vitest';

import { ProfilesService } from './profiles.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('ProfilesService', () => {
  it('creates a safe tenant-scoped profile draft', () => {
    const service = new ProfilesService();

    const draft = service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
      phone: '+254700000000',
    });

    expect(draft.tenantId).toBe(tenantId);
    expect(draft.status).toBe('DRAFT');
    expect(service.previewDraft(tenantId, draft.id).preview.completenessScore).toBeGreaterThan(70);
  });

  it('blocks zero-tolerance profile content', () => {
    const service = new ProfilesService();

    expect(() =>
      service.createDraft(tenantId, {
        displayName: 'Bad Actor',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'Ammunition available for delivery.',
        countryCode: 'KE',
      }),
    ).toThrow();
  });

  it('blocks prohibited content in contact and website fields', () => {
    const service = new ProfilesService();

    expect(() =>
      service.createDraft(tenantId, {
        displayName: 'General Trading',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'We connect verified businesses with compliant commercial suppliers.',
        countryCode: 'KE',
        website: 'https://counterfeit-goods.example',
      }),
    ).toThrow();
  });
});
