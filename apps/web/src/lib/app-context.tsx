'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

import {
  ANDROID_APP_CLIENT_CONTEXT,
  ANDROID_APP_SESSION_KEY,
  isAndroidAppContext,
} from '@telpen/domain';

/**
 * 'unknown' during server render and hydration, then 'app' inside the Google
 * Play (TWA) build or 'web' everywhere else. See packages/domain/src/android-app-context.ts.
 */
export type ClientAppContext = 'unknown' | 'app' | 'web';

function readStoredFlag(): string | null {
  try {
    return window.sessionStorage.getItem(ANDROID_APP_SESSION_KEY);
  } catch {
    return null;
  }
}

/** Resolves (and remembers for this tab) whether this page runs inside the Android app. */
export function detectAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  let standalone = false;
  try {
    standalone = window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    standalone = false;
  }
  const inApp = isAndroidAppContext({
    referrer: document.referrer,
    search: window.location.search,
    storedFlag: readStoredFlag(),
    displayModeStandalone: standalone,
    userAgent: navigator.userAgent,
  });
  if (inApp) {
    try {
      // sessionStorage is per tab: the TWA flag never reaches the user's normal Chrome tabs.
      window.sessionStorage.setItem(ANDROID_APP_SESSION_KEY, ANDROID_APP_CLIENT_CONTEXT);
    } catch {
      // Storage blocked: the referrer / standalone checks still run on each page.
    }
  }
  return inApp;
}

function subscribe() {
  return () => {};
}

function snapshot(): ClientAppContext {
  return detectAndroidApp() ? 'app' : 'web';
}

function serverSnapshot(): ClientAppContext {
  return 'unknown';
}

export function useClientAppContext(): ClientAppContext {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/**
 * Renders purchase / subscription-price content only once we know we are NOT in
 * the Android app (hidden while unknown, so it never flashes inside the app).
 */
export function WebOnlyCheckout({ children, inApp = null }: { children: ReactNode; inApp?: ReactNode }) {
  const context = useClientAppContext();
  if (context === 'web') return <>{children}</>;
  if (context === 'app') return <>{inApp}</>;
  return null;
}

/** Web-only content: preview panels that are not offered inside the Android app. */
export const WebOnly = WebOnlyCheckout;
