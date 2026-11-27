'use client';

import { useState, useSyncExternalStore } from 'react';

import { COPIED_HINT, shareTargets } from '@telpen/domain';

import { SfcIcon } from './SfcIcon';

/**
 * Share the current page where people actually are (owner 26/11/26): WhatsApp
 * and Facebook first, then X, Telegram, LinkedIn, SMS and email, plus copy
 * link. TikTok, Instagram and YouTube have no web share address: on a phone
 * "TikTok, Instagram & more" opens the phone's own share sheet; on a computer
 * it copies the link with a hint (never the computer's OneNote/Outlook box).
 * Nothing is sent until the person taps; no tracking parameters are added.
 */
export function ShareBar({
  title,
  text,
  label = 'Share',
  url: fixedUrl,
}: {
  title: string;
  text: string;
  label?: string;
  /** A fixed address to share (e.g. the homepage from a private page); default: this page. */
  url?: string;
}) {
  const [note, setNote] = useState('');
  // The page address on the client ('' while rendering on the server).
  const pageUrl = useSyncExternalStore(
    () => () => undefined,
    () => window.location.href,
    () => '',
  );
  const url = fixedUrl ?? pageUrl;

  const copy = async (hint = 'Link copied') => {
    try {
      await navigator.clipboard.writeText(url || pageUrl || window.location.href);
      setNote(hint);
    } catch {
      setNote(url);
    }
    window.setTimeout(() => setNote(''), 4000);
  };

  const more = async () => {
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const phoneSheet = touch && typeof navigator.share === 'function';
    if (!phoneSheet) return copy(COPIED_HINT);
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Closed the sheet: nothing to do.
    }
  };

  return (
    <div className="share-bar" role="group" aria-label={label}>
      <p className="form-note" style={{ width: '100%', margin: 0 }}>
        <SfcIcon name="share" size={14} /> {label}
      </p>
      {url
        ? shareTargets({ text, url, title }).map((target) => (
            <a
              key={target.id}
              className="secondary-button"
              href={target.href}
              target={target.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              style={{ background: target.color, color: '#fff', borderColor: target.color }}
            >
              {target.label}
            </a>
          ))
        : null}
      <button type="button" className="secondary-button" onClick={() => void more()}>
        TikTok, Instagram &amp; more
      </button>
      <button type="button" className="secondary-button" onClick={() => void copy()} aria-live="polite">
        <SfcIcon name="link" size={16} /> Copy link
      </button>
      {note ? (
        <p className="form-note" role="status" style={{ width: '100%', margin: 0 }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
