import type { SupplyChainRole } from './industries';

export const sourceFinderSortOptions = [
  'RELEVANCE',
  'NEWEST',
  'MOST_VISITED',
  'VERIFIED',
  'RESPONSE_TIME',
] as const;

export type SourceFinderSortOption = (typeof sourceFinderSortOptions)[number];

export type RelationshipLink = {
  id: string;
  label: string;
  role: SupplyChainRole;
  relationship: 'SUPPLIES' | 'BUYS_FROM' | 'DISTRIBUTES' | 'SERVES' | 'FINANCES' | 'CERTIFIES';
  confidence: number;
};

export type SourceFinderRecord = {
  id: string;
  name: string;
  role: SupplyChainRole;
  industryCode: string;
  countryCode: string;
  location: string;
  offers: string[];
  needs: string[];
  relatedLinks: RelationshipLink[];
  verified: boolean;
  publishedAt: string;
  responseTimeMinutes: number;
  analytics: {
    views: number;
    clicks: number;
    inquiries: number;
    shares: number;
    downloads: number;
  };
};

export type SourceFinderSearchInput = {
  query: string;
  role?: SupplyChainRole | 'ALL';
  industryCode?: string;
  countryCode?: string;
  sortBy?: SourceFinderSortOption;
};

export const sourceFinderReasonCodes = [
  'OFFER_MATCH',
  'NEED_MATCH',
  'NAME_OR_LOCATION_MATCH',
  'ROLE_MATCH',
  'INDUSTRY_MATCH',
  'COUNTRY_MATCH',
  'VERIFIED_PROFILE',
  'POPULAR_PROFILE',
  'FAST_RESPONSE',
  'RELATIONSHIP_LINKS',
] as const;

export type SourceFinderReasonCode = (typeof sourceFinderReasonCodes)[number];

export type SourceFinderSearchResult = SourceFinderRecord & {
  score: number;
  reasonCodes: SourceFinderReasonCode[];
  reasons: string[];
};

export const pilotSourceFinderRecords: SourceFinderRecord[] = [
  {
    id: 'r1',
    name: 'Nairobi Fresh Produce Cooperative',
    role: 'SUPPLIER',
    industryCode: 'AGRICULTURE',
    countryCode: 'KE',
    location: 'Nairobi',
    offers: ['tomatoes', 'kale', 'onions', 'fresh produce', 'hotel supply'],
    needs: ['cold storage', 'transport', 'retail buyers'],
    verified: true,
    publishedAt: '2026-06-17T08:00:00.000Z',
    responseTimeMinutes: 14,
    analytics: {
      views: 1280,
      clicks: 342,
      inquiries: 68,
      shares: 41,
      downloads: 17,
    },
    relatedLinks: [
      {
        id: 'link-r1-r2',
        label: 'Rift Valley Cold Chain Logistics',
        role: 'LOGISTICS_PROVIDER',
        relationship: 'SERVES',
        confidence: 0.91,
      },
      {
        id: 'link-r1-r3',
        label: 'Coast Hospitality Buyers Guild',
        role: 'BUYER',
        relationship: 'BUYS_FROM',
        confidence: 0.86,
      },
    ],
  },
  {
    id: 'r2',
    name: 'Rift Valley Cold Chain Logistics',
    role: 'LOGISTICS_PROVIDER',
    industryCode: 'LOGISTICS',
    countryCode: 'KE',
    location: 'Nakuru',
    offers: ['cold transport', 'storage', 'last mile delivery', 'refrigerated logistics'],
    needs: ['produce suppliers', 'pharma clients', 'hotel buyers'],
    verified: true,
    publishedAt: '2026-06-01T08:00:00.000Z',
    responseTimeMinutes: 31,
    analytics: {
      views: 920,
      clicks: 201,
      inquiries: 46,
      shares: 28,
      downloads: 9,
    },
    relatedLinks: [
      {
        id: 'link-r2-r1',
        label: 'Nairobi Fresh Produce Cooperative',
        role: 'SUPPLIER',
        relationship: 'SERVES',
        confidence: 0.91,
      },
    ],
  },
  {
    id: 'r3',
    name: 'Coast Hospitality Buyers Guild',
    role: 'BUYER',
    industryCode: 'HOSPITALITY',
    countryCode: 'KE',
    location: 'Mombasa',
    offers: ['bulk hotel procurement', 'supplier contracts'],
    needs: ['fresh produce', 'cleaning services', 'linen supply'],
    verified: false,
    publishedAt: '2026-06-28T08:00:00.000Z',
    responseTimeMinutes: 60,
    analytics: {
      views: 740,
      clicks: 166,
      inquiries: 31,
      shares: 22,
      downloads: 6,
    },
    relatedLinks: [
      {
        id: 'link-r3-r1',
        label: 'Nairobi Fresh Produce Cooperative',
        role: 'SUPPLIER',
        relationship: 'BUYS_FROM',
        confidence: 0.86,
      },
      {
        id: 'link-r3-r4',
        label: 'Kiambu Packaging Works',
        role: 'PRODUCER',
        relationship: 'BUYS_FROM',
        confidence: 0.72,
      },
    ],
  },
  {
    id: 'r4',
    name: 'Kiambu Packaging Works',
    role: 'PRODUCER',
    industryCode: 'MANUFACTURING',
    countryCode: 'KE',
    location: 'Kiambu',
    offers: ['food packaging', 'retail labels', 'cartons', 'shelf-ready packaging'],
    needs: ['farm suppliers', 'retail distributors', 'hospitality buyers'],
    verified: true,
    publishedAt: '2026-05-17T08:00:00.000Z',
    responseTimeMinutes: 45,
    analytics: {
      views: 650,
      clicks: 119,
      inquiries: 22,
      shares: 12,
      downloads: 8,
    },
    relatedLinks: [
      {
        id: 'link-r4-r3',
        label: 'Coast Hospitality Buyers Guild',
        role: 'BUYER',
        relationship: 'SUPPLIES',
        confidence: 0.72,
      },
    ],
  },
];

export function searchSourceFinderRecords(
  input: SourceFinderSearchInput,
  records: SourceFinderRecord[] = pilotSourceFinderRecords,
): SourceFinderSearchResult[] {
  const sortBy = input.sortBy ?? 'RELEVANCE';
  const queryTokens = tokenize(input.query);

  const results = records
    .filter((record) => !input.countryCode || record.countryCode === input.countryCode)
    .filter((record) => !input.industryCode || input.industryCode === 'ALL' || record.industryCode === input.industryCode)
    .filter((record) => !input.role || input.role === 'ALL' || record.role === input.role)
    .map((record) => scoreRecord(record, queryTokens, input))
    .filter((record) => queryTokens.length === 0 || record.score > 0);

  return sortResults(results, sortBy);
}

function scoreRecord(
  record: SourceFinderRecord,
  queryTokens: string[],
  input: SourceFinderSearchInput,
): SourceFinderSearchResult {
  const reasonCodes = new Set<SourceFinderReasonCode>();
  const reasons: string[] = [];
  let score = 0;

  const offerText = normalize(record.offers.join(' '));
  const needText = normalize(record.needs.join(' '));
  const nameLocationText = normalize([record.name, record.location].join(' '));
  const relatedText = normalize(record.relatedLinks.map((link) => link.label).join(' '));

  for (const token of queryTokens) {
    if (offerText.includes(token)) {
      score += 24;
      reasonCodes.add('OFFER_MATCH');
    }
    if (needText.includes(token)) {
      score += 20;
      reasonCodes.add('NEED_MATCH');
    }
    if (nameLocationText.includes(token)) {
      score += 12;
      reasonCodes.add('NAME_OR_LOCATION_MATCH');
    }
    if (relatedText.includes(token)) {
      score += 8;
      reasonCodes.add('RELATIONSHIP_LINKS');
    }
  }

  if (input.role && input.role !== 'ALL' && record.role === input.role) {
    score += 15;
    reasonCodes.add('ROLE_MATCH');
  }
  if (input.industryCode && input.industryCode !== 'ALL' && record.industryCode === input.industryCode) {
    score += 12;
    reasonCodes.add('INDUSTRY_MATCH');
  }
  if (input.countryCode && record.countryCode === input.countryCode) {
    score += 8;
    reasonCodes.add('COUNTRY_MATCH');
  }
  if (record.verified) {
    score += 8;
    reasonCodes.add('VERIFIED_PROFILE');
  }
  if (record.analytics.views >= 750 || record.analytics.inquiries >= 40) {
    score += 8;
    reasonCodes.add('POPULAR_PROFILE');
  }
  if (record.responseTimeMinutes <= 30) {
    score += 6;
    reasonCodes.add('FAST_RESPONSE');
  }
  if (record.relatedLinks.length > 0) {
    score += Math.min(record.relatedLinks.length * 4, 12);
    reasonCodes.add('RELATIONSHIP_LINKS');
  }

  if (reasonCodes.has('OFFER_MATCH')) reasons.push('Offers match the search intent.');
  if (reasonCodes.has('NEED_MATCH')) reasons.push('Needs indicate likely demand or buyer fit.');
  if (reasonCodes.has('ROLE_MATCH')) reasons.push('Role matches the selected supply-chain position.');
  if (reasonCodes.has('INDUSTRY_MATCH')) reasons.push('Industry matches the selected category.');
  if (reasonCodes.has('COUNTRY_MATCH')) reasons.push('Country matches the selected market.');
  if (reasonCodes.has('VERIFIED_PROFILE')) reasons.push('Profile is marked verified.');
  if (reasonCodes.has('POPULAR_PROFILE')) reasons.push('Strong views or inquiry activity.');
  if (reasonCodes.has('FAST_RESPONSE')) reasons.push('Fast response history.');
  if (reasonCodes.has('RELATIONSHIP_LINKS')) reasons.push('Related suppliers, buyers, or service links are attached.');
  if (reasonCodes.has('NAME_OR_LOCATION_MATCH')) reasons.push('Name or location matches the search.');

  return {
    ...record,
    score: Math.min(100, score),
    reasonCodes: Array.from(reasonCodes),
    reasons,
  };
}

function sortResults(
  results: SourceFinderSearchResult[],
  sortBy: SourceFinderSortOption,
): SourceFinderSearchResult[] {
  const sorted = [...results];
  if (sortBy === 'NEWEST') {
    return sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  if (sortBy === 'MOST_VISITED') {
    return sorted.sort((a, b) => b.analytics.views - a.analytics.views);
  }
  if (sortBy === 'VERIFIED') {
    return sorted.sort((a, b) => Number(b.verified) - Number(a.verified) || b.score - a.score);
  }
  if (sortBy === 'RESPONSE_TIME') {
    return sorted.sort((a, b) => a.responseTimeMinutes - b.responseTimeMinutes);
  }
  return sorted.sort((a, b) => b.score - a.score);
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
