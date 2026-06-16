import { describe, expect, it } from 'vitest';

import { AdvertsService } from './adverts.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

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
