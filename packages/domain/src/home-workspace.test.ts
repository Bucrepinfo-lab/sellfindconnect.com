import { describe, expect, it } from 'vitest';

import {
  HOME_WORKSPACE_PANEL_IDS,
  parseHomeWorkspaceQuery,
  resolveCatalogIndustryCode,
  safeInternalRedirect,
} from './home-workspace';
import { FIND_QUICK_INDUSTRIES } from './onboarding';
import { industryCategories } from './industries';

describe('home workspace query landing', () => {
  it('maps dashboard discover redirects onto Source Finder with onboarding search', () => {
    const landing = parseHomeWorkspaceQuery(
      new URLSearchParams('onboarding=1&industry=AGRI&q=maize+flour&view=discover'),
    );

    expect(landing).toEqual({
      view: 'discover',
      panelId: HOME_WORKSPACE_PANEL_IDS.discover,
      query: 'maize flour',
      industryCode: 'AGRICULTURE',
      role: undefined,
      onboarding: true,
    });
  });

  it('maps dashboard advert redirects onto Advertiser Setup with a supply-chain role', () => {
    const landing = parseHomeWorkspaceQuery({
      onboarding: '1',
      view: 'adverts',
      role: 'PRODUCER',
    });

    expect(landing.view).toBe('adverts');
    expect(landing.panelId).toBe(HOME_WORKSPACE_PANEL_IDS.adverts);
    expect(landing.role).toBe('PRODUCER');
    expect(landing.onboarding).toBe(true);
  });

  it('accepts catalog industry codes and ignores unknown views, roles, and industries', () => {
    const landing = parseHomeWorkspaceQuery({
      view: 'billing',
      industry: 'MANUFACTURING',
      role: 'HACKER',
      q: '   ',
      onboarding: 'no',
    });

    expect(landing.view).toBeUndefined();
    expect(landing.panelId).toBeUndefined();
    expect(landing.query).toBeUndefined();
    expect(landing.industryCode).toBe('MANUFACTURING');
    expect(landing.role).toBeUndefined();
    expect(landing.onboarding).toBe(false);
  });

  it('strips hidden characters from search queries', () => {
    const landing = parseHomeWorkspaceQuery({
      q: 'fresh\u200b produce',
    });

    expect(landing.query).toBe('fresh produce');
  });

  it('maps every onboarding quick industry onto a catalog code', () => {
    const catalogCodes = new Set(industryCategories.map((item) => item.code));

    for (const industry of FIND_QUICK_INDUSTRIES) {
      expect(catalogCodes.has(industry.catalogCode)).toBe(true);
      expect(resolveCatalogIndustryCode(industry.code)).toBe(industry.catalogCode);
    }
  });

  it('rejects open redirects from onboarding launch payloads', () => {
    expect(safeInternalRedirect('/dashboard/discover?view=discover', '/')).toBe(
      '/dashboard/discover?view=discover',
    );
    expect(safeInternalRedirect('https://evil.test', '/')).toBe('/');
    expect(safeInternalRedirect('//evil.test', '/')).toBe('/');
  });
});
