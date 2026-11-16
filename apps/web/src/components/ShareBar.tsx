'use client';

import { useState } from 'react';

import { SfcIcon } from './SfcIcon';

/**
 * Share the current page: the phone's own share sheet where there is one,
 * WhatsApp everywhere, and copy link as the fallback. Nothing is sent until
 * the person taps; no tracking parameters are added.
 */
export function ShareBar({ title, text, label = 'Share' }: { title: string; text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const pageUrl = () => (typeof window === 'undefined' ? '' : window.location.href);

  const nativeShare = async () => {
    const url = pageUrl();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Closed the sheet or sharing is blocked: fall through to WhatsApp.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="share-bar" role="group" aria-label={label}>
      <button type="button" className="secondary-button" onClick={() => void nativeShare()}>
        <SfcIcon name="share" size={16} /> {label}
      </button>
      <button type="button" className="secondary-button" onClick={() => void copyLink()} aria-live="polite">
        <SfcIcon name="link" size={16} /> {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
