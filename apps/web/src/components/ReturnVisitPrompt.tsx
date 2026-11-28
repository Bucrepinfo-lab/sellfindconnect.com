'use client';

import { ArrowRight, KeyRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SESSION_TOKEN_STORAGE_KEY } from '../lib/public-api';
import { shouldInviteLogin } from '../lib/return-visit';

/**
 * Owner 27/11/26: the first visit stays open (look around, onboarding cards,
 * public pages). From the second visit, if the person still has no login, a
 * friendly card invites them to create it — so nobody who does not know how
 * is left out. "Not now" hides it for this visit only.
 */
const VISITS_KEY = 'sfc.visits';
const COUNTED_KEY = 'sfc.visit.counted';
const DISMISSED_KEY = 'sfc.loginPrompt.dismissed';

function read(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function write(store: Storage | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    /* private mode: no prompt is fine */
  }
}

export function ReturnVisitPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const local = typeof window === 'undefined' ? undefined : window.localStorage;
    const session = typeof window === 'undefined' ? undefined : window.sessionStorage;
    let visits = Number(read(local, VISITS_KEY) ?? '0') || 0;
    if (!read(session, COUNTED_KEY)) {
      visits += 1;
      write(local, VISITS_KEY, String(visits));
      write(session, COUNTED_KEY, '1');
    }
    const decide = () =>
      setShow(
        shouldInviteLogin({
          visits,
          signedIn: Boolean(read(local, SESSION_TOKEN_STORAGE_KEY)),
          dismissedThisVisit: Boolean(read(session, DISMISSED_KEY)),
          onSignInForm: window.location.hash === '#sign-in',
        }),
      );
    // Read the browser only after the first paint (no mismatch with the server).
    const frame = window.requestAnimationFrame(decide);
    window.addEventListener('hashchange', decide);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', decide);
    };
  }, []);

  if (!show) return null;
  return (
    <aside className="return-login" aria-label="Create your login">
      <span className="return-login__icon" aria-hidden>
        <KeyRound size={20} />
      </span>
      <div className="return-login__text">
        <strong>Welcome back! Create your login</strong>
        <span>Just your phone number and a 4-digit PIN. No SMS.</span>
      </div>
      <a className="return-login__go" href="/dashboard#sign-in" onClick={() => setShow(false)}>
        Tap here to create my login
        <ArrowRight size={18} aria-hidden />
      </a>
      <button
        type="button"
        className="return-login__close"
        aria-label="Not now"
        onClick={() => {
          write(window.sessionStorage, DISMISSED_KEY, '1');
          setShow(false);
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </aside>
  );
}
