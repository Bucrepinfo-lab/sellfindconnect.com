'use client';

import Link from 'next/link';
import { useState } from 'react';
import { countries, industryCategories, supplyChainRoles } from '@telpen/domain';

type RegisterPayload = {
  session: {
    token?: string;
    tenantId: string;
    role: string;
    mfaRequired: boolean;
    mfaVerified: boolean;
    mfaChallenge?: { developmentCode?: string };
  };
  user?: { email?: string; displayName?: string };
  tenant?: { displayName?: string };
};

const userTypeOptions = [
  { value: 'BOTH', label: 'Sell and find' },
  { value: 'ADVERTISER', label: 'Sell or advertise' },
  { value: 'BUYER_SEARCHER', label: 'Find suppliers or buyers' },
] as const;

function roleLabel(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function readError(response: Response) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    if (parsed.message) return parsed.message;
  } catch {
    // fall through
  }
  return body || 'Account could not be created. Check the details and try again.';
}

export function SignUpForm({
  apiBaseUrl,
  onRegistered,
  onCancel,
}: {
  apiBaseUrl: string;
  onRegistered: (payload: RegisterPayload) => void;
  onCancel: () => void;
}) {
  const [businessName, setBusinessName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('KE');
  const [industryCode, setIndustryCode] = useState(industryCategories[0]?.code ?? 'AGRICULTURE');
  const [primaryRole, setPrimaryRole] = useState<string>('SUPPLIER');
  const [userType, setUserType] = useState<string>('BOTH');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const ready =
    businessName.trim().length >= 2 &&
    displayName.trim().length >= 2 &&
    email.includes('@') &&
    password.length >= 8 &&
    acceptedTerms &&
    !pending;

  const submit = async () => {
    if (!ready) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/auth/register-owner`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          tenantDisplayName: businessName.trim(),
          countryCode,
          industryCode,
          primaryRole,
          userType,
          phone: phone.trim() || undefined,
          acceptedTerms: true,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      setPassword('');
      onRegistered((await response.json()) as RegisterPayload);
    } catch {
      setError('Could not reach SellFindConnect. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="sign-up-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="panel-heading tight">
        <h2>Create your business account</h2>
      </div>
      <p className="form-note">The first month is free. No card needed.</p>
      <label className="field compact-field">
        <span>Business name</span>
        <input
          autoComplete="organization"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
        />
      </label>
      <label className="field compact-field">
        <span>Your name</span>
        <input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label className="field compact-field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="field compact-field">
        <span>Password (at least 8 characters)</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="field compact-field">
        <span>Phone (optional)</span>
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+254 7XX XXX XXX"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <label className="field compact-field">
        <span>Country</span>
        <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field compact-field">
        <span>Industry</span>
        <select value={industryCode} onChange={(event) => setIndustryCode(event.target.value)}>
          {industryCategories.map((industry) => (
            <option key={industry.code} value={industry.code}>
              {industry.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field compact-field">
        <span>Your place in the supply chain</span>
        <select value={primaryRole} onChange={(event) => setPrimaryRole(event.target.value)}>
          {supplyChainRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <label className="field compact-field">
        <span>What you want to do</span>
        <select value={userType} onChange={(event) => setUserType(event.target.value)}>
          {userTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="check-field">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        <span>
          I accept the <Link href="/terms">Terms</Link>, <Link href="/subscription">Subscription</Link>,{' '}
          <Link href="/privacy">Privacy</Link>, <Link href="/prohibited">Prohibited content</Link> and{' '}
          <Link href="/community">Community standards</Link> policies.
        </span>
      </label>
      <div className="terms-actions">
        <button className="primary-button" type="submit" disabled={!ready}>
          {pending ? 'Creating account…' : 'Create account'}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel}>
          I already have an account
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
