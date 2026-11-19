'use client';

import { useEffect, useState } from 'react';

import { formatPlanPrice } from '@telpen/domain';

import { apiRequest } from '../lib/api-client';

type PlanOption = {
  plan: 'BASIC' | 'PRO';
  name: string;
  summary: string;
  maxMediaPerListing: number;
  monthly: number;
  yearly: number;
  locked: boolean;
};

type PlanOptions = {
  currentPlan: 'BASIC' | 'PRO';
  currencyCode: string | null;
  payable: boolean;
  plans: PlanOption[];
};

type CheckoutResult =
  | { ok: true; txnId: string }
  | { ok: false; reason: 'no_phone' | 'invalid_amount' | 'no_price' | 'provider_error' | 'tax_profile' | 'terms' };

const reasonText: Record<Exclude<CheckoutResult, { ok: true }>['reason'], string> = {
  tax_profile: 'Paid plans are not open yet. Your account keeps working as it is until they open.',
  terms: 'Accept the current terms first, then choose your plan again.',
  no_phone: 'Sign in with your M-Pesa phone number first. M-Pesa asks that phone to pay.',
  no_price: 'Plans are not available in your country yet.',
  invalid_amount: 'That price could not be charged. Try again later.',
  provider_error: 'M-Pesa did not take the request. Try again in a minute.',
};

/**
 * Basic or Pro, paid by M-Pesa on the signed-in phone. The server sets the
 * price and changes the plan only after M-Pesa confirms the payment.
 */
export function PlanCard() {
  const [options, setOptions] = useState<PlanOptions | null>(null);
  const [period, setPeriod] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<PlanOptions>('/payments/subscription-options')
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!options?.payable || !options.currencyCode) return null;
  const currency = options.currencyCode;

  const choose = async (option: PlanOption) => {
    setBusy(option.plan);
    setNote(null);
    try {
      const result = await apiRequest<CheckoutResult>('/payments/checkout', {
        method: 'POST',
        body: { plan: option.plan, period },
      });
      const price = formatPlanPrice(period === 'YEAR' ? option.yearly : option.monthly, currency);
      setNote(
        result.ok
          ? {
              tone: 'ok',
              text: `Check your phone: M-Pesa is asking you to pay ${price} for ${option.name}. Your plan changes as soon as the payment goes through.`,
            }
          : { tone: 'error', text: reasonText[result.reason] },
      );
    } catch (error) {
      setNote({ tone: 'error', text: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
    } finally {
      setBusy('');
    }
  };

  const current = options.plans.find((option) => option.plan === options.currentPlan);

  return (
    <div className="biz-card" id="plan">
      <h2>Your plan</h2>
      <p className="biz-sub">
        You are on {current?.name ?? 'Basic'}. The first month is free. A year paid ahead costs 10 months.
      </p>
      <div className="biz-actions" role="radiogroup" aria-label="Pay for">
        <button
          className={period === 'MONTH' ? 'primary-button' : 'secondary-button'}
          type="button"
          role="radio"
          aria-checked={period === 'MONTH'}
          onClick={() => setPeriod('MONTH')}
        >
          Monthly
        </button>
        <button
          className={period === 'YEAR' ? 'primary-button' : 'secondary-button'}
          type="button"
          role="radio"
          aria-checked={period === 'YEAR'}
          onClick={() => setPeriod('YEAR')}
        >
          Yearly
        </button>
      </div>
      <ul className="biz-plans">
        {options.plans.map((option) => {
          const price = period === 'YEAR' ? option.yearly : option.monthly;
          const isCurrent = option.plan === options.currentPlan;
          return (
            <li key={option.plan} className="biz-plan">
              <h3>
                {option.name} · {formatPlanPrice(price, currency)} {period === 'YEAR' ? 'a year' : 'a month'}
              </h3>
              <p className="biz-sub">{option.summary}</p>
              {option.locked ? <p className="biz-sub">Founding price: kept for as long as you stay subscribed.</p> : null}
              <button
                className={option.plan === 'PRO' ? 'primary-button' : 'secondary-button'}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void choose(option)}
              >
                {busy === option.plan ? 'Asking M-Pesa…' : isCurrent ? `Pay for ${option.name}` : `Switch to ${option.name}`}
              </button>
            </li>
          );
        })}
      </ul>
      {note ? (
        <div className={`biz-note ${note.tone === 'ok' ? '' : note.tone}`} role={note.tone === 'error' ? 'alert' : 'status'}>
          {note.text}
        </div>
      ) : null}
    </div>
  );
}
