import { describe, expect, it } from 'vitest';

import {
  ANDROID_APP_CLIENT_CONTEXT,
  hasAndroidAppStartFlag,
  isAndroidAppClientHeader,
  isAndroidAppContext,
  isAndroidAppReferrer,
  isPaymentMethodAllowedInAndroidApp,
} from './android-app-context';

const androidChrome =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const desktopChrome =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

describe('android app context', () => {
  it('detects the TWA launch referrer for our package only', () => {
    expect(isAndroidAppReferrer('android-app://com.sellfindconnect.app/')).toBe(true);
    expect(isAndroidAppReferrer('ANDROID-APP://com.sellfindconnect.app')).toBe(true);
    expect(isAndroidAppReferrer('android-app://com.other.app/')).toBe(false);
    expect(isAndroidAppReferrer('https://www.google.com/')).toBe(false);
    expect(isAndroidAppReferrer('')).toBe(false);
    expect(isAndroidAppReferrer(undefined)).toBe(false);
  });

  it('detects the ?source=twa start flag', () => {
    expect(hasAndroidAppStartFlag('?source=twa')).toBe(true);
    expect(hasAndroidAppStartFlag('utm_campaign=x&source=TWA')).toBe(true);
    expect(hasAndroidAppStartFlag('?source=web')).toBe(false);
    expect(hasAndroidAppStartFlag('')).toBe(false);
  });

  it('treats any strong signal or the persisted tab flag as the app', () => {
    expect(isAndroidAppContext({ referrer: 'android-app://com.sellfindconnect.app' })).toBe(true);
    expect(isAndroidAppContext({ search: '?source=twa' })).toBe(true);
    expect(isAndroidAppContext({ storedFlag: ANDROID_APP_CLIENT_CONTEXT })).toBe(true);
  });

  it('fails safe on Android standalone, but keeps desktop and browser web users on checkout', () => {
    expect(isAndroidAppContext({ displayModeStandalone: true, userAgent: androidChrome })).toBe(true);
    expect(isAndroidAppContext({ displayModeStandalone: true, userAgent: desktopChrome })).toBe(false);
    expect(isAndroidAppContext({ displayModeStandalone: false, userAgent: androidChrome })).toBe(false);
    expect(
      isAndroidAppContext({ referrer: 'https://sellfindconnect.com/', search: '?q=maize', storedFlag: null }),
    ).toBe(false);
    expect(isAndroidAppContext({})).toBe(false);
  });

  it('reads the API client header', () => {
    expect(isAndroidAppClientHeader('android-twa')).toBe(true);
    expect(isAndroidAppClientHeader(' Android-TWA ')).toBe(true);
    expect(isAndroidAppClientHeader(['web', 'android-twa'])).toBe(true);
    expect(isAndroidAppClientHeader('web')).toBe(false);
    expect(isAndroidAppClientHeader(undefined)).toBe(false);
  });

  it('allows only Play Billing (WALLET) payments inside the app', () => {
    expect(isPaymentMethodAllowedInAndroidApp('WALLET')).toBe(true);
    expect(isPaymentMethodAllowedInAndroidApp('CARD')).toBe(false);
    expect(isPaymentMethodAllowedInAndroidApp('MOBILE_MONEY')).toBe(false);
    expect(isPaymentMethodAllowedInAndroidApp('BANK_TRANSFER')).toBe(false);
  });
});
