import { buildDiscoveryIndexDocument, tokenizeDiscoveryText, type DiscoveryVector } from './discovery';
import { getCountry } from './geography';
import { industryCategories, type SupplyChainRole } from './industries';
import { normaliseFtsRank } from './search';

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
  'OUTCOME_FEEDBACK',
  'KEYWORD_MATCH',
] as const;

export type SourceFinderReasonCode = (typeof sourceFinderReasonCodes)[number];

export type SourceFinderSearchResult = SourceFinderRecord & {
  score: number;
  reasonCodes: SourceFinderReasonCode[];
  reasons: string[];
};

export type SourceFinderIndexDocument = SourceFinderRecord & {
  searchText: string;
  tokenVector: DiscoveryVector;
  indexedAt: string;
};

export function buildSourceFinderIndexDocument(
  record: SourceFinderRecord,
  indexedAt = record.publishedAt,
): SourceFinderIndexDocument {
  const document = buildDiscoveryIndexDocument({
    title: record.name,
    displayName: record.location,
    description: [...record.offers, ...record.needs].join(' '),
    industryCode: record.industryCode,
    countryCode: record.countryCode,
    role: record.role,
    tags: [...record.offers, ...record.needs],
    relationshipSignals: record.relatedLinks.map((link) => ({
      role: link.role,
      relationship: link.relationship,
      weight: link.confidence,
      reason: link.label,
    })),
  });

  return {
    ...record,
    searchText: document.searchText,
    tokenVector: document.tokenVector,
    indexedAt,
  };
}

export type SourceFinderIndexSearchInput = {
  query?: string;
  countryCode?: string;
  industryCode?: string;
  role?: SupplyChainRole | 'ALL';
};

export function buildSourceFinderTsQuery(query: string): string {
  const tokens = tokenizeDiscoveryText(query)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 2)
    .map((token) => `${token}:*`);
  return tokens.join(' & ') || "''";
}

export function scoreSourceFinderFullText(
  document: Pick<SourceFinderIndexDocument, 'searchText' | 'tokenVector'>,
  query: string,
): number {
  const tokens = tokenizeDiscoveryText(query);
  if (tokens.length === 0) {
    return 0;
  }

  let hits = 0;
  let weight = 0;
  for (const token of tokens) {
    const vectorWeight = document.tokenVector[token] ?? 0;
    if (vectorWeight > 0 || document.searchText.includes(token)) {
      hits += 1;
      weight += vectorWeight > 0 ? vectorWeight : 0.1;
    }
  }

  if (hits < tokens.length) {
    return 0;
  }

  return Number((weight / tokens.length).toFixed(6));
}

export type SourceFinderSearchMode = 'RULES' | 'FTS' | 'HYBRID';

export type SourceFinderIndexSearchHit = {
  document: SourceFinderIndexDocument;
  ftsRank: number;
};

export function searchSourceFinderIndexDocuments(
  documents: SourceFinderIndexDocument[],
  input: SourceFinderIndexSearchInput = {},
): SourceFinderIndexSearchHit[] {
  const filtered = documents
    .filter((document) => !input.countryCode || document.countryCode === input.countryCode)
    .filter(
      (document) =>
        !input.industryCode ||
        input.industryCode === 'ALL' ||
        document.industryCode === input.industryCode,
    )
    .filter((document) => !input.role || input.role === 'ALL' || document.role === input.role);

  const query = input.query?.trim() ?? '';
  if (!query || tokenizeDiscoveryText(query).length === 0) {
    return filtered.map((document) => ({ document, ftsRank: 0 }));
  }

  return filtered
    .map((document) => ({
      document,
      ftsRank: scoreSourceFinderFullText(document, query),
    }))
    .filter((hit) => hit.ftsRank > 0);
}

export function resolveSourceFinderSearchMode(input: {
  indexedDocumentCount: number;
  query: string;
  ftsHitCount: number;
}): SourceFinderSearchMode {
  const hasQuery = tokenizeDiscoveryText(input.query).length > 0;
  if (input.indexedDocumentCount === 0 || !hasQuery) {
    return 'RULES';
  }
  if (input.ftsHitCount === 0) {
    return 'RULES';
  }
  return 'HYBRID';
}

export function rankSourceFinderWithFullText(
  input: SourceFinderSearchInput,
  records: SourceFinderRecord[],
  hits: SourceFinderIndexSearchHit[] = [],
): SourceFinderSearchResult[] {
  const matchingHits = hits.filter((hit) => hit.ftsRank > 0);
  const catalog =
    matchingHits.length > 0
      ? records.filter((record) => matchingHits.some((hit) => hit.document.id === record.id))
      : records;
  const ranks = new Map(matchingHits.map((hit) => [hit.document.id, hit.ftsRank]));
  return applySourceFinderFullTextRanking(
    searchSourceFinderRecords(input, catalog),
    ranks,
    input.sortBy ?? 'RELEVANCE',
  );
}

export function applySourceFinderFullTextRanking(
  results: SourceFinderSearchResult[],
  ranks: Map<string, number>,
  sortBy: SourceFinderSortOption = 'RELEVANCE',
): SourceFinderSearchResult[] {
  const boosted = results.map((result) => {
    const ftsRank = ranks.get(result.id) ?? 0;
    if (ftsRank <= 0) {
      return result;
    }

    const reasonCodes = result.reasonCodes.includes('KEYWORD_MATCH')
      ? result.reasonCodes
      : [...result.reasonCodes, 'KEYWORD_MATCH' as const];
    const reasons = result.reasons.includes('Full-text index matched the search keywords.')
      ? result.reasons
      : [...result.reasons, 'Full-text index matched the search keywords.'];

    return {
      ...result,
      score: Math.min(100, result.score + Math.round(normaliseFtsRank(ftsRank) * 20)),
      reasonCodes,
      reasons,
    };
  });

  return sortResults(boosted, sortBy);
}

export function toSourceFinderRecord(document: SourceFinderIndexDocument): SourceFinderRecord {
  return {
    id: document.id,
    name: document.name,
    role: document.role,
    industryCode: document.industryCode,
    countryCode: document.countryCode,
    location: document.location,
    offers: document.offers,
    needs: document.needs,
    relatedLinks: document.relatedLinks,
    verified: document.verified,
    publishedAt: document.publishedAt,
    responseTimeMinutes: document.responseTimeMinutes,
    analytics: document.analytics,
  };
}

export type SourceFinderHierarchyScope = {
  countryCode?: string;
  industryCode?: string;
  role?: SupplyChainRole | 'ALL';
};

export type SourceFinderHierarchyBucket = {
  key: string;
  label: string;
  sources: number;
  verified: number;
  relationshipLinks: number;
  views: number;
  inquiries: number;
};

export type SourceFinderHierarchyReport = {
  totals: {
    sources: number;
    verified: number;
    relationshipLinks: number;
    countries: number;
    industries: number;
    roles: number;
  };
  byCountry: SourceFinderHierarchyBucket[];
  byIndustry: SourceFinderHierarchyBucket[];
  byRole: SourceFinderHierarchyBucket[];
  byRelationship: SourceFinderHierarchyBucket[];
  topSources: Array<{
    id: string;
    name: string;
    role: SupplyChainRole;
    countryCode: string;
    views: number;
    relationshipLinks: number;
  }>;
};

export function buildSourceFinderHierarchyReport(
  records: SourceFinderRecord[],
  scope: SourceFinderHierarchyScope = {},
): SourceFinderHierarchyReport {
  const scoped = records
    .filter((record) => !scope.countryCode || record.countryCode === scope.countryCode)
    .filter(
      (record) =>
        !scope.industryCode ||
        scope.industryCode === 'ALL' ||
        record.industryCode === scope.industryCode,
    )
    .filter((record) => !scope.role || scope.role === 'ALL' || record.role === scope.role);

  const byCountry = new Map<string, SourceFinderHierarchyBucket>();
  const byIndustry = new Map<string, SourceFinderHierarchyBucket>();
  const byRole = new Map<string, SourceFinderHierarchyBucket>();
  const byRelationship = new Map<string, SourceFinderHierarchyBucket>();

  for (const record of scoped) {
    addHierarchyBucket(
      byCountry,
      record.countryCode,
      getCountry(record.countryCode)?.name ?? record.countryCode,
      record,
    );
    addHierarchyBucket(
      byIndustry,
      record.industryCode,
      industryCategories.find((industry) => industry.code === record.industryCode)?.name ??
        record.industryCode,
      record,
    );
    addHierarchyBucket(byRole, record.role, record.role.replaceAll('_', ' '), record);
    for (const link of record.relatedLinks) {
      const current = byRelationship.get(link.relationship) ?? {
        key: link.relationship,
        label: link.relationship.replaceAll('_', ' '),
        sources: 0,
        verified: 0,
        relationshipLinks: 0,
        views: 0,
        inquiries: 0,
      };
      current.relationshipLinks += 1;
      byRelationship.set(link.relationship, current);
    }
  }

  for (const record of scoped) {
    const seen = new Set<string>();
    for (const link of record.relatedLinks) {
      if (seen.has(link.relationship)) {
        continue;
      }
      seen.add(link.relationship);
      const current = byRelationship.get(link.relationship);
      if (!current) {
        continue;
      }
      current.sources += 1;
      current.verified += record.verified ? 1 : 0;
      current.views += record.analytics.views;
      current.inquiries += record.analytics.inquiries;
    }
  }

  return {
    totals: {
      sources: scoped.length,
      verified: scoped.filter((record) => record.verified).length,
      relationshipLinks: scoped.reduce((sum, record) => sum + record.relatedLinks.length, 0),
      countries: byCountry.size,
      industries: byIndustry.size,
      roles: byRole.size,
    },
    byCountry: sortHierarchyBuckets(byCountry),
    byIndustry: sortHierarchyBuckets(byIndustry),
    byRole: sortHierarchyBuckets(byRole),
    byRelationship: sortHierarchyBuckets(byRelationship),
    topSources: [...scoped]
      .sort((left, right) => right.analytics.views - left.analytics.views || left.name.localeCompare(right.name))
      .slice(0, 5)
      .map((record) => ({
        id: record.id,
        name: record.name,
        role: record.role,
        countryCode: record.countryCode,
        views: record.analytics.views,
        relationshipLinks: record.relatedLinks.length,
      })),
  };
}

function addHierarchyBucket(
  buckets: Map<string, SourceFinderHierarchyBucket>,
  key: string,
  label: string,
  record: SourceFinderRecord,
): void {
  const current = buckets.get(key) ?? {
    key,
    label,
    sources: 0,
    verified: 0,
    relationshipLinks: 0,
    views: 0,
    inquiries: 0,
  };
  current.sources += 1;
  current.verified += record.verified ? 1 : 0;
  current.relationshipLinks += record.relatedLinks.length;
  current.views += record.analytics.views;
  current.inquiries += record.analytics.inquiries;
  buckets.set(key, current);
}

function sortHierarchyBuckets(
  buckets: Map<string, SourceFinderHierarchyBucket>,
): SourceFinderHierarchyBucket[] {
  return [...buckets.values()].sort(
    (left, right) =>
      right.sources - left.sources ||
      right.views - left.views ||
      left.label.localeCompare(right.label),
  );
}

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
  if (reasonCodes.has('OUTCOME_FEEDBACK')) reasons.push('Prior accepted or saved outcomes improved this match.');

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

export const opportunityAlertFrequencies = ['INSTANT', 'DAILY', 'WEEKLY'] as const;

export type OpportunityAlertFrequency = (typeof opportunityAlertFrequencies)[number];

export const opportunityAlertCadenceMs: Record<OpportunityAlertFrequency, number> = {
  INSTANT: 0,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

export const opportunityAlertMinScore = 40;

export class SourceFinderSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceFinderSearchError';
  }
}

export type SavedSourceFinderSearch = {
  id: string;
  tenantId: string;
  name: string;
  query: string;
  role?: SupplyChainRole | 'ALL';
  industryCode?: string;
  countryCode?: string;
  sortBy?: SourceFinderSortOption;
  alertFrequency: OpportunityAlertFrequency;
  isActive: boolean;
  lastAlertedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SourceFinderOpportunityAlert = {
  id: string;
  tenantId: string;
  savedSearchId: string;
  sourceRecordId: string;
  sourceName: string;
  sourceRole: SupplyChainRole;
  title: string;
  message: string;
  score: number;
  reasonCodes: SourceFinderReasonCode[];
  createdAt: string;
};

export type SavedSourceFinderSearchInput = {
  name: string;
  query: string;
  role?: SupplyChainRole | 'ALL';
  industryCode?: string;
  countryCode?: string;
  sortBy?: SourceFinderSortOption;
  alertFrequency?: OpportunityAlertFrequency;
};

export function createSavedSourceFinderSearch(
  input: SavedSourceFinderSearchInput,
  context: { tenantId: string; id: string },
  nowIso = new Date().toISOString(),
): SavedSourceFinderSearch {
  const name = input.name.trim();
  const query = input.query.trim();

  if (name.length < 2 || name.length > 120) {
    throw new SourceFinderSearchError('Saved search name must be between 2 and 120 characters.');
  }

  if (query.length < 2 || query.length > 200) {
    throw new SourceFinderSearchError('Saved search query must be between 2 and 200 characters.');
  }

  const alertFrequency = input.alertFrequency ?? 'DAILY';
  if (!opportunityAlertFrequencies.includes(alertFrequency)) {
    throw new SourceFinderSearchError('Unsupported opportunity alert cadence.');
  }

  return {
    id: context.id,
    tenantId: context.tenantId,
    name,
    query,
    role: input.role,
    industryCode: input.industryCode,
    countryCode: input.countryCode,
    sortBy: input.sortBy,
    alertFrequency,
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function isOpportunityAlertDue(
  search: Pick<SavedSourceFinderSearch, 'isActive' | 'alertFrequency' | 'lastAlertedAt'>,
  nowIso = new Date().toISOString(),
): boolean {
  if (!search.isActive) {
    return false;
  }

  if (!search.lastAlertedAt) {
    return true;
  }

  return (
    Date.parse(nowIso) - Date.parse(search.lastAlertedAt) >=
    opportunityAlertCadenceMs[search.alertFrequency]
  );
}

export function selectOpportunityMatches(
  results: SourceFinderSearchResult[],
  limit = 5,
): SourceFinderSearchResult[] {
  return results
    .filter((result) => result.score >= opportunityAlertMinScore)
    .slice(0, Math.min(20, Math.max(1, limit)));
}

export function buildOpportunityAlert(
  search: SavedSourceFinderSearch,
  result: SourceFinderSearchResult,
  id: string,
  nowIso = new Date().toISOString(),
): SourceFinderOpportunityAlert {
  return {
    id,
    tenantId: search.tenantId,
    savedSearchId: search.id,
    sourceRecordId: result.id,
    sourceName: result.name,
    sourceRole: result.role,
    title: `Opportunity: ${result.name}`,
    message: `${result.name} matches "${search.name}" with score ${result.score}.`,
    score: result.score,
    reasonCodes: result.reasonCodes,
    createdAt: nowIso,
  };
}

export function opportunityAlertKey(savedSearchId: string, sourceRecordId: string): string {
  return `${savedSearchId}:${sourceRecordId}`;
}

export const sourceFinderOutcomeActions = [
  'ACCEPT',
  'SAVE',
  'DISMISS',
  'HIDE',
  'REPORT',
] as const;

export type SourceFinderOutcomeAction = (typeof sourceFinderOutcomeActions)[number];

export type SourceFinderOutcomeFeedback = {
  id: string;
  tenantId: string;
  sourceRecordId: string;
  query?: string;
  action: SourceFinderOutcomeAction;
  note?: string;
  behavioralMatchingConsent: boolean;
  createdAt: string;
};

export type SourceFinderOutcomeFeedbackInput = {
  sourceRecordId: string;
  query?: string;
  action: SourceFinderOutcomeAction;
  note?: string;
  behavioralMatchingConsent?: boolean;
};

export function createSourceFinderOutcomeFeedback(
  input: SourceFinderOutcomeFeedbackInput,
  context: { tenantId: string; id: string },
  nowIso = new Date().toISOString(),
): SourceFinderOutcomeFeedback {
  const sourceRecordId = input.sourceRecordId.trim();
  const query = input.query?.trim();
  const note = input.note?.trim();

  if (sourceRecordId.length < 2 || sourceRecordId.length > 120) {
    throw new SourceFinderSearchError('Outcome feedback requires a valid source record.');
  }

  if (!sourceFinderOutcomeActions.includes(input.action)) {
    throw new SourceFinderSearchError('Unsupported Source Finder outcome action.');
  }

  if (query && (query.length < 2 || query.length > 200)) {
    throw new SourceFinderSearchError('Outcome feedback query must be between 2 and 200 characters.');
  }

  if (note && note.length > 500) {
    throw new SourceFinderSearchError('Outcome feedback note must be 500 characters or fewer.');
  }

  return {
    id: context.id,
    tenantId: context.tenantId,
    sourceRecordId,
    query: query || undefined,
    action: input.action,
    note: note || undefined,
    behavioralMatchingConsent: input.behavioralMatchingConsent === true,
    createdAt: nowIso,
  };
}

export function latestSourceFinderOutcomes(
  feedback: readonly SourceFinderOutcomeFeedback[],
): Map<string, SourceFinderOutcomeFeedback> {
  const latest = new Map<string, SourceFinderOutcomeFeedback>();
  const ordered = [...feedback].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  for (const item of ordered) {
    latest.set(item.sourceRecordId, item);
  }

  return latest;
}

export function applySourceFinderOutcomes(
  results: SourceFinderSearchResult[],
  feedback: readonly SourceFinderOutcomeFeedback[],
  options: { behavioralMatchingConsent?: boolean } = {},
): SourceFinderSearchResult[] {
  const latest = latestSourceFinderOutcomes(feedback);
  if (latest.size === 0) {
    return results;
  }

  const behavioralMatchingConsent = options.behavioralMatchingConsent === true;
  const adjusted: SourceFinderSearchResult[] = [];

  for (const result of results) {
    const outcome = latest.get(result.id);
    if (!outcome) {
      adjusted.push(result);
      continue;
    }

    if (outcome.action === 'HIDE' || outcome.action === 'REPORT') {
      continue;
    }

    let score = result.score;
    const reasonCodes = [...result.reasonCodes];
    const reasons = [...result.reasons];

    if (outcome.action === 'DISMISS') {
      score = Math.max(0, score - 15);
    }

    if (
      (outcome.action === 'ACCEPT' || outcome.action === 'SAVE') &&
      behavioralMatchingConsent &&
      outcome.behavioralMatchingConsent
    ) {
      score = Math.min(100, score + 10);
      if (!reasonCodes.includes('OUTCOME_FEEDBACK')) {
        reasonCodes.push('OUTCOME_FEEDBACK');
        reasons.push('Prior accepted or saved outcomes improved this match.');
      }
    }

    adjusted.push({
      ...result,
      score,
      reasonCodes,
      reasons,
    });
  }

  return adjusted.sort((left, right) => right.score - left.score);
}
