'use client';

import Link from 'next/link';

import { WebOnlyCheckout } from '../lib/app-context';
import { useStoredSession } from '../lib/use-session';
import { BrandLogo } from './BrandLogo';
import { LiveSearch, type SearchFilters } from './LiveSearch';
import { SfcIcon, type SfcIconName } from './SfcIcon';
import { ShareBar } from './ShareBar';
import '../styles/business.css';
import '../styles/home.css';

/**
 * Each reason answers a complaint people make about other directories and
 * marketplaces, and each one describes something this product already does.
 */
const REASONS: Array<{ icon: SfcIconName; title: string; text: string; webOnly?: boolean }> = [
  {
    icon: 'direct',
    title: 'You talk to the business itself',
    text: 'Call or WhatsApp the number on the listing. We do not sit in the middle, take a cut of your deal or sell your enquiry to anyone else.',
  },
  {
    icon: 'checked',
    title: 'A checked account behind every listing',
    text: 'A business confirms its account with a one-time code before it can publish, and its photos are checked before they show.',
  },
  {
    icon: 'price',
    title: 'Clear prices, shown upfront',
    text: 'Searching is always free. Listing your business has one monthly fee, shown before you pay. Any extra is optional and priced before you choose it.',
    webOnly: true,
  },
  {
    icon: 'report',
    title: 'Report it, block it, gone',
    text: 'Every listing has Report and Block. Scams, fakes and prohibited goods are removed, and a business you block stays hidden from you.',
  },
];

const STEPS = [
  { title: 'Search', text: 'Type what you need and pick your county.' },
  { title: 'Compare', text: 'Open listings to see photos, what they offer and where they are.' },
  { title: 'Connect', text: 'Call or WhatsApp the business directly and agree your own terms.' },
];

/** Public home: real search over published adverts, the reasons to trust it and the policies. */
export function PublicHome({ initial }: { initial: SearchFilters }) {
  const session = useStoredSession();
  return (
    <main className="home">
      <nav className="home-nav" aria-label="Site navigation">
        <Link href="/" className="home-nav__brand" aria-label="SellFindConnect home">
          <BrandLogo />
        </Link>
        <span className="home-nav__links">
          {session ? (
            <Link className="home-nav__cta" href="/dashboard">
              Your business
            </Link>
          ) : (
            <>
              <Link href="/dashboard">Sign in</Link>
              <Link className="home-nav__cta" href="/dashboard?signup=1">
                List your business
              </Link>
            </>
          )}
        </span>
      </nav>

      <LiveSearch initial={initial}>
        <header className="home-hero__heading">
          <h1>Find who sells it, buys it or moves it, anywhere in Kenya.</h1>
          <p>Suppliers, wholesalers, transporters and service providers in all 47 counties. Search free, then contact them directly.</p>
        </header>
      </LiveSearch>

      <section className="home-section" aria-labelledby="why-heading">
        <h2 id="why-heading">Why businesses use SellFindConnect</h2>
        <ul className="reason-list">
          {REASONS.map((reason) => {
            const item = (
              <li key={reason.title} className="reason">
                <span className="reason__icon" aria-hidden="true">
                  <SfcIcon name={reason.icon} size={24} />
                </span>
                <div>
                  <h3>{reason.title}</h3>
                  <p>{reason.text}</p>
                </div>
              </li>
            );
            return reason.webOnly ? <WebOnlyCheckout key={reason.title}>{item}</WebOnlyCheckout> : item;
          })}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol className="step-list">
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="sell-band" aria-labelledby="sell-heading">
        <div>
          <h2 id="sell-heading">Selling something? Be found where buyers are searching.</h2>
          <p>
            Put up your business with photos, what you offer and where you are. It takes a few minutes on your phone.
            <WebOnlyCheckout> Your first month is free.</WebOnlyCheckout>
          </p>
        </div>
        <div className="sell-band__actions">
          <Link className="sell-band__cta" href={session ? '/dashboard/adverts/new' : '/dashboard?signup=1'}>
            {session ? 'Post an advert' : 'List your business'}
          </Link>
          <ShareBar
            label="Tell a business"
            title="SellFindConnect"
            text="Find suppliers, buyers and transporters across Kenya on SellFindConnect."
          />
        </div>
      </section>

      <details className="home-section safety-note" id="zero-tolerance">
        <summary>What we never allow</summary>
        <p className="biz-sub">
          Illegal goods, weapons, drugs, exploitation, scams and other prohibited content are removed and reported. Every
          listing can be reported, and every business can be blocked.
        </p>
        <Link href="/prohibited">Read the prohibited content policy</Link>
      </details>

      <footer className="biz-footer home-footer">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/community">Community standards</Link>
        <Link href="/prohibited">Prohibited content</Link>
        <Link href="/account/delete">Delete account</Link>
      </footer>
    </main>
  );
}
