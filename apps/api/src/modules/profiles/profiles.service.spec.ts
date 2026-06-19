import { describe, expect, it } from 'vitest';

import type { AuthAuditRecord } from '../auth/auth.records';
import type { AuthService } from '../auth/auth.service';
import { InMemoryProfilesRepository } from './in-memory-profiles.repository';
import { ProfilesService } from './profiles.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
type TenantAuditInput = Omit<AuthAuditRecord, 'id' | 'createdAt'>;

describe('ProfilesService', () => {
  it('creates a safe tenant-scoped profile draft', async () => {
    const service = new ProfilesService();

    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
      phone: '+254700000000',
    });

    expect(draft.tenantId).toBe(tenantId);
    expect(draft.status).toBe('DRAFT');
    const preview = await service.previewDraft(tenantId, draft.id);
    expect(preview.preview.completenessScore).toBeGreaterThan(70);
  });

  it('blocks zero-tolerance profile content', async () => {
    const service = new ProfilesService();

    await expect(
      service.createDraft(tenantId, {
        displayName: 'Bad Actor',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'Ammunition available for delivery.',
        countryCode: 'KE',
      }),
    ).rejects.toThrow();
  });

  it('blocks prohibited content in contact and website fields', async () => {
    const service = new ProfilesService();

    await expect(
      service.createDraft(tenantId, {
        displayName: 'General Trading',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'We connect verified businesses with compliant commercial suppliers.',
        countryCode: 'KE',
        website: 'https://counterfeit-goods.example',
      }),
    ).rejects.toThrow();
  });

  it('publishes a draft as the tenant live profile with audit evidence', async () => {
    const auditLogs: TenantAuditInput[] = [];
    const service = new ProfilesService(undefined, {
      hasCurrentTermsAcceptance: async () => true,
      recordTenantAudit: async (record: TenantAuditInput) => {
        auditLogs.push(record);
      },
    } as Pick<AuthService, 'hasCurrentTermsAcceptance' | 'recordTenantAudit'> as AuthService);

    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
      phone: '+254700000000',
      email: 'hello@example.com',
    });

    const published = await service.publishDraft(
      tenantId,
      draft.id,
      { acceptedTerms: true },
      'user-1',
    );

    expect(published).toMatchObject({
      tenantId,
      sourceDraftId: draft.id,
      status: 'LIVE',
      version: 1,
    });
    expect((await service.getLiveProfile(tenantId)).id).toBe(published.id);
    expect((await service.getDraft(tenantId, draft.id)).status).toBe('PUBLISHED');
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      tenantId,
      actorUserId: 'user-1',
      action: 'PROFILE_PUBLISHED',
      entityType: 'PROFILE',
      entityId: published.id,
    });
  });

  it('archives the previous live profile when a newer draft is published', async () => {
    const service = new ProfilesService();
    const firstDraft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });
    const secondDraft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce Export Desk',
      industryCode: 'AGRICULTURE',
      role: 'PRODUCER',
      description: 'We coordinate verified produce exports for regional buyers.',
      countryCode: 'KE',
    });

    const first = await service.publishDraft(
      tenantId,
      firstDraft.id,
      { acceptedTerms: true },
      'user-1',
    );
    const second = await service.publishDraft(
      tenantId,
      secondDraft.id,
      { acceptedTerms: true },
      'user-1',
    );
    const history = await service.listPublishedProfiles(tenantId);

    expect(second.version).toBe(2);
    expect((await service.getLiveProfile(tenantId)).id).toBe(second.id);
    expect(history.find((profile) => profile.id === first.id)).toMatchObject({
      status: 'ARCHIVED',
      version: 1,
    });
    expect(history.find((profile) => profile.id === second.id)).toMatchObject({
      status: 'LIVE',
      version: 2,
    });
  });

  it('uses an injected profile repository boundary', async () => {
    const repository = new InMemoryProfilesRepository();
    const service = new ProfilesService(repository);

    const draft = await service.createDraft(tenantId, {
      displayName: 'Repository Backed Profile',
      industryCode: 'TRADE',
      role: 'RETAILER',
      description: 'We connect safe retail buyers with verified compliant suppliers.',
      countryCode: 'KE',
    });

    expect(await repository.findDraft(tenantId, draft.id)).toMatchObject({
      id: draft.id,
      status: 'DRAFT',
    });
  });

  it('updates a published draft without changing the live profile until republish', async () => {
    const service = new ProfilesService();
    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });
    const first = await service.publishDraft(
      tenantId,
      draft.id,
      { acceptedTerms: true },
      'user-1',
    );

    const edited = await service.updateDraft(tenantId, draft.id, {
      description: 'We supply fresh vegetables, herbs, and compliant grocery stock in Nairobi.',
    });

    expect(edited.status).toBe('DRAFT');
    expect((await service.getLiveProfile(tenantId)).id).toBe(first.id);

    const second = await service.publishDraft(
      tenantId,
      draft.id,
      { acceptedTerms: true },
      'user-1',
    );
    expect(second.version).toBe(2);
    expect(second.description).toContain('herbs');
  });

  it('marks high-risk profile changes as pending review and blocks publishing', async () => {
    const service = new ProfilesService();
    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });

    const updated = await service.updateDraft(tenantId, draft.id, {
      industryCode: 'HEALTH',
      description: 'We coordinate compliant wellness supply introductions for licensed clinics.',
    });
    const preview = await service.previewDraft(tenantId, draft.id);

    expect(updated.status).toBe('PENDING_REVIEW');
    expect(preview.preview.reviewRequired).toBe(true);
    await expect(
      service.publishDraft(tenantId, draft.id, { acceptedTerms: true }, 'user-1'),
    ).rejects.toThrow('moderation review');
  });

  it('requires request and stored current terms before publishing with auth attached', async () => {
    const service = new ProfilesService(undefined, {
      hasCurrentTermsAcceptance: async () => false,
      recordTenantAudit: async () => undefined,
    } as Pick<AuthService, 'hasCurrentTermsAcceptance' | 'recordTenantAudit'> as AuthService);
    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });

    await expect(
      service.publishDraft(tenantId, draft.id, { acceptedTerms: false as true }, 'user-1'),
    ).rejects.toThrow('Current terms acceptance');
    await expect(
      service.publishDraft(tenantId, draft.id, { acceptedTerms: true }, 'user-1'),
    ).rejects.toThrow('stored terms acceptance');
  });
});
