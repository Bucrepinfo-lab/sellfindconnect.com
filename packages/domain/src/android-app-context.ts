/**
 * Android app (Trusted Web Activity) context.
 *
 * The Google Play build (package `com.sellfindconnect.app`) wraps the PWA in a
 * TWA. Google Play's payments policy requires Play Billing for digital goods
 * sold inside a Play-distributed app, so every subscription / checkout entry
 * point is hidden inside the app and the API refuses non-Play checkout calls
 * that identify as coming from it. Web and browser-installed PWA users keep
 * the normal checkout.
 *
 * Detection signals, strongest first:
 *  1. `document.referrer` starts with `android-app://com.sellfindconnect.app`
 *     (Chrome sets this on the TWA launch navigation).
 *  2. The launch URL carries `?source=twa` (set as the TWA start URL in the
 *     next Android build).
 *  3. A flag persisted in sessionStorage by an earlier page of the same TWA
 *     tab. sessionStorage is per tab, so the flag never leaks into the user's
 *     normal Chrome tabs (a cookie or localStorage would: a TWA shares Chrome's
 *     cookie jar and storage).
 *  4. Hint: Android + `display-mode: standalone`. This also matches a PWA
 *     installed from Chrome on Android; we accept that trade-off and fail safe
 *     (those users can still pay in the browser) rather than risk a checkout
 *     appearing in the Play app if the referrer is lost (e.g. WebView fallback).
 */

export const ANDROID_APP_PACKAGE = 'com.sellfindconnect.app';
export const ANDROID_APP_REFERRER_PREFIX = `android-app://${ANDROID_APP_PACKAGE}`;
export const ANDROID_APP_START_PARAM = 'source';
export const ANDROID_APP_START_VALUE = 'twa';
export const ANDROID_APP_SESSION_KEY = 'sfc.appContext';
/** Request header the web app sends on API calls made from inside the Android app. */
export const CLIENT_CONTEXT_HEADER = 'x-sfc-client';
export const ANDROID_APP_CLIENT_CONTEXT = 'android-twa';

export type AppContextSignals = {
  referrer?: string | null;
  search?: string | null;
  storedFlag?: string | null;
  displayModeStandalone?: boolean;
  userAgent?: string | null;
};

export function isAndroidAppReferrer(referrer: string | null | undefined): boolean {
  return (referrer ?? '').trim().toLowerCase().startsWith(ANDROID_APP_REFERRER_PREFIX);
}

export function hasAndroidAppStartFlag(search: string | null | undefined): boolean {
  if (!search) return false;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return params.get(ANDROID_APP_START_PARAM)?.toLowerCase() === ANDROID_APP_START_VALUE;
  } catch {
    return false;
  }
}

export function isAndroidAppContext(signals: AppContextSignals): boolean {
  if (isAndroidAppReferrer(signals.referrer)) return true;
  if (hasAndroidAppStartFlag(signals.search)) return true;
  if (signals.storedFlag === ANDROID_APP_CLIENT_CONTEXT) return true;
  if (signals.displayModeStandalone && /android/i.test(signals.userAgent ?? '')) return true;
  return false;
}

/** True when an API request identifies itself as coming from the Android app. */
export function isAndroidAppClientHeader(value: string | string[] | null | undefined): boolean {
  const values = Array.isArray(value) ? value : [value ?? ''];
  return values.some((entry) => entry.trim().toLowerCase() === ANDROID_APP_CLIENT_CONTEXT);
}

/**
 * Payment methods the Android app may use. Only Play Billing (WALLET purchase
 * tokens verified by the Play adapter) is allowed for digital goods there.
 */
export function isPaymentMethodAllowedInAndroidApp(method: string): boolean {
  return method === 'WALLET';
}
