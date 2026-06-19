import { describe, expect, it } from 'vitest';

import type { AuthAuditRecord } from '../auth/auth.records';
import type { PlatformAccessSession } from '../auth/auth.records';
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
      whatsapp: '+254711000000',
      email: 'hello@example.co.ke',
      website: 'https://fresh.example.co.ke',
      physicalAddress: 'Industrial Area, Nairobi, Kenya',
      mapsUrl: 'https://maps.google.com/?q=Nairobi',
      socialLinks: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/example' }],
      serviceArea: {
        primaryCity: 'Nairobi',
        regions: ['Nairobi County', 'Kiambu County'],
        radiusKm: 120,
        remoteAvailable: true,
        operatingCountries: ['KE', 'UG'],
      },
    });

    expect(draft.tenantId).toBe(tenantId);
    expect(draft.status).toBe('DRAFT');
    const preview = await service.previewDraft(tenantId, draft.id);
    expect(preview.preview.completenessScore).toBeGreaterThan(70);
    expect(preview.preview.publicContacts).toMatchObject({
      whatsapp: '+254711000000',
      mapsUrl: 'https://maps.google.com/?q=Nairobi',
    });
    expect(preview.preview.serviceArea).toMatchObject({
      primaryCity: 'Nairobi',
      regions: ['Nairobi County', 'Kiambu County'],
      operatingCountries: ['KE', 'UG'],
    });
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

  it('blocks prohibited content in nested contact enrichment fields', async () => {
    const service = new ProfilesService();

    await expect(
      service.createDraft(tenantId, {
        displayName: 'Regional Trading Desk',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'We connect verified businesses with compliant commercial suppliers.',
        countryCode: 'KE',
        socialLinks: [
          { label: 'Catalog', url: 'https://counterfeit-goods.example/catalog' },
        ],
        serviceArea: {
          primaryCity: 'Nairobi',
          regions: ['Nairobi County'],
        },
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
      whatsapp: '+254711000000',
      physicalAddress: 'Industrial Area, Nairobi, Kenya',
      serviceArea: {
        primaryCity: 'Nairobi',
        regions: ['Nairobi County'],
        radiusKm: 100,
      },
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
      whatsapp: '+254711000000',
      physicalAddress: 'Industrial Area, Nairobi, Kenya',
      serviceArea: {
        primaryCity: 'Nairobi',
      },
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

  it('updates profile contact enrichment and service area without moderation review', async () => {
    const auditLogs: TenantAuditInput[] = [];
    const service = new ProfilesService(undefined, {
      recordTenantAudit: async (record: TenantAuditInput) => {
        auditLogs.push(record);
      },
    } as Pick<AuthService, 'recordTenantAudit'> as AuthService);
    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });

    const updated = await service.updateDraft(tenantId, draft.id, {
      whatsapp: '+254711000000',
      physicalAddress: 'Industrial Area, Nairobi, Kenya',
      mapsUrl: 'https://maps.google.com/?q=Nairobi',
      socialLinks: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/example' }],
      serviceArea: {
        primaryCity: 'Nairobi',
        regions: ['Nairobi County', 'Kiambu County'],
        radiusKm: 120,
        remoteAvailable: true,
        operatingCountries: ['KE', 'UG'],
      },
    });
    const preview = await service.previewDraft(tenantId, draft.id);

    expect(updated.status).toBe('DRAFT');
    expect(updated.reviewReasons).toEqual([]);
    expect(preview.preview.publicContacts.socialLinks).toHaveLength(1);
    expect(preview.preview.serviceArea).toMatchObject({
      primaryCity: 'Nairobi',
      radiusKm: 120,
      remoteAvailable: true,
    });
    expect(auditLogs[0]?.metadata).toMatchObject({
      reviewRequired: false,
    });
    expect(String(auditLogs[0]?.metadata?.changedFields)).toContain('serviceArea');
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
    expect(updated.reviewReasons).toContain('HIGH_RISK_INDUSTRY_CHANGE');
    expect(updated.reviewRequestedAt).toBeDefined();
    expect(preview.preview.reviewRequired).toBe(true);
    expect(preview.preview.reviewReasons).toContain('HIGH_RISK_INDUSTRY_CHANGE');
    await expect(
      service.publishDraft(tenantId, draft.id, { acceptedTerms: true }, 'user-1'),
    ).rejects.toThrow('moderation review');
  });

  it('lists pending reviews and approves a reviewed profile draft for publishing', async () => {
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
    });
    await service.updateDraft(tenantId, draft.id, {
      industryCode: 'HEALTH',
      description: 'We coordinate compliant wellness supply introductions for licensed clinics.',
    });

    await expect(service.listPendingReviews(tenantId, 'editor-1', 'EDITOR')).rejects.toThrow();
    const pending = await service.listPendingReviews(tenantId, 'owner-1', 'OWNER');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.reviewReasons).toContain('HIGH_RISK_INDUSTRY_CHANGE');

    const approved = await service.reviewDraft(
      tenantId,
      draft.id,
      { decision: 'APPROVED', note: 'Licensed category language checked.' },
      'owner-1',
      'OWNER',
    );

    expect(approved).toMatchObject({
      status: 'DRAFT',
      reviewDecision: 'APPROVED',
      reviewedBy: 'owner-1',
    });
    expect(await service.listPendingReviews(tenantId, 'owner-1', 'OWNER')).toHaveLength(0);
    await expect(
      service.publishDraft(tenantId, draft.id, { acceptedTerms: true }, 'owner-1'),
    ).resolves.toMatchObject({ status: 'LIVE' });
    expect(auditLogs.some((record) => record.action === 'PROFILE_DRAFT_REVIEWED')).toBe(true);
  });

  it('lets scoped platform moderators list and review only matching drafts', async () => {
    const resources: Array<{ tenantId?: string; countryCode?: string }> = [];
    const platformSession: PlatformAccessSession = {
      sessionId: 'session-1',
      sessionTenantId: 'platform-home-tenant',
      userId: 'country-mod-1',
      mfaVerified: true,
      assignments: [
        {
          id: 'assignment-1',
          userId: 'country-mod-1',
          role: 'COUNTRY_MODERATOR',
          scopeLevel: 'COUNTRY',
          countryCode: 'KE',
          mfaRequired: true,
          assignedBy: 'global-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    const service = new ProfilesService(undefined, {
      canPlatformAccess: (_session, _permission, resource) => resource.tenantId === tenantId,
      requirePlatformAccess: async (_session, _permission, resource) => {
        resources.push(resource);
        if (resource.tenantId !== tenantId) {
          throw new Error('scope denied');
        }

        return {
          allowed: true,
          permission: 'MODERATE_CONTENT',
          role: 'COUNTRY_MODERATOR',
          scopeLevel: 'COUNTRY',
          reason: 'ACCESS_GRANTED',
        };
      },
      recordTenantAudit: async () => undefined,
    } as Pick<
      AuthService,
      'canPlatformAccess' | 'requirePlatformAccess' | 'recordTenantAudit'
    > as AuthService);
    const kenyaDraft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });
    const otherTenantId = '22222222-2222-4222-8222-222222222222';
    const otherDraft = await service.createDraft(otherTenantId, {
      displayName: 'Mombasa Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Mombasa.',
      countryCode: 'KE',
    });
    await service.updateDraft(tenantId, kenyaDraft.id, {
      industryCode: 'HEALTH',
      description: 'We coordinate compliant wellness supply introductions for licensed clinics.',
    });
    await service.updateDraft(otherTenantId, otherDraft.id, {
      industryCode: 'HEALTH',
      description: 'We coordinate compliant wellness supply introductions for licensed clinics.',
    });

    const pending = await service.listPlatformPendingReviews(platformSession);
    const reviewed = await service.platformReviewDraft(
      tenantId,
      kenyaDraft.id,
      { decision: 'APPROVED', note: 'Country moderation scope checked.' },
      platformSession,
    );

    expect(pending.map((draft) => draft.id)).toEqual([kenyaDraft.id]);
    expect(resources[0]).toMatchObject({ tenantId, countryCode: 'KE' });
    expect(reviewed).toMatchObject({
      status: 'DRAFT',
      reviewDecision: 'APPROVED',
      reviewedBy: 'country-mod-1',
    });
    await expect(
      service.platformReviewDraft(
        otherTenantId,
        otherDraft.id,
        { decision: 'APPROVED' },
        platformSession,
      ),
    ).rejects.toThrow('scope denied');
  });

  it('rejects a pending profile draft and requires an edit before publishing', async () => {
    const service = new ProfilesService();
    const draft = await service.createDraft(tenantId, {
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
      countryCode: 'KE',
    });
    await service.updateDraft(tenantId, draft.id, {
      role: 'FINANCIER',
      description: 'We coordinate compliant trade finance introductions for licensed buyers.',
    });

    const rejected = await service.reviewDraft(
      tenantId,
      draft.id,
      { decision: 'REJECTED', note: 'Finance wording needs stronger licensing evidence.' },
      'admin-1',
      'ADMIN',
    );

    expect(rejected.status).toBe('REJECTED');
    await expect(
      service.publishDraft(tenantId, draft.id, { acceptedTerms: true }, 'admin-1'),
    ).rejects.toThrow('rejected');

    const edited = await service.updateDraft(tenantId, draft.id, {
      role: 'SUPPLIER',
      description: 'We coordinate compliant supplier introductions for verified buyers.',
    });
    expect(edited.status).toBe('DRAFT');
    expect(edited.reviewDecision).toBeUndefined();
    expect(edited.reviewReasons).toEqual([]);
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
