import { createHmac, timingSafeEqual } from 'node:crypto';

import type { BillingPeriod, SubscriptionPlan } from './subscription-pricing';

/**
 * Paddle card checkout for the Basic/Pro subscription (owner decision
 * 19/11/26). Paddle is the merchant of record for card sales: it charges,
 * collects and remits the tax. M-Pesa stays a direct sale (see
 * tax-operating-model). Off unless PADDLE_ENABLED=true and every key is set;
 * keys live in Fly secrets, never in code. The buyer pays at Paddle's own
 * checkout: this app never starts a card charge.
 */
export type PaddleEnv = Record<string, string | undefined>;

export type PaddlePriceIds = Record<SubscriptionPlan, Record<BillingPeriod, string>>;

export type PaddleConfig = {
  environment: 'sandbox' | 'production';
  /** Public client-side token (Paddle.js). */
  clientToken: string;
  priceIds: PaddlePriceIds;
  webhookSecret: string;
};

/** The public part of the config, safe to send to the browser. */
export type PaddlePublicConfig = {
  environment: PaddleConfig['environment'];
  clientToken: string;
  priceIds: PaddlePriceIds;
};

export function paddleConfig(env: PaddleEnv = {}): PaddleConfig | null {
  if ((env.PADDLE_ENABLED ?? '').trim().toLowerCase() !== 'true') return null;
  const read = (key: string) => (env[key] ?? '').trim();
  const clientToken = read('PADDLE_CLIENT_TOKEN');
  const webhookSecret = read('PADDLE_WEBHOOK_SECRET');
  const priceIds: PaddlePriceIds = {
    BASIC: { MONTH: read('PADDLE_PRICE_BASIC_MONTH'), YEAR: read('PADDLE_PRICE_BASIC_YEAR') },
    PRO: { MONTH: read('PADDLE_PRICE_PRO_MONTH'), YEAR: read('PADDLE_PRICE_PRO_YEAR') },
  };
  const allPrices = [priceIds.BASIC.MONTH, priceIds.BASIC.YEAR, priceIds.PRO.MONTH, priceIds.PRO.YEAR];
  if (!clientToken || !webhookSecret || allPrices.some((id) => !id)) return null;
  const environment = read('PADDLE_ENV').toLowerCase() === 'production' ? 'production' : 'sandbox';
  return { environment, clientToken, priceIds, webhookSecret };
}

export function paddlePublicConfig(config: PaddleConfig | null): PaddlePublicConfig | null {
  return config ? { environment: config.environment, clientToken: config.clientToken, priceIds: config.priceIds } : null;
}

/**
 * Check a Paddle-Signature header ("ts=<unix>;h1=<hex>[;h1=<hex>]"): HMAC-SHA256
 * of "<ts>:<raw body>" with the notification secret, within 5 minutes.
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowMs: number = Date.now(),
  toleranceSec = 300,
): boolean {
  if (!header || !secret) return false;
  let ts = '';
  const sigs: string[] = [];
  for (const part of header.split(';')) {
    const [key, value] = part.split('=', 2).map((piece) => piece?.trim() ?? '');
    if (key === 'ts') ts = value ?? '';
    else if (key === 'h1' && value) sigs.push(value);
  }
  const tsNum = Number(ts);
  if (!ts || !Number.isFinite(tsNum) || sigs.length === 0) return false;
  if (Math.abs(nowMs / 1000 - tsNum) > toleranceSec) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex'), 'hex');
  return sigs.some((sig) => {
    const got = Buffer.from(sig, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export type PaddlePaidPlan = {
  transactionId: string;
  tenantId: string;
  plan: SubscriptionPlan;
  period: BillingPeriod;
  /** Grand total in currency units (Paddle sends minor units), or null. */
  amount: number | null;
  currency: string | null;
};

/**
 * A paid plan from a Paddle notification: only a completed transaction for
 * one of our four prices, carrying our tenantId. The plan comes from the
 * price id (which we configured), never from free-form custom data.
 */
export function paidPlanFromPaddleEvent(event: unknown, priceIds: PaddlePriceIds): PaddlePaidPlan | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as { event_type?: unknown; data?: Record<string, unknown> };
  if (e.event_type !== 'transaction.completed' || !e.data) return null;
  const d = e.data as {
    id?: unknown;
    status?: unknown;
    custom_data?: { tenantId?: unknown } | null;
    items?: Array<{ price?: { id?: unknown } | null; price_id?: unknown } | null>;
    currency_code?: unknown;
    details?: { totals?: { grand_total?: unknown } | null } | null;
  };
  if (typeof d.id !== 'string' || !d.id) return null;
  if (d.status !== 'completed' && d.status !== 'paid') return null;
  const tenantId = d.custom_data?.tenantId;
  if (typeof tenantId !== 'string' || !tenantId) return null;

  const byPrice = new Map<string, { plan: SubscriptionPlan; period: BillingPeriod }>();
  for (const plan of ['BASIC', 'PRO'] as const) {
    for (const period of ['MONTH', 'YEAR'] as const) {
      byPrice.set(priceIds[plan][period], { plan, period });
    }
  }
  const match = (d.items ?? [])
    .map((item) =>
      typeof item?.price?.id === 'string' ? item.price.id : typeof item?.price_id === 'string' ? item.price_id : '',
    )
    .map((id) => byPrice.get(id))
    .find((found) => found !== undefined);
  if (!match) return null;

  const total = d.details?.totals?.grand_total;
  const minor = typeof total === 'string' || typeof total === 'number' ? Number(total) : Number.NaN;
  return {
    transactionId: d.id,
    tenantId,
    plan: match.plan,
    period: match.period,
    amount: Number.isFinite(minor) ? minor / 100 : null,
    currency: typeof d.currency_code === 'string' ? d.currency_code : null,
  };
}
