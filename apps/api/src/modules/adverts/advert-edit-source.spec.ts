import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ProfilesService } from '../profiles/profiles.service';
import { AdvertsService } from './adverts.service';
import { InMemoryAdvertsRepository } from './in-memory-adverts.repository';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '22222222-2222-4222-8222-222222222222';

const profile = {
  displayName: 'Nairobi Fresh Produce',
  industryCode: 'AGRICULTURE',
  role: 'SUPPLIER' as const,
  description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
  countryCode: 'KE',
};

const advert = (title = 'Fresh vegetable supply') => ({
  title,
  displayName: profile.displayName,
  industryCode: profile.industryCode,
  role: profile.role,
  description: 'Weekly deliveries of fresh vegetables to hotels and retailers.',
  countryCode: profile.countryCode,
});

async function setup() {
  const profiles = new ProfilesService();
  for (const tenant of [tenantId, otherTenantId]) {
    const draft = await profiles.createDraft(tenant, profile);
    await profiles.publishDraft(tenant, draft.id, { acceptedTerms: true });
  }
  // One shared repository stands in for the database seen by every device.
  const repository = new InMemoryAdvertsRepository();
  const service = new AdvertsService(repository, undefined, undefined, undefined, profiles);
  return { service, repository };
}

describe('advert drafts record the live advert they edit (sourceAdvertId)', () => {
  it('Edit creates a draft linked to the live advert, keeping its title', async () => {
    const { service } = await setup();
    const live = await service.createAdvert(tenantId, advert());

    const draft = await service.editAdvert(tenantId, live.id);

    expect(draft.sourceAdvertId).toBe(live.id);
    expect(draft.title).toBe('Fresh vegetable supply');
  });

  it('Edit again (any device) reuses the open draft instead of making another copy', async () => {
    const { service, repository } = await setup();
    const live = await service.createAdvert(tenantId, advert());

    const first = await service.editAdvert(tenantId, live.id);
    // A second device builds its own service over the same stored data.
    const otherDevice = new AdvertsService(repository);
    const second = await otherDevice.editAdvert(tenantId, live.id);

    expect(second.id).toBe(first.id);
    expect((await service.listDrafts(tenantId)).filter((draft) => draft.status === 'DRAFT')).toHaveLength(1);
  });

  it('publishing the linked draft archives the original in the same call', async () => {
    const { service } = await setup();
    const live = await service.createAdvert(tenantId, advert());
    const draft = await service.editAdvert(tenantId, live.id);
    await service.updateDraft(tenantId, draft.id, { title: 'Fresh vegetable supply, daily' });

    const replacement = await service.publishDraft(tenantId, draft.id, { acceptedTerms: true });

    expect((await service.listAdverts(tenantId)).map((item) => item.id)).toEqual([replacement.id]);
    expect(replacement.title).toBe('Fresh vegetable supply, daily');
    expect(replacement).not.toHaveProperty('sourceAdvertId');
  });

  it('still publishes the edit if the original was already removed', async () => {
    const { service } = await setup();
    const live = await service.createAdvert(tenantId, advert());
    const draft = await service.editAdvert(tenantId, live.id);
    await service.archiveAdvert(tenantId, live.id);

    const replacement = await service.publishDraft(tenantId, draft.id, { acceptedTerms: true });

    expect((await service.listAdverts(tenantId)).map((item) => item.id)).toEqual([replacement.id]);
  });

  it('keeps the explicit replacesAdvertId path for drafts made before the column existed', async () => {
    const { service } = await setup();
    const live = await service.createAdvert(tenantId, advert());
    const legacy = await service.duplicateAdvert(tenantId, live.id, {});
    expect(legacy.sourceAdvertId).toBeUndefined();

    const replacement = await service.publishDraft(tenantId, legacy.id, {
      acceptedTerms: true,
      replacesAdvertId: live.id,
    });

    expect((await service.listAdverts(tenantId)).map((item) => item.id)).toEqual([replacement.id]);
  });

  it('a plain duplicate is not linked and does not archive the original', async () => {
    const { service } = await setup();
    const live = await service.createAdvert(tenantId, advert());
    const copy = await service.duplicateAdvert(tenantId, live.id, {});

    await service.publishDraft(tenantId, copy.id, { acceptedTerms: true });

    expect(await service.listAdverts(tenantId)).toHaveLength(2);
  });

  it('cannot start editing another tenant’s advert', async () => {
    const { service } = await setup();
    const theirs = await service.createAdvert(otherTenantId, advert('Their advert'));

    await expect(service.editAdvert(tenantId, theirs.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await service.listDrafts(tenantId)).toHaveLength(0);
  });
});
