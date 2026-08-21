'use client';

import {
  ArrowUpDown,
  BadgeCheck,
  Ban,
  Bell,
  CheckCheck,
  ClipboardList,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  CircleAlert,
  Clock,
  Eye,
  FileCheck2,
  Flag,
  Handshake,
  Inbox,
  Link2,
  MessageSquareText,
  Radio,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import {
  accessPermissions,
  accessRoles,
  activePolicyVersions,
  countries,
  advertLifecyclePolicy,
  buildSavedReplySuggestions,
  buildLeadConversionIntelligence,
  buildNotificationDeliveryPlan,
  calculateAdvertLifecycle,
  calculateConversationSlaDecision,
  calculateTaxSnapshotAmounts,
  calculateTrialSubscription,
  canExportCountryTaxReport,
  canOperateTaxReturnWorkbench,
  conversationStatuses,
  conversationRealtimeNamespace,
  countUnreadMessagesForRole,
  describeConversationPresenceStatus,
  describeMessageDeliveryStatus,
  describeNotificationDispatchAttemptStatus,
  describeProductAuditAction,
  isConversationTypingActive,
  markMessageDelivered,
  markMessageRead,
  planNotificationDispatchAttempts,
  presentUserFacingMediaReview,
  resolveConversationPresenceStatus,
  toConversationAttachment,
  defaultNotificationPreferences,
  evaluateAccess,
  evaluatePasswordPolicy,
  evaluateSafetyText,
  evaluateTaxPeriodCompletion,
  expandDiscoveryQuery,
  getRemittanceAlertDecision,
  getCountry,
  industryCategories,
  operationalRegions,
  attachApprovedRelationshipClaims,
  applySourceFinderOutcomes,
  buildOpportunityAlert,
  buildSourceFinderHierarchyReport,
  buildProductAuditRecord,
  buildSourceFinderIndexDocument,
  buildTaxReturnExport,
  canViewTenantAuditLogs,
  createRelationshipClaim,
  createSavedSourceFinderSearch,
  createSourceFinderOutcomeFeedback,
  decideRelationshipClaim,
  isOpportunityAlertDue,
  isPublicGraphClaim,
  opportunityAlertFrequencies,
  relationshipKinds,
  relationshipVisibilities,
  type OpportunityAlertFrequency,
  type RelationshipClaim,
  type RelationshipKind,
  type RelationshipVisibility,
  type SavedSourceFinderSearch,
  type SourceFinderOpportunityAlert,
  type SourceFinderOutcomeFeedback,
  selectOpportunityMatches,
  rankSourceFinderWithFullText,
  pilotSourceFinderRecords,
  prohibitedCategorySummaries,
  searchSourceFinderIndexDocuments,
  searchSourceFinderRecords,
  sourceFinderOutcomeActions,
  sourceFinderSortOptions,
  leadStatuses,
  matchFeedbackActions,
  type LeadStatus,
  type MatchFeedbackAction,
  type ConversationMessage,
  type ConversationMessageAttachment,
  type ConversationStatus,
  type MessageDeliveryStatus,
  type AccessPermission,
  type AccessResourceScope,
  type AccessRole,
  type AccessScopeLevel,
  type NotificationSeverity,
  type SourceFinderSearchResult,
  type SourceFinderSortOption,
  type SourceFinderOutcomeAction,
  supplyChainRoles,
  type SupplyChainRole,
} from '@telpen/domain';

const tenantId = '11111111-1111-4111-8111-111111111111';
const counterpartTenantId = '22222222-2222-4222-8222-222222222222';
const lifecycleDemoNow = new Date(Date.UTC(2026, 6, 10, 0, 0, 0)).toISOString();
const conversationDemoOpenedAt = '2026-06-17T08:00:00.000Z';
const conversationDemoNow = '2026-06-17T11:15:00.000Z';
const opportunityAlertDemoNow = '2026-08-22T08:00:00.000Z';
const taxReturnDemoNow = '2026-07-31T09:05:00.000Z';
const analyticsApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

type SavedSearchAlertPreview = {
  id: string;
  savedSearch: SavedSourceFinderSearch;
  result: SourceFinderSearchResult | null;
  status: 'READY' | 'BLOCKED' | 'WAITING';
};

type AnalyticsExportFormat = 'CSV' | 'JSON' | 'PDF';
type AnalyticsReportDataSource = 'AUTO' | 'RAW' | 'ROLLUP';
type HierarchyReportStatus = 'PREVIEW' | 'LOADING' | 'LIVE' | 'BLOCKED' | 'ERROR';
type PlatformAuthStatus =
  | 'SIGNED_OUT'
  | 'LOGIN_PENDING'
  | 'MFA_REQUIRED'
  | 'VERIFYING'
  | 'SIGNED_IN'
  | 'ERROR';

type HierarchyBreakdown = {
  label: string;
  value: number;
};

type HierarchyAnalyticsReport = {
  scope: {
    scopeLevel: AccessScopeLevel;
    label: string;
    regionCode?: string;
    continentCode?: string;
    countryCode?: string;
    tenantId?: string;
  };
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  eventCount: number;
  totals: Record<string, number>;
  mostVisited: Array<{
    entityId: string;
    entityType: string;
    views: number;
  }>;
  topCountries: HierarchyBreakdown[];
  topIndustries: HierarchyBreakdown[];
  topTenants: HierarchyBreakdown[];
  access?: {
    role?: string;
    scopeLevel?: AccessScopeLevel;
    reason?: string;
  };
  privacy: {
    rawEventMetadataIncluded: boolean;
  };
  warehouse?: {
    requestedDataSource: AnalyticsReportDataSource;
    dataSource: 'RAW_EVENTS' | 'DAILY_ROLLUPS';
    rollupRows: number;
    fallbackReason?: string;
  };
};

type HierarchyVisitedRow = {
  id: string;
  name: string;
  views: number;
};

type PresentedSession = {
  token?: string;
  tenantId: string;
  role: string;
  mfaRequired: boolean;
  mfaVerified: boolean;
  expiresAt: string;
  mfaChallenge?: {
    id: string;
    deliveryChannel: string;
    expiresAt: string;
    developmentCode?: string;
  };
};

type AuthSessionPayload = {
  session: PresentedSession;
  user?: {
    email?: string;
    displayName?: string;
  };
  tenant?: {
    id: string;
    displayName: string;
  };
};

const termsClauses = [
  {
    title: 'Accurate authority',
    text: 'The advertiser confirms lawful authority to post, sell, promote, source and communicate about every item, service, profile, link and media asset.',
  },
  {
    title: 'Zero-tolerance scope',
    text: 'Blocked goods, services, searches, media, links, messages, payments and relationship claims are never allowed and cannot be approved by accepting terms.',
  },
  {
    title: 'Platform acceptable use',
    text: 'Users must not use Telpen for illegal activity, exploitation, terrorism, trafficking, fraud, phishing, malware, DDoS, botnets, scraping abuse, spam, crypto mining, torrenting, proxy abuse or compute resale.',
  },
  {
    title: 'Truthful advertising',
    text: 'Claims, prices, offers, endorsements, guarantees, taxes, availability and disclosures must be accurate, current and compliant in the advertiser country.',
  },
  {
    title: 'Rights and permissions',
    text: 'Users must own or have permission for all names, brands, images, clips, files, links, code, descriptions and intellectual-property claims they submit.',
  },
  {
    title: 'Data and consent',
    text: 'Contacts, biodata, buyer signals and uploaded personal data must be collected, shared and messaged only with lawful notice, consent or another valid basis.',
  },
  {
    title: 'Transaction responsibility',
    text: 'Users are responsible for their own listings, communications, contracts, deliveries, payments, taxes and disputes; Telpen is not a party to user transactions.',
  },
  {
    title: 'Moderation rights',
    text: 'Telpen may block, remove, restrict, preserve evidence, suspend accounts, rate-limit abuse and report severe violations while honoring mandatory platform, hosting-provider and regulatory duties.',
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-KE').format(value);
}

function formatMoney(value: number, currencyCode: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatResponseTime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

function codeLabel(value: string) {
  return value
    .split('_')
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function roleLabel(role: string) {
  return codeLabel(role);
}

function statusLabel(status: HierarchyReportStatus) {
  if (status === 'PREVIEW') return 'Seeded preview';
  if (status === 'LOADING') return 'Loading';
  if (status === 'LIVE') return 'Live API';
  return codeLabel(status);
}

function platformStatusLabel(status: PlatformAuthStatus) {
  if (status === 'SIGNED_OUT') return 'No verified session';
  if (status === 'LOGIN_PENDING') return 'Signing in';
  if (status === 'MFA_REQUIRED') return 'MFA required';
  if (status === 'VERIFYING') return 'Verifying';
  if (status === 'SIGNED_IN') return 'Session verified';
  return 'Auth error';
}

function sessionSummary(payload: AuthSessionPayload) {
  const identity = payload.user?.email ?? payload.user?.displayName ?? 'Platform user';
  const tenant = payload.tenant?.displayName ?? payload.session.tenantId;
  const mfa = payload.session.mfaVerified ? 'MFA verified' : 'MFA pending';
  return `${identity} / ${tenant} / ${mfa}`;
}

async function readApiError(response: Response, fallback: string) {
  const body = await response.text();
  if (!body) return response.statusText || fallback;

  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    return parsed.message ?? response.statusText ?? fallback;
  } catch {
    return body;
  }
}

function getEventTotal(report: HierarchyAnalyticsReport, eventType: string) {
  return report.totals[eventType] ?? 0;
}

function displayCountryBreakdown(item: HierarchyBreakdown | undefined) {
  if (!item) return 'No country';
  const country = getCountry(item.label);
  return `${country?.name ?? item.label} (${formatNumber(item.value)})`;
}

function displayIndustryBreakdown(item: HierarchyBreakdown | undefined) {
  if (!item) return 'No industry';
  const industry = industryCategories.find((category) => category.code === item.label);
  return industry?.name ?? item.label;
}

function reportPeriodDays(report: HierarchyAnalyticsReport) {
  const start = Date.parse(report.periodStart);
  const end = Date.parse(report.periodEnd);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 'Live API';
  return `${Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)))} day report`;
}

function buildHierarchyAnalyticsApiPath(input: {
  scopeLevel: AccessScopeLevel;
  countryCode: string;
  tenantId: string;
  industryCode: string;
  format: AnalyticsExportFormat;
  dataSource: AnalyticsReportDataSource;
  exportRoute?: boolean;
}) {
  const params = new URLSearchParams({
    scopeLevel: input.scopeLevel,
    format: input.format,
    dataSource: input.dataSource,
  });

  if (input.scopeLevel === 'REGIONAL') {
    params.set('regionCode', 'EMEA');
  }

  if (input.scopeLevel === 'CONTINENT') {
    params.set('continentCode', 'AF');
  }

  if (input.scopeLevel === 'COUNTRY') {
    params.set('countryCode', input.countryCode);
  }

  if (input.scopeLevel === 'TENANT') {
    params.set('tenantId', input.tenantId);
    params.set('countryCode', input.countryCode);
  }

  if (input.industryCode !== 'ALL') {
    params.set('industryCode', input.industryCode);
  }

  const route = input.exportRoute
    ? '/platform/analytics/hierarchy/export'
    : '/platform/analytics/hierarchy';
  return `${route}?${params.toString()}`;
}

export default function Home() {
  const [query, setQuery] = useState('fresh produce');
  const [savedSearchName, setSavedSearchName] = useState('Fresh produce buyers');
  const [savedSearchFrequency, setSavedSearchFrequency] =
    useState<OpportunityAlertFrequency>('DAILY');
  const [savedSearches, setSavedSearches] = useState<SavedSourceFinderSearch[]>([
    createSavedSourceFinderSearch(
      {
        name: 'Fresh produce buyers',
        query: 'fresh produce hotel buyers',
        role: 'BUYER',
        industryCode: 'ALL',
        countryCode: 'KE',
        alertFrequency: 'DAILY',
      },
      { tenantId, id: 'saved-fresh-produce' },
      '2026-08-21T08:00:00.000Z',
    ),
    createSavedSourceFinderSearch(
      {
        name: 'Packaging distributors',
        query: 'food packaging distributors',
        role: 'DISTRIBUTOR',
        industryCode: 'MANUFACTURING',
        countryCode: 'KE',
        alertFrequency: 'WEEKLY',
      },
      { tenantId, id: 'saved-packaging' },
      '2026-08-21T08:00:00.000Z',
    ),
  ]);
  const [opportunityAlerts, setOpportunityAlerts] = useState<SourceFinderOpportunityAlert[]>([]);
  const [role, setRole] = useState<SupplyChainRole | 'ALL'>('ALL');
  const [industryCode, setIndustryCode] = useState('ALL');
  const [sortBy, setSortBy] = useState<SourceFinderSortOption>('RELEVANCE');
  const [matchFeedback, setMatchFeedback] = useState<MatchFeedbackAction>('SAVE');
  const [behavioralMatchingConsent, setBehavioralMatchingConsent] = useState(false);
  const [sourceFinderOutcomes, setSourceFinderOutcomes] = useState<SourceFinderOutcomeFeedback[]>(
    [],
  );
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('NEW');
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('OPEN');
  const [conversationAssignee, setConversationAssignee] = useState('sales-desk');
  const [notificationSeverity, setNotificationSeverity] = useState<NotificationSeverity>('HIGH');
  const [accessRole, setAccessRole] = useState<AccessRole>('COUNTRY_ADMIN');
  const [accessScopeLevel, setAccessScopeLevel] = useState<AccessScopeLevel>('COUNTRY');
  const [accessPermission, setAccessPermission] = useState<AccessPermission>('MANAGE_COUNTRY');
  const [accessMfaVerified, setAccessMfaVerified] = useState(true);
  const [analyticsScopeLevel, setAnalyticsScopeLevel] = useState<AccessScopeLevel>('COUNTRY');
  const [analyticsExportFormat, setAnalyticsExportFormat] = useState<AnalyticsExportFormat>('CSV');
  const [analyticsDataSource, setAnalyticsDataSource] = useState<AnalyticsReportDataSource>('AUTO');
  const [platformEmail, setPlatformEmail] = useState('owner@sellfindconnect.com');
  const [platformPassword, setPlatformPassword] = useState('Strong-owner#2026');
  const [platformMfaCode, setPlatformMfaCode] = useState('');
  const [platformAuthStatus, setPlatformAuthStatus] = useState<PlatformAuthStatus>('SIGNED_OUT');
  const [platformSessionSummary, setPlatformSessionSummary] = useState('No session');
  const [platformAuthError, setPlatformAuthError] = useState('');
  const [platformSessionToken, setPlatformSessionToken] = useState('');
  const [hierarchyReport, setHierarchyReport] = useState<HierarchyAnalyticsReport | null>(null);
  const [hierarchyReportStatus, setHierarchyReportStatus] =
    useState<HierarchyReportStatus>('PREVIEW');
  const [hierarchyReportError, setHierarchyReportError] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('owner@sellfindconnect.com');
  const [ownerPassword, setOwnerPassword] = useState('Strong-owner#2026');
  const [tenantDisplayName, setTenantDisplayName] = useState('Nairobi Fresh Produce Cooperative');
  const [pushConsent, setPushConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [chatMessage, setChatMessage] = useState(
    'Please share price terms, availability, delivery coverage and minimum order.',
  );
  const [chatTypingAt, setChatTypingAt] = useState<string | undefined>();
  const [outboundDeliveryStatus, setOutboundDeliveryStatus] =
    useState<MessageDeliveryStatus>('SENT');
  const [chatAttachment, setChatAttachment] = useState<ConversationMessageAttachment | null>(null);
  const [chatLiveChannel, setChatLiveChannel] = useState(true);
  const [inboundReceipt, setInboundReceipt] = useState<ConversationMessage>({
    id: 'demo-inbound',
    conversationId: 'demo-conversation',
    tenantId: 'demo-tenant',
    senderRole: 'REQUESTER',
    body: 'Please confirm weekly supply availability for tomatoes and kale.',
    deliveryStatus: 'SENT',
    createdAt: conversationDemoOpenedAt,
  });
  const [profileDescription, setProfileDescription] = useState(
    'We supply fresh vegetables to hotels, restaurants and retailers in Nairobi.',
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [relationshipKind, setRelationshipKind] = useState<RelationshipKind>('SHIPS');
  const [relationshipVisibility, setRelationshipVisibility] =
    useState<RelationshipVisibility>('PUBLIC');
  const [relationshipNote, setRelationshipNote] = useState(
    'Weekly cold-chain delivery for hotel produce.',
  );
  const [relationshipError, setRelationshipError] = useState('');
  const [relationshipClaims, setRelationshipClaims] = useState<RelationshipClaim[]>([]);

  const country = getCountry('KE') ?? countries[0]!;
  const countryCode = country.code;
  const pilotTaxSnapshot = calculateTaxSnapshotAmounts({
    amount: country.monthlySubscriptionAmount,
    taxRate: 0.16,
    taxInclusivePricing: true,
  });
  const nextRemittanceAlert = getRemittanceAlertDecision(
    '2026-07-31T00:00:00.000Z',
    '2026-07-24T00:00:00.000Z',
  );
  const taxReturnExport = buildTaxReturnExport(
    {
      id: 'tax-return-ke-vat-2026-06',
      countryCode: country.code,
      taxType: 'VAT',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      filingDeadline: '2026-07-20T00:00:00.000Z',
      paymentDeadline: '2026-07-31T00:00:00.000Z',
      filingCurrency: country.currencyCode,
      computedTaxDue: pilotTaxSnapshot.taxAmount,
      status: 'LOCKED',
      reviewApprovedBy: 'country-finance-admin',
      filingApprovedBy: 'global-finance-admin',
      filedAt: '2026-07-18T09:00:00.000Z',
      remittedAt: '2026-07-31T09:00:00.000Z',
      lockedAt: taxReturnDemoNow,
      evidence: [
        {
          kind: 'FILING_CONFIRMATION',
          reference: 'KRA-VAT-2026-06',
          attachedAt: '2026-07-18T09:00:00.000Z',
          attachedBy: 'country-finance-admin',
        },
        {
          kind: 'REMITTANCE_RECEIPT',
          reference: 'PAY-8891',
          attachedAt: '2026-07-31T09:00:00.000Z',
          attachedBy: 'global-finance-admin',
        },
        {
          kind: 'AUTHORITY_REFERENCE',
          reference: 'KRA-REF-7781',
          attachedAt: taxReturnDemoNow,
          attachedBy: 'global-finance-admin',
        },
      ],
    },
    'CSV',
  );
  const taxPeriodCompletion = evaluateTaxPeriodCompletion({
    status: 'LOCKED',
    evidenceKinds: ['FILING_CONFIRMATION', 'REMITTANCE_RECEIPT', 'AUTHORITY_REFERENCE'],
    reviewApprovedBy: 'country-finance-admin',
    filingApprovedBy: 'global-finance-admin',
    remittedAt: '2026-07-31T09:00:00.000Z',
  });
  const canManageTaxReturn = canOperateTaxReturnWorkbench(accessRole);
  const canExportTaxReturn = canExportCountryTaxReport(accessRole);
  const selectedIndustry = industryCategories.find((industry) => industry.code === industryCode);
  const safetyDecision = evaluateSafetyText(profileDescription);
  const querySafetyDecision = evaluateSafetyText(query);
  const queryExpansion = expandDiscoveryQuery(query);
  const canPublish = safetyDecision.allowed && termsAccepted;
  const publishBlockReason = !safetyDecision.allowed
    ? 'Publishing is disabled because the draft contains prohibited content'
    : !termsAccepted
      ? 'Publishing is disabled until the advertiser accepts the terms'
      : 'Publish draft';

  const graphRecords = attachApprovedRelationshipClaims(
    pilotSourceFinderRecords,
    relationshipClaims,
  );
  const sourceFinderHierarchy = buildSourceFinderHierarchyReport(graphRecords, {
    countryCode,
    industryCode: industryCode === 'ALL' ? undefined : industryCode,
    role,
  });
  const rankedResults: SourceFinderSearchResult[] = querySafetyDecision.allowed
    ? rankSourceFinderWithFullText(
        {
          query,
          role,
          industryCode,
          countryCode,
          sortBy,
        },
        graphRecords,
        searchSourceFinderIndexDocuments(
          graphRecords.map((record) => buildSourceFinderIndexDocument(record)),
          {
            query,
            countryCode,
            industryCode,
            role,
          },
        ),
      )
    : [];
  const filteredResults = applySourceFinderOutcomes(rankedResults, sourceFinderOutcomes, {
    behavioralMatchingConsent,
  });
  const canSaveSearch = querySafetyDecision.allowed && query.trim().length >= 2;
  const savedSearchAlerts: SavedSearchAlertPreview[] = savedSearches.flatMap(
    (savedSearch): SavedSearchAlertPreview[] => {
      const savedSearchSafety = evaluateSafetyText(savedSearch.query);
      if (!savedSearchSafety.allowed) {
        return [
          {
            id: `${savedSearch.id}-blocked`,
            savedSearch,
            result: null,
            status: 'BLOCKED' as const,
          },
        ];
      }

      return searchSourceFinderRecords(
        {
          query: savedSearch.query,
          role: savedSearch.role,
          industryCode: savedSearch.industryCode,
          countryCode,
          sortBy: 'RELEVANCE',
        },
        pilotSourceFinderRecords,
      )
        .slice(0, 2)
        .map((result) => ({
          id: `${savedSearch.id}-${result.id}`,
          savedSearch,
          result,
          status: 'READY' as const,
        }));
    },
  );
  const synonymPreview = queryExpansion.expandedTerms
    .filter((term) => !queryExpansion.originalTerms.includes(term))
    .slice(0, 6);
  const saveCurrentSearch = () => {
    if (!canSaveSearch) return;

    const saved = createSavedSourceFinderSearch(
      {
        name: savedSearchName.trim() || query.trim(),
        query: query.trim(),
        role,
        industryCode,
        countryCode,
        sortBy,
        alertFrequency: savedSearchFrequency,
      },
      {
        tenantId,
        id: `saved-${savedSearches.length + 1}-${query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      },
      opportunityAlertDemoNow,
    );
    setSavedSearches((current) => [
      saved,
      ...current.filter((item) => item.query.toLowerCase() !== saved.query.toLowerCase()),
    ]);
  };

  const runOpportunityAlertsNow = () => {
    const now = opportunityAlertDemoNow;
    const existingKeys = new Set(
      opportunityAlerts.map((alert) => `${alert.savedSearchId}:${alert.sourceRecordId}`),
    );
    const created: SourceFinderOpportunityAlert[] = [];
    const nextSearches = savedSearches.map((search) => {
      if (!evaluateSafetyText(search.query).allowed || !isOpportunityAlertDue(search, now)) {
        return search;
      }

      for (const result of selectOpportunityMatches(
        searchSourceFinderRecords(
          {
            query: search.query,
            role: search.role,
            industryCode: search.industryCode,
            countryCode: search.countryCode ?? countryCode,
            sortBy: search.sortBy ?? 'RELEVANCE',
          },
          graphRecords,
        ),
        2,
      )) {
        const key = `${search.id}:${result.id}`;
        if (existingKeys.has(key)) {
          continue;
        }
        existingKeys.add(key);
        created.push(buildOpportunityAlert(search, result, key, now));
      }

      return { ...search, lastAlertedAt: now, updatedAt: now };
    });

    setSavedSearches(nextSearches);
    if (created.length > 0) {
      setOpportunityAlerts((current) => [...created, ...current]);
    }
  };

  const totals = filteredResults.reduce(
    (memo, item) => ({
      views: memo.views + item.analytics.views,
      clicks: memo.clicks + item.analytics.clicks,
      inquiries: memo.inquiries + item.analytics.inquiries,
      shares: memo.shares + item.analytics.shares,
      downloads: memo.downloads + item.analytics.downloads,
    }),
    { views: 0, clicks: 0, inquiries: 0, shares: 0, downloads: 0 },
  );
  const selectedMatch = filteredResults[0];
  const leadIntelligence = selectedMatch ? buildLeadConversionIntelligence(selectedMatch) : null;
  const canCreateLead = Boolean(termsAccepted && querySafetyDecision.allowed && selectedMatch);
  const relationshipSafety = evaluateSafetyText(
    `${tenantDisplayName} ${relationshipNote} Rift Valley Cold Chain Logistics`,
  );
  const canCreateRelationship = Boolean(termsAccepted && relationshipSafety.allowed);
  const pendingRelationshipClaims = relationshipClaims.filter((claim) => claim.status === 'PENDING');
  const graphRelationshipClaims = relationshipClaims.filter(isPublicGraphClaim);
  const submitRelationshipClaim = () => {
    try {
      const claim = createRelationshipClaim(
        {
          sourceLabel: tenantDisplayName,
          sourceRole: 'SUPPLIER',
          counterpartLabel: 'Rift Valley Cold Chain Logistics',
          counterpartRole: 'LOGISTICS_PROVIDER',
          counterpartTenantId,
          relationship: relationshipKind,
          visibility: relationshipVisibility,
          note: relationshipNote,
          acceptedTerms: true,
        },
        { tenantId, userId: 'owner-demo' },
        `claim-${Date.now()}`,
      );
      setRelationshipClaims((current) => [claim, ...current]);
      setRelationshipError('');
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : 'Relationship claim blocked');
    }
  };
  const approveRelationshipClaim = (claimId: string) => {
    const existing = relationshipClaims.find((claim) => claim.id === claimId);
    if (!existing) return;
    try {
      const approved = decideRelationshipClaim(existing, 'APPROVED', {
        tenantId: counterpartTenantId,
        userId: 'counterpart-demo',
      });
      setRelationshipClaims((current) =>
        current.map((claim) => (claim.id === claimId ? approved : claim)),
      );
      setRelationshipError('');
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : 'Relationship decision blocked');
    }
  };
  const chatSafetyDecision = evaluateSafetyText(chatMessage);
  const conversationSla =
    leadIntelligence && selectedMatch
      ? calculateConversationSlaDecision(
          {
            openedAt: conversationDemoOpenedAt,
            lastInboundMessageAt: conversationDemoOpenedAt,
            firstResponseAt:
              conversationStatus === 'WAITING_ON_REQUESTER' || conversationStatus === 'RESOLVED'
                ? '2026-06-17T09:10:00.000Z'
                : undefined,
            responseSlaHours: leadIntelligence.responseSlaHours,
            priority: leadIntelligence.priority,
            status: conversationStatus,
          },
          conversationDemoNow,
        )
      : null;
  const savedReplies =
    selectedMatch && leadIntelligence
      ? buildSavedReplySuggestions({
          sourceName: selectedMatch.name,
          inquiryType: 'RFQ',
          quantity: '100 crates per week',
          urgency: 'This week',
          nextBestActions: leadIntelligence.nextBestActions,
        })
      : [];
  const canSendChat = Boolean(
    canCreateLead &&
    chatSafetyDecision.allowed &&
    chatMessage.trim().length >= 2 &&
    conversationStatus !== 'BLOCKED' &&
    conversationStatus !== 'RESOLVED',
  );
  const chatTypingActive = isConversationTypingActive(chatTypingAt);
  const inboundUnreadCount = countUnreadMessagesForRole([inboundReceipt], 'TENANT_AGENT');
  const chatPresenceStatus = resolveConversationPresenceStatus(
    chatLiveChannel ? conversationDemoNow : undefined,
    conversationDemoNow,
    chatLiveChannel ? 1 : 0,
  );
  const notificationPreferences = defaultNotificationPreferences.map((preference) => {
    if (preference.channel === 'PUSH') {
      return {
        ...preference,
        enabled: pushConsent,
        consentState: pushConsent ? ('GRANTED' as const) : preference.consentState,
      };
    }
    if (preference.channel === 'SMS') {
      return {
        ...preference,
        enabled: smsConsent,
        consentState: smsConsent ? ('GRANTED' as const) : preference.consentState,
      };
    }
    if (preference.channel === 'WHATSAPP') {
      return {
        ...preference,
        enabled: whatsappConsent,
        consentState: whatsappConsent ? ('GRANTED' as const) : preference.consentState,
      };
    }
    return preference;
  });
  const notificationPlan = buildNotificationDeliveryPlan({
    eventType:
      conversationSla?.alertType === 'SLA_BREACHED'
        ? 'CONVERSATION_SLA_BREACHED'
        : conversationSla?.alertType === 'SLA_DUE_SOON'
          ? 'CONVERSATION_SLA_DUE_SOON'
          : 'CONVERSATION_MESSAGE',
    severity: notificationSeverity,
    title: conversationSla?.alertType
      ? `${codeLabel(conversationSla.alertType)}: ${selectedMatch?.name ?? 'conversation'}`
      : `Message update: ${selectedMatch?.name ?? 'conversation'}`,
    message: conversationSla?.message ?? 'A conversation event is ready for delivery.',
    recipient: {
      countryCode: country.code,
      locale: country.locale,
      timezone: country.timezone,
      preferences: notificationPreferences,
    },
  });
  const notificationDispatchPreview = planNotificationDispatchAttempts({
    tenantId,
    selectedChannels: notificationPlan.selectedChannels,
    destination: {
      email: ownerEmail,
      phone: smsConsent ? '+254700000001' : undefined,
      pushToken: pushConsent ? 'demo-fcm-token' : undefined,
    },
  });
  const canViewProductAudit = canViewTenantAuditLogs(
    accessRole === 'ADMIN' ? 'ADMIN' : accessRole === 'OWNER' ? 'OWNER' : 'READ_ONLY_VIEWER',
  );
  const productAuditPreview = [
    buildProductAuditRecord({
      action: 'CONVERSATION_CREATED',
      entityType: 'CONVERSATION',
      entityId: 'demo-conversation',
      tenantId,
      createdAt: conversationDemoOpenedAt,
      metadata: { inquiryType: 'RFQ', messageLength: 64, body: inboundReceipt.body },
    }),
    buildProductAuditRecord({
      action: 'NOTIFICATION_DISPATCHED',
      entityType: 'NOTIFICATION',
      entityId: 'demo-outbox',
      tenantId,
      createdAt: conversationDemoNow,
      metadata: { sentCount: 1, failedCount: 1 },
    }),
  ];
  const accessDecision = evaluateAccess({
    subject: {
      userId: 'country-admin-1',
      role: accessRole,
      mfaVerified: accessMfaVerified,
      scope: {
        level: accessScopeLevel,
        regionCodes: ['EMEA'],
        continentCodes: ['AF'],
        countryCodes: [country.code],
        tenantIds: [tenantId],
      },
    },
    permission: accessPermission,
    resource: {
      tenantId,
      countryCode: country.code,
    },
  });
  const selectedAnalyticsRegion = operationalRegions.find(
    (regionItem) => regionItem.code === 'EMEA',
  );
  const analyticsResource: AccessResourceScope =
    analyticsScopeLevel === 'GLOBAL'
      ? {}
      : analyticsScopeLevel === 'REGIONAL'
        ? { regionCode: 'EMEA' }
        : analyticsScopeLevel === 'CONTINENT'
          ? { continentCode: 'AF' }
          : analyticsScopeLevel === 'COUNTRY'
            ? { countryCode: country.code }
            : { tenantId, countryCode: country.code };
  const analyticsScopeLabel = codeLabel(analyticsScopeLevel);
  const hierarchyAccessDecision = evaluateAccess({
    subject: {
      userId: 'country-admin-1',
      role: accessRole,
      mfaVerified: accessMfaVerified,
      scope: {
        level: accessScopeLevel,
        regionCodes: ['EMEA'],
        continentCodes: ['AF'],
        countryCodes: [country.code],
        tenantIds: [tenantId],
      },
    },
    permission: 'VIEW_ANALYTICS',
    resource: analyticsResource,
  });
  const hierarchyRecords =
    analyticsScopeLevel === 'TENANT'
      ? filteredResults
      : pilotSourceFinderRecords.filter((record) => {
          const recordCountry = getCountry(record.countryCode);
          const recordContinentCode = recordCountry?.continentCode;
          const recordInRegion = Boolean(
            selectedAnalyticsRegion &&
            (selectedAnalyticsRegion.countryCodes.includes(record.countryCode) ||
              (recordContinentCode &&
                selectedAnalyticsRegion.continentCodes.includes(recordContinentCode))),
          );

          return (
            (analyticsScopeLevel === 'GLOBAL' ||
              (analyticsScopeLevel === 'REGIONAL' && recordInRegion) ||
              (analyticsScopeLevel === 'CONTINENT' && recordContinentCode === 'AF') ||
              (analyticsScopeLevel === 'COUNTRY' && record.countryCode === country.code)) &&
            (industryCode === 'ALL' || record.industryCode === industryCode)
          );
        });
  const hierarchyTotals = hierarchyRecords.reduce(
    (memo, item) => ({
      views: memo.views + item.analytics.views,
      clicks: memo.clicks + item.analytics.clicks,
      inquiries: memo.inquiries + item.analytics.inquiries,
      shares: memo.shares + item.analytics.shares,
      downloads: memo.downloads + item.analytics.downloads,
    }),
    { views: 0, clicks: 0, inquiries: 0, shares: 0, downloads: 0 },
  );
  const hierarchyMostVisited = [...hierarchyRecords]
    .sort((a, b) => b.analytics.views - a.analytics.views)
    .slice(0, 3);
  const hierarchyAverageDaysLive = hierarchyRecords.length
    ? Math.round(
        hierarchyRecords.reduce(
          (memo, item) =>
            memo + calculateAdvertLifecycle(item.publishedAt, lifecycleDemoNow).daysLive,
          0,
        ) / hierarchyRecords.length,
      )
    : 0;
  const hierarchyClickThroughRate = hierarchyTotals.views
    ? Math.round((hierarchyTotals.clicks / hierarchyTotals.views) * 100)
    : 0;
  const hierarchyTopIndustry =
    [...hierarchyRecords].sort((left, right) => {
      const rightTotal = right.analytics.views + right.analytics.clicks + right.analytics.inquiries;
      const leftTotal = left.analytics.views + left.analytics.clicks + left.analytics.inquiries;
      return rightTotal - leftTotal;
    })[0]?.industryCode ?? 'None';
  const hierarchyTopIndustryName =
    industryCategories.find((industry) => industry.code === hierarchyTopIndustry)?.name ??
    hierarchyTopIndustry;
  const hierarchyTopTenant =
    [...hierarchyRecords].sort((left, right) => right.analytics.views - left.analytics.views)[0]
      ?.name ?? 'No tenant';
  const hierarchyCountryViews = hierarchyRecords.reduce<Record<string, number>>((memo, item) => {
    memo[item.countryCode] = (memo[item.countryCode] ?? 0) + item.analytics.views;
    return memo;
  }, {});
  const hierarchyTopCountryEntry = Object.entries(hierarchyCountryViews).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const hierarchyTopCountryLabel = hierarchyTopCountryEntry
    ? `${getCountry(hierarchyTopCountryEntry[0])?.name ?? hierarchyTopCountryEntry[0]} (${formatNumber(
        hierarchyTopCountryEntry[1],
      )})`
    : 'No country';
  const hierarchyExportName = `analytics-${analyticsScopeLevel.toLowerCase()}-${country.code}.${analyticsExportFormat.toLowerCase()}`;
  const hierarchyReportApiPath = buildHierarchyAnalyticsApiPath({
    scopeLevel: analyticsScopeLevel,
    countryCode: country.code,
    tenantId,
    industryCode,
    format: analyticsExportFormat,
    dataSource: analyticsDataSource,
  });
  const hierarchyExportApiPath = buildHierarchyAnalyticsApiPath({
    scopeLevel: analyticsScopeLevel,
    countryCode: country.code,
    tenantId,
    industryCode,
    format: analyticsExportFormat,
    dataSource: analyticsDataSource,
    exportRoute: true,
  });
  const hierarchyReportUrl = `${analyticsApiBaseUrl.replace(/\/$/, '')}${hierarchyReportApiPath}`;
  const platformLoginUrl = `${analyticsApiBaseUrl.replace(/\/$/, '')}/auth/login`;
  const platformMfaUrl = `${analyticsApiBaseUrl.replace(/\/$/, '')}/auth/mfa/verify`;
  const platformSessionUrl = `${analyticsApiBaseUrl.replace(/\/$/, '')}/auth/session`;
  const resetHierarchyReport = () => {
    setHierarchyReport(null);
    setHierarchyReportError('');
    setHierarchyReportStatus('PREVIEW');
  };
  const applyPlatformSession = (payload: AuthSessionPayload) => {
    if (payload.session.token) {
      setPlatformSessionToken(payload.session.token);
    }

    resetHierarchyReport();
    setPlatformSessionSummary(sessionSummary(payload));
    setPlatformAuthStatus(
      payload.session.mfaRequired && !payload.session.mfaVerified ? 'MFA_REQUIRED' : 'SIGNED_IN',
    );
    setPlatformAuthError('');

    if (payload.session.mfaChallenge?.developmentCode) {
      setPlatformMfaCode(payload.session.mfaChallenge.developmentCode);
    }
  };
  const signInPlatformSession = async () => {
    if (!platformEmail.trim() || !platformPassword || platformAuthStatus === 'LOGIN_PENDING') {
      return;
    }

    setPlatformAuthStatus('LOGIN_PENDING');
    setPlatformAuthError('');

    try {
      const response = await fetch(platformLoginUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: platformEmail.trim(),
          password: platformPassword,
        }),
      });

      if (!response.ok) {
        setPlatformAuthStatus('ERROR');
        setPlatformAuthError(await readApiError(response, 'Sign-in failed'));
        return;
      }

      applyPlatformSession((await response.json()) as AuthSessionPayload);
    } catch (error) {
      setPlatformAuthStatus('ERROR');
      setPlatformAuthError(error instanceof Error ? error.message : 'Sign-in failed');
    }
  };
  const verifyPlatformMfa = async () => {
    const sessionToken = platformSessionToken.trim();
    const code = platformMfaCode.trim();
    if (!sessionToken || code.length !== 6 || platformAuthStatus === 'VERIFYING') return;

    setPlatformAuthStatus('VERIFYING');
    setPlatformAuthError('');

    try {
      const response = await fetch(platformMfaUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken,
          code,
        }),
      });

      if (!response.ok) {
        setPlatformAuthStatus('MFA_REQUIRED');
        setPlatformAuthError(await readApiError(response, 'MFA verification failed'));
        return;
      }

      const payload = (await response.json()) as AuthSessionPayload;
      setPlatformMfaCode('');
      applyPlatformSession(payload);
    } catch (error) {
      setPlatformAuthStatus('ERROR');
      setPlatformAuthError(error instanceof Error ? error.message : 'MFA verification failed');
    }
  };
  const verifyPlatformSession = async () => {
    const sessionToken = platformSessionToken.trim();
    if (!sessionToken || platformAuthStatus === 'VERIFYING') return;

    setPlatformAuthStatus('VERIFYING');
    setPlatformAuthError('');

    try {
      const response = await fetch(platformSessionUrl, {
        headers: {
          'x-session-token': sessionToken,
        },
      });

      if (!response.ok) {
        setPlatformAuthStatus('ERROR');
        setPlatformSessionSummary('No session');
        setPlatformAuthError(await readApiError(response, 'Session verification failed'));
        return;
      }

      applyPlatformSession((await response.json()) as AuthSessionPayload);
    } catch (error) {
      setPlatformAuthStatus('ERROR');
      setPlatformAuthError(error instanceof Error ? error.message : 'Session verification failed');
    }
  };
  const loadHierarchyReport = async () => {
    const sessionToken = platformSessionToken.trim();
    if (!sessionToken || hierarchyReportStatus === 'LOADING') return;

    setHierarchyReportStatus('LOADING');
    setHierarchyReportError('');

    try {
      const response = await fetch(hierarchyReportUrl, {
        headers: {
          'x-session-token': sessionToken,
        },
      });

      if (!response.ok) {
        setHierarchyReport(null);
        setHierarchyReportStatus(
          response.status === 401 || response.status === 403 ? 'BLOCKED' : 'ERROR',
        );
        setHierarchyReportError(await readApiError(response, 'Report request failed'));
        return;
      }

      setHierarchyReport((await response.json()) as HierarchyAnalyticsReport);
      setHierarchyReportStatus('LIVE');
    } catch (error) {
      setHierarchyReport(null);
      setHierarchyReportStatus('ERROR');
      setHierarchyReportError(error instanceof Error ? error.message : 'Report request failed');
    }
  };
  const displayHierarchyTotals = hierarchyReport
    ? {
        views:
          getEventTotal(hierarchyReport, 'VIEW') + getEventTotal(hierarchyReport, 'IMPRESSION'),
        clicks: getEventTotal(hierarchyReport, 'CLICK'),
        inquiries: getEventTotal(hierarchyReport, 'INQUIRY'),
        shares: getEventTotal(hierarchyReport, 'SHARE'),
        downloads: getEventTotal(hierarchyReport, 'DOWNLOAD'),
      }
    : hierarchyTotals;
  const displayHierarchyVisitedRows: HierarchyVisitedRow[] = hierarchyReport
    ? hierarchyReport.mostVisited.slice(0, 3).map((item) => ({
        id: `${item.entityType}-${item.entityId}`,
        name: `${codeLabel(item.entityType)} ${item.entityId}`,
        views: item.views,
      }))
    : hierarchyMostVisited.map((item) => ({
        id: item.id,
        name: item.name,
        views: item.analytics.views,
      }));
  const displayHierarchyClickThroughRate = displayHierarchyTotals.views
    ? Math.round((displayHierarchyTotals.clicks / displayHierarchyTotals.views) * 100)
    : 0;
  const displayHierarchyAverageAge = hierarchyReport
    ? reportPeriodDays(hierarchyReport)
    : `${hierarchyAverageDaysLive} days`;
  const displayHierarchyTopCountry = hierarchyReport
    ? displayCountryBreakdown(hierarchyReport.topCountries[0])
    : hierarchyTopCountryLabel;
  const displayHierarchyTopIndustry = hierarchyReport
    ? displayIndustryBreakdown(hierarchyReport.topIndustries[0])
    : hierarchyTopIndustryName;
  const displayHierarchyTopTenant = hierarchyReport?.topTenants[0]?.label ?? hierarchyTopTenant;
  const displayHierarchyAccess = hierarchyReport
    ? codeLabel(hierarchyReport.access?.reason ?? 'ACCESS_GRANTED')
    : hierarchyAccessDecision.allowed
      ? 'Granted'
      : codeLabel(hierarchyAccessDecision.reason);
  const hierarchyPolicyAllowed =
    hierarchyReportStatus === 'LIVE' ||
    ((hierarchyReportStatus === 'PREVIEW' || hierarchyReportStatus === 'LOADING') &&
      hierarchyAccessDecision.allowed);
  const ownerPasswordPolicy = evaluatePasswordPolicy(ownerPassword);
  const ownerTrial = calculateTrialSubscription({
    startedAt: '2026-06-18T00:00:00.000Z',
    monthlyAmount: country.monthlySubscriptionAmount,
    currencyCode: country.currencyCode,
  });
  const onboardingSafety = evaluateSafetyText(`${ownerEmail} ${tenantDisplayName}`);
  const canCreateTenantOwner =
    ownerPasswordPolicy.allowed && onboardingSafety.allowed && termsAccepted;
  const renewalQueue = filteredResults
    .map((item) => ({
      ...item,
      lifecycle: calculateAdvertLifecycle(item.publishedAt, lifecycleDemoNow),
    }))
    .filter((item) => item.lifecycle.status !== 'LIVE')
    .sort((a, b) => b.lifecycle.daysLive - a.lifecycle.daysLive);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand-mark">
          <Building2 size={24} />
          <span>Telpen</span>
        </div>
        <nav className="nav-stack">
          <button className="nav-item active" title="Source Finder">
            <Search size={18} />
            <span>Source Finder</span>
          </button>
          <button className="nav-item" title="Leads">
            <Inbox size={18} />
            <span>Leads</span>
          </button>
          <button className="nav-item" title="Messages">
            <MessageSquareText size={18} />
            <span>Messages</span>
          </button>
          <button
            className="nav-item"
            title="Relationships"
            type="button"
            onClick={() => document.getElementById('relationship-graph')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Link2 size={18} />
            <span>Graph</span>
          </button>
          <button className="nav-item" title="Analytics">
            <ChartNoAxesCombined size={18} />
            <span>Analytics</span>
          </button>
          <button className="nav-item" title="Safety">
            <ShieldCheck size={18} />
            <span>Safety</span>
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Commercial Intelligence</h1>
            <div className="scope-line">
              <span className="country-pill">
                <Flag size={14} />
                {country.flag} {country.name}
              </span>
              <span>
                {country.currencyCode} {country.monthlySubscriptionAmount}/month after trial
              </span>
              <span>Tenant {tenantId.slice(0, 8)}</span>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="primary-button" disabled={!canPublish} title={publishBlockReason}>
              <Send size={16} />
              Publish Draft
            </button>
          </div>
        </header>

        <section className="metric-grid" aria-label="Performance metrics">
          <Metric label="Views" value={formatNumber(totals.views)} icon={<Eye size={18} />} />
          <Metric
            label="Clicks"
            value={formatNumber(totals.clicks)}
            icon={<ArrowUpDown size={18} />}
          />
          <Metric
            label="Inquiries"
            value={formatNumber(totals.inquiries)}
            icon={<Inbox size={18} />}
          />
          <Metric
            label="Shares"
            value={formatNumber(totals.shares)}
            icon={<Handshake size={18} />}
          />
          <Metric
            label="Downloads"
            value={formatNumber(totals.downloads)}
            icon={<Sparkles size={18} />}
          />
        </section>

        <section className="work-grid">
          <div className="finder-panel">
            <div className="panel-heading">
              <div>
                <h2>Source Finder</h2>
                <span>{filteredResults.length} ranked connections</span>
              </div>
              <BadgeCheck size={22} />
            </div>

            <div className="search-row">
              <label className="search-box">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search item, source, buyer or service"
                  aria-invalid={!querySafetyDecision.allowed}
                />
              </label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as SupplyChainRole | 'ALL')}
              >
                <option value="ALL">All roles</option>
                {supplyChainRoles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabel(item)}
                  </option>
                ))}
              </select>
              <select
                value={industryCode}
                onChange={(event) => {
                  resetHierarchyReport();
                  setIndustryCode(event.target.value);
                }}
              >
                <option value="ALL">All industries</option>
                {industryCategories.map((industry) => (
                  <option key={industry.code} value={industry.code}>
                    {industry.name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SourceFinderSortOption)}
              >
                {sourceFinderSortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option
                      .split('_')
                      .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
                      .join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <label className="lead-select-row">
              <span>Behavioral matching</span>
              <select
                value={behavioralMatchingConsent ? 'GRANTED' : 'DENIED'}
                onChange={(event) =>
                  setBehavioralMatchingConsent(event.target.value === 'GRANTED')
                }
              >
                <option value="DENIED">Consent denied</option>
                <option value="GRANTED">Consent granted</option>
              </select>
            </label>
            <label className="lead-select-row">
              <span>Outcome</span>
              <select
                value={matchFeedback}
                onChange={(event) =>
                  setMatchFeedback(event.target.value as MatchFeedbackAction)
                }
              >
                {sourceFinderOutcomeActions.map((action) => (
                  <option key={action} value={action}>
                    {codeLabel(action)}
                  </option>
                ))}
              </select>
            </label>
            <div className="terms-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={!querySafetyDecision.allowed || filteredResults.length === 0}
                onClick={() => {
                  const target = filteredResults[0];
                  if (!target) return;
                  const outcome = createSourceFinderOutcomeFeedback(
                    {
                      sourceRecordId: target.id,
                      query,
                      action: matchFeedback as SourceFinderOutcomeAction,
                      behavioralMatchingConsent,
                    },
                    {
                      tenantId,
                      id: `outcome-${sourceFinderOutcomes.length + 1}-${target.id}`,
                    },
                    opportunityAlertDemoNow,
                  );
                  setSourceFinderOutcomes((current) => [outcome, ...current]);
                }}
              >
                Record outcome
              </button>
            </div>
            <div
              className={
                behavioralMatchingConsent ? 'policy-box ok compact' : 'policy-box block compact'
              }
            >
              {behavioralMatchingConsent ? <ShieldCheck size={16} /> : <CircleAlert size={18} />}
              <div>
                <strong>
                  {behavioralMatchingConsent
                    ? 'Behavioral ranking on'
                    : 'Personal hide/report only'}
                </strong>
                <span>
                  {behavioralMatchingConsent
                    ? 'Accepted and saved outcomes can raise Source Finder scores for this tenant.'
                    : 'Hide and report still apply. Accept/save boosts need matching consent.'}
                </span>
              </div>
            </div>

            <div className="discovery-intel-row" aria-label="Discovery query intelligence">
              {queryExpansion.corrections.length > 0 ? (
                <span>
                  Corrected{' '}
                  {queryExpansion.corrections
                    .map((correction) => `${correction.from} to ${correction.to}`)
                    .join(', ')}
                </span>
              ) : (
                <span>Exact query terms</span>
              )}
              {synonymPreview.length > 0 ? (
                <span>{synonymPreview.join(', ')}</span>
              ) : (
                <span>No synonym expansion</span>
              )}
              <span>Postgres FTS + token rank</span>
              <span>{filteredResults.length} alert candidates</span>
            </div>

            {!querySafetyDecision.allowed ? (
              <div className="search-policy-block" role="alert">
                <CircleAlert size={20} />
                <div>
                  <strong>Search blocked</strong>
                  <span>
                    Prohibited goods, services, sourcing and related connections are not available
                    on Telpen.
                  </span>
                </div>
              </div>
            ) : (
              <div className="result-list">
                {filteredResults.map((result) => {
                  const industry = industryCategories.find(
                    (item) => item.code === result.industryCode,
                  );
                  const lifecycle = calculateAdvertLifecycle(result.publishedAt, lifecycleDemoNow);
                  return (
                    <article key={result.id} className="result-card">
                      <div className="result-main">
                        <div>
                          <div className="result-title-row">
                            <h3>{result.name}</h3>
                            {result.verified ? <BadgeCheck size={16} /> : null}
                          </div>
                          <div className="result-meta">
                            <span>{roleLabel(result.role)}</span>
                            <span>{industry?.name}</span>
                            <span>{result.location}</span>
                          </div>
                        </div>
                        <div className="score-box">
                          <strong>{result.score}</strong>
                          <span>match</span>
                        </div>
                      </div>

                      <div className="tag-row">
                        {result.offers.map((offer) => (
                          <span key={offer}>{offer}</span>
                        ))}
                      </div>

                      <div className="reason-row" aria-label="Match reasons">
                        {result.reasons.slice(0, 3).map((reason) => (
                          <span key={reason}>{reason}</span>
                        ))}
                      </div>

                      <div className="relationship-row" aria-label="Related commercial links">
                        {result.relatedLinks.slice(0, 3).map((link) => (
                          <span key={link.id}>
                            {roleLabel(link.role)}: {link.label}
                          </span>
                        ))}
                      </div>

                      <div className="result-footer">
                        <span>{result.analytics.inquiries} inquiries</span>
                        <span>{formatResponseTime(result.responseTimeMinutes)} response</span>
                        <span>{lifecycle.daysLive} days live</span>
                        <button className="link-button">
                          Open <ChevronRight size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="right-rail">
            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Advertiser Setup</h2>
                <span>{selectedIndustry?.code ?? 'ALL'}</span>
              </div>
              <label className="field">
                <span>Profile description</span>
                <textarea
                  value={profileDescription}
                  onChange={(event) => setProfileDescription(event.target.value)}
                  rows={7}
                />
              </label>
              <div className={safetyDecision.allowed ? 'policy-box ok' : 'policy-box block'}>
                {safetyDecision.allowed ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{safetyDecision.allowed ? 'Allowed' : 'Blocked'}</strong>
                  <span>
                    {safetyDecision.allowed
                      ? 'Ready for draft preview.'
                      : `Cannot preview, publish or distribute - ${safetyDecision.policyCode}`}
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Terms Gate</h2>
                <span className={termsAccepted ? 'terms-status accepted' : 'terms-status required'}>
                  {termsAccepted ? 'Accepted' : 'Required'}
                </span>
              </div>
              <div className="terms-list">
                {termsClauses.map((clause) => (
                  <div className="terms-row" key={clause.title}>
                    <UserCheck size={15} />
                    <div>
                      <strong>{clause.title}</strong>
                      <span>{clause.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="terms-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setTermsAccepted(true)}
                  aria-pressed={termsAccepted}
                >
                  <FileCheck2 size={16} />
                  Accept Terms
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setTermsAccepted(false)}
                  disabled={!termsAccepted}
                >
                  <Ban size={16} />
                  Withdraw
                </button>
              </div>
              <div className={canPublish ? 'policy-box ok compact' : 'policy-box block compact'}>
                {canPublish ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{canPublish ? 'Publishing unlocked' : 'Publishing locked'}</strong>
                  <span>
                    {canPublish
                      ? 'Draft can move to preview and publishing.'
                      : 'Accepting terms is required and prohibited content remains blocked.'}
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Owner Onboarding</h2>
                <span>{canCreateTenantOwner ? 'Ready' : 'Locked'}</span>
              </div>
              <label className="field compact-field">
                <span>Owner email</span>
                <input
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  type="email"
                />
              </label>
              <label className="field compact-field">
                <span>Tenant name</span>
                <input
                  value={tenantDisplayName}
                  onChange={(event) => setTenantDisplayName(event.target.value)}
                />
              </label>
              <label className="field compact-field">
                <span>Password policy</span>
                <input
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  type="password"
                />
              </label>
              <FinanceRow label="Password score" value={`${ownerPasswordPolicy.score}%`} />
              <FinanceRow
                label="Trial ends"
                value={new Intl.DateTimeFormat(country.locale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).format(new Date(ownerTrial.trialEndsAt))}
              />
              <FinanceRow
                label="Next billing"
                value={formatMoney(ownerTrial.monthlyAmount, country.currencyCode, country.locale)}
              />
              <FinanceRow label="Terms version" value={activePolicyVersions.termsVersion} />
              <FinanceRow
                label="Policy version"
                value={activePolicyVersions.prohibitedContentVersion}
              />
              <div
                className={
                  canCreateTenantOwner ? 'policy-box ok compact' : 'policy-box block compact'
                }
              >
                {canCreateTenantOwner ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>
                    {canCreateTenantOwner ? 'Owner signup ready' : 'Owner signup locked'}
                  </strong>
                  <span>
                    {canCreateTenantOwner
                      ? 'Safe owner tenant can enter trial with MFA required. Verification, password-reset, invite, and email MFA overlay through Resend when credentials are present.'
                      : !termsAccepted
                        ? 'Terms acceptance is required before signup.'
                        : !onboardingSafety.allowed
                          ? `Blocked - ${onboardingSafety.policyCode}`
                          : ownerPasswordPolicy.allowed
                            ? 'Review signup details.'
                            : ownerPasswordPolicy.missing.join(' ')}
                  </span>
                </div>
              </div>
              <div className="policy-box ok compact">
                <ShieldCheck size={16} />
                <div>
                  <strong>Auth email</strong>
                  <span>
                    Resend overlays verification, password-reset, invite, and email MFA delivery.
                    AUTH_EMAIL_PROVIDER=resend fail-closes without keys. Authenticator TOTP
                    enrollment is available after the first MFA-verified session. Confirmation
                    issues 10 hashed recovery codes once.
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Zero-Tolerance Policy</h2>
                <span>Always blocked</span>
              </div>
              <div className="prohibited-list">
                {prohibitedCategorySummaries.map((item) => (
                  <div className="prohibited-row" key={item.category}>
                    <CircleAlert size={15} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Hierarchy Access</h2>
                <span>{accessDecision.allowed ? 'Granted' : codeLabel(accessDecision.reason)}</span>
              </div>
              <label className="lead-select-row">
                <span>Role</span>
                <select
                  value={accessRole}
                  onChange={(event) => setAccessRole(event.target.value as AccessRole)}
                >
                  {accessRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {codeLabel(roleOption)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lead-select-row">
                <span>Scope</span>
                <select
                  value={accessScopeLevel}
                  onChange={(event) => setAccessScopeLevel(event.target.value as AccessScopeLevel)}
                >
                  {(['GLOBAL', 'REGIONAL', 'CONTINENT', 'COUNTRY', 'TENANT'] as const).map(
                    (scopeOption) => (
                      <option key={scopeOption} value={scopeOption}>
                        {codeLabel(scopeOption)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="lead-select-row">
                <span>Permission</span>
                <select
                  value={accessPermission}
                  onChange={(event) => setAccessPermission(event.target.value as AccessPermission)}
                >
                  {accessPermissions.map((permission) => (
                    <option key={permission} value={permission}>
                      {codeLabel(permission)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={accessMfaVerified}
                  onChange={(event) => setAccessMfaVerified(event.target.checked)}
                />
                <span>MFA verified</span>
              </label>
              <FinanceRow label="Country" value={`${country.flag} ${country.name}`} />
              <FinanceRow label="Continent" value="Africa" />
              <FinanceRow label="Region" value="EMEA" />
              <FinanceRow label="Tenant" value={tenantId.slice(0, 8)} />
              <div
                className={
                  accessDecision.allowed ? 'policy-box ok compact' : 'policy-box block compact'
                }
              >
                {accessDecision.allowed ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{accessDecision.allowed ? 'Access granted' : 'Access blocked'}</strong>
                  <span>
                    {accessDecision.allowed
                      ? `${codeLabel(accessRole)} can ${codeLabel(accessPermission).toLowerCase()} here.`
                      : codeLabel(accessDecision.reason)}
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Product Audit</h2>
                <span>{canViewProductAudit ? `${productAuditPreview.length} events` : 'Restricted'}</span>
              </div>
              <FinanceRow label="Lookup" value="GET /v1/audit" />
              <FinanceRow
                label="Viewer"
                value={canViewProductAudit ? 'Owner or admin' : 'Hidden from this role'}
              />
              {canViewProductAudit ? (
                <>
                  <div className="lead-actions-list" aria-label="Product audit events">
                    {productAuditPreview.map((record) => (
                      <Signal
                        key={`${record.action}-${record.createdAt}`}
                        text={`${describeProductAuditAction(record.action)} · ${record.entityType.toLowerCase()}`}
                      />
                    ))}
                  </div>
                  <div className="policy-box ok compact">
                    <ClipboardList size={18} />
                    <div>
                      <strong>Trail visible</strong>
                      <span>Chat copy, emails, and session secrets stay out of audit metadata.</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="policy-box block compact">
                  <CircleAlert size={18} />
                  <div>
                    <strong>Audit locked</strong>
                    <span>Only a tenant owner or admin can read the tenant audit trail.</span>
                  </div>
                </div>
              )}
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Finance Readiness</h2>
                <span>{country.currencyCode}</span>
              </div>
              <FinanceRow label="Country tax profile" value="Approved" />
              <FinanceRow
                label="Subscription"
                value={formatMoney(
                  country.monthlySubscriptionAmount,
                  country.currencyCode,
                  country.locale,
                )}
              />
              <FinanceRow
                label="Computed tax"
                value={formatMoney(
                  pilotTaxSnapshot.taxAmount,
                  country.currencyCode,
                  country.locale,
                )}
              />
              <FinanceRow
                label="Net revenue"
                value={formatMoney(
                  pilotTaxSnapshot.netRevenueAmount,
                  country.currencyCode,
                  country.locale,
                )}
              />
              <FinanceRow
                label="Next remittance"
                value={
                  nextRemittanceAlert
                    ? `${nextRemittanceAlert.alertType.replaceAll('_', ' ')} T-${nextRemittanceAlert.daysUntilDue}`
                    : 'Calendar clear'
                }
              />
              <FinanceRow
                label="Tax return"
                value={taxPeriodCompletion.complete ? 'June VAT locked' : 'Workbench incomplete'}
              />
              <FinanceRow
                label="Filing evidence"
                value="Confirmation, remittance, authority ref"
              />
              <FinanceRow
                label="Dual approval"
                value="Country then global finance"
              />
              <FinanceRow
                label="Tax export"
                value={
                  canExportTaxReturn
                    ? taxReturnExport.fileName
                    : 'Finance admin only'
                }
              />
              <FinanceRow
                label="Durable store"
                value="FINANCE_REPOSITORY=prisma"
              />
              <FinanceRow
                label="Post-lock corrections"
                value="Controlled adjustments"
              />
              <FinanceRow
                label="Payment adapter"
                value="PAYMENT_PROVIDER=live"
              />
              {canManageTaxReturn ? (
                <div className="policy-box ok compact">
                  <FileCheck2 size={16} />
                  <div>
                    <strong>Period lock on</strong>
                    <span>
                      Filing and remittance evidence plus both approvers are required before a
                      period can close.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="policy-box block compact">
                  <CircleAlert size={18} />
                  <div>
                    <strong>Workbench locked</strong>
                    <span>
                      Billing managers can see tenant invoices, not country tax returns or
                      exports.
                    </span>
                  </div>
                </div>
              )}
            </section>

            <section className="side-panel" id="relationship-graph">
              <div className="panel-heading tight">
                <h2>Relationship Graph</h2>
                <span>{graphRelationshipClaims.length} live</span>
              </div>
              <FinanceRow
                label="Catalog sources"
                value={String(sourceFinderHierarchy.totals.sources)}
              />
              <FinanceRow
                label="Verified"
                value={String(sourceFinderHierarchy.totals.verified)}
              />
              <FinanceRow
                label="Graph links"
                value={String(sourceFinderHierarchy.totals.relationshipLinks)}
              />
              <FinanceRow
                label="Top country"
                value={sourceFinderHierarchy.byCountry[0]?.label ?? country.name}
              />
              <FinanceRow
                label="Top industry"
                value={sourceFinderHierarchy.byIndustry[0]?.label ?? 'All industries'}
              />
              <FinanceRow
                label="Top source"
                value={sourceFinderHierarchy.topSources[0]?.name ?? 'No sources'}
              />
              <label className="lead-select-row">
                <span>Link type</span>
                <select
                  value={relationshipKind}
                  onChange={(event) =>
                    setRelationshipKind(event.target.value as RelationshipKind)
                  }
                >
                  {relationshipKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {codeLabel(kind)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lead-select-row">
                <span>Visibility</span>
                <select
                  value={relationshipVisibility}
                  onChange={(event) =>
                    setRelationshipVisibility(event.target.value as RelationshipVisibility)
                  }
                >
                  {relationshipVisibilities.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {codeLabel(visibility)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Claim note</span>
                <textarea
                  value={relationshipNote}
                  onChange={(event) => setRelationshipNote(event.target.value)}
                  rows={3}
                />
              </label>
              <div className="terms-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!canCreateRelationship}
                  onClick={submitRelationshipClaim}
                >
                  <Link2 size={16} />
                  Claim link
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={pendingRelationshipClaims.length === 0}
                  onClick={() => {
                    const pending = pendingRelationshipClaims[0];
                    if (pending) approveRelationshipClaim(pending.id);
                  }}
                >
                  <BadgeCheck size={16} />
                  Approve
                </button>
              </div>
              <div
                className={
                  canCreateRelationship ? 'policy-box ok compact' : 'policy-box block compact'
                }
              >
                {canCreateRelationship ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>
                    {canCreateRelationship ? 'Claim unlocked' : 'Claim locked'}
                  </strong>
                  <span>
                    {relationshipError
                      ? relationshipError
                      : canCreateRelationship
                        ? 'Public and verified links stay off the graph until the counterpart or a moderator approves.'
                        : 'Accepted terms and a safe note are required before a relationship can be claimed.'}
                  </span>
                </div>
              </div>
              <div className="lead-actions-list">
                {pendingRelationshipClaims.slice(0, 3).map((claim) => (
                  <Signal
                    key={claim.id}
                    text={`${claim.sourceLabel} ${codeLabel(claim.relationship).toLowerCase()} ${claim.counterpartLabel} · pending`}
                  />
                ))}
                {graphRelationshipClaims.slice(0, 3).map((claim) => (
                  <Signal
                    key={`${claim.id}-live`}
                    text={`${claim.sourceLabel} ${codeLabel(claim.relationship).toLowerCase()} ${claim.counterpartLabel} · ${codeLabel(claim.visibility).toLowerCase()}`}
                  />
                ))}
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Lead Conversion</h2>
                <span>{leadIntelligence?.priority ?? 'No match'}</span>
              </div>
              <FinanceRow label="Selected match" value={selectedMatch?.name ?? 'No safe match'} />
              <FinanceRow
                label="Confidence"
                value={leadIntelligence ? `${leadIntelligence.confidence}%` : '0%'}
              />
              <FinanceRow
                label="Response SLA"
                value={leadIntelligence ? `${leadIntelligence.responseSlaHours}h` : '-'}
              />
              <label className="lead-select-row">
                <span>Feedback</span>
                <select
                  value={matchFeedback}
                  onChange={(event) => setMatchFeedback(event.target.value as MatchFeedbackAction)}
                >
                  {matchFeedbackActions.map((action) => (
                    <option key={action} value={action}>
                      {codeLabel(action)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lead-select-row">
                <span>Status</span>
                <select
                  value={leadStatus}
                  onChange={(event) => setLeadStatus(event.target.value as LeadStatus)}
                >
                  {leadStatuses.map((status) => (
                    <option key={status} value={status}>
                      {codeLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="terms-actions">
                <button className="primary-button" type="button" disabled={!canCreateLead}>
                  <MessageSquareText size={16} />
                  Create Inquiry
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedMatch}
                  onClick={() => setLeadStatus('QUALIFIED')}
                >
                  <FileCheck2 size={16} />
                  Qualify
                </button>
              </div>
              <div className={canCreateLead ? 'policy-box ok compact' : 'policy-box block compact'}>
                {canCreateLead ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{canCreateLead ? 'Inquiry unlocked' : 'Inquiry locked'}</strong>
                  <span>
                    {canCreateLead
                      ? `${codeLabel(matchFeedback)} match can move into the lead inbox.`
                      : 'Safe search result and accepted terms are required before outreach.'}
                  </span>
                </div>
              </div>
              <div className="lead-actions-list">
                {leadIntelligence?.nextBestActions.map((action) => (
                  <Signal key={action} text={action} />
                ))}
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Conversation Workspace</h2>
                <span>
                  {conversationSla?.state
                    ? `${codeLabel(conversationSla.state)}${inboundUnreadCount > 0 ? ` · ${inboundUnreadCount} unread` : ''}`
                    : 'No thread'}
                </span>
              </div>
              <FinanceRow
                label="Assignment"
                value={
                  conversationAssignee === 'sales-desk'
                    ? 'Sales desk'
                    : conversationAssignee === 'country-lead'
                      ? 'Country lead'
                      : 'Support agent'
                }
              />
              <FinanceRow
                label="SLA window"
                value={conversationSla ? `${conversationSla.responseSlaHours}h` : '-'}
              />
              <FinanceRow
                label="Due signal"
                value={conversationSla ? `${conversationSla.minutesUntilDue}m` : '-'}
              />
              <FinanceRow
                label="Inbound receipt"
                value={`${describeMessageDeliveryStatus(inboundReceipt.deliveryStatus)} · ${inboundUnreadCount} unread`}
              />
              <FinanceRow
                label="Outbound receipt"
                value={describeMessageDeliveryStatus(outboundDeliveryStatus)}
              />
              <FinanceRow
                label="Typing"
                value={chatTypingActive ? 'Sales desk is typing' : 'Idle'}
              />
              <FinanceRow
                label="Presence"
                value={`${describeConversationPresenceStatus(chatPresenceStatus)} · ${conversationRealtimeNamespace}`}
              />
              <FinanceRow
                label="Attachment"
                value={
                  chatAttachment
                    ? `${chatAttachment.fileName} · ${presentUserFacingMediaReview({
                        moderationStatus: chatAttachment.moderationStatus,
                      }).message}`
                    : 'None'
                }
              />
              <label className="lead-select-row">
                <span>Status</span>
                <select
                  value={conversationStatus}
                  onChange={(event) =>
                    setConversationStatus(event.target.value as ConversationStatus)
                  }
                >
                  {conversationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {codeLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lead-select-row">
                <span>Owner</span>
                <select
                  value={conversationAssignee}
                  onChange={(event) => setConversationAssignee(event.target.value)}
                >
                  <option value="sales-desk">Sales desk</option>
                  <option value="country-lead">Country lead</option>
                  <option value="support-agent">Support agent</option>
                </select>
              </label>
              <label className="chat-field">
                <span>Safe reply</span>
                <textarea
                  value={chatMessage}
                  onChange={(event) => {
                    setChatMessage(event.target.value);
                    setChatTypingAt(new Date().toISOString());
                  }}
                  rows={5}
                  aria-invalid={!chatSafetyDecision.allowed}
                />
              </label>
              <div className="saved-reply-list" aria-label="Saved replies">
                {savedReplies.slice(0, 3).map((reply) => (
                  <button
                    className="saved-reply-button"
                    key={reply.id}
                    type="button"
                    onClick={() => setChatMessage(reply.body)}
                  >
                    {reply.title}
                  </button>
                ))}
              </div>
              <div className="terms-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!canSendChat}
                  onClick={() => {
                    setConversationStatus('WAITING_ON_REQUESTER');
                    setOutboundDeliveryStatus('SENT');
                    setChatTypingAt(undefined);
                  }}
                >
                  <MessageSquareText size={16} />
                  Send Message
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedMatch}
                  onClick={() => setConversationStatus('ASSIGNED')}
                >
                  <UserCheck size={16} />
                  Assign
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedMatch || inboundReceipt.deliveryStatus !== 'SENT'}
                  onClick={() => setInboundReceipt((current) => markMessageDelivered(current))}
                >
                  <CheckCheck size={16} />
                  Mark delivered
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedMatch || inboundReceipt.deliveryStatus === 'READ'}
                  onClick={() =>
                    setInboundReceipt((current) => markMessageRead(current, 'TENANT_AGENT'))
                  }
                >
                  <Eye size={16} />
                  Mark read
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedMatch}
                  onClick={() => setChatLiveChannel((current) => !current)}
                >
                  <Radio size={16} />
                  {chatLiveChannel ? 'Leave live channel' : 'Go live'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!selectedMatch}
                  onClick={() =>
                    setChatAttachment(
                      toConversationAttachment({
                        id: 'demo-quote-sheet',
                        kind: 'IMAGE',
                        fileName: 'quote-sheet.jpg',
                        mimeType: 'image/jpeg',
                        moderationStatus: 'PASSED',
                        sourceUrl: 'https://cdn.example.test/chat/quote-sheet.jpg',
                      }),
                    )
                  }
                >
                  <FileCheck2 size={16} />
                  Attach scan-ready image
                </button>
              </div>
              <div className={canSendChat ? 'policy-box ok compact' : 'policy-box block compact'}>
                {canSendChat ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{canSendChat ? 'Messaging unlocked' : 'Messaging locked'}</strong>
                  <span>
                    {canSendChat
                      ? `${conversationSla?.message ?? 'SLA active'}${chatAttachment ? ` · ${chatAttachment.fileName} ready` : ''}${chatLiveChannel ? ' · live channel on' : ''}`
                      : chatSafetyDecision.allowed
                        ? 'Accepted terms and an open safe match are required.'
                        : `Message blocked - ${chatSafetyDecision.policyCode}`}
                  </span>
                </div>
              </div>
              <div className="policy-box ok compact">
                <ShieldCheck size={16} />
                <div>
                  <strong>Live media storage</strong>
                  <span>
                    SPACES_* credentials overlay DigitalOcean Spaces uploads. ClamAV and Sightengine
                    scanners overlay when their keys are set. Transform jobs verify public CDN URLs
                    before marking READY. Kenya reporting playbooks attach on escalate. Tenants see
                    ready, under-review, blocked, or replace-file status without internal reasons.
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Notification Delivery</h2>
                <span>{codeLabel(notificationSeverity)}</span>
              </div>
              <label className="lead-select-row">
                <span>Urgency</span>
                <select
                  value={notificationSeverity}
                  onChange={(event) =>
                    setNotificationSeverity(event.target.value as NotificationSeverity)
                  }
                >
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((severity) => (
                    <option key={severity} value={severity}>
                      {codeLabel(severity)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={pushConsent}
                  onChange={(event) => setPushConsent(event.target.checked)}
                />
                <span>Push consent</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(event) => setSmsConsent(event.target.checked)}
                />
                <span>SMS consent</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(event) => setWhatsappConsent(event.target.checked)}
                />
                <span>WhatsApp consent</span>
              </label>
              <div className="channel-block">
                <span>Queued</span>
                <div className="channel-list">
                  {notificationPlan.selectedChannels.map((channel) => (
                    <span className="channel-pill ok" key={channel}>
                      {codeLabel(channel)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="channel-block">
                <span>Dispatch</span>
                <div className="channel-list">
                  {notificationDispatchPreview.map((item) => (
                    <span
                      className={item.action === 'SEND' ? 'channel-pill ok' : 'channel-pill muted'}
                      key={`dispatch-${item.channel}`}
                    >
                      {codeLabel(item.channel)} ·{' '}
                      {item.action === 'SEND'
                        ? describeNotificationDispatchAttemptStatus('QUEUED')
                        : 'No destination'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="channel-block">
                <span>Suppressed</span>
                <div className="channel-list">
                  {notificationPlan.suppressedChannels.length > 0 ? (
                    notificationPlan.suppressedChannels.map((item) => (
                      <span className="channel-pill muted" key={`${item.channel}-${item.reason}`}>
                        {codeLabel(item.channel)}
                      </span>
                    ))
                  ) : (
                    <span className="channel-pill ok">None</span>
                  )}
                </div>
              </div>
              <div
                className={
                  notificationPlan.requiresImmediateAttention
                    ? 'policy-box block compact'
                    : 'policy-box ok compact'
                }
              >
                {notificationPlan.requiresImmediateAttention ? (
                  <CircleAlert size={18} />
                ) : (
                  <ShieldCheck size={18} />
                )}
                <div>
                  <strong>
                    {notificationPlan.requiresImmediateAttention
                      ? 'Immediate alert'
                      : 'Standard alert'}
                  </strong>
                  <span>{notificationPlan.title}</span>
                </div>
              </div>
              <div className="policy-box ok compact">
                <ShieldCheck size={18} />
                <div>
                  <strong>Durable outbox</strong>
                  <span>
                    Preferences and dispatch state persist through NOTIFICATIONS_REPOSITORY=prisma.
                  </span>
                </div>
              </div>
              <div className="policy-box ok compact">
                <ShieldCheck size={18} />
                <div>
                  <strong>WhatsApp adapter</strong>
                  <span>
                    Memory by default. WHATSAPP_PROVIDER=meta or africastalking overlays live
                    credentials and rejects destinations that are not E.164 numbers.
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Saved Searches</h2>
                <span>{savedSearches.length} active</span>
              </div>
              <label className="field compact-field">
                <span>Name</span>
                <input
                  value={savedSearchName}
                  onChange={(event) => setSavedSearchName(event.target.value)}
                />
              </label>
              <label className="lead-select-row">
                <span>Alert cadence</span>
                <select
                  value={savedSearchFrequency}
                  onChange={(event) =>
                    setSavedSearchFrequency(event.target.value as OpportunityAlertFrequency)
                  }
                >
                  {opportunityAlertFrequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {codeLabel(frequency)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="terms-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!canSaveSearch}
                  onClick={saveCurrentSearch}
                >
                  <Bell size={16} />
                  Save Search
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={savedSearches.length === 0}
                  onClick={runOpportunityAlertsNow}
                >
                  <Search size={16} />
                  Run Alerts
                </button>
              </div>
              <div className={canSaveSearch ? 'policy-box ok compact' : 'policy-box block compact'}>
                {canSaveSearch ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{canSaveSearch ? 'Alert-ready' : 'Alert blocked'}</strong>
                  <span>
                    {canSaveSearch
                      ? `${opportunityAlerts.length} delivered opportunities · ${queryExpansion.expandedTerms.length} search terms.`
                      : 'Saved alerts cannot be created for blocked or empty searches.'}
                  </span>
                </div>
              </div>
              <div className="policy-box ok compact">
                <Search size={16} />
                <div>
                  <strong>Full-text search</strong>
                  <span>Postgres FTS + token rank. Indexed catalogs report HYBRID; the pilot catalog stays RULES.</span>
                </div>
              </div>
              <div className="saved-search-list">
                {savedSearches.slice(0, 4).map((savedSearch) => (
                  <button
                    key={savedSearch.id}
                    type="button"
                    className="saved-search-row"
                    onClick={() => {
                      resetHierarchyReport();
                      setQuery(savedSearch.query);
                      setRole(savedSearch.role ?? 'ALL');
                      setIndustryCode(savedSearch.industryCode ?? 'ALL');
                      setSavedSearchName(savedSearch.name);
                      setSavedSearchFrequency(savedSearch.alertFrequency);
                    }}
                  >
                    <span>
                      <strong>{savedSearch.name}</strong>
                      {savedSearch.query}
                    </span>
                    <em>{savedSearch.alertFrequency.toLowerCase()}</em>
                  </button>
                ))}
              </div>
              <div className="alert-list">
                {(opportunityAlerts.length > 0 ? opportunityAlerts : savedSearchAlerts)
                  .slice(0, 4)
                  .map((alert) => {
                    const ready =
                      'sourceName' in alert
                        ? true
                        : alert.status === 'READY';
                    const title =
                      'sourceName' in alert
                        ? alert.sourceName
                        : alert.result
                          ? alert.result.name
                          : alert.savedSearch.name;
                    const detail =
                      'sourceName' in alert
                        ? `${alert.title}: ${alert.score} match`
                        : alert.result
                          ? `${alert.savedSearch.name}: ${alert.result.score} match`
                          : 'Blocked by safety policy';
                    return (
                      <div
                        key={alert.id}
                        className={ready ? 'alert-row ready' : 'alert-row blocked'}
                      >
                        {ready ? <Sparkles size={15} /> : <Ban size={15} />}
                        <div>
                          <strong>{title}</strong>
                          <span>{detail}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Analytics Command</h2>
                <span>{analyticsScopeLabel}</span>
              </div>
              <label className="lead-select-row">
                <span>Report scope</span>
                <select
                  value={analyticsScopeLevel}
                  onChange={(event) => {
                    resetHierarchyReport();
                    setAnalyticsScopeLevel(event.target.value as AccessScopeLevel);
                  }}
                >
                  {(['GLOBAL', 'REGIONAL', 'CONTINENT', 'COUNTRY', 'TENANT'] as const).map(
                    (scopeOption) => (
                      <option key={scopeOption} value={scopeOption}>
                        {codeLabel(scopeOption)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="lead-select-row">
                <span>Export</span>
                <select
                  value={analyticsExportFormat}
                  onChange={(event) => {
                    resetHierarchyReport();
                    setAnalyticsExportFormat(event.target.value as AnalyticsExportFormat);
                  }}
                >
                  <option value="CSV">CSV</option>
                  <option value="JSON">JSON</option>
                  <option value="PDF">PDF</option>
                </select>
              </label>
              <label className="lead-select-row">
                <span>Data</span>
                <select
                  value={analyticsDataSource}
                  onChange={(event) => {
                    resetHierarchyReport();
                    setAnalyticsDataSource(event.target.value as AnalyticsReportDataSource);
                  }}
                >
                  <option value="AUTO">Auto</option>
                  <option value="RAW">Raw</option>
                  <option value="ROLLUP">Rollup</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>Platform email</span>
                <input
                  type="email"
                  value={platformEmail}
                  onChange={(event) => setPlatformEmail(event.target.value)}
                />
              </label>
              <label className="field compact-field">
                <span>Platform password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={platformPassword}
                  onChange={(event) => setPlatformPassword(event.target.value)}
                />
              </label>
              <div className="terms-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    !platformEmail.trim() ||
                    !platformPassword ||
                    platformAuthStatus === 'LOGIN_PENDING'
                  }
                  onClick={signInPlatformSession}
                >
                  <UserCheck size={16} />
                  {platformAuthStatus === 'LOGIN_PENDING' ? 'Signing In' : 'Sign In'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!platformSessionToken.trim() || platformAuthStatus === 'VERIFYING'}
                  onClick={verifyPlatformSession}
                >
                  <BadgeCheck size={16} />
                  Verify Session
                </button>
              </div>
              <label className="field compact-field">
                <span>MFA code</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={platformMfaCode}
                  onChange={(event) => setPlatformMfaCode(event.target.value.replace(/\D/g, ''))}
                />
              </label>
              <div className="terms-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    !platformSessionToken.trim() ||
                    platformMfaCode.trim().length !== 6 ||
                    platformAuthStatus === 'VERIFYING'
                  }
                  onClick={verifyPlatformMfa}
                >
                  <ShieldCheck size={16} />
                  {platformAuthStatus === 'VERIFYING' ? 'Verifying' : 'Verify MFA'}
                </button>
              </div>
              <label className="field compact-field">
                <span>Session token</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={platformSessionToken}
                  onChange={(event) => {
                    resetHierarchyReport();
                    setPlatformSessionToken(event.target.value);
                    setPlatformSessionSummary(
                      event.target.value.trim() ? 'Manual token' : 'No session',
                    );
                    setPlatformAuthError('');
                    setPlatformAuthStatus('SIGNED_OUT');
                  }}
                />
              </label>
              <div className="terms-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!platformSessionToken.trim() || hierarchyReportStatus === 'LOADING'}
                  onClick={loadHierarchyReport}
                >
                  <ChartNoAxesCombined size={16} />
                  {hierarchyReportStatus === 'LOADING' ? 'Loading' : 'Load Report'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!hierarchyReport && hierarchyReportStatus === 'PREVIEW'}
                  onClick={resetHierarchyReport}
                >
                  <ArrowUpDown size={16} />
                  Preview
                </button>
              </div>
              <AnalyticsRow label="Auth status" value={platformStatusLabel(platformAuthStatus)} />
              <AnalyticsRow label="Session" value={platformSessionSummary} />
              {platformAuthError ? (
                <AnalyticsRow label="Auth error" value={platformAuthError} />
              ) : null}
              <AnalyticsRow label="Report source" value={statusLabel(hierarchyReportStatus)} />
              <AnalyticsRow
                label="Data source"
                value={
                  hierarchyReport?.warehouse
                    ? `${codeLabel(hierarchyReport.warehouse.dataSource)} (${formatNumber(
                        hierarchyReport.warehouse.rollupRows,
                      )} rollups)`
                    : codeLabel(analyticsDataSource)
                }
              />
              {hierarchyReportError ? (
                <AnalyticsRow label="Report error" value={hierarchyReportError} />
              ) : null}
              <AnalyticsRow
                label="Most visited"
                value={displayHierarchyVisitedRows[0]?.name ?? 'No visits'}
              />
              <AnalyticsRow label="Sorted by" value="Match score" />
              <AnalyticsRow label="Click rate" value={`${displayHierarchyClickThroughRate}%`} />
              <AnalyticsRow label="Average age" value={displayHierarchyAverageAge} />
              <AnalyticsRow
                label="Enquiries"
                value={formatNumber(displayHierarchyTotals.inquiries)}
              />
              <AnalyticsRow label="Shared" value={formatNumber(displayHierarchyTotals.shares)} />
              <AnalyticsRow
                label="Downloaded"
                value={formatNumber(displayHierarchyTotals.downloads)}
              />
              <AnalyticsRow label="Scope access" value={displayHierarchyAccess} />
              <AnalyticsRow
                label="Hierarchy views"
                value={formatNumber(displayHierarchyTotals.views)}
              />
              <AnalyticsRow
                label="Hierarchy clicks"
                value={formatNumber(displayHierarchyTotals.clicks)}
              />
              <AnalyticsRow label="Top country" value={displayHierarchyTopCountry} />
              <AnalyticsRow label="Top industry" value={displayHierarchyTopIndustry} />
              <AnalyticsRow label="Top tenant" value={displayHierarchyTopTenant} />
              <AnalyticsRow label="Export file" value={hierarchyExportName} />
              <AnalyticsRow label="API base" value={analyticsApiBaseUrl} />
              <AnalyticsRow label="Report API" value={`GET ${hierarchyReportApiPath}`} />
              <AnalyticsRow
                label="Export API"
                value={`${analyticsExportFormat} ${hierarchyExportApiPath}`}
              />
              <div className="visited-list">
                {displayHierarchyVisitedRows.map((item) => (
                  <div key={item.id} className="visited-row">
                    <span>{item.name}</span>
                    <strong>{formatNumber(item.views)}</strong>
                  </div>
                ))}
              </div>
              <div
                className={
                  hierarchyPolicyAllowed ? 'policy-box ok compact' : 'policy-box block compact'
                }
              >
                {hierarchyPolicyAllowed ? <FileCheck2 size={16} /> : <Ban size={16} />}
                <div>
                  <strong>
                    {hierarchyPolicyAllowed
                      ? `${analyticsScopeLabel} export ready`
                      : 'Hierarchy export blocked'}
                  </strong>
                  <span>
                    {hierarchyPolicyAllowed
                      ? 'Protected CSV/JSON/PDF API excludes raw metadata; retention sweep is 395 days.'
                      : `${displayHierarchyAccess} for VIEW ANALYTICS.`}
                  </span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Advert Lifecycle</h2>
                <span>{advertLifecyclePolicy.liveDays} days</span>
              </div>
              <AnalyticsRow label="Renewal alert 1" value="Day 35" />
              <AnalyticsRow label="Renewal alert 2" value="Day 39" />
              <AnalyticsRow label="Scheduled publish" value="Goes live at start time" />
              <AnalyticsRow label="Auto-delete" value="Day 40" />
              <div className="lifecycle-list">
                {renewalQueue.length > 0 ? (
                  renewalQueue.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={
                        item.lifecycle.shouldAutoDelete
                          ? 'lifecycle-row danger'
                          : 'lifecycle-row warning'
                      }
                    >
                      <Clock size={15} />
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.lifecycle.shouldAutoDelete
                            ? 'Auto-delete now'
                            : `${item.lifecycle.daysRemaining} day before deletion`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lifecycle-row">
                    <Clock size={15} />
                    <div>
                      <strong>No renewals due</strong>
                      <span>Alerts will appear on days 35 and 39.</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Opportunity Signals</h2>
                <span>Live</span>
              </div>
              <Signal text="Fresh produce has 3 high-fit buyers and 2 logistics links." />
              <Signal text="Packaging demand is rising in Nairobi and Kiambu." />
              <Signal
                text={
                  pendingRelationshipClaims.length > 0
                    ? `${pendingRelationshipClaims.length} relationship claims need counterparty approval.`
                    : 'Approved supplier, logistics, and buyer links can now rank in Source Finder.'
                }
              />
              <Signal
                text={
                  opportunityAlerts.length > 0
                    ? `${opportunityAlerts.length} Source Finder opportunity alerts are ready to deliver.`
                    : 'Saved Source Finder searches can alert on new high-fit matches.'
                }
              />
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="metric">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="finance-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnalyticsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="analytics-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Signal({ text }: { text: string }) {
  return (
    <div className="signal-row">
      <Sparkles size={15} />
      <span>{text}</span>
    </div>
  );
}
