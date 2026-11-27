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
import { ThemeToggle } from './ThemeToggle';

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
    title: 'A real business behind every listing',
    text: 'Every listing belongs to a business signed in with its own phone number and PIN, and its photos are checked before they show.',
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

/**
 * One banner per kind of visitor, each with the value in plain words and the
 * next step (owner 25/11/26: the front office should build appetite).
 */
const BANNERS: Array<{ tone: string; icon: SfcIconName; kicker: string; title: string; points: string[]; cta: string; href: string }> = [
  {
    tone: 'sell',
    icon: 'sell',
    kicker: 'For sellers',
    title: 'Be found by buyers in all 47 counties',
    points: ['Your advert shows in search the moment you publish', 'Buyers call or WhatsApp you directly', 'No commission on your deals'],
    cta: 'Create an advert',
    href: '/dashboard#adverts',
  },
  {
    tone: 'find',
    icon: 'find',
    kicker: 'For buyers',
    title: 'Compare suppliers near you, then call',
    points: ['Search is free, no account needed', 'Filter by county, ward, industry and type', 'Report or block anyone in one tap'],
    cta: 'Start searching',
    href: '#search',
  },
  {
    tone: 'connect',
    icon: 'transporter',
    kicker: 'Transport and services',
    title: 'Get regular work from traders who need you',
    points: ['List your routes, lorry sizes or services', 'Show the businesses you already work with', 'Get enquiries on your phone'],
    cta: 'List my service',
    href: '/dashboard#adverts',
  },
];

/** What every member gets, as plain checks. Each one is something the product already does. */
const PROMISES = [
  'Free to search, no account needed',
  'You deal directly, no middleman',
  'No commission on your sales',
  'Every listing tied to a business phone number',
  'Works on any phone and in the Android app',
  'Report and block on every listing',
];

/**
 * How it works, for both kinds of visitor (owner 26/11/26): the buyer's three
 * steps and the seller's three steps, side by side, each in the order people
 * really go, each ending in a button.
 */
const STEPS = [
  { title: 'Search', text: 'Type what you need and pick your county. Free, no account needed.' },
  { title: 'Compare', text: 'Open listings to see photos, what they offer and where they are.' },
  { title: 'Connect', text: 'Call or WhatsApp the business directly and agree your own terms.' },
];
const SELL_STEPS = [
  { title: 'Write or say your advert', text: 'What you sell, your prices and where you deliver. Tap the microphone if typing is hard.' },
  { title: 'Publish with your phone', text: 'Your phone number and a 4-digit PIN. No SMS code. The first month is free.' },
  { title: 'Buyers call you', text: 'Your advert shows in search at once, and buyers contact you directly. No commission.' },
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
              <Link href="/dashboard#sign-in">Sign in</Link>
              <Link className="home-nav__cta" href="/dashboard#adverts">
                Post an advert
              </Link>
            </>
          )}
        </span>
      </nav>

      <LiveSearch initial={initial}>
        <header className="home-hero__heading">
          <h1>Find who sells it, buys it or moves it, <span className="home-hero__glow">anywhere in Kenya.</span></h1>
          <p>Suppliers, wholesalers, transporters and service providers in all 47 counties. Search free, then contact them directly.</p>
        </header>
      </LiveSearch>

      <section className="home-section how-flow" id="how" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <div className="how-flow__cols">
          <div className="how-flow__col">
            <h3 className="how-flow__who">I want to buy or find</h3>
            <ol className="step-list">
              {STEPS.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
            <a className="how-flow__cta how-flow__cta--find" href="#search">Start searching</a>
          </div>
          <div className="how-flow__col">
            <h3 className="how-flow__who">I want to sell or offer a service</h3>
            <ol className="step-list">
              {SELL_STEPS.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
            <Link className="how-flow__cta how-flow__cta--sell" href={session ? '/dashboard/adverts/new' : '/dashboard#adverts'}>
              Post my advert
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="banners-heading">
        <h2 id="banners-heading">What would you like to do?</h2>
        <ul className="value-banners">
          {BANNERS.map((banner) => (
            <li key={banner.title} className={`value-banner tone-${banner.tone}`}>
              <span className="value-banner__icon" aria-hidden="true">
                <SfcIcon name={banner.icon} size={26} />
              </span>
              <p className="value-banner__kicker">{banner.kicker}</p>
              <h3>{banner.title}</h3>
              <ul>
                {banner.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link className="value-banner__cta" href={banner.href}>
                {banner.cta}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="promise-band" aria-labelledby="promise-heading">
        <h2 id="promise-heading">What you get with SellFindConnect</h2>
        <ul className="promise-list">
          {PROMISES.map((promise) => (
            <li key={promise}>
              <SfcIcon name="checked" size={18} />
              <span>{promise}</span>
            </li>
          ))}
        </ul>
      </section>

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

      <section className="sell-band" aria-labelledby="sell-heading">
        <div>
          <h2 id="sell-heading">Selling something? Be found where buyers are searching.</h2>
          <p>
            Put up your business with photos, what you offer and where you are. It takes a few minutes on your phone.
            <WebOnlyCheckout> Your first month is free.</WebOnlyCheckout>
          </p>
        </div>
        <div className="sell-band__actions">
          <Link className="sell-band__cta" href={session ? '/dashboard/adverts/new' : '/dashboard#adverts'}>
            {session ? 'Post an advert' : 'Create your advert'}
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

      <section className="home-section home-help" aria-labelledby="help-heading">
        <h2 id="help-heading">Need help?</h2>
        <p>
          Write to <span className="home-help__mail">telpeninfo@gmail.com</span> and tell us what you tapped. We answer the
          same day.
        </p>
      </section>

      {/* Phones: the two main actions stay one thumb away. */}
      <nav className="home-dock" aria-label="Quick actions">
        <a className="home-dock__btn home-dock__btn--find" href="#search">
          Search
        </a>
        <Link className="home-dock__btn home-dock__btn--sell" href={session ? '/dashboard/adverts/new' : '/dashboard#adverts'}>
          Post an advert
        </Link>
      </nav>

      <footer className="biz-footer home-footer">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/community">Community standards</Link>
        <Link href="/prohibited">Prohibited content</Link>
        <Link href="/account/delete">Delete account</Link>
        <ThemeToggle tone="page" />
      </footer>
    </main>
  );
}
