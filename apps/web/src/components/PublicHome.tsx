'use client';

import Link from 'next/link';

import { WebOnlyCheckout } from '../lib/app-context';
import { useStoredSession } from '../lib/use-session';
import { LiveSearch, type SearchFilters } from './LiveSearch';
import '../styles/business.css';

/** Public home: real search over published adverts, plus the policies. Nothing role-specific. */
export function PublicHome({ initial }: { initial: SearchFilters }) {
  const session = useStoredSession();
  return (
    <main className="biz-page">
      <nav className="biz-topnav" aria-label="Site navigation">
        <strong style={{ color: 'var(--green)' }}>SellFindConnect</strong>
        <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {session ? (
            <Link href="/dashboard">Your business</Link>
          ) : (
            <>
              <Link href="/dashboard">Sign in</Link>
              <Link href="/dashboard?signup=1">List your business</Link>
            </>
          )}
        </span>
      </nav>

      <header style={{ margin: '8px 0 16px' }}>
        <p className="biz-pill">Kenya&apos;s business-to-business directory</p>
        <h1 style={{ margin: '10px 0 6px' }}>Find the supplier, buyer or transporter your business needs.</h1>
        <p className="biz-sub">
          Search businesses across every link of the supply chain and contact them directly.
          <WebOnlyCheckout> Listing your business is free for the first month.</WebOnlyCheckout>
        </p>
      </header>

      <LiveSearch initial={initial} />

      <section className="biz-card" style={{ marginTop: 16 }} id="zero-tolerance">
        <h2>What we never allow</h2>
        <p className="biz-sub">
          Illegal goods, weapons, drugs, exploitation, scams and other prohibited content are removed and reported. Every
          listing can be reported, and every business can be blocked.
        </p>
        <Link href="/prohibited">Read the prohibited content policy</Link>
      </section>

      <footer className="biz-footer">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/community">Community standards</Link>
        <Link href="/prohibited">Prohibited content</Link>
        <Link href="/account/delete">Delete account</Link>
      </footer>
    </main>
  );
}
