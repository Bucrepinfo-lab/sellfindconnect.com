'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  evaluateSafetyText,
  findKenyaConstituency,
  formatPublicCount,
  findKenyaCounty,
  industryCategories,
  kenyaCounties,
  kenyaLandmarksInCounty,
  kenyaLandmarks,
  kenyaPlaceLabel,
  listingBadges,
  listingSortModes,
  nearestKenyaCounty,
  normalizeKenyaPlace,
  sortListings,
  supplyChainRoles,
  type ListingBadge,
  type ListingSortMode,
} from '@telpen/domain';

import { ApiError, apiRequest } from '../lib/api-client';
import { codeLabel, industryLabel } from '../lib/labels';
import { SfcIcon, industryIconName, roleIconName } from './SfcIcon';
import { useStoredSession } from '../lib/use-session';
import '../styles/business.css';
import '../styles/home.css';

export type PublicAdvert = {
  id: string;
  tenantId: string;
  title: string;
  displayName: string;
  industryCode: string;
  role: string;
  countryCode: string;
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  publishedAt: string;
  expiresAt: string;
  boosted?: boolean;
  matchedTerms?: string[];
  /** Anonymous public counts over the last 90 days. */
  stats?: { views: number; enquiries: number };
  /** Visible review average and count for the business, when it has reviews. */
  rating?: { average: number | null; count: number };
  /** Where the business is, from its profile (absent until it sets one). */
  location?: { county?: string; constituency?: string; ward?: string; landmark?: string };
  media?: Array<{ id: string; sourceUrl: string; cdnUrl?: string; thumbnailUrl?: string; altText?: string; kind?: string }>;
};

type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; results: PublicAdvert[]; message?: string };

export type SearchFilters = {
  q: string;
  industry: string;
  role: string;
  county?: string;
  constituency?: string;
  ward?: string;
  sort?: ListingSortMode;
};

const PROHIBITED = 'Prohibited goods and services are not available on SellFindConnect.';

/** The roles people search for most, in plain words. The full list sits under "More filters". */
const QUICK_ROLES: Array<{ role: string; label: string }> = [
  { role: 'SUPPLIER', label: 'Suppliers' },
  { role: 'WHOLESALER', label: 'Wholesalers' },
  { role: 'PRODUCER', label: 'Producers' },
  { role: 'LOGISTICS_PROVIDER', label: 'Transporters' },
  { role: 'SERVICE_PROVIDER', label: 'Services' },
  { role: 'BUYER', label: 'Buyers' },
];

const DEFAULT_MARKETS = ['Gikomba Market', 'Kongowea Market', 'Kibuye Market', 'Nakuru Wakulima Market', 'Eastleigh', 'Karatina Market'];

async function runSearch(filters: SearchFilters): Promise<SearchState> {
  const q = filters.q.trim();
  if (q && !evaluateSafetyText(q).allowed) {
    return { status: 'error', results: [], message: PROHIBITED };
  }
  const params = new URLSearchParams({ countryCode: 'KE', limit: '30' });
  if (q) params.set('q', q.slice(0, 160));
  if (filters.industry) params.set('industryCode', filters.industry);
  if (filters.role) params.set('role', filters.role);
  // The API matches a business's set location exactly, and falls back to the
  // advert text for businesses that have not set one yet.
  const place = normalizeKenyaPlace(filters);
  if (place.county) params.set('county', place.county);
  if (place.constituency) params.set('constituency', place.constituency);
  if (place.ward) params.set('ward', place.ward);
  try {
    const payload = await apiRequest<{ results: PublicAdvert[] }>(`/public/adverts/search?${params.toString()}`, {
      auth: false,
    });
    return { status: 'done', results: payload.results ?? [] };
  } catch (error) {
    return {
      status: 'error',
      results: [],
      message:
        error instanceof ApiError && error.status === 422
          ? PROHIBITED
          : error instanceof Error
            ? error.message
            : 'Search failed. Try again.',
    };
  }
}

/** Keep the applied filters in the address bar so the search can be shared or reloaded. */
function writeFiltersToUrl(filters: SearchFilters) {
  try {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | undefined) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    set('q', filters.q.trim().slice(0, 160));
    set('industry', filters.industry);
    set('role', filters.role);
    set('county', filters.county);
    set('constituency', filters.constituency);
    set('ward', filters.ward);
    set('sort', filters.sort && filters.sort !== 'BEST' ? filters.sort.toLowerCase() : undefined);
    url.searchParams.delete('query');
    url.searchParams.delete('industryCode');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Address bar updates are a convenience; the search itself already ran.
  }
}

function badgeIcon(badge: ListingBadge) {
  if (badge.kind === 'FEATURED') return <SfcIcon name="featured" size={13} />;
  if (badge.kind === 'ENDING') return <SfcIcon name="clock" size={13} />;
  if (badge.kind === 'NEW') return <SfcIcon name="fresh" size={13} />;
  return null;
}

function ResultCard({ result, now }: { result: PublicAdvert; now: Date | undefined }) {
  const images = (result.media ?? []).filter((item) => !item.kind || item.kind === 'IMAGE');
  const cover = images[0];
  const badges = listingBadges({ ...result, media: images }, now);
  const summary = result.description.length > 150 ? `${result.description.slice(0, 147)}…` : result.description;
  const where = result.location?.county
    ? [result.location.landmark, kenyaPlaceLabel(result.location)].filter(Boolean).join(' · ')
    : '';
  return (
    <li className="result-card">
      <Link href={`/listing/${result.id}`} className="result-card__link" aria-label={`Open ${result.title}`}>
        <div className="result-card__media" aria-hidden={cover ? undefined : true}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.thumbnailUrl ?? cover.cdnUrl ?? cover.sourceUrl}
              alt={cover.altText ?? result.title}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="result-card__initial">{result.displayName.trim().charAt(0).toUpperCase() || 'S'}</span>
          )}
        </div>
        <div className="result-card__body">
          {badges.length ? (
            <span className="result-card__badges">
              {badges.map((badge) => (
                <span key={badge.kind} className={`badge badge--${badge.kind.toLowerCase()}`}>
                  {badgeIcon(badge)}
                  {badge.label}
                </span>
              ))}
            </span>
          ) : null}
          <strong className="result-card__title">{result.title}</strong>
          <span className="result-card__meta">
            {result.displayName} · {codeLabel(result.role)}
          </span>
          <span className="result-card__meta">{industryLabel(result.industryCode)}</span>
          {result.rating && result.rating.count > 0 && result.rating.average !== null ? (
            <span className="result-card__rating" aria-label={`Rated ${result.rating.average.toFixed(1)} out of 5 from ${result.rating.count} reviews`}>
              <SfcIcon name="star" size={13} solid />
              {result.rating.average.toFixed(1)}
              <span className="result-card__rating-count">({result.rating.count})</span>
            </span>
          ) : null}
          {result.stats && (result.stats.views > 0 || result.stats.enquiries > 0) ? (
            <span className="result-card__stats">
              <SfcIcon name="eye" size={13} />
              {formatPublicCount(result.stats.views, 'view', 'views')}
              {result.stats.enquiries > 0 ? ` · ${formatPublicCount(result.stats.enquiries, 'enquiry', 'enquiries')}` : ''}
            </span>
          ) : null}
          {where ? (
            <span className="result-card__place">
              <SfcIcon name="pin" size={13} />
              {where}
            </span>
          ) : null}
          <span className="result-card__summary">{summary}</span>
        </div>
      </Link>
    </li>
  );
}

function ResultSkeleton() {
  return (
    <ul className="result-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <li key={item} className="result-card result-card--skeleton">
          <div className="result-card__media" />
          <div className="result-card__body">
            <span className="skeleton-line" style={{ width: '70%' }} />
            <span className="skeleton-line" style={{ width: '45%' }} />
            <span className="skeleton-line" style={{ width: '90%' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Source Finder over real, published adverts (GET /v1/public/adverts/search).
 * `children` is the page heading shown above the search box.
 */
export function LiveSearch({ initial, children }: { initial: SearchFilters; children?: ReactNode }) {
  const session = useStoredSession();
  const initialPlace = normalizeKenyaPlace(initial);
  const [query, setQuery] = useState(initial.q);
  const [industry, setIndustry] = useState(initial.industry);
  const [role, setRole] = useState(initial.role);
  const [county, setCounty] = useState(initialPlace.county ?? '');
  const [constituency, setConstituency] = useState(initialPlace.constituency ?? '');
  const [ward, setWard] = useState(initialPlace.ward ?? '');
  const [sort, setSort] = useState<ListingSortMode>(initial.sort ?? 'BEST');
  const [photosOnly, setPhotosOnly] = useState(false);
  const [state, setState] = useState<SearchState>({ status: 'loading', results: [] });
  const [blockedTenants, setBlockedTenants] = useState<string[]>([]);
  const [locating, setLocating] = useState<'idle' | 'busy' | 'done' | 'denied' | 'outside' | 'unavailable'>('idle');
  // One clock reading per result set keeps badges stable while the list is on screen.
  const [now, setNow] = useState<Date | undefined>(undefined);

  const apply = async (next: Partial<SearchFilters> = {}) => {
    const filters: SearchFilters = { q: query, industry, role, county, constituency, ward, sort, ...next };
    setState((current) => ({ ...current, status: 'loading' }));
    writeFiltersToUrl(filters);
    const result = await runSearch(filters);
    setNow(new Date());
    setState(result);
  };

  const { q: initialQ, industry: initialIndustry, role: initialRole } = initial;
  const initialCounty = initialPlace.county ?? '';
  const initialConstituency = initialPlace.constituency ?? '';
  const initialWard = initialPlace.ward ?? '';
  useEffect(() => {
    // First search on load, using filters from the URL (onboarding or a shared link).
    let cancelled = false;
    runSearch({
      q: initialQ,
      industry: initialIndustry,
      role: initialRole,
      county: initialCounty,
      constituency: initialConstituency,
      ward: initialWard,
    }).then((next) => {
      if (cancelled) return;
      setNow(new Date());
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [initialQ, initialIndustry, initialRole, initialCounty, initialConstituency, initialWard]);

  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) return;
    apiRequest<Array<{ blockedTargetId: string; blockedTenantId?: string }>>('/ugc/blocks')
      .then((blocks) =>
        setBlockedTenants(blocks.flatMap((block) => [block.blockedTargetId, block.blockedTenantId ?? ''])),
      )
      .catch(() => undefined);
  }, [signedIn]);

  const place = useMemo(() => normalizeKenyaPlace({ county, constituency, ward }), [county, constituency, ward]);
  const visible = useMemo(() => {
    const allowed = state.results.filter(
      (result) => !blockedTenants.includes(result.tenantId) && !blockedTenants.includes(result.id),
    );
    const withPhotos = photosOnly ? allowed.filter((result) => (result.media?.length ?? 0) > 0) : allowed;
    return sortListings(withPhotos, sort);
  }, [state.results, blockedTenants, photosOnly, sort]);

  const constituencies = findKenyaCounty(county)?.constituencies ?? [];
  const wards = findKenyaConstituency(county, constituency)?.wards ?? [];
  const countyMarkets = kenyaLandmarksInCounty(county).filter((item) => item.kind !== 'MALL');
  const markets = countyMarkets.length
    ? countyMarkets.slice(0, 8)
    : kenyaLandmarks.filter((item) => DEFAULT_MARKETS.includes(item.name));
  const moreFiltersInUse = [industry && !industryCategories.slice(0, 8).some((item) => item.code === industry), constituency, ward, photosOnly, role && !QUICK_ROLES.some((item) => item.role === role)].filter(Boolean).length;
  const anyFilter = Boolean(query.trim() || industry || role || county || photosOnly);

  /**
   * Suggest the county from the phone's position. The position stays on the
   * device: only the county name is used, for this search.
   */
  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocating('unavailable');
      return;
    }
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const found = nearestKenyaCounty(position.coords.latitude, position.coords.longitude);
        if (!found) {
          setLocating('outside');
          return;
        }
        setLocating('done');
        setCounty(found.name);
        setConstituency('');
        setWard('');
        void apply({ county: found.name, constituency: '', ward: '' });
      },
      (error) => setLocating(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  };

  const clearAll = () => {
    setQuery('');
    setIndustry('');
    setRole('');
    setCounty('');
    setConstituency('');
    setWard('');
    setPhotosOnly(false);
    setSort('BEST');
    void apply({ q: '', industry: '', role: '', county: '', constituency: '', ward: '', sort: 'BEST' });
  };

  return (
    <>
      <section className="home-hero" aria-label="Find businesses">
        {children}
        <form
          className="hero-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            void apply();
          }}
        >
          <label className="hero-search__field hero-search__field--what">
            <span>What do you need?</span>
            <input
              type="search"
              value={query}
              maxLength={160}
              placeholder="maize flour, cement, lorry hire…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="hero-search__field">
            <span>County</span>
            <select
              value={county}
              onChange={(event) => {
                setCounty(event.target.value);
                setConstituency('');
                setWard('');
                void apply({ county: event.target.value, constituency: '', ward: '' });
              }}
            >
              <option value="">All of Kenya</option>
              {kenyaCounties
                .slice()
                .sort((left, right) => left.name.localeCompare(right.name))
                .map((item) => (
                  <option key={item.code} value={item.name}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="hero-search__go" type="submit" disabled={state.status === 'loading'}>
            <SfcIcon name="find" size={18} />
            {state.status === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </form>
        <div className="hero-locate">
          <button type="button" className="hero-locate__button" onClick={useMyLocation} disabled={locating === 'busy'}>
            <SfcIcon name="locate" size={16} />
            {locating === 'busy' ? 'Finding your county…' : 'Use my location'}
          </button>
          <span className="hero-locate__note" aria-live="polite">
            {locating === 'done' && county ? `Showing ${county}. Change the county if this is not right.` : null}
            {locating === 'denied' ? 'Location is off for this site. Pick your county instead.' : null}
            {locating === 'outside' ? 'You seem to be outside Kenya. Pick a county to search.' : null}
            {locating === 'unavailable' ? 'Could not get your location. Pick your county instead.' : null}
            {locating === 'idle' ? 'Your position stays on your phone; only the county is used.' : null}
          </span>
        </div>
        <div className="chip-row" role="group" aria-label="Who are you looking for?">
          {QUICK_ROLES.map((item) => {
            const active = role === item.role;
            return (
              <button
                key={item.role}
                type="button"
                className={`chip chip--on-dark${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  const next = active ? '' : item.role;
                  setRole(next);
                  void apply({ role: next });
                }}
              >
                <SfcIcon name={roleIconName(item.role)} size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-section" id="source-finder" aria-label="Search results">
        <div className="chip-row chip-row--scroll" role="group" aria-label="Industry">
          {industryCategories.slice(0, 8).map((item) => {
            const active = industry === item.code;
            return (
              <button
                key={item.code}
                type="button"
                className={`chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                title={item.description}
                onClick={() => {
                  const next = active ? '' : item.code;
                  setIndustry(next);
                  void apply({ industry: next });
                }}
              >
                <SfcIcon name={industryIconName(item.code)} size={16} />
                {item.name.split(',')[0]}
              </button>
            );
          })}
        </div>

        <details className="more-filters">
          <summary>
            More filters{moreFiltersInUse ? ` (${moreFiltersInUse} on)` : ''}
          </summary>
          <div className="more-filters__grid">
            <label className="biz-field">
              <span>Industry</span>
              <select
                value={industry}
                onChange={(event) => {
                  setIndustry(event.target.value);
                  void apply({ industry: event.target.value });
                }}
              >
                <option value="">All industries</option>
                {industryCategories.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="biz-field">
              <span>Role</span>
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  void apply({ role: event.target.value });
                }}
              >
                <option value="">Any role</option>
                {supplyChainRoles.map((item) => (
                  <option key={item} value={item}>
                    {codeLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="biz-field">
              <span>Constituency</span>
              <select
                value={constituency}
                disabled={!county}
                onChange={(event) => {
                  setConstituency(event.target.value);
                  setWard('');
                  void apply({ constituency: event.target.value, ward: '' });
                }}
              >
                <option value="">{county ? 'Whole county' : 'Pick a county first'}</option>
                {constituencies.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="biz-field">
              <span>Ward</span>
              <select
                value={ward}
                disabled={!constituency}
                onChange={(event) => {
                  setWard(event.target.value);
                  void apply({ ward: event.target.value });
                }}
              >
                <option value="">{constituency ? 'Whole constituency' : 'Pick a constituency first'}</option>
                {wards.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="biz-check more-filters__check">
              <input type="checkbox" checked={photosOnly} onChange={(event) => setPhotosOnly(event.target.checked)} />
              <span>Only listings with photos</span>
            </label>
          </div>
        </details>

        <div className="results-bar">
          <p className="results-bar__count" aria-live="polite">
            {state.status === 'loading'
              ? 'Searching…'
              : state.status === 'done'
                ? `${visible.length} ${visible.length === 1 ? 'business' : 'businesses'}${place.county ? ` in ${kenyaPlaceLabel(place)}` : ''}`
                : ''}
          </p>
          <div className="sort-tabs" role="group" aria-label="Sort results">
            {listingSortModes.map((item) => (
              <button
                key={item.mode}
                type="button"
                aria-pressed={sort === item.mode}
                className={`sort-tab${sort === item.mode ? ' is-active' : ''}`}
                onClick={() => {
                  setSort(item.mode);
                  writeFiltersToUrl({ q: query, industry, role, county, constituency, ward, sort: item.mode });
                }}
              >
                <SfcIcon name={roleIconName(item.role)} size={16} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite">
          {state.status === 'error' ? <p className="biz-note error">{state.message}</p> : null}
          {state.status === 'loading' && state.results.length === 0 ? <ResultSkeleton /> : null}
          {state.status === 'done' && visible.length === 0 ? (
            <div className="biz-empty empty-state">
              <strong>No business matches yet.</strong>
              <p>
                {place.county
                  ? `No business in ${kenyaPlaceLabel(place)} matches yet. Try the whole county or all of Kenya.`
                  : 'Try fewer words or a different industry.'}
              </p>
              <div className="biz-actions">
                {anyFilter ? (
                  <button type="button" className="secondary-button" onClick={clearAll}>
                    Clear all filters
                  </button>
                ) : null}
                <Link className="primary-button" href="/dashboard?signup=1">
                  List your business here
                </Link>
              </div>
            </div>
          ) : null}
          {visible.length ? (
            <ul className={`result-grid${state.status === 'loading' ? ' is-refreshing' : ''}`}>
              {visible.map((result) => (
                <ResultCard key={result.id} result={result} now={now} />
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="home-section" aria-label="Start from a market you know">
        <h2>Start from a market you know</h2>
        <p className="biz-sub">
          {countyMarkets.length
            ? `Well-known trading places in ${county}. Tap one to see businesses that mention it.`
            : 'Tap a trading place to see businesses that mention it. Pick a county above for local markets.'}
        </p>
        <div className="chip-row">
          {markets.map((item) => (
            <button
              key={`${item.county ?? ''}-${item.name}`}
              type="button"
              className="chip chip--market"
              title={item.knownFor}
              onClick={() => {
                const term = item.name.replace(/\s*\(.*\)\s*/g, ' ').trim().replace(/\s+Market$/i, '');
                setQuery(term);
                void apply({ q: term });
                document.getElementById('source-finder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.area ?? item.county}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
