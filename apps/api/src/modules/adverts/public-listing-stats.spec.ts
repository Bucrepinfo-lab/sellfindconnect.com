import { describe, expect, it } from 'vitest';

import { ProfilesService } from '../profiles/profiles.service';
import { AdvertsService } from './adverts.service';

const tenantId = '66666666-6666-4666-8666-666666666666';

async function setup() {
  const profiles = new ProfilesService();
  const adverts = new AdvertsService(undefined, undefined, undefined, undefined, profiles);
  const identity = {
    displayName: 'Rift Cereals',
    industryCode: 'AGRICULTURE',
    role: 'SUPPLIER' as const,
    countryCode: 'KE',
  };
  const draft = await profiles.createDraft(tenantId, {
    ...identity,
    description: 'Maize, beans and wheat for millers and schools in the Rift Valley.',
  });
  await profiles.publishDraft(tenantId, draft.id, { acceptedTerms: true });
  const advert = await adverts.createAdvert(tenantId, {
    ...identity,
    title: 'Dry maize by the tonne',
    description: 'Clean dry maize delivered by the tonne to millers and schools.',
  });
  return { adverts, advert };
}

describe('public listing counts', () => {
  it('starts every listing at zero', async () => {
    const { adverts, advert } = await setup();
    expect((await adverts.getPublicAdvert(advert.id)).stats).toEqual({ views: 0, enquiries: 0 });
  });

  it('counts a view and a contact tap once per visitor', async () => {
    const { adverts, advert } = await setup();
    await adverts.recordPublicListingEvent(advert.id, 'VIEW', 'visitor-a');
    await adverts.recordPublicListingEvent(advert.id, 'VIEW', 'visitor-a');
    await adverts.recordPublicListingEvent(advert.id, 'VIEW', 'visitor-b');
    await adverts.recordPublicListingEvent(advert.id, 'INQUIRY', 'visitor-a');

    expect((await adverts.getPublicAdvert(advert.id)).stats).toEqual({ views: 2, enquiries: 1 });
    const { results } = await adverts.searchPublicAdverts({ countryCode: 'KE' });
    expect(results.find((item) => item.id === advert.id)?.stats).toEqual({ views: 2, enquiries: 1 });
  });

  it('ignores unknown or hidden listings without an error', async () => {
    const { adverts, advert } = await setup();
    await expect(adverts.recordPublicListingEvent('not-an-id', 'VIEW', 'v')).resolves.toBeUndefined();
    await expect(
      adverts.recordPublicListingEvent('00000000-0000-4000-8000-000000000000', 'VIEW', 'v'),
    ).resolves.toBeUndefined();
    await adverts.pauseAdvert(tenantId, advert.id);
    await expect(adverts.recordPublicListingEvent(advert.id, 'VIEW', 'v2')).resolves.toBeUndefined();
  });
});
