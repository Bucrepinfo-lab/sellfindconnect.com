import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilesService } from '../profiles/profiles.service';
import { AdvertsService } from './adverts.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('public advert detail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a live advert and hides it once paused or archived', async () => {
    const service = new AdvertsService();
    const advert = await service.createAdvert(tenantId, {
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
    });

    await expect(service.getPublicAdvert(advert.id)).resolves.toMatchObject({
      id: advert.id,
      tenantId,
      title: 'Fresh vegetable supply',
    });
    const search = await service.searchPublicAdverts({ q: 'vegetable' });
    expect(search.results.map((result) => result.id)).toContain(advert.id);

    await service.pauseAdvert(tenantId, advert.id);
    await expect(service.getPublicAdvert(advert.id)).rejects.toBeInstanceOf(NotFoundException);

    await service.renewAdvert(tenantId, advert.id, { acceptedTerms: true });
    await expect(service.getPublicAdvert(advert.id)).resolves.toMatchObject({ id: advert.id });

    await service.archiveAdvert(tenantId, advert.id);
    await expect(service.getPublicAdvert(advert.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404s unknown and malformed ids', async () => {
    const service = new AdvertsService();
    await expect(service.getPublicAdvert('not-a-uuid')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getPublicAdvert('22222222-2222-4222-8222-222222222222'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('profile drafts listing', () => {
  it('lists only the calling tenant drafts, newest first', async () => {
    const service = new ProfilesService();
    const base = {
      industryCode: 'AGRICULTURE',
      role: 'SUPPLIER' as const,
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      countryCode: 'KE',
    };
    const mine = await service.createDraft(tenantId, { ...base, displayName: 'Nairobi Fresh Produce' });
    await service.createDraft('33333333-3333-4333-8333-333333333333', {
      ...base,
      displayName: 'Other Tenant Produce',
    });

    const drafts = await service.listDrafts(tenantId);
    expect(drafts.map((draft) => draft.id)).toEqual([mine.id]);
  });
});
