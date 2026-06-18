'use client';

import {
  ArrowUpDown,
  BadgeCheck,
  Ban,
  Bell,
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
  conversationStatuses,
  defaultNotificationPreferences,
  evaluateAccess,
  evaluatePasswordPolicy,
  evaluateSafetyText,
  getRemittanceAlertDecision,
  getCountry,
  industryCategories,
  pilotSourceFinderRecords,
  prohibitedCategorySummaries,
  searchSourceFinderRecords,
  sourceFinderSortOptions,
  leadStatuses,
  matchFeedbackActions,
  type LeadStatus,
  type MatchFeedbackAction,
  type ConversationStatus,
  type AccessPermission,
  type AccessRole,
  type AccessScopeLevel,
  type NotificationSeverity,
  type SourceFinderSearchResult,
  type SourceFinderSortOption,
  supplyChainRoles,
  type SupplyChainRole,
} from '@telpen/domain';

const tenantId = '11111111-1111-4111-8111-111111111111';
const lifecycleDemoNow = new Date(Date.UTC(2026, 6, 10, 0, 0, 0)).toISOString();
const conversationDemoOpenedAt = '2026-06-17T08:00:00.000Z';
const conversationDemoNow = '2026-06-17T11:15:00.000Z';

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

export default function Home() {
  const [query, setQuery] = useState('fresh produce');
  const [role, setRole] = useState<SupplyChainRole | 'ALL'>('ALL');
  const [industryCode, setIndustryCode] = useState('ALL');
  const [sortBy, setSortBy] = useState<SourceFinderSortOption>('RELEVANCE');
  const [matchFeedback, setMatchFeedback] = useState<MatchFeedbackAction>('SAVE');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('NEW');
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('OPEN');
  const [conversationAssignee, setConversationAssignee] = useState('sales-desk');
  const [notificationSeverity, setNotificationSeverity] = useState<NotificationSeverity>('HIGH');
  const [accessRole, setAccessRole] = useState<AccessRole>('COUNTRY_ADMIN');
  const [accessScopeLevel, setAccessScopeLevel] = useState<AccessScopeLevel>('COUNTRY');
  const [accessPermission, setAccessPermission] = useState<AccessPermission>('MANAGE_COUNTRY');
  const [accessMfaVerified, setAccessMfaVerified] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState('owner@sellfindconnect.com');
  const [ownerPassword, setOwnerPassword] = useState('Strong-owner#2026');
  const [tenantDisplayName, setTenantDisplayName] = useState('Nairobi Fresh Produce Cooperative');
  const [pushConsent, setPushConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [chatMessage, setChatMessage] = useState(
    'Please share price terms, availability, delivery coverage and minimum order.',
  );
  const [profileDescription, setProfileDescription] = useState(
    'We supply fresh vegetables to hotels, restaurants and retailers in Nairobi.',
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

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
  const selectedIndustry = industryCategories.find((industry) => industry.code === industryCode);
  const safetyDecision = evaluateSafetyText(profileDescription);
  const querySafetyDecision = evaluateSafetyText(query);
  const canPublish = safetyDecision.allowed && termsAccepted;
  const publishBlockReason = !safetyDecision.allowed
    ? 'Publishing is disabled because the draft contains prohibited content'
    : !termsAccepted
      ? 'Publishing is disabled until the advertiser accepts the terms'
      : 'Publish draft';

  const filteredResults: SourceFinderSearchResult[] = querySafetyDecision.allowed
    ? searchSourceFinderRecords(
        {
          query,
          role,
          industryCode,
          countryCode,
          sortBy,
        },
        pilotSourceFinderRecords,
      )
    : [];

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
  const mostVisited = [...filteredResults]
    .sort((a, b) => b.analytics.views - a.analytics.views)
    .slice(0, 3);
  const averageDaysLive = filteredResults.length
    ? Math.round(
        filteredResults.reduce(
          (memo, item) =>
            memo + calculateAdvertLifecycle(item.publishedAt, lifecycleDemoNow).daysLive,
          0,
        ) / filteredResults.length,
      )
    : 0;
  const clickThroughRate = totals.views ? Math.round((totals.clicks / totals.views) * 100) : 0;
  const selectedMatch = filteredResults[0];
  const leadIntelligence = selectedMatch
    ? buildLeadConversionIntelligence(selectedMatch)
    : null;
  const canCreateLead = Boolean(termsAccepted && querySafetyDecision.allowed && selectedMatch);
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
  const ownerPasswordPolicy = evaluatePasswordPolicy(ownerPassword);
  const ownerTrial = calculateTrialSubscription({
    startedAt: '2026-06-18T00:00:00.000Z',
    monthlyAmount: country.monthlySubscriptionAmount,
    currencyCode: country.currencyCode,
  });
  const onboardingSafety = evaluateSafetyText(`${ownerEmail} ${tenantDisplayName}`);
  const canCreateTenantOwner = ownerPasswordPolicy.allowed && onboardingSafety.allowed && termsAccepted;
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
          <button className="nav-item" title="Relationships">
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
            <button
              className="primary-button"
              disabled={!canPublish}
              title={publishBlockReason}
            >
              <Send size={16} />
              Publish Draft
            </button>
          </div>
        </header>

        <section className="metric-grid" aria-label="Performance metrics">
          <Metric label="Views" value={formatNumber(totals.views)} icon={<Eye size={18} />} />
          <Metric label="Clicks" value={formatNumber(totals.clicks)} icon={<ArrowUpDown size={18} />} />
          <Metric label="Inquiries" value={formatNumber(totals.inquiries)} icon={<Inbox size={18} />} />
          <Metric label="Shares" value={formatNumber(totals.shares)} icon={<Handshake size={18} />} />
          <Metric label="Downloads" value={formatNumber(totals.downloads)} icon={<Sparkles size={18} />} />
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
              <select value={role} onChange={(event) => setRole(event.target.value as SupplyChainRole | 'ALL')}>
                <option value="ALL">All roles</option>
                {supplyChainRoles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabel(item)}
                  </option>
                ))}
              </select>
              <select value={industryCode} onChange={(event) => setIndustryCode(event.target.value)}>
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
              <FinanceRow
                label="Password score"
                value={`${ownerPasswordPolicy.score}%`}
              />
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
              <FinanceRow label="Policy version" value={activePolicyVersions.prohibitedContentVersion} />
              <div className={canCreateTenantOwner ? 'policy-box ok compact' : 'policy-box block compact'}>
                {canCreateTenantOwner ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{canCreateTenantOwner ? 'Owner signup ready' : 'Owner signup locked'}</strong>
                  <span>
                    {canCreateTenantOwner
                      ? 'Safe owner tenant can enter trial with MFA required.'
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
              <div className={accessDecision.allowed ? 'policy-box ok compact' : 'policy-box block compact'}>
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
                value={formatMoney(pilotTaxSnapshot.taxAmount, country.currencyCode, country.locale)}
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
                <span>{conversationSla?.state ? codeLabel(conversationSla.state) : 'No thread'}</span>
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
              <label className="lead-select-row">
                <span>Status</span>
                <select
                  value={conversationStatus}
                  onChange={(event) => setConversationStatus(event.target.value as ConversationStatus)}
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
                  onChange={(event) => setChatMessage(event.target.value)}
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
                  onClick={() => setConversationStatus('WAITING_ON_REQUESTER')}
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
              </div>
              <div className={canSendChat ? 'policy-box ok compact' : 'policy-box block compact'}>
                {canSendChat ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}
                <div>
                  <strong>{canSendChat ? 'Messaging unlocked' : 'Messaging locked'}</strong>
                  <span>
                    {canSendChat
                      ? `${conversationSla?.message ?? 'SLA active'}`
                      : chatSafetyDecision.allowed
                        ? 'Accepted terms and an open safe match are required.'
                        : `Message blocked - ${chatSafetyDecision.policyCode}`}
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
                  onChange={(event) => setNotificationSeverity(event.target.value as NotificationSeverity)}
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
                    {notificationPlan.requiresImmediateAttention ? 'Immediate alert' : 'Standard alert'}
                  </strong>
                  <span>{notificationPlan.title}</span>
                </div>
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Analytics Command</h2>
                <span>Tenant</span>
              </div>
              <AnalyticsRow label="Most visited" value={mostVisited[0]?.name ?? 'No visits'} />
              <AnalyticsRow label="Sorted by" value="Match score" />
              <AnalyticsRow label="Click rate" value={`${clickThroughRate}%`} />
              <AnalyticsRow label="Average age" value={`${averageDaysLive} days`} />
              <AnalyticsRow label="Enquiries" value={formatNumber(totals.inquiries)} />
              <AnalyticsRow label="Shared" value={formatNumber(totals.shares)} />
              <AnalyticsRow label="Downloaded" value={formatNumber(totals.downloads)} />
              <div className="visited-list">
                {mostVisited.map((item) => (
                  <div key={item.id} className="visited-row">
                    <span>{item.name}</span>
                    <strong>{formatNumber(item.analytics.views)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="side-panel">
              <div className="panel-heading tight">
                <h2>Advert Lifecycle</h2>
                <span>{advertLifecyclePolicy.liveDays} days</span>
              </div>
              <AnalyticsRow label="Renewal alert 1" value="Day 35" />
              <AnalyticsRow label="Renewal alert 2" value="Day 39" />
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
              <Signal text="2 relationship claims need counterparty approval." />
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
