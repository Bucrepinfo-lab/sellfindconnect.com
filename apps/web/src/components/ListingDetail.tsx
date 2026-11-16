'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatPublicCount, kenyaPlaceLabel, ugcReportReasons } from '@telpen/domain';

import { ApiError, apiRequest, isTermsError } from '../lib/api-client';
import { formatDmy } from '../lib/dates';
import { recordListingEvent } from '../lib/public-api';
import { codeLabel, industryLabel } from '../lib/labels';
import { useStoredSession } from '../lib/use-session';
import type { PublicAdvert } from './LiveSearch';
import { BusinessReviews } from './BusinessReviews';
import { ShareBar } from './ShareBar';
import '../styles/business.css';
import '../styles/home.css';

type Load = { status: 'loading' } | { status: 'missing' } | { status: 'error'; message: string } | { status: 'ok'; advert: PublicAdvert };

function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

export function ListingDetail({ id }: { id: string }) {
  const session = useStoredSession();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [reason, setReason] = useState<string>('SPAM_SCAMS');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<PublicAdvert>(`/public/adverts/${encodeURIComponent(id)}`, { auth: false })
      .then((advert) => {
        if (cancelled) return;
        setLoad({ status: 'ok', advert });
        recordListingEvent(advert.id, 'VIEW');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoad(
          error instanceof ApiError && error.status === 404
            ? { status: 'missing' }
            : { status: 'error', message: error instanceof Error ? error.message : 'Could not load this listing.' },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const send = async (kind: 'report' | 'block', advert: PublicAdvert) => {
    setBusy(true);
    setNotice(null);
    try {
      if (kind === 'report') {
        await apiRequest('/ugc/reports', {
          method: 'POST',
          body: {
            targetType: 'ADVERT',
            targetId: advert.id,
            targetTenantId: advert.tenantId,
            reason,
            ...(details.trim() ? { details: details.trim().slice(0, 500) } : {}),
            acceptedTerms: true,
          },
        });
        setNotice({ tone: 'ok', text: 'Report sent. Our moderators will review this listing.' });
      } else {
        await apiRequest('/ugc/blocks', {
          method: 'POST',
          body: { blockedTargetId: advert.tenantId, blockedTenantId: advert.tenantId, reason, acceptedTerms: true },
        });
        setBlocked(true);
        setNotice({ tone: 'ok', text: 'Blocked. You will no longer see this business in your search results.' });
      }
    } catch (error) {
      const text =
        error instanceof ApiError && error.status === 409
          ? 'You have already blocked this business.'
          : isTermsError(error)
            ? 'Accept the current terms in your dashboard first, then try again.'
            : error instanceof Error
              ? error.message
              : 'Could not send. Try again.';
      setNotice({ tone: 'error', text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="biz-page">
      <nav className="biz-topnav" aria-label="Listing navigation">
        <Link href="/">← Search businesses</Link>
        <Link href="/dashboard">{session ? 'Your business' : 'Sign in'}</Link>
      </nav>

      {load.status === 'loading' ? <p className="biz-sub">Loading…</p> : null}
      {load.status === 'missing' ? (
        <div className="biz-card">
          <h1>Listing not available</h1>
          <p className="biz-sub">This advert has ended, was unpublished, or was removed.</p>
          <Link className="primary-button" href="/">
            Search businesses
          </Link>
        </div>
      ) : null}
      {load.status === 'error' ? <p className="biz-note error">{load.message}</p> : null}

      {load.status === 'ok' ? (
        <ListingBody
          advert={load.advert}
          own={session?.tenantId === load.advert.tenantId}
          signedIn={Boolean(session)}
          blocked={blocked}
          busy={busy}
          reason={reason}
          details={details}
          notice={notice}
          onReason={setReason}
          onDetails={setDetails}
          onSend={(kind) => void send(kind, load.advert)}
        />
      ) : null}

      <footer className="biz-footer">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/community">Community standards</Link>
        <Link href="/prohibited">Prohibited content</Link>
      </footer>
    </main>
  );
}

function ListingBody(props: {
  advert: PublicAdvert;
  own: boolean;
  signedIn: boolean;
  blocked: boolean;
  busy: boolean;
  reason: string;
  details: string;
  notice: { tone: 'ok' | 'error'; text: string } | null;
  onReason: (value: string) => void;
  onDetails: (value: string) => void;
  onSend: (kind: 'report' | 'block') => void;
}) {
  const { advert } = props;
  const images = (advert.media ?? []).filter((item) => !item.kind || item.kind === 'IMAGE');
  return (
    <>
      <article className="biz-card">
        <span className="biz-pill">{codeLabel(advert.role)}</span>
        <h1 style={{ margin: '8px 0 4px', overflowWrap: 'anywhere' }}>{advert.title}</h1>
        <p className="biz-sub">
          {advert.displayName} · {industryLabel(advert.industryCode)} · listed {formatDmy(advert.publishedAt)}
        </p>
        {advert.stats && (advert.stats.views > 0 || advert.stats.enquiries > 0) ? (
          <p className="biz-sub" style={{ marginTop: -6 }}>
            {formatPublicCount(advert.stats.views, 'view', 'views')} ·{' '}
            {formatPublicCount(advert.stats.enquiries, 'enquiry', 'enquiries')} in the last 90 days
          </p>
        ) : null}
        {advert.location?.county ? (
          <p className="result-card__place" style={{ margin: '0 0 12px' }}>
            {[advert.location.landmark, kenyaPlaceLabel(advert.location)].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {images.length ? (
          <div className="biz-media">
            {images.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={item.id} src={item.thumbnailUrl ?? item.cdnUrl ?? item.sourceUrl} alt={item.altText ?? advert.title} />
            ))}
          </div>
        ) : null}
        <p style={{ whiteSpace: 'pre-line', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{advert.description}</p>

        <h2>Contact {advert.displayName}</h2>
        {advert.phone || advert.email || advert.website ? (
          <div className="biz-actions">
            {advert.phone ? (
              <a onClick={() => recordListingEvent(advert.id, 'INQUIRY')} className="primary-button" href={`tel:${advert.phone.replace(/\s/g, '')}`}>
                Call
              </a>
            ) : null}
            {advert.phone ? (
              <a onClick={() => recordListingEvent(advert.id, 'INQUIRY')} className="secondary-button" href={whatsappLink(advert.phone)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : null}
            {advert.email ? (
              <a onClick={() => recordListingEvent(advert.id, 'INQUIRY')} className="secondary-button" href={`mailto:${advert.email}?subject=${encodeURIComponent(`Enquiry: ${advert.title}`)}`}>
                Email
              </a>
            ) : null}
            {advert.website ? (
              <a onClick={() => recordListingEvent(advert.id, 'INQUIRY')} className="secondary-button" href={advert.website} target="_blank" rel="noopener noreferrer nofollow">
                Website
              </a>
            ) : null}
          </div>
        ) : (
          <p className="biz-sub">This business has not added contact details yet.</p>
        )}
        <div style={{ marginTop: 12 }}>
          <ShareBar
            label="Share this listing"
            title={advert.title}
            text={`${advert.title} by ${advert.displayName} on SellFindConnect:`}
          />
        </div>
      </article>

      <BusinessReviews
        tenantId={advert.tenantId}
        businessName={advert.displayName}
        own={props.own}
        signedIn={props.signedIn}
      />

      <section className="biz-card" style={{ marginTop: 16 }} aria-label="Report or block">
        {props.own ? (
          <p className="biz-sub">
            This is your advert. Manage it from <Link href="/dashboard#adverts">your business</Link>.
          </p>
        ) : !props.signedIn ? (
          <>
            <h2>Something wrong with this listing?</h2>
            <p className="biz-sub">
              <Link href="/dashboard">Sign in</Link> to report it to our moderators or block this business.
            </p>
          </>
        ) : (
          <>
            <h2>Report or block</h2>
            <p className="biz-sub">Reports go to our moderators. Blocking hides this business from your searches.</p>
            <div className="biz-grid two">
              <label className="biz-field">
                <span>Reason</span>
                <select value={props.reason} onChange={(event) => props.onReason(event.target.value)}>
                  {ugcReportReasons.map((item) => (
                    <option key={item} value={item}>
                      {codeLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="biz-field">
                <span>Details (optional)</span>
                <input value={props.details} maxLength={500} onChange={(event) => props.onDetails(event.target.value)} />
              </label>
            </div>
            <div className="biz-actions">
              <button className="secondary-button" type="button" disabled={props.busy} onClick={() => props.onSend('report')}>
                Report listing
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={props.busy || props.blocked}
                onClick={() => props.onSend('block')}
              >
                {props.blocked ? 'Blocked' : 'Block business'}
              </button>
            </div>
          </>
        )}
        {props.notice ? (
          <p className={`biz-note ${props.notice.tone === 'error' ? 'error' : ''}`} role="status">
            {props.notice.text}
          </p>
        ) : null}
      </section>
    </>
  );
}
