import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ProfilesService } from '../profiles/profiles.service';
import { AdvertsService } from './adverts.service';

const mombasaTenant = '33333333-3333-4333-8333-333333333333';
const nairobiTenant = '44444444-4444-4444-8444-444444444444';
const unsetTenant = '55555555-5555-4555-8555-555555555555';

const base = {
  industryCode: 'AGRICULTURE',
  role: 'SUPPLIER' as const,
  countryCode: 'KE',
};

async function business(
  profiles: ProfilesService,
  adverts: AdvertsService,
  tenant: string,
  displayName: string,
  description: string,
  serviceArea?: { county?: string; constituency?: string; ward?: string; landmark?: string },
) {
  const profileDraft = await profiles.createDraft(tenant, {
    ...base,
    displayName,
    description: `${description} We supply hotels and shops every week.`,
    ...(serviceArea ? { serviceArea } : {}),
  });
  await profiles.publishDraft(tenant, profileDraft.id, { acceptedTerms: true });
  return adverts.createAdvert(tenant, {
    ...base,
    displayName,
    title: 'Fresh vegetable supply',
    description: `${description} Weekly deliveries to hotels and retailers.`,
  });
}

async function setup() {
  const profiles = new ProfilesService();
  const adverts = new AdvertsService(undefined, undefined, undefined, undefined, profiles);
  await business(profiles, adverts, mombasaTenant, 'Coast Greens', 'Fresh produce from the coast.', {
    county: 'mombasa',
    constituency: 'NYALI',
    ward: 'kongowea',
    landmark: 'Kongowea Market',
  });
  await business(profiles, adverts, nairobiTenant, 'City Greens', 'Fresh produce for the capital.', {
    county: 'Nairobi',
    constituency: 'Starehe',
  });
  await business(profiles, adverts, unsetTenant, 'Valley Greens', 'Fresh produce delivered across Mombasa town.');
  return { profiles, adverts };
}

const names = (results: Array<{ displayName: string }>) => results.map((item) => item.displayName).sort();

describe('public advert search by area', () => {
  it('stores a business location with official spellings', async () => {
    const profiles = new ProfilesService();
    const draft = await profiles.createDraft(mombasaTenant, {
      ...base,
      displayName: 'Coast Greens',
      description: 'Fresh produce from the coast for hotels and shops.',
      serviceArea: { county: 'MOMBASA', constituency: 'nyali', ward: 'Not a ward', landmark: '  Kongowea Market ' },
    });
    expect(draft.serviceArea).toMatchObject({
      county: 'Mombasa',
      constituency: 'Nyali',
      landmark: 'Kongowea Market',
    });
    expect(draft.serviceArea?.ward).toBeUndefined();
  });

  it('refuses a county that is not one of the 47', async () => {
    const profiles = new ProfilesService();
    await expect(
      profiles.createDraft(mombasaTenant, {
        ...base,
        displayName: 'Coast Greens',
        description: 'Fresh produce from the coast for hotels and shops.',
        serviceArea: { county: 'Atlantis' },
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('returns each listing with its business location', async () => {
    const { adverts } = await setup();
    const { results } = await adverts.searchPublicAdverts({ countryCode: 'KE' });
    const coast = results.find((item) => item.displayName === 'Coast Greens');
    expect(coast?.location).toEqual({
      county: 'Mombasa',
      constituency: 'Nyali',
      ward: 'Kongowea',
      landmark: 'Kongowea Market',
    });
    expect(results.find((item) => item.displayName === 'Valley Greens')?.location).toBeUndefined();
  });

  it('filters by county on the set location, and by text for businesses without one', async () => {
    const { adverts } = await setup();
    expect(names((await adverts.searchPublicAdverts({ countryCode: 'KE', county: 'Mombasa' })).results)).toEqual([
      'Coast Greens',
      'Valley Greens',
    ]);
    expect(names((await adverts.searchPublicAdverts({ countryCode: 'KE', county: 'nairobi' })).results)).toEqual([
      'City Greens',
    ]);
    expect((await adverts.searchPublicAdverts({ countryCode: 'KE', county: 'Kisumu' })).results).toEqual([]);
  });

  it('narrows to constituency and ward when asked', async () => {
    const { adverts } = await setup();
    const ward = await adverts.searchPublicAdverts({
      countryCode: 'KE',
      county: 'Mombasa',
      constituency: 'Nyali',
      ward: 'Kongowea',
    });
    expect(names(ward.results)).toEqual(['Coast Greens']);
    expect(ward.filters).toMatchObject({ county: 'Mombasa', constituency: 'Nyali', ward: 'Kongowea' });
    const other = await adverts.searchPublicAdverts({ countryCode: 'KE', county: 'Mombasa', constituency: 'Kisauni' });
    expect(names(other.results)).toEqual([]);
  });

  it('ignores an unknown county instead of hiding everything', async () => {
    const { adverts } = await setup();
    const { results } = await adverts.searchPublicAdverts({ countryCode: 'KE', county: 'Atlantis' });
    expect(results).toHaveLength(3);
  });

  it('shows the location on the public listing page', async () => {
    const { adverts } = await setup();
    const { results } = await adverts.searchPublicAdverts({ countryCode: 'KE' });
    const id = results.find((item) => item.displayName === 'City Greens')?.id ?? '';
    expect((await adverts.getPublicAdvert(id)).location).toEqual({ county: 'Nairobi', constituency: 'Starehe' });
  });
});
