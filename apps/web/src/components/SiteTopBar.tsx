'use client';

import { ArrowLeft, Building2, Search, Store, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { backTargetFor, showsSiteTopBar } from '../lib/site-nav';

/**
 * Owner 27/11/26: "there is no back button … make sure there is navigation
 * tabs … all the pages can be navigated with the tabs". Every page outside
 * the main workspace (home, dashboard, staff console, which have their own
 * menu) gets this bar: Back, plus the three main tabs with their words.
 */
const TABS = [
  { href: '/', label: 'Find businesses', icon: Search, match: (p: string) => p === '/' || p.startsWith('/listing') },
  { href: '/dashboard', label: 'My business', icon: Store, match: (p: string) => p.startsWith('/dashboard') },
  { href: '/account', label: 'Account', icon: UserCheck, match: (p: string) => p.startsWith('/account') },
] as const;

export function SiteTopBar() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  if (!showsSiteTopBar(pathname)) return null;

  const goBack = () => {
    // Back to where they came from on this site; otherwise to the page above this one.
    const cameFromHere = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin);
    if (cameFromHere && window.history.length > 1) router.back();
    else router.push(backTargetFor(pathname));
  };

  return (
    <header className="site-topbar">
      <div className="site-topbar__inner">
        <button type="button" className="site-topbar__back" onClick={goBack}>
          <ArrowLeft size={18} aria-hidden />
          <span>Back</span>
        </button>
        <Link href="/" className="site-topbar__brand" aria-label="SellFindConnect home">
          <Building2 size={20} aria-hidden />
          <span>SellFindConnect</span>
        </Link>
        <nav className="site-topbar__tabs" aria-label="Main">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link key={href} href={href} className="site-topbar__tab" aria-current={active ? 'page' : undefined}>
                <Icon size={18} aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
