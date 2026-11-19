'use client';

import { useEffect, useState } from 'react';

import { formatPlanPrice } from '@telpen/domain';

import { apiRequest } from '../lib/api-client';

type PlanOption = {
  plan: 'BASIC' | 'PRO';
  name: string;
  summary: string;
  maxMediaPerListing: number;
  /** M-Pesa price; null when the plan is paid by card (the price shows at Paddle's checkout). */
  monthly: number | null;
  yearly: number | null;
  locked: boolean;
};

type CardCheckout = {
  environment: 'sandbox' | 'production';
  clientToken: string;
  priceIds: Record<'BASIC' | 'PRO', Record<'MONTH' | 'YEAR', string>>;
  customData: { tenantId: string };
};

type PlanOptions = {
  currentPlan: 'BASIC' | 'PRO';
  currencyCode: string | null;
  rail: 'PADDLE' | 'MPESA' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'NONE';
  rails: Array<'PADDLE' | 'MPESA' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>;
  localMethod: string | null;
  payable: boolean;
  plans: PlanOption[];
  card: CardCheckout | null;
};

type PaddleJs = {
  Environment: { set: (environment: string) => void };
  Initialize: (options: { token: string }) => void;
  Checkout: { open: (options: { items: { priceId: string; quantity: number }[]; customData: Record<string, string> }) => void };
};

let paddleReady: Promise<PaddleJs> | null = null;

/** Loads Paddle.js once; card details are typed into Paddle's checkout, never into SellFindConnect. */
function loadPaddle(card: CardCheckout): Promise<PaddleJs> {
  if (!paddleReady) {
    paddleReady = new Promise<PaddleJs>((resolve, reject) => {
      const done = () => {
        const paddle = (window as unknown as { Paddle?: PaddleJs }).Paddle;
        if (!paddle) return reject(new Error('The card checkout did not load. Try again.'));
        if (card.environment === 'sandbox') paddle.Environment.set('sandbox');
        paddle.Initialize({ token: card.clientToken });
        resolve(paddle);
      };
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = done;
      script.onerror = () => {
        paddleReady = null;
        reject(new Error('The card checkout did not load. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return paddleReady;
}

type CheckoutResult =
  | { ok: true; txnId: string; redirectUrl?: string }
  | { ok: false; reason: 'no_phone' | 'invalid_amount' | 'no_price' | 'use_card' | 'provider_error' | 'tax_profile' | 'terms' };

const reasonText: Record<Exclude<CheckoutResult, { ok: true }>['reason'], string> = {
  tax_profile: 'M-Pesa payments are paused for a tax update. Try again later or pay by card.',
  terms: 'Accept the current terms first, then choose your plan again.',
  no_phone: 'Add and verify your mobile money phone number first. The payment prompt goes to that phone.',
  no_price: 'Plans are not available in your country yet.',
  use_card: 'Plans are paid by card here. Use the card button.',
  invalid_amount: 'That price could not be charged. Try again later.',
  provider_error: 'The payment could not start. Try again in a minute.',
};

/**
 * Basic or Pro. Owner rules 19/11/26: M-Pesa leads in Kenya (the way most
 * people pay), with "pay by card" through Paddle second; elsewhere Paddle,
 * which handles the tax. The server decides the ways and changes the plan only
 * after the payment is confirmed.
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

  if (!options?.payable) return null;
  const currency = options.currencyCode ?? '';
  const card = options.rails.includes('PADDLE') ? options.card : null;
  // The way most people in this country pay leads (owner standing order 19/11/26).
  const mpesa = options.rails.some((rail) => rail !== 'PADDLE');
  const localName = options.localMethod ?? 'M-Pesa';

  const payByCard = async (option: PlanOption) => {
    if (!card) return;
    setBusy(`card-${option.plan}`);
    setNote(null);
    try {
      const paddle = await loadPaddle(card);
      paddle.Checkout.open({
        items: [{ priceId: card.priceIds[option.plan][period], quantity: 1 }],
        customData: card.customData,
      });
      setNote({ tone: 'ok', text: `Your plan changes to ${option.name} as soon as the card payment goes through.` });
    } catch (error) {
      setNote({ tone: 'error', text: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
    } finally {
      setBusy('');
    }
  };

  const choose = async (option: PlanOption) => {
    setBusy(option.plan);
    setNote(null);
    try {
      const result = await apiRequest<CheckoutResult>('/payments/checkout', {
        method: 'POST',
        body: { plan: option.plan, period },
      });
      const amount = period === 'YEAR' ? option.yearly : option.monthly;
      const price = amount === null ? option.name : formatPlanPrice(amount, currency);
      if (result.ok && result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setNote(
        result.ok
          ? {
              tone: 'ok',
              text: `Check your phone: ${localName} is asking you to pay ${price} for ${option.name}. Your plan changes as soon as the payment goes through.`,
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
      {card ? (
        <p className="biz-sub">
          Card payments are processed by Paddle, our online reseller, which handles any tax due where you live. The card price is shown at checkout.
        </p>
      ) : null}
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
          const priceText = price === null ? '' : ` · ${formatPlanPrice(price, currency)} ${period === 'YEAR' ? 'a year' : 'a month'}`;
          const isCurrent = option.plan === options.currentPlan;
          return (
            <li key={option.plan} className="biz-plan">
              <h3>
                {option.name}
                {priceText}
              </h3>
              <p className="biz-sub">{option.summary}</p>
              {option.locked ? <p className="biz-sub">Founding price: kept for as long as you stay subscribed.</p> : null}
              {mpesa ? (
                <button
                  className={option.plan === 'PRO' ? 'primary-button' : 'secondary-button'}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void choose(option)}
                >
                  {busy === option.plan
                    ? 'Starting payment…'
                    : isCurrent
                      ? `Pay for ${option.name} by ${localName}`
                      : `Switch to ${option.name} by ${localName}`}
                </button>
              ) : null}
              {card ? (
                <button
                  className={!mpesa && option.plan === 'PRO' ? 'primary-button' : 'secondary-button'}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void payByCard(option)}
                >
                  {busy === `card-${option.plan}` ? 'Opening card checkout…' : isCurrent ? `Pay for ${option.name} by card` : `Switch to ${option.name} by card`}
                </button>
              ) : null}
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
