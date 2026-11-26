'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { industryCategories, supplyChainRoles } from '@telpen/domain';

import { publicApiBaseUrl } from '../lib/public-api';
import { codeLabel } from '../lib/labels';
import { saveSession } from '../lib/use-session';

type Session = { token?: string; tenantId: string; role: string; mfaVerified: boolean };
type SignedIn = { status: 'SIGNED_IN'; session: Session; pinSet: boolean; user?: { displayName?: string } };
type StartResult =
  | { next: 'pin' | 'locked' }
  | { next: 'set'; pinToken: string }
  | { next: 'register'; registrationToken: string };
type DeviceStatus =
  | { trusted: false }
  | { trusted: true; pinSet: boolean; pinLocked: boolean; phoneHint?: string; displayName?: string };

type Step = 'loading' | 'pin' | 'phone' | 'locked' | 'register' | 'set-pin';

const base = publicApiBaseUrl.replace(/\/$/, '');

class PhoneApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Calls /auth/phone/*. credentials: 'include' so the httpOnly trusted-device cookie travels. */
async function phoneApi<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/auth/phone${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PhoneApiError('No connection. Check your data or Wi-Fi and try again.', 0);
  }
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }
  if (!response.ok) {
    const record = (parsed ?? {}) as { message?: unknown; code?: string };
    const inner = record.message && typeof record.message === 'object' ? (record.message as { message?: string; code?: string }) : undefined;
    const message =
      typeof record.message === 'string'
        ? record.message
        : Array.isArray(record.message)
          ? record.message.join(' ')
          : (inner?.message ?? 'Something went wrong. Try again.');
    throw new PhoneApiError(message, response.status, record.code ?? inner?.code);
  }
  return parsed as T;
}

function finish(result: SignedIn) {
  if (result.session.token) {
    saveSession({ token: result.session.token, tenantId: result.session.tenantId, role: result.session.role });
  }
}

/**
 * Primary sign-in and sign-up without SMS or codes (owner 20/11/26, 26/11/26):
 * phone number, then the person's own 4-digit PIN on any device. A new number
 * registers a business with a PIN; an account with no PIN chooses one here; a
 * forgotten or locked PIN is cleared by support, then a new one is chosen.
 * Email sign-in stays available.
 */
export function PhoneSignIn({
  onUseEmail,
  prefill,
  heading,
  note,
}: {
  onUseEmail: () => void;
  /** Business details already typed (e.g. with an advert): not asked again. */
  prefill?: { tenantDisplayName: string; industryCode: string; primaryRole: string };
  /** Replaces "Sign in or create an account" when this step has a reason. */
  heading?: string;
  /** One line under the heading saying why the account is needed now. */
  note?: string;
}) {
  const [step, setStep] = useState<Step>('loading');
  const [device, setDevice] = useState<DeviceStatus>({ trusted: false });
  const [phone, setPhone] = useState('');
  const [pinToken, setPinToken] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [pendingSession, setPendingSession] = useState<SignedIn | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [business, setBusiness] = useState({
    tenantDisplayName: prefill?.tenantDisplayName ?? '',
    displayName: '',
    industryCode: prefill?.industryCode ?? 'AGRICULTURE',
    primaryRole: prefill?.primaryRole ?? 'SUPPLIER',
    userType: prefill ? 'ADVERTISER' : 'BOTH',
    email: '',
    acceptedTerms: false,
  });

  useEffect(() => {
    let cancelled = false;
    phoneApi<DeviceStatus>('/device')
      .then((status) => {
        if (cancelled) return;
        setDevice(status);
        setStep(status.trusted && status.pinSet && !status.pinLocked ? 'pin' : 'phone');
      })
      .catch(() => {
        if (!cancelled) setStep('phone');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (caught) {
      const failure = caught instanceof PhoneApiError ? caught : new PhoneApiError('Something went wrong. Try again.', 0);
      if (failure.code === 'PIN_LOCKED') {
        setStep('locked');
        setPin('');
      } else if (failure.code === 'RESET_REQUIRED' || failure.code === 'PIN_NOT_SET') {
        setStep('phone');
        setPin('');
      }
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const signedIn = (result: SignedIn) => {
    if (result.pinSet) {
      finish(result);
      return;
    }
    setPendingSession(result);
    setPin('');
    setPinConfirm('');
    setStep('set-pin');
  };

  const start = () =>
    act(async () => {
      const result = await phoneApi<StartResult>('/start', { phone });
      setPin('');
      setPinConfirm('');
      if (result.next === 'register') {
        setRegistrationToken(result.registrationToken);
        setStep('register');
        return;
      }
      if (result.next === 'set') {
        setPinToken(result.pinToken);
        setStep('set-pin');
        return;
      }
      setStep(result.next);
    });

  const register = () =>
    act(async () => {
      const { email, ...rest } = business;
      if (pin !== pinConfirm) throw new PhoneApiError('The two PINs do not match.', 0);
      const result = await phoneApi<SignedIn>('/register', {
        ...rest,
        countryCode: 'KE',
        registrationToken,
        pin,
        tenantDisplayName: rest.tenantDisplayName.trim(),
        displayName: rest.displayName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      signedIn(result);
    });

  const savePin = () =>
    act(async () => {
      if (pin !== pinConfirm) throw new PhoneApiError('The two PINs do not match.', 0);
      if (pinToken) {
        // An account with no PIN yet: choose it now, no code.
        const result = await phoneApi<SignedIn>('/pin/first', { pinToken, pin, deviceLabel: 'Phone sign-in' });
        setPinToken('');
        finish(result);
        return;
      }
      if (!pendingSession?.session.token) throw new PhoneApiError('Sign in again.', 0);
      await phoneApi('/pin', { sessionToken: pendingSession.session.token, pin });
      finish(pendingSession);
    });

  const pinSignIn = () =>
    act(async () => {
      const result = await phoneApi<SignedIn>('/pin/sign-in', phone.trim() ? { pin, phone, deviceLabel: 'Phone sign-in' } : { pin });
      finish(result);
    });

  const forgetDevice = () =>
    act(async () => {
      await phoneApi('/device/forget', {});
      setDevice({ trusted: false });
      setStep('phone');
    });

  if (step === 'loading') {
    return <p className="form-note">Loading…</p>;
  }

  return (
    <div className="phone-sign-in">
      {step === 'pin' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void pinSignIn();
          }}
        >
          <div className="panel-heading tight">
            <h2>Welcome back{device.trusted && device.displayName && !phone.trim() ? `, ${device.displayName}` : ''}</h2>
          </div>
          <p className="form-note">
            Enter your 4-digit PIN for {phone.trim() || (device.trusted ? device.phoneHint : undefined) || 'this phone'}.
          </p>
          <label className="field compact-field">
            <span>PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <div className="terms-actions">
            <button className="primary-button" type="submit" disabled={busy || pin.length !== 4}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
          <p className="form-note">
            <button className="text-link" type="button" onClick={() => setStep('locked')}>
              Forgot PIN?
            </button>{' '}
            ·{' '}
            <button className="text-link" type="button" onClick={() => void forgetDevice()}>
              Not you? Use another number
            </button>
          </p>
        </form>
      ) : null}

      {step === 'phone' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void start();
          }}
        >
          <div className="panel-heading tight">
            <h2>{heading ?? 'Sign in or create an account'}</h2>
          </div>
          {note ? <p className="form-note">{note}</p> : null}
          {note ? null : <p className="form-note">Use your phone number and your own 4-digit PIN. No email, no SMS.</p>}
          <label className="field compact-field">
            <span>Phone number</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <div className="terms-actions">
            <button className="primary-button" type="submit" disabled={busy || phone.replace(/\D/g, '').length < 9}>
              {busy ? 'Please wait…' : 'Continue'}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'locked' ? (
        <div>
          <div className="panel-heading tight">
            <h2>Forgot your PIN?</h2>
          </div>
          <p className="form-note">
            Email SellFindConnect support at <a href="mailto:telpeninfo@gmail.com?subject=Please%20clear%20my%20PIN">telpeninfo@gmail.com</a>{' '}
            from the number&apos;s owner. After checking it is you, they clear your PIN. Then enter your phone number again and
            choose a new one. No code is sent and you never type one.
          </p>
          <div className="terms-actions">
            <button className="primary-button" type="button" onClick={() => setStep('phone')}>
              Enter my phone number
            </button>
          </div>
        </div>
      ) : null}

      {step === 'register' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void register();
          }}
        >
          <div className="panel-heading tight">
            <h2>Create your business account</h2>
          </div>
          <p className="form-note">
            {prefill
              ? `Last step: your name and a PIN for ${prefill.tenantDisplayName}. Then your advert goes live.`
              : 'Welcome! This number has no account yet. Tell us about your business and choose a PIN.'}
          </p>
          <label className="field compact-field">
            <span>Your name</span>
            <input
              autoComplete="name"
              value={business.displayName}
              onChange={(event) => setBusiness({ ...business, displayName: event.target.value })}
            />
          </label>
          {prefill ? null : (
            <>
          <label className="field compact-field">
            <span>Business name</span>
            <input
              autoComplete="organization"
              value={business.tenantDisplayName}
              onChange={(event) => setBusiness({ ...business, tenantDisplayName: event.target.value })}
            />
          </label>
          <label className="field compact-field">
            <span>Industry</span>
            <select value={business.industryCode} onChange={(event) => setBusiness({ ...business, industryCode: event.target.value })}>
              {industryCategories.map((industry) => (
                <option key={industry.code} value={industry.code}>
                  {industry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field compact-field">
            <span>Your place in the supply chain</span>
            <select value={business.primaryRole} onChange={(event) => setBusiness({ ...business, primaryRole: event.target.value })}>
              {supplyChainRoles.map((role) => (
                <option key={role} value={role}>
                  {codeLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="field compact-field">
            <span>What you want to do</span>
            <select value={business.userType} onChange={(event) => setBusiness({ ...business, userType: event.target.value })}>
              <option value="BOTH">Sell and find</option>
              <option value="ADVERTISER">Sell or advertise</option>
              <option value="BUYER_SEARCHER">Find suppliers or buyers</option>
            </select>
          </label>
            </>
          )}
          <label className="field compact-field">
            <span>Email (optional)</span>
            <input
              type="email"
              autoComplete="email"
              value={business.email}
              onChange={(event) => setBusiness({ ...business, email: event.target.value })}
            />
          </label>
          <label className="field compact-field">
            <span>Choose a 4-digit PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="field compact-field">
            <span>Repeat the PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={pinConfirm}
              onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={business.acceptedTerms}
              onChange={(event) => setBusiness({ ...business, acceptedTerms: event.target.checked })}
            />
            <span>
              I accept the <Link href="/terms">Terms</Link>, <Link href="/subscription">Subscription</Link>,{' '}
              <Link href="/privacy">Privacy</Link>, <Link href="/prohibited">Prohibited content</Link> and{' '}
              <Link href="/community">Community standards</Link> policies.
            </span>
          </label>
          <div className="terms-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={
                busy ||
                !business.acceptedTerms ||
                business.tenantDisplayName.trim().length < 2 ||
                business.displayName.trim().length < 2 ||
                pin.length !== 4 ||
                pinConfirm.length !== 4
              }
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'set-pin' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void savePin();
          }}
        >
          <div className="panel-heading tight">
            <h2>Choose your 4-digit PIN</h2>
          </div>
          <p className="form-note">
            {pinToken ? 'Welcome back. This number has an account but no PIN yet. ' : ''}From now on, sign in on any phone with
            your number and this PIN. If you forget it, support clears it and you choose a new one. No code needed.
          </p>
          <label className="field compact-field">
            <span>New PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="field compact-field">
            <span>Repeat PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={pinConfirm}
              onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <div className="terms-actions">
            <button className="primary-button" type="submit" disabled={busy || pin.length !== 4 || pinConfirm.length !== 4}>
              {busy ? 'Saving…' : 'Save PIN'}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === 'phone' || step === 'pin' ? (
        <p className="form-note">
          <button className="text-link" type="button" onClick={onUseEmail}>
            SellFindConnect staff? Sign in with email
          </button>
        </p>
      ) : null}
    </div>
  );
}
