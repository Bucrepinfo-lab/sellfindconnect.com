import { describe, expect, it } from 'vitest';

import {
  communityStandardSummaries,
  communityStandardsVersion,
} from './community-standards';

describe('community standards', () => {
  it('versions the public user policy and covers Play UGC conduct rules', () => {
    expect(communityStandardsVersion).toBe('community-2026-08-22');
    expect(communityStandardSummaries.map((item) => item.id)).toEqual([
      'AUTHORITY',
      'ZERO_TOLERANCE',
      'ACCEPTABLE_USE',
      'TRUTHFUL',
      'RIGHTS',
      'CONSENT',
      'HARASSMENT',
      'TRANSACTIONS',
      'REPORT_BLOCK',
      'CHILDREN',
      'MONETIZATION',
      'MODERATION',
    ]);
    expect(new Set(communityStandardSummaries.map((item) => item.id)).size).toBe(
      communityStandardSummaries.length,
    );
  });

  it('keeps sexual content fully prohibited and requires report and block', () => {
    const children = communityStandardSummaries.find((item) => item.id === 'CHILDREN');
    const reporting = communityStandardSummaries.find((item) => item.id === 'REPORT_BLOCK');
    const harassment = communityStandardSummaries.find((item) => item.id === 'HARASSMENT');

    expect(children?.summary).toMatch(/not directed at children/i);
    expect(children?.summary).toMatch(/fully prohibited/i);
    expect(reporting?.summary).toMatch(/report and block/i);
    expect(harassment?.summary).toMatch(/harass/i);
  });
});
