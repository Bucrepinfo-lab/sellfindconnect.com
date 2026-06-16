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
import { useMemo, useState } from 'react';

import {
  countries,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  prohibitedCategorySummaries,
  supplyChainRoles,
  type SupplyChainRole,
} from '@telpen/domain';

type MarketResult = {
  id: string;
  name: string;
  role: SupplyChainRole;
  industryCode: string;
  countryCode: string;
  location: string;
  offers: string[];
  needs: string[];
  score: number;
  responseTime: string;
  verified: boolean;
  views: number;
  clicks: number;
  inquiries: number;
  shares: number;
  downloads: number;
  daysLive: number;
};

const tenantId = '11111111-1111-4111-8111-111111111111';

const marketResults: MarketResult[] = [
  {
    id: 'r1',
    name: 'Nairobi Fresh Produce Cooperative',
    role: 'SUPPLIER',
    industryCode: 'AGRICULTURE',
    countryCode: 'KE',
    location: 'Nairobi',
    offers: ['tomatoes', 'kale', 'onions', 'hotel supply'],
    needs: ['cold storage', 'transport', 'retail buyers'],
    score: 94,
    responseTime: '14m',
    verified: true,
    views: 1280,
    clicks: 342,
    inquiries: 68,
    shares: 41,
    downloads: 17,
    daysLive: 23,
  },
  {
    id: 'r2',
    name: 'Rift Valley Cold Chain Logistics',
    role: 'LOGISTICS_PROVIDER',
    industryCode: 'LOGISTICS',
    countryCode: 'KE',
    location: 'Nakuru',
    offers: ['cold transport', 'storage', 'last mile delivery'],
    needs: ['produce suppliers', 'pharma clients'],
    score: 88,
    responseTime: '31m',
    verified: true,
    views: 920,
    clicks: 201,
    inquiries: 46,
    shares: 28,
    downloads: 9,
    daysLive: 39,
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
    score: 83,
    responseTime: '1h',
    verified: false,
    views: 740,
    clicks: 166,
    inquiries: 31,
    shares: 22,
    downloads: 6,
    daysLive: 12,
  },
  {
    id: 'r4',
    name: 'Kiambu Packaging Works',
    role: 'PRODUCER',
    industryCode: 'MANUFACTURING',
    countryCode: 'KE',
    location: 'Kiambu',
    offers: ['food packaging', 'retail labels', 'cartons'],
    needs: ['farm suppliers', 'retail distributors'],
    score: 79,
    responseTime: '45m',
    verified: true,
    views: 650,
    clicks: 119,
    inquiries: 22,
    shares: 12,
    downloads: 8,
    daysLive: 54,
  },
];

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

function roleLabel(role: string) {
  return role
    .split('_')
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

export default function Home() {
  const [query, setQuery] = useState('fresh produce');
  const [role, setRole] = useState<SupplyChainRole | 'ALL'>('ALL');
  const [industryCode, setIndustryCode] = useState('ALL');
  const [profileDescription, setProfileDescription] = useState(
    'We supply fresh vegetables to hotels, restaurants and retailers in Nairobi.',
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  const country = getCountry('KE') ?? countries[0]!;
  const selectedIndustry = industryCategories.find((industry) => industry.code === industryCode);
  const safetyDecision = evaluateSafetyText(profileDescription);
  const querySafetyDecision = evaluateSafetyText(query);
  const canPublish = safetyDecision.allowed && termsAccepted;
  const publishBlockReason = !safetyDecision.allowed
    ? 'Publishing is disabled because the draft contains prohibited content'
    : !termsAccepted
      ? 'Publishing is disabled until the advertiser accepts the terms'
      : 'Publish draft';

  const filteredResults = useMemo(() => {
    if (!querySafetyDecision.allowed) return [];

    const normalizedQuery = query.trim().toLowerCase();
    return marketResults
      .filter((item) => role === 'ALL' || item.role === role)
      .filter((item) => industryCode === 'ALL' || item.industryCode === industryCode)
      .filter((item) => {
        if (!normalizedQuery) return true;
        const haystack = [
          item.name,
          item.location,
          item.role,
          ...item.offers,
          ...item.needs,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => b.score - a.score);
  }, [industryCode, query, querySafetyDecision.allowed, role]);

  const totals = filteredResults.reduce(
    (memo, item) => ({
      views: memo.views + item.views,
      clicks: memo.clicks + item.clicks,
      inquiries: memo.inquiries + item.inquiries,
      shares: memo.shares + item.shares,
      downloads: memo.downloads + item.downloads,
    }),
    { views: 0, clicks: 0, inquiries: 0, shares: 0, downloads: 0 },
  );

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

                      <div className="result-footer">
                        <span>{result.inquiries} inquiries</span>
                        <span>{result.responseTime} response</span>
                        <span>{result.daysLive} days live</span>
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
                <h2>Finance Readiness</h2>
                <span>KE</span>
              </div>
              <FinanceRow label="Country tax profile" value="Required" />
              <FinanceRow label="Subscription" value="KES 10" />
              <FinanceRow label="Trial" value="1 month" />
              <FinanceRow label="Remittance alerts" value="T-30 to overdue" />
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

function Signal({ text }: { text: string }) {
  return (
    <div className="signal-row">
      <Sparkles size={15} />
      <span>{text}</span>
    </div>
  );
}
