/**
 * SellFindConnect subscription prices (owner decision 18/11/26).
 *
 * - Basic: KES 499 a month, or KES 4,990 a year paid ahead.
 * - Pro: KES 1,499 a month, or KES 14,990 a year. A year ahead = 10 months' price.
 * - What each plan unlocks (owner asked Claude to decide, 19/11/26):
 *   - Media per listing: Basic 10 (what every tenant has today, so nobody
 *     loses anything), Pro 20.
 *   - RFQs: on every plan. Buyers send RFQs free and every advertiser can
 *     receive and answer them. Charging buyers, or hiding RFQs from Basic
 *     sellers, would leave buyers unanswered and break the match → chat/RFQ
 *     loop the product sells (B2B norm: Alibaba buyers post RFQs free; sellers
 *     pay for reach, not for the right to answer).
 *   - Source Finder priority: Pro only. Not yet applied to ranking: the
 *     matcher's reason codes must stay honest, so it needs its own change.
 * - The first month is free (calculateTrialSubscription).
 * - Prices include tax (the Kenya tax profile treats the fee as tax-inclusive).
 * - Founding price lock: a tenant that starts in the first 12 months after
 *   launch keeps the founding price for as long as it stays subscribed
 *   (CANCELED ends it). Later prices reach only tenants that start after the
 *   founding window, through SFC_PRICES.
 * - Approved by the owner: Kenya (18/11/26); Uganda, Tanzania, Rwanda, Nigeria,
 *   Ghana and South Africa (20/11/26, "approve all prices"). A country with no
 *   row, or a row left unapproved (the USD row), has no local price.
 *
 * Nothing here moves money: it only says what a tenant would be asked to pay.
 * Paid use still needs an APPROVED tax profile (finance-tax-reference).
 */

import type { TenantSubscriptionStatus } from './auth-tenancy';
import { mediaPolicy } from './media';

/** A year paid ahead costs this many months' price. */
export const YEAR_PLAN_MONTHS_PAID = 10;
/** Tenants that start within this many months after launch keep the founding price. */
export const FOUNDING_MONTHS = 12;

export type SubscriptionPlan = 'BASIC' | 'PRO';
export type BillingPeriod = 'MONTH' | 'YEAR';

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, { name: string; summary: string }> = {
  BASIC: {
    name: 'Basic',
    summary: 'Profile, listings with up to 10 photos or videos each, Source Finder, in-app chat and RFQs.',
  },
  PRO: {
    name: 'Pro',
    summary: 'Everything in Basic, up to 20 photos or videos per listing, and Source Finder priority.',
  },
};

export type PlanEntitlements = {
  /** Photos/videos one listing (profile or advert) can show. */
  maxMediaPerListing: number;
  /** Placed ahead of equal matches in the Source Finder (not applied yet). */
  sourceFinderPriority: boolean;
  /** Receive and answer RFQs. On every plan: buyers are never blocked. */
  rfqs: true;
};

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, PlanEntitlements> = {
  BASIC: { maxMediaPerListing: mediaPolicy.maxItemsPerOwner, sourceFinderPriority: false, rfqs: true },
  PRO: { maxMediaPerListing: mediaPolicy.maxItemsPerOwnerTopPlan, sourceFinderPriority: true, rfqs: true },
};

/** A stored plan value, or BASIC for anything missing or unknown (fail closed to the lower plan). */
export function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  return plan?.trim().toUpperCase() === 'PRO' ? 'PRO' : 'BASIC';
}

export function planEntitlements(plan: string | null | undefined): PlanEntitlements {
  return PLAN_ENTITLEMENTS[normalizePlan(plan)];
}

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
  UG: row('UG', 'UGX', 14000, 42000, true),
  TZ: row('TZ', 'TZS', 10000, 30000, true),
  RW: row('RW', 'RWF', 5000, 15000, true),
  NG: row('NG', 'NGN', 6000, 18000, true),
  GH: row('GH', 'GHS', 50, 150, true),
  ZA: row('ZA', 'ZAR', 70, 210, true),
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
