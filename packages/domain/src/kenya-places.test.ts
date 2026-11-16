import { describe, expect, it } from 'vitest';

import {
  findKenyaConstituency,
  findKenyaCounty,
  kenyaCounties,
  kenyaPlaceLabel,
  normalizeKenyaPlace,
  textMentionsKenyaPlace,
  textNamesPlace,
} from './kenya-places';

describe('Kenya places (Legal Notice 14 of 2012)', () => {
  it('holds 47 counties, 290 constituencies and 1,450 wards', () => {
    expect(kenyaCounties).toHaveLength(47);
    const constituencies = kenyaCounties.flatMap((county) => county.constituencies);
    expect(constituencies).toHaveLength(290);
    expect(constituencies.flatMap((item) => item.wards)).toHaveLength(1450);
  });

  it('numbers counties 1 to 47 with no gaps or repeats', () => {
    expect(kenyaCounties.map((county) => county.code)).toEqual(Array.from({ length: 47 }, (_, i) => i + 1));
    expect(kenyaCounties[0]?.name).toBe('Mombasa');
    expect(kenyaCounties[46]?.name).toBe('Nairobi');
  });

  it('has no empty or repeated names inside a parent', () => {
    for (const county of kenyaCounties) {
      const names = county.constituencies.map((item) => item.name);
      expect(new Set(names).size, county.name).toBe(names.length);
      for (const constituency of county.constituencies) {
        expect(constituency.wards.length, constituency.name).toBeGreaterThan(0);
        expect(constituency.wards.every((ward) => ward.trim().length > 0)).toBe(true);
      }
    }
  });

  it('finds places whatever the letter case', () => {
    expect(findKenyaCounty('  mombasa ')?.code).toBe(1);
    expect(findKenyaConstituency('Mombasa', 'CHANGAMWE')?.wards).toContain('Port Reitz');
    expect(findKenyaConstituency('Baringo', 'Baringo North')?.wards).toContain('Kabartonjo');
    expect(findKenyaCounty('Atlantis')).toBeUndefined();
  });

  it('drops the parts of a selection that do not exist', () => {
    expect(normalizeKenyaPlace({ county: 'mombasa', constituency: 'changamwe', ward: 'port reitz' })).toEqual({
      county: 'Mombasa',
      constituency: 'Changamwe',
      ward: 'Port Reitz',
    });
    expect(normalizeKenyaPlace({ county: 'Mombasa', constituency: 'Westlands', ward: 'Kangemi' })).toEqual({
      county: 'Mombasa',
    });
    expect(normalizeKenyaPlace({ county: 'Nowhere', ward: 'Kangemi' })).toEqual({});
  });

  it('labels a place most specific part first', () => {
    expect(kenyaPlaceLabel({ county: 'Mombasa', constituency: 'Changamwe', ward: 'Port Reitz' })).toBe(
      'Port Reitz, Changamwe, Mombasa',
    );
    expect(kenyaPlaceLabel({})).toBe('');
  });

  it('matches place names as whole words only', () => {
    expect(textNamesPlace('Maize flour supplier, Nakuru town', 'Nakuru')).toBe(true);
    expect(textNamesPlace('We deliver to NAKURU.', 'nakuru')).toBe(true);
    expect(textNamesPlace('Embulbul hardware', 'Embu')).toBe(false);
    expect(textNamesPlace('anything', '')).toBe(false);
  });

  it('narrows by the most specific place chosen; no choice matches everything', () => {
    const text = 'Cereals wholesaler in Kongowea, Mombasa';
    expect(textMentionsKenyaPlace(text, {})).toBe(true);
    expect(textMentionsKenyaPlace(text, { county: 'Mombasa' })).toBe(true);
    expect(textMentionsKenyaPlace(text, { county: 'Mombasa', constituency: 'Nyali', ward: 'Kongowea' })).toBe(true);
    expect(textMentionsKenyaPlace(text, { county: 'Mombasa', constituency: 'Kisauni' })).toBe(false);
    expect(textMentionsKenyaPlace(text, { county: 'Kisumu' })).toBe(false);
  });

  it('needs the county or constituency beside an everyday ward name', () => {
    const ward = { county: 'Kiambu', constituency: 'Thika Town', ward: 'Hospital' };
    expect(textMentionsKenyaPlace('Hospital beds and linen supplier, Nairobi', ward)).toBe(false);
    expect(textMentionsKenyaPlace('Shop near Hospital ward, Thika Town', ward)).toBe(true);
  });
});
