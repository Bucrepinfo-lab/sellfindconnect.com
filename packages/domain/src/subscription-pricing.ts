/**
 * SellFindConnect subscription prices (owner decision 18/11/26).
 *
 * - Basic: KES 499 a month, or KES 4,990 a year paid ahead.
 * - Pro (more media, Source Finder priority, RFQs): KES 1,499 a month, or
 *   KES 14,990 a year. A year ahead = 10 months' price.
 * - The first month is free (calculateTrialSubscription).
 * - Prices include tax (the Kenya tax profile treats the fee as tax-inclusive).
 * - Founding price lock: a tenant that starts in the first 12 months after
 *   launch keeps the founding price for as long as it stays subscribed
 *   (CANCELED ends it). Later prices reach only tenants that start after the
 *   founding window, through SFC_PRICES.
 * - Kenya is approved; other countries are INDICATIVE until the owner approves.
 *
 * Nothing here moves money: it only says what a tenant would be asked to pay.
 * Paid use still needs an APPROVED tax profile (finance-tax-reference).
 */

import type { TenantSubscriptionStatus } from './auth-tenancy';

/** A year paid ahead costs this many months' price. */
export const YEAR_PLAN_MONTHS_PAID = 10;
/** Tenants that start within this many months after launch keep the founding price. */
export const FOUNDING_MONTHS = 12;

export type SubscriptionPlan = 'BASIC' | 'PRO';
export type BillingPeriod = 'MONTH' | 'YEAR';

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, { name: string; summary: string }> = {
  BASIC: { name: 'Basic', summary: 'Profile, listings with media, Source Finder, in-app chat.' },
  PRO: { name: 'Pro', summary: 'More media per listing, Source Finder priority, RFQs.' },
};

export type PlanPriceList = {
  country: string;
  currencyCode: string;
  /** Monthly prices in currency units, tax included. */
  basic: number;
  pro: number;
  approved: boolean;
};

const row = (country: string, currencyCode: string, basic: number, pro: number, approved = false): PlanPriceList => ({
  country,
  currencyCode,
  basic,
  pro,
  approved,
});

/** The founding price list. Changing a founding price breaks the lock: don't. */
export const FOUNDING_SUBSCRIPTION_PRICES: Record<string, PlanPriceList> = {
  KE: row('KE', 'KES', 499, 1499, true),
  UG: row('UG', 'UGX', 14000, 42000),
  TZ: row('TZ', 'TZS', 10000, 30000),
  RW: row('RW', 'RWF', 5000, 15000),
  NG: row('NG', 'NGN', 6000, 18000),
  GH: row('GH', 'GHS', 50, 150),
  ZA: row('ZA', 'ZAR', 70, 210),
  US: row('US', 'USD', 3.99, 11.99),
};

/** End of the founding window (SFC_FOUNDING_UNTIL, an ISO date). Unset = still open. */
export function foundingUntil(env: Record<string, string | undefined> = {}): Date | null {
  const raw = env.SFC_FOUNDING_UNTIL?.trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

export function isFoundingSubscriber(startedAt: Date | null | undefined, env: Record<string, string | undefined> = {}): boolean {
  const until = foundingUntil(env);
  if (!until) return true;
  return !!startedAt && startedAt.getTime() < until.getTime();
}

/**
 * Later prices for tenants that start after the founding window:
 * SFC_PRICES="KE:599/1799" (basic/pro, currency units). Bad entries are ignored.
 */
export function parsePriceOverrides(raw: string | undefined): Record<string, { basic: number; pro: number }> {
  const out: Record<string, { basic: number; pro: number }> = {};
  for (const part of (raw ?? '').split(',')) {
    const m = part.trim().match(/^([A-Z]{2}):(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    const [, code, a, b] = m ?? [];
    if (!code || !a || !b) continue;
    const basic = Number(a);
    const pro = Number(b);
    if (basic > 0 && pro > 0) out[code] = { basic, pro };
  }
  return out;
}

export type PlanQuote = {
  country: string;
  currencyCode: string;
  plan: SubscriptionPlan;
  period: BillingPeriod;
  /** Monthly price, tax included. */
  monthlyAmount: number;
  /** Price of the chosen period (a month, or a year = 10 months). */
  amount: number;
  /** True when the founding price lock applies. */
  locked: boolean;
  approved: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The price a tenant pays. `startedAt` + `status` describe its subscription
 * (none yet = a new tenant, which gets the founding price while the window is
 * open). Returns null for a country with no price row: no price, no charge.
 */
export function quoteSubscription(input: {
  countryCode: string;
  plan?: SubscriptionPlan;
  period?: BillingPeriod;
  startedAt?: Date | null;
  status?: TenantSubscriptionStatus | string | null;
  now?: Date;
  env?: Record<string, string | undefined>;
}): PlanQuote | null {
  const code = input.countryCode.toUpperCase();
  const founding = FOUNDING_SUBSCRIPTION_PRICES[code];
  if (!founding) return null;
  const env = input.env ?? {};
  const plan = input.plan ?? 'BASIC';
  const period = input.period ?? 'MONTH';

  const holds = input.startedAt != null && input.status !== 'CANCELED';
  const isFounding = holds ? isFoundingSubscriber(input.startedAt, env) : isFoundingSubscriber(input.now ?? new Date(), env);
  const override = isFounding ? undefined : parsePriceOverrides(env.SFC_PRICES)[code];
  const list = override ? { ...founding, ...override } : founding;

  const monthlyAmount = plan === 'PRO' ? list.pro : list.basic;
  return {
    country: code,
    currencyCode: founding.currencyCode,
    plan,
    period,
    monthlyAmount,
    amount: round2(period === 'YEAR' ? monthlyAmount * YEAR_PLAN_MONTHS_PAID : monthlyAmount),
    locked: isFounding,
    approved: founding.approved,
  };
}

/** "KES 4,990", "USD 3.99". */
export function formatPlanPrice(amount: number, currencyCode: string): string {
  const whole = Number.isInteger(amount);
  return `${currencyCode} ${amount.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
}
