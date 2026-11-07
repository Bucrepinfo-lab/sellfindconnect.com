import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ProfilesService } from '../profiles/profiles.service';
import { AdvertsService } from './adverts.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '22222222-2222-4222-8222-222222222222';

const ownProfile = {
  displayName: 'Nairobi Fresh Produce',
  industryCode: 'AGRICULTURE',
  role: 'SUPPLIER' as const,
  description: 'We supply fresh vegetables to hotels and shops in Nairobi.',
  countryCode: 'KE',
};

const otherProfile = {
  displayName: 'Mombasa Cold Chain',
  industryCode: 'LOGISTICS',
  role: 'LOGISTICS_PROVIDER' as const,
  description: 'Refrigerated transport between Mombasa and Nairobi every week.',
  countryCode: 'KE',
};

async function publishProfile(profiles: ProfilesService, tenant: string, input: typeof ownProfile | typeof otherProfile) {
  const draft = await profiles.createDraft(tenant, input);
  return profiles.publishDraft(tenant, draft.id, { acceptedTerms: true });
}

function advertFrom(identity: typeof ownProfile | typeof otherProfile, title = 'Fresh vegetable supply') {
  return {
    title,
    displayName: identity.displayName,
    industryCode: identity.industryCode,
    role: identity.role,
    description: 'Weekly deliveries of fresh vegetables to hotels and retailers.',
    countryCode: identity.countryCode,
  };
}

async function setup() {
  const profiles = new ProfilesService();
  await publishProfile(profiles, tenantId, ownProfile);
  await publishProfile(profiles, otherTenantId, otherProfile);
  const adverts = new AdvertsService(undefined, undefined, undefined, undefined, profiles);
  return { profiles, adverts };
}

describe('AdvertsService ownership (server rejects what the UI hides)', () => {
  it('creates and publishes adverts under the tenant’s own live profile', async () => {
    const { adverts } = await setup();

    const draft = await adverts.createDraft(tenantId, advertFrom(ownProfile));
    const live = await adverts.publishDraft(tenantId, draft.id, { acceptedTerms: true });

    expect(live.displayName).toBe(ownProfile.displayName);
    expect(live.industryCode).toBe(ownProfile.industryCode);
  });

  it('rejects an advert that claims another business’s name, industry or role', async () => {
    const { adverts } = await setup();

    await expect(adverts.createDraft(tenantId, advertFrom(otherProfile))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(
      adverts.createDraft(tenantId, { ...advertFrom(ownProfile), displayName: otherProfile.displayName }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects switching a draft to another business identity', async () => {
    const { adverts } = await setup();
    const draft = await adverts.createDraft(tenantId, advertFrom(ownProfile));

    await expect(
      adverts.updateDraft(tenantId, draft.id, { displayName: otherProfile.displayName }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      adverts.updateDraft(tenantId, draft.id, { title: 'Fresh vegetable supply, weekly' }),
    ).resolves.toMatchObject({ title: 'Fresh vegetable supply, weekly' });
  });

  it('requires a live business profile before any advert', async () => {
    const profiles = new ProfilesService();
    const adverts = new AdvertsService(undefined, undefined, undefined, undefined, profiles);

    await expect(adverts.createDraft(tenantId, advertFrom(ownProfile))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('replaces the tenant’s own live advert in one step, so the listing never shows twice', async () => {
    const { adverts } = await setup();
    const original = await adverts.createAdvert(tenantId, advertFrom(ownProfile));
    const copy = await adverts.duplicateAdvert(tenantId, original.id, { title: 'Fresh vegetable supply' });

    const replacement = await adverts.publishDraft(tenantId, copy.id, {
      acceptedTerms: true,
      replacesAdvertId: original.id,
    });

    const listed = await adverts.listAdverts(tenantId);
    expect(listed.map((advert) => advert.id)).toEqual([replacement.id]);
    const search = await adverts.searchPublicAdverts({ countryCode: 'KE' });
    expect(search.results.filter((result) => result.tenantId === tenantId).map((result) => result.id)).toEqual([
      replacement.id,
    ]);
  });

  it('refuses to replace an advert that belongs to another tenant, before publishing anything', async () => {
    const { adverts } = await setup();
    const theirs = await adverts.createAdvert(otherTenantId, advertFrom(otherProfile, 'Cold chain trucks'));
    const draft = await adverts.createDraft(tenantId, advertFrom(ownProfile));

    await expect(
      adverts.publishDraft(tenantId, draft.id, { acceptedTerms: true, replacesAdvertId: theirs.id }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(await adverts.listAdverts(tenantId)).toHaveLength(0);
    expect((await adverts.listAdverts(otherTenantId)).map((advert) => advert.id)).toEqual([theirs.id]);
  });
});
