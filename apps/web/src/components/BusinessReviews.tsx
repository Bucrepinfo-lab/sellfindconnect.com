'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  BUSINESS_REVIEW_COMMENT_MAX,
  formatRatingSummary,
  ugcReportReasons,
  type BusinessRatingSummary,
  type PublicBusinessReview,
} from '@telpen/domain';

import { ApiError, apiRequest, isTermsError } from '../lib/api-client';
import { formatDmy } from '../lib/dates';
import { codeLabel } from '../lib/labels';

type ReviewsPayload = { summary: BusinessRatingSummary; reviews: PublicBusinessReview[] };
type OwnReview = { id: string; tenantId: string; rating: number; comment?: string; status: 'VISIBLE' | 'HIDDEN' };
type Notice = { tone: 'ok' | 'error'; text: string } | null;

const ratingWords = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'stars__on' : 'stars__off'} />
      ))}
    </span>
  );
}

function errorText(error: unknown): string {
  if (isTermsError(error)) return 'Accept the current terms in your dashboard first, then try again.';
  if (error instanceof ApiError && error.status === 404) return 'This business is not taking reviews right now.';
  return error instanceof Error ? error.message : 'Could not save. Try again.';
}

/** Ratings and reviews of one business, with write, withdraw and report actions. */
export function BusinessReviews(props: { tenantId: string; businessName: string; own: boolean; signedIn: boolean }) {
  const { tenantId } = props;
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [mine, setMine] = useState<OwnReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('SPAM_SCAMS');

  const load = useCallback(() => {
    apiRequest<ReviewsPayload>(`/public/businesses/${encodeURIComponent(tenantId)}/reviews`, { auth: false })
      .then((payload) => {
        setData(payload);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!props.signedIn || props.own) return;
    let cancelled = false;
    apiRequest<OwnReview[]>('/reviews/written')
      .then((written) => {
        if (cancelled) return;
        const found = written.find((item) => item.tenantId === tenantId) ?? null;
        setMine(found);
        if (found) {
          setRating(found.rating);
          setComment(found.comment ?? '');
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props.signedIn, props.own, tenantId]);

  const save = async () => {
    if (rating < 1) {
      setNotice({ tone: 'error', text: 'Choose 1 to 5 stars first.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const saved = await apiRequest<OwnReview>('/reviews', {
        method: 'POST',
        body: {
          businessTenantId: tenantId,
          rating,
          ...(comment.trim() ? { comment: comment.trim().slice(0, BUSINESS_REVIEW_COMMENT_MAX) } : {}),
          acceptedTerms: true,
        },
      });
      setNotice({
        tone: 'ok',
        text:
          saved.status === 'HIDDEN'
            ? 'Saved. A moderator has hidden your review, so it is not shown publicly.'
            : mine
              ? 'Review updated.'
              : 'Review posted. Thank you.',
      });
      setMine(saved);
      load();
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await apiRequest(`/reviews/${encodeURIComponent(tenantId)}`, { method: 'DELETE' });
      setMine(null);
      setRating(0);
      setComment('');
      setNotice({ tone: 'ok', text: 'Review withdrawn.' });
      load();
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const report = async (reviewId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await apiRequest('/ugc/reports', {
        method: 'POST',
        body: { targetType: 'REVIEW', targetId: reviewId, targetTenantId: tenantId, reason: reportReason, acceptedTerms: true },
      });
      setReporting(null);
      setNotice({ tone: 'ok', text: 'Report sent. Our moderators will check this review.' });
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const summary = data?.summary;
  const canWrite = props.signedIn && !props.own;

  return (
    <section className="biz-card reviews" style={{ marginTop: 16 }} aria-labelledby="reviews-heading">
      <div className="reviews__head">
        <h2 id="reviews-heading">Reviews</h2>
        {summary ? (
          <p className="reviews__summary">
            {summary.count ? <Stars value={summary.average ?? 0} size={18} /> : null}
            <span>{formatRatingSummary(summary)}</span>
          </p>
        ) : null}
      </div>

      {summary && summary.count > 1 ? (
        <ol className="reviews__bars" aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((stars) => {
            const n = summary.distribution[stars - 1] ?? 0;
            return (
              <li key={stars}>
                <span>{stars}★</span>
                <span className="reviews__bar">
                  <span style={{ width: `${Math.round((n / summary.count) * 100)}%` }} />
                </span>
                <span>{n}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {failed ? <p className="biz-sub">Reviews could not load right now.</p> : null}

      {data && data.reviews.length ? (
        <ul className="reviews__list">
          {data.reviews.map((item) => (
            <li key={item.id} className="reviews__item">
              <div className="reviews__meta">
                <Stars value={item.rating} size={14} />
                <span className="sr-only">{item.rating} out of 5</span>
                <span>
                  {formatDmy(item.createdAt)}
                  {item.edited ? ' · edited' : ''}
                </span>
              </div>
              {item.comment ? <p className="reviews__comment">{item.comment}</p> : null}
              {canWrite && mine?.id !== item.id ? (
                reporting === item.id ? (
                  <div className="reviews__report">
                    <select
                      aria-label="Why are you reporting this review?"
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                    >
                      {ugcReportReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {codeLabel(reason)}
                        </option>
                      ))}
                    </select>
                    <button className="secondary-button" type="button" disabled={busy} onClick={() => void report(item.id)}>
                      Send report
                    </button>
                    <button className="link-button" type="button" onClick={() => setReporting(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="link-button reviews__report-link" type="button" onClick={() => setReporting(item.id)}>
                    Report review
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : data ? (
        <p className="biz-sub">No reviews yet{props.own ? '.' : `. Dealt with ${props.businessName}? Be the first to rate them.`}</p>
      ) : null}

      {props.own ? (
        <p className="biz-sub">Reviews come from other businesses on SellFindConnect. You can report any that break our community standards.</p>
      ) : !props.signedIn ? (
        <p className="biz-sub">
          <Link href="/dashboard">Sign in</Link> with your business account to rate {props.businessName}.
        </p>
      ) : (
        <form
          className="reviews__form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h3>{mine ? 'Your review' : `Rate ${props.businessName}`}</h3>
          <fieldset className="star-picker">
            <legend className="sr-only">Your rating</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} title={ratingWords[n]}>
                <input
                  type="radio"
                  name="review-rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                />
                <Star size={28} className={n <= rating ? 'stars__on' : 'stars__off'} aria-hidden="true" />
                <span className="sr-only">
                  {n} star{n === 1 ? '' : 's'}, {ratingWords[n]}
                </span>
              </label>
            ))}
            <span className="star-picker__word" aria-live="polite">
              {rating ? ratingWords[rating] : 'Tap a star'}
            </span>
          </fieldset>
          <label className="biz-field">
            <span>What was it like? (optional)</span>
            <textarea
              value={comment}
              maxLength={BUSINESS_REVIEW_COMMENT_MAX}
              rows={3}
              placeholder="Delivery, quality, price, how they handled questions…"
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <p className="biz-sub reviews__rules">
            Rate your own experience only. No phone numbers, insults or anything our{' '}
            <Link href="/community">community standards</Link> forbid.
          </p>
          <div className="biz-actions">
            <button className="primary-button" type="submit" disabled={busy}>
              {mine ? 'Update review' : 'Post review'}
            </button>
            {mine ? (
              <button className="secondary-button" type="button" disabled={busy} onClick={() => void withdraw()}>
                Withdraw review
              </button>
            ) : null}
          </div>
        </form>
      )}

      {notice ? (
        <p className={`biz-note ${notice.tone === 'error' ? 'error' : ''}`} role="status">
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
