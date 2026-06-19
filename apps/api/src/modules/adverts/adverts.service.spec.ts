import { describe, expect, it } from 'vitest';
import { mediaPolicy } from '@telpen/domain';

import type { AuthAuditRecord } from '../auth/auth.records';
import type { AuthService } from '../auth/auth.service';
import type { MediaAdapters } from '../media/media.adapters';
import { AdvertsService } from './adverts.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
type TenantAuditInput = Omit<AuthAuditRecord, 'id' | 'createdAt'>;

function createService() {
  const service = new AdvertsService();
  const advert = service.createAdvert(tenantId, {
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
  it('creates a safe advert with a 40-day expiry date', () => {
    const { advert } = createService();

    expect(advert.status).toBe('LIVE');
    expect(advert.expiresAt).toBe('2026-07-11T00:00:00.000Z');
  });

  it('prepares provider-neutral advert media upload instructions', async () => {
    const auditLogs: TenantAuditInput[] = [];
    const service = new AdvertsService({
      hasCurrentTermsAcceptance: async () => true,
      recordTenantAudit: async (record: TenantAuditInput) => {
        auditLogs.push(record);
      },
    } as Pick<AuthService, 'hasCurrentTermsAcceptance' | 'recordTenantAudit'> as AuthService);
    const advert = service.createAdvert(tenantId, {
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
    expect(result.mediaSlots).toEqual({ used: 0, max: mediaPolicy.maxItemsPerOwner, remaining: 10 });
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
        review: () => ({ allowed: true, moderationStatus: 'PENDING', moderationReason: 'SCAN_QUEUED' }),
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
    const service = new AdvertsService(undefined, adapters);
    const advert = service.createAdvert(tenantId, {
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
    const adverts = service.listAdverts(tenantId);

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
    expect(service.listAdvertMedia(tenantId, advert.id)).toHaveLength(1);
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
    const service = new AdvertsService(undefined, rejectingAdapters);
    const advert = service.createAdvert(tenantId, {
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
    expect(service.listAdvertMedia(tenantId, advert.id)).toHaveLength(0);
  });

  it('enforces the ten item media display limit per advert', async () => {
    const { service, advert } = createService();

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
    expect(service.listAdverts(tenantId)[0]?.mediaSlots).toEqual({
      used: 10,
      max: mediaPolicy.maxItemsPerOwner,
      remaining: 0,
    });
  });

  it('creates one renewal alert on day 35 and does not duplicate it', () => {
    const { service } = createService();

    const firstRun = service.runLifecycle(tenantId, { now: '2026-07-06T00:00:00.000Z' });
    const secondRun = service.runLifecycle(tenantId, { now: '2026-07-06T12:00:00.000Z' });

    expect(firstRun.alertsCreated).toHaveLength(1);
    expect(firstRun.alertsCreated[0]?.day).toBe(35);
    expect(secondRun.alertsCreated).toHaveLength(0);
    expect(service.listNotifications(tenantId)).toHaveLength(1);
  });

  it('creates the final renewal alert on day 39', () => {
    const { service } = createService();

    service.runLifecycle(tenantId, { now: '2026-07-06T00:00:00.000Z' });
    const run = service.runLifecycle(tenantId, { now: '2026-07-10T00:00:00.000Z' });

    expect(run.alertsCreated).toHaveLength(1);
    expect(run.alertsCreated[0]?.day).toBe(39);
    expect(service.listNotifications(tenantId).map((item) => item.day)).toEqual([35, 39]);
  });

  it('auto-deletes adverts on day 40', () => {
    const { service } = createService();

    const run = service.runLifecycle(tenantId, { now: '2026-07-11T00:00:00.000Z' });

    expect(run.autoDeleted).toHaveLength(1);
    expect(run.autoDeleted[0]?.status).toBe('AUTO_DELETED');
    expect(service.listAdverts(tenantId)).toHaveLength(0);
  });

  it('archives advert media when the advert auto-deletes on day 40', async () => {
    const { service, advert } = createService();
    await service.addAdvertMedia(tenantId, advert.id, {
      sourceUrl: 'https://cdn.example.test/fresh-stall.jpg',
      fileName: 'fresh-stall.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
    });

    const run = service.runLifecycle(tenantId, { now: '2026-07-11T00:00:00.000Z' });

    expect(run.autoDeleted).toHaveLength(1);
    expect(() => service.listAdvertMedia(tenantId, advert.id)).toThrow('Advert not found');
    expect(service.listAdverts(tenantId)).toHaveLength(0);
  });

  it('runs lifecycle for all tenants for scheduler jobs', () => {
    const service = new AdvertsService();
    const otherTenantId = '22222222-2222-4222-8222-222222222222';

    service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });
    service.createAdvert(otherTenantId, {
      title: 'Packaging supply',
      displayName: 'Kiambu Packaging Works',
      industryCode: 'MANUFACTURING',
      role: 'SUPPLIER',
      description: 'We supply food packaging and cartons to retailers in Kiambu.',
      countryCode: 'KE',
      publishedAt: '2026-06-01T00:00:00.000Z',
    });

    const result = service.runAllLifecycles({ now: '2026-07-06T00:00:00.000Z' });

    expect(result.tenantsChecked).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((tenant) => tenant.alertsCreated.length === 1)).toBe(true);
  });

  it('blocks prohibited advert content', () => {
    const service = new AdvertsService();

    expect(() =>
      service.createAdvert(tenantId, {
        title: 'Unsafe advert',
        displayName: 'Bad Actor',
        industryCode: 'TRADE',
        role: 'SUPPLIER',
        description: 'Ammunition available for delivery.',
        countryCode: 'KE',
      }),
    ).toThrow();
  });
});
