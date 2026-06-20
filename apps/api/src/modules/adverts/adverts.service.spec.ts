import { describe, expect, it } from 'vitest';
import { mediaPolicy } from '@telpen/domain';

import type { AuthAuditRecord } from '../auth/auth.records';
import type { AuthService } from '../auth/auth.service';
import type { MediaAdapters } from '../media/media.adapters';
import { AdvertsService } from './adverts.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
type TenantAuditInput = Omit<AuthAuditRecord, 'id' | 'createdAt'>;

async function createService() {
  const service = new AdvertsService();
  const advert = await service.createAdvert(tenantId, {
    title: 'Fresh vegetable supply',
    displayName: 'Nairobi Fresh Produce',
    industryCode: 'AGRICULTURE',
    role: 'SUPPLIER',
    description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
    countryCode: 'KE',
    publishedAt: '2026-06-01T00:00:00.000Z',
  });

  return { service, advert };
}

describe('AdvertsService', () => {
  it('creates a safe advert with a 40-day expiry date', async () => {
    const { advert } = await createService();

    expect(advert.status).toBe('LIVE');
    expect(advert.version).toBe(1);
    expect(advert.expiresAt).toBe('2026-07-11T00:00:00.000Z');
  });

  it('supports persisted draft preview and publish flow', async () => {
    const service = new AdvertsService();
    const draft = await service.createDraft(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });
    await service.addDraftMedia(tenantId, draft.id, {
      sourceUrl: 'https://cdn.example.test/fresh-stall.jpg',
      fileName: 'fresh-stall.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
    });

    const preview = await service.previewDraft(tenantId, draft.id);
    const published = await service.publishDraft(tenantId, draft.id, { acceptedTerms: true });

    expect(preview.preview.mediaSlots).toEqual({
      used: 1,
      max: mediaPolicy.maxItemsPerOwner,
      remaining: 9,
    });
    expect(published).toMatchObject({
      sourceDraftId: draft.id,
      status: 'LIVE',
      version: 1,
      publishedAt: '2026-06-01T00:00:00.000Z',
      expiresAt: '2026-07-11T00:00:00.000Z',
    });
    await expect(service.getDraft(tenantId, draft.id)).resolves.toMatchObject({
      status: 'PUBLISHED',
    });
    await expect(service.listAdvertMedia(tenantId, published.id)).resolves.toHaveLength(1);
  });

  it('duplicates live adverts into editable drafts with media copied for preview', async () => {
    const { service, advert } = await createService();
    await service.addAdvertMedia(tenantId, advert.id, {
      sourceUrl: 'https://cdn.example.test/fresh-stall.jpg',
      fileName: 'fresh-stall.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
    });

    const duplicate = await service.duplicateAdvert(
      tenantId,
      advert.id,
      { title: 'Fresh vegetable supply copy' },
      'user-1',
    );

    expect(duplicate).toMatchObject({
      status: 'DRAFT',
      title: 'Copy of Fresh vegetable supply copy',
      industryCode: advert.industryCode,
      countryCode: advert.countryCode,
    });
    await expect(service.listDraftMedia(tenantId, duplicate.id)).resolves.toHaveLength(1);
  });

  it('boosts matching public adverts above otherwise similar listings', async () => {
    const service = new AdvertsService();
    const regular = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-07-01T00:00:00.000Z',
    });
    const boosted = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable delivery',
      displayName: 'Nairobi Direct Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to restaurants and hotels in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-07-01T00:00:00.000Z',
    });

    await service.boostAdvert(
      tenantId,
      boosted.id,
      {
        acceptedTerms: true,
        boostWeight: 5,
        boostedAt: '2026-07-02T00:00:00.000Z',
        boostExpiresAt: '2026-07-16T00:00:00.000Z',
      },
      'user-1',
    );
    const results = await service.searchPublicAdverts({
      q: 'fresh vegetables hotels',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      now: '2026-07-03T00:00:00.000Z',
    });

    expect(results.results.map((item) => item.id)).toEqual([boosted.id, regular.id]);
    expect(results.results[0]).toMatchObject({
      boosted: true,
      boostWeight: 5,
      rankReasons: expect.arrayContaining(['ACTIVE_BOOST']),
    });
  });

  it('uses discovery index vector and relationship graph ranking for public adverts', async () => {
    const service = new AdvertsService();
    const advert = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-07-01T00:00:00.000Z',
    });

    const results = await service.searchPublicAdverts({
      q: 'fresh vegetable hotel buyers',
      countryCode: 'KE',
      now: '2026-07-02T00:00:00.000Z',
    });

    expect(results.results[0]).toMatchObject({
      id: advert.id,
      rankReasons: expect.arrayContaining(['VECTOR_MATCH', 'RELATIONSHIP_GRAPH:BUYER']),
      matchedTerms: expect.arrayContaining(['fresh', 'vegetable']),
    });
    expect(results.results[0]?.relationshipSignals.map((signal) => signal.role)).toContain('BUYER');
  });

  it('creates saved search alerts from discovery matches without duplicating adverts', async () => {
    const service = new AdvertsService();
    const advert = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-07-01T00:00:00.000Z',
    });
    const saved = await service.createSavedSearch(tenantId, {
      name: 'Fresh vegetable buyers',
      q: 'fresh vegetable buyers',
      countryCode: 'KE',
      alertFrequency: 'DAILY',
    });

    const firstRun = await service.runSavedSearchAlerts(tenantId, {
      savedSearchId: saved.id,
      now: '2026-07-02T00:00:00.000Z',
    });
    const secondRun = await service.runSavedSearchAlerts(tenantId, {
      savedSearchId: saved.id,
      now: '2026-07-02T12:00:00.000Z',
    });

    expect(firstRun.alertsCreated).toHaveLength(1);
    expect(firstRun.alertsCreated[0]).toMatchObject({
      advertId: advert.id,
      savedSearchId: saved.id,
      reasonCodes: expect.arrayContaining(['VECTOR_MATCH', 'RELATIONSHIP_GRAPH:BUYER']),
    });
    expect(secondRun.alertsCreated).toHaveLength(0);
    await expect(service.listDiscoveryAlerts(tenantId)).resolves.toHaveLength(1);
    await expect(service.listSavedSearches(tenantId)).resolves.toEqual([
      expect.objectContaining({
        id: saved.id,
        lastAlertedAt: '2026-07-02T12:00:00.000Z',
      }),
    ]);
  });

  it('blocks public discovery searches for prohibited categories', async () => {
    const { service } = await createService();

    await expect(
      service.searchPublicAdverts({
        q: 'ammunition suppliers near me',
        countryCode: 'KE',
      }),
    ).rejects.toThrow();
  });

  it('prepares provider-neutral advert media upload instructions', async () => {
    const auditLogs: TenantAuditInput[] = [];
    const service = new AdvertsService(undefined, {
      hasCurrentTermsAcceptance: async () => true,
      recordTenantAudit: async (record: TenantAuditInput) => {
        auditLogs.push(record);
      },
    } as Pick<AuthService, 'hasCurrentTermsAcceptance' | 'recordTenantAudit'> as AuthService);
    const advert = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });

    const result = await service.prepareAdvertMediaUpload(
      tenantId,
      advert.id,
      {
        fileName: 'Fresh Stall.JPG',
        mimeType: 'IMAGE/JPEG',
        fileSizeBytes: 800_000,
      },
      'user-1',
    );

    expect(result.upload).toMatchObject({
      provider: 'development-s3-compatible',
      publicUrl: expect.stringContaining('/public/advert/'),
      thumbnailUrl: expect.stringContaining('/thumb/advert/'),
      requiredHeaders: {
        'content-type': 'image/jpeg',
        'x-media-owner-type': 'ADVERT',
      },
    });
    expect(result.upload.objectKey).toContain(`advert/${tenantId}/${advert.id}/`);
    expect(result.mediaSlots).toEqual({
      used: 0,
      max: mediaPolicy.maxItemsPerOwner,
      remaining: 10,
    });
    expect(auditLogs.some((record) => record.action === 'ADVERT_MEDIA_UPLOAD_PREPARED')).toBe(true);
  });

  it('adds safe advert media and exposes it with advert display slots', async () => {
    const adapters: MediaAdapters = {
      storage: {
        prepareUpload: () => {
          throw new Error('storage adapter should not be used');
        },
      },
      moderation: {
        review: () => ({
          allowed: true,
          moderationStatus: 'PENDING',
          moderationReason: 'SCAN_QUEUED',
        }),
      },
      transforms: {
        plan: () => ({
          transformStatus: 'READY',
          cdnUrl: 'https://cdn.example.test/display/fresh-stall.jpg',
          thumbnailUrl: 'https://cdn.example.test/thumb/fresh-stall.jpg',
          variants: [
            {
              label: 'thumbnail',
              url: 'https://cdn.example.test/thumb/fresh-stall.jpg',
              width: 480,
            },
          ],
        }),
      },
    };
    const service = new AdvertsService(undefined, undefined, adapters);
    const advert = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });

    const result = await service.addAdvertMedia(tenantId, advert.id, {
      sourceUrl: 'https://media.example.test/raw/fresh-stall.jpg',
      fileName: 'fresh-stall.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
      caption: 'Fresh vegetables ready for hotel delivery.',
      storageProvider: 's3-compatible',
      objectKey: 'adverts/tenant/advert/fresh-stall.jpg',
    });
    const adverts = await service.listAdverts(tenantId);

    expect(result.media).toMatchObject({
      ownerType: 'ADVERT',
      ownerId: advert.id,
      status: 'LIVE',
      moderationStatus: 'PENDING',
      moderationReason: 'SCAN_QUEUED',
      storageProvider: 's3-compatible',
      cdnUrl: 'https://cdn.example.test/display/fresh-stall.jpg',
      thumbnailUrl: 'https://cdn.example.test/thumb/fresh-stall.jpg',
      transformStatus: 'READY',
    });
    expect(result.mediaSlots).toEqual({ used: 1, max: mediaPolicy.maxItemsPerOwner, remaining: 9 });
    await expect(service.listAdvertMedia(tenantId, advert.id)).resolves.toHaveLength(1);
    expect(adverts[0]?.media).toHaveLength(1);
    expect(adverts[0]?.mediaSlots).toEqual(result.mediaSlots);
  });

  it('blocks unsafe, unsupported, and moderation-rejected advert media', async () => {
    const rejectingAdapters: MediaAdapters = {
      storage: {
        prepareUpload: () => {
          throw new Error('storage adapter should not be used');
        },
      },
      moderation: {
        review: () => ({
          allowed: false,
          moderationStatus: 'BLOCKED',
          moderationReason: 'MALWARE_OR_UNSAFE_MEDIA',
        }),
      },
      transforms: {
        plan: () => {
          throw new Error('transform adapter should not be used');
        },
      },
    };
    const service = new AdvertsService(undefined, undefined, rejectingAdapters);
    const advert = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });

    await expect(
      service.addAdvertMedia(tenantId, advert.id, {
        sourceUrl: 'https://media.example.test/raw/ammunition.jpg',
        fileName: 'ammunition.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 800_000,
        caption: 'Ammunition available for delivery.',
      }),
    ).rejects.toThrow();
    await expect(
      service.addAdvertMedia(tenantId, advert.id, {
        sourceUrl: 'https://media.example.test/raw/brochure.pdf',
        fileName: 'brochure.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 800_000,
      }),
    ).rejects.toThrow('media policy');
    await expect(
      service.addAdvertMedia(tenantId, advert.id, {
        sourceUrl: 'https://media.example.test/raw/fresh-stall.jpg',
        fileName: 'fresh-stall.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 800_000,
      }),
    ).rejects.toThrow('moderation review');
    await expect(service.listAdvertMedia(tenantId, advert.id)).resolves.toHaveLength(0);
  });

  it('enforces the ten item media display limit per advert', async () => {
    const { service, advert } = await createService();

    for (let index = 0; index < mediaPolicy.maxItemsPerOwner; index += 1) {
      await service.addAdvertMedia(tenantId, advert.id, {
        sourceUrl: `https://cdn.example.test/fresh-stall-${index}.jpg`,
        fileName: `fresh-stall-${index}.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: 800_000,
      });
    }

    await expect(
      service.addAdvertMedia(tenantId, advert.id, {
        sourceUrl: 'https://cdn.example.test/fresh-stall-extra.jpg',
        fileName: 'fresh-stall-extra.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 800_000,
      }),
    ).rejects.toThrow('maximum');
    const adverts = await service.listAdverts(tenantId);
    expect(adverts[0]?.mediaSlots).toEqual({
      used: 10,
      max: mediaPolicy.maxItemsPerOwner,
      remaining: 0,
    });
  });

  it('creates one renewal alert on day 35 and does not duplicate it', async () => {
    const { service } = await createService();

    const firstRun = await service.runLifecycle(tenantId, { now: '2026-07-06T00:00:00.000Z' });
    const secondRun = await service.runLifecycle(tenantId, { now: '2026-07-06T12:00:00.000Z' });

    expect(firstRun.alertsCreated).toHaveLength(1);
    expect(firstRun.alertsCreated[0]?.day).toBe(35);
    expect(secondRun.alertsCreated).toHaveLength(0);
    await expect(service.listNotifications(tenantId)).resolves.toHaveLength(1);
  });

  it('creates the final renewal alert on day 39', async () => {
    const { service } = await createService();

    await service.runLifecycle(tenantId, { now: '2026-07-06T00:00:00.000Z' });
    const run = await service.runLifecycle(tenantId, { now: '2026-07-10T00:00:00.000Z' });

    expect(run.alertsCreated).toHaveLength(1);
    expect(run.alertsCreated[0]?.day).toBe(39);
    expect((await service.listNotifications(tenantId)).map((item) => item.day)).toEqual([35, 39]);
  });

  it('auto-deletes adverts on day 40', async () => {
    const { service } = await createService();

    const run = await service.runLifecycle(tenantId, { now: '2026-07-11T00:00:00.000Z' });

    expect(run.autoDeleted).toHaveLength(1);
    expect(run.autoDeleted[0]?.status).toBe('AUTO_DELETED');
    await expect(service.listAdverts(tenantId)).resolves.toHaveLength(0);
  });

  it('archives advert media when the advert auto-deletes on day 40', async () => {
    const { service, advert } = await createService();
    await service.addAdvertMedia(tenantId, advert.id, {
      sourceUrl: 'https://cdn.example.test/fresh-stall.jpg',
      fileName: 'fresh-stall.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
    });

    const run = await service.runLifecycle(tenantId, { now: '2026-07-11T00:00:00.000Z' });

    expect(run.autoDeleted).toHaveLength(1);
    await expect(service.listAdvertMedia(tenantId, advert.id)).rejects.toThrow('Advert not found');
    await expect(service.listAdverts(tenantId)).resolves.toHaveLength(0);
  });

  it('pauses, renews, and archives live adverts', async () => {
    const { service, advert } = await createService();

    const paused = await service.pauseAdvert(tenantId, advert.id, 'user-1');
    const renewed = await service.renewAdvert(
      tenantId,
      advert.id,
      { acceptedTerms: true, renewedAt: '2026-07-10T00:00:00.000Z' },
      'user-1',
    );
    const archived = await service.archiveAdvert(tenantId, advert.id, 'user-1');

    expect(paused.status).toBe('PAUSED');
    expect(paused.pausedAt).toBeDefined();
    expect(renewed).toMatchObject({
      status: 'LIVE',
      publishedAt: '2026-07-10T00:00:00.000Z',
      expiresAt: '2026-08-19T00:00:00.000Z',
      renewalAlertsSent: [],
    });
    expect(archived).toMatchObject({
      status: 'ARCHIVED',
      archivedAt: expect.any(String),
    });
    await expect(service.listAdverts(tenantId)).resolves.toHaveLength(0);
  });

  it('runs lifecycle for all tenants for scheduler jobs', async () => {
    const service = new AdvertsService();
    const otherTenantId = '22222222-2222-4222-8222-222222222222';

    await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });
    await service.createAdvert(otherTenantId, {
      title: 'Packaging supply',
      displayName: 'Kiambu Packaging Works',
      industryCode: 'MANUFACTURING',
      role: 'SUPPLIER',
      description: 'We supply food packaging and cartons to retailers in Kiambu.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });

    const result = await service.runAllLifecycles({ now: '2026-07-06T00:00:00.000Z' });

    expect(result.tenantsChecked).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((tenant) => tenant.alertsCreated.length === 1)).toBe(true);
  });

  it('blocks prohibited advert content', async () => {
    const service = new AdvertsService();

    await expect(
      service.createAdvert(tenantId, {
        title: 'Unsafe advert',
        displayName: 'Bad Actor',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'Ammunition available for delivery.',
        countryCode: 'KE',
      }),
    ).rejects.toThrow();
  });
});
