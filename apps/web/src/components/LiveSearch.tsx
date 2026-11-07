'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { evaluateSafetyText, industryCategories, supplyChainRoles } from '@telpen/domain';

import { ApiError, apiRequest } from '../lib/api-client';
import { codeLabel, industryLabel } from '../lib/labels';
import { useStoredSession } from '../lib/use-session';
import '../styles/business.css';

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
  media?: Array<{ id: string; sourceUrl: string; cdnUrl?: string; thumbnailUrl?: string; altText?: string; kind?: string }>;
};

type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; results: PublicAdvert[]; message?: string };

export type SearchFilters = { q: string; industry: string; role: string };

const PROHIBITED = 'Prohibited goods and services are not available on SellFindConnect.';

async function runSearch(filters: SearchFilters): Promise<SearchState> {
  const q = filters.q.trim();
  if (q && !evaluateSafetyText(q).allowed) {
    return { status: 'error', results: [], message: PROHIBITED };
  }
  const params = new URLSearchParams({ countryCode: 'KE', limit: '30' });
  if (q) params.set('q', q.slice(0, 160));
  if (filters.industry) params.set('industryCode', filters.industry);
  if (filters.role) params.set('role', filters.role);
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

/** Source Finder over real, published adverts (GET /v1/public/adverts/search). */
export function LiveSearch({ initial }: { initial: SearchFilters }) {
  const session = useStoredSession();
  const [query, setQuery] = useState(initial.q);
  const [industry, setIndustry] = useState(initial.industry);
  const [role, setRole] = useState(initial.role);
  const [state, setState] = useState<SearchState>({ status: 'loading', results: [] });
  const [blockedTenants, setBlockedTenants] = useState<string[]>([]);

  const search = async () => {
    setState((current) => ({ ...current, status: 'loading' }));
    setState(await runSearch({ q: query, industry, role }));
  };

  const { q: initialQ, industry: initialIndustry, role: initialRole } = initial;
  useEffect(() => {
    // First search on load, using filters from the URL (onboarding or a shared link).
    let cancelled = false;
    runSearch({ q: initialQ, industry: initialIndustry, role: initialRole }).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [initialQ, initialIndustry, initialRole]);

  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) return;
    apiRequest<Array<{ blockedTargetId: string; blockedTenantId?: string }>>('/ugc/blocks')
      .then((blocks) =>
        setBlockedTenants(blocks.flatMap((block) => [block.blockedTargetId, block.blockedTenantId ?? ''])),
      )
      .catch(() => undefined);
  }, [signedIn]);

  const visible = state.results.filter(
    (result) => !blockedTenants.includes(result.tenantId) && !blockedTenants.includes(result.id),
  );

  return (
    <section className="biz-card" id="source-finder" aria-label="Find businesses">
      <h2>Find businesses</h2>
      <p className="biz-sub">Search published adverts from Kenyan suppliers, buyers, transporters and service providers.</p>
      <form
        className="biz-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="biz-field">
          <span>What are you looking for?</span>
          <input
            type="search"
            value={query}
            maxLength={160}
            placeholder="e.g. maize flour supplier Nairobi"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="biz-field">
          <span>Industry</span>
          <select value={industry} onChange={(event) => setIndustry(event.target.value)}>
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
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Any role</option>
            {supplyChainRoles.map((item) => (
              <option key={item} value={item}>
                {codeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="submit" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div aria-live="polite" style={{ marginTop: 14 }}>
        {state.status === 'error' ? <p className="biz-note error">{state.message}</p> : null}
        {state.status === 'done' && visible.length === 0 ? (
          <div className="biz-empty">
            No businesses match yet. Try fewer words, or <Link href="/dashboard?signup=1">list your own business</Link>.
          </div>
        ) : null}
        {visible.length ? (
          <ul className="biz-list">
            {visible.map((result) => (
              <li className="biz-item" key={result.id}>
                <strong>{result.title}</strong>
                <p>
                  {result.displayName} · {codeLabel(result.role)} · {industryLabel(result.industryCode)}
                </p>
                <p>{result.description.length > 180 ? `${result.description.slice(0, 177)}…` : result.description}</p>
                <div className="biz-actions" style={{ marginTop: 0 }}>
                  <Link className="secondary-button" href={`/listing/${result.id}`}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
