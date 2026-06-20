import { describe, expect, it } from 'vitest';

import {
  buildDiscoveryIndexDocument,
  inferDesiredDiscoveryRoles,
  scoreDiscoveryVector,
} from './discovery';

describe('discovery indexing', () => {
  it('builds searchable vectors and scores related text matches', () => {
    const document = buildDiscoveryIndexDocument({
      title: 'Fresh vegetable supply',
      displayName: 'Nairobi Fresh Produce',
      description: 'We supply fresh vegetables to hotels and retailers in Nairobi.',
      industryCode: 'AGRICULTURE',
      countryCode: 'KE',
      role: 'SUPPLIER',
    });
    const score = scoreDiscoveryVector('fresh vegetable hotel buyers', document.tokenVector);

    expect(document.searchText).toContain('fresh vegetable supply');
    expect(score.score).toBeGreaterThan(0);
    expect(score.matchedTerms).toEqual(expect.arrayContaining(['fresh', 'vegetable']));
  });

  it('infers desired relationship roles from buyer and supplier language', () => {
    expect(inferDesiredDiscoveryRoles('hotel buyers and customers')).toEqual(['BUYER', 'CONSUMER']);
    expect(inferDesiredDiscoveryRoles('find suppliers and sources')).toEqual(['SUPPLIER']);
  });
});
