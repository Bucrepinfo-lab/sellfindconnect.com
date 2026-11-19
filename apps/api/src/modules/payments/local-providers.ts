import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/**
 * Local ways to pay (owner standing order 19/11/26: the method most people in
 * a country use comes first; the card comes later, through Paddle).
 *
 * - pawaPay: mobile money (MTN MoMo, Airtel Money, Orange Money, M-Pesa
 *   Tanzania and others). The payer gets a prompt on their own phone and
 *   approves it with their PIN. A callback is never trusted on its own: the
 *   deposit is re-read from pawaPay's status API before anything is applied.
 * - Paystack: bank transfer and USSD (Nigeria), instant EFT (South Africa).
 *   The payer finishes on Paystack's own page; the webhook is signed
 *   (HMAC-SHA512 of the raw body) and the transaction is re-verified.
 *
 * Both are direct sales by Telpen Systems Ltd (neither files the tax). Off
 * unless switched on with their keys (Fly secrets, owner only):
 *   PAWAPAY_ENABLED=true + PAWAPAY_API_TOKEN (+ PAWAPAY_ENV=sandbox|production)
 *   PAYSTACK_ENABLED=true + PAYSTACK_SECRET_KEY
 * Nothing here starts a payment without the payer's own approval.
 */
export type Env = Record<string, string | undefined>;
export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;
export type LocalStatus = 'success' | 'failed' | 'pending' | 'unknown';

const on = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'true';

export function pawapayOn(env: Env): boolean {
  return on(env.PAWAPAY_ENABLED) && !!(env.PAWAPAY_API_TOKEN ?? '').trim();
}

export function paystackOn(env: Env): boolean {
  return on(env.PAYSTACK_ENABLED) && !!(env.PAYSTACK_SECRET_KEY ?? '').trim();
}

function pawapayBase(env: Env): string {
  return (env.PAWAPAY_ENV ?? '').trim().toLowerCase() === 'production' ? 'https://api.pawapay.io' : 'https://api.sandbox.pawapay.io';
}

function pawapayHeaders(env: Env): Record<string, string> {
  return { Authorization: `Bearer ${(env.PAWAPAY_API_TOKEN ?? '').trim()}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

export function mapPawapayStatus(s: unknown): LocalStatus {
  const v = String(s ?? '').toUpperCase();
  if (v === 'COMPLETED') return 'success';
  if (v === 'FAILED' || v === 'REJECTED' || v === 'CANCELLED') return 'failed';
  if (['ACCEPTED', 'SUBMITTED', 'PROCESSING', 'IN_RECONCILIATION', 'ENQUEUED'].includes(v)) return 'pending';
  return 'unknown';
}

type Deposit = { depositId?: string; status?: string; amount?: string | number; currency?: string };

function depositFrom(raw: unknown): Deposit | null {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw)) return (raw[0] as Deposit) ?? null;
  const r = raw as { data?: Deposit } & Deposit;
  if (r.data && typeof r.data === 'object') return r.data;
  return typeof r.depositId === 'string' ? r : null;
}

/** The depositId a pawaPay callback names (to be re-read, never trusted). */
export function pawapayCallbackDepositId(rawBody: string): string | null {
  try {
    const d = depositFrom(JSON.parse(rawBody));
    return d && typeof d.depositId === 'string' && d.depositId ? d.depositId : null;
  } catch {
    return null;
  }
}

/** Ask pawaPay to prompt the payer's phone. Returns the depositId to record. */
export async function pawapayDeposit(input: {
  env: Env;
  fetchImpl?: FetchLike;
  amount: number;
  currency: string;
  phone: string;
  message: string;
  reference: string;
  newId?: () => string;
}): Promise<{ ok: true; depositId: string } | { ok: false; reason: 'not_configured' | 'no_wallet' | 'provider_error' }> {
  if (!pawapayOn(input.env)) return { ok: false, reason: 'not_configured' };
  const f = input.fetchImpl ?? (fetch as unknown as FetchLike);
  const phone = input.phone.replace(/\D/g, '');
  let provider: string | null = null;
  try {
    const res = await f(`${pawapayBase(input.env)}/v2/predict-provider`, {
      method: 'POST',
      headers: pawapayHeaders(input.env),
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const raw = (await res.json().catch(() => ({}))) as { provider?: string };
    provider = res.ok && typeof raw.provider === 'string' ? raw.provider : null;
  } catch {
    provider = null;
  }
  if (!provider) return { ok: false, reason: 'no_wallet' };
  const depositId = (input.newId ?? randomUUID)();
  try {
    const res = await f(`${pawapayBase(input.env)}/v2/deposits`, {
      method: 'POST',
      headers: pawapayHeaders(input.env),
      body: JSON.stringify({
        depositId,
        amount: String(input.amount),
        currency: input.currency.toUpperCase(),
        payer: { type: 'MMO', accountDetails: { phoneNumber: phone, provider } },
        clientReferenceId: input.reference.slice(0, 100),
        customerMessage: input.message.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 22).padEnd(4, '.'),
      }),
    });
    const raw = (await res.json().catch(() => ({}))) as { status?: string; depositId?: string };
    if (!res.ok || (raw.status !== 'ACCEPTED' && raw.status !== 'DUPLICATE_IGNORED')) return { ok: false, reason: 'provider_error' };
    return { ok: true, depositId: raw.depositId ?? depositId };
  } catch {
    return { ok: false, reason: 'provider_error' };
  }
}

/** Re-read a deposit from pawaPay (the only answer trusted). */
export async function pawapayCheck(input: { env: Env; fetchImpl?: FetchLike; depositId: string }): Promise<{
  status: LocalStatus;
  amount: number | null;
  currency: string | null;
}> {
  if (!pawapayOn(input.env)) return { status: 'unknown', amount: null, currency: null };
  const f = input.fetchImpl ?? (fetch as unknown as FetchLike);
  try {
    const res = await f(`${pawapayBase(input.env)}/v2/deposits/${encodeURIComponent(input.depositId)}`, { headers: pawapayHeaders(input.env) });
    const d = res.ok ? depositFrom(await res.json().catch(() => null)) : null;
    if (!d) return { status: 'unknown', amount: null, currency: null };
    const amount = d.amount != null && Number.isFinite(Number(d.amount)) ? Number(d.amount) : null;
    return { status: mapPawapayStatus(d.status), amount, currency: d.currency ?? null };
  } catch {
    return { status: 'unknown', amount: null, currency: null };
  }
}

const PAYSTACK = 'https://api.paystack.co';

function paystackHeaders(env: Env): Record<string, string> {
  return { Authorization: `Bearer ${(env.PAYSTACK_SECRET_KEY ?? '').trim()}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

/** Paystack wants the smallest unit (kobo, pesewas, cents). */
export const toMinor = (amount: number) => Math.round(amount * 100);

/** The channels to offer first: bank transfer and USSD in Nigeria, EFT in South Africa; card last. */
export function paystackChannelsFor(country: string): string[] {
  switch (country.toUpperCase()) {
    case 'NG':
      return ['bank_transfer', 'ussd', 'bank', 'card'];
    case 'ZA':
      return ['eft', 'card'];
    case 'GH':
      return ['mobile_money', 'card'];
    default:
      return ['bank_transfer', 'card'];
  }
}

/** Start a Paystack checkout; the payer finishes on Paystack's own page. */
export async function paystackInitialize(input: {
  env: Env;
  fetchImpl?: FetchLike;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  country: string;
  callbackUrl?: string;
  metadata: Record<string, string>;
}): Promise<{ ok: true; url: string } | { ok: false; reason: 'not_configured' | 'provider_error' }> {
  if (!paystackOn(input.env)) return { ok: false, reason: 'not_configured' };
  const f = input.fetchImpl ?? (fetch as unknown as FetchLike);
  try {
    const res = await f(`${PAYSTACK}/transaction/initialize`, {
      method: 'POST',
      headers: paystackHeaders(input.env),
      body: JSON.stringify({
        email: input.email,
        amount: toMinor(input.amount),
        currency: input.currency.toUpperCase(),
        reference: input.reference,
        channels: paystackChannelsFor(input.country),
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });
    const raw = (await res.json().catch(() => ({}))) as { status?: boolean; data?: { authorization_url?: string } };
    if (!res.ok || !raw.status || !raw.data?.authorization_url) return { ok: false, reason: 'provider_error' };
    return { ok: true, url: raw.data.authorization_url };
  } catch {
    return { ok: false, reason: 'provider_error' };
  }
}

/** Re-verify a Paystack transaction (amount in major units). */
export async function paystackVerify(input: { env: Env; fetchImpl?: FetchLike; reference: string }): Promise<{
  status: LocalStatus;
  amount: number | null;
  currency: string | null;
}> {
  if (!paystackOn(input.env)) return { status: 'unknown', amount: null, currency: null };
  const f = input.fetchImpl ?? (fetch as unknown as FetchLike);
  try {
    const res = await f(`${PAYSTACK}/transaction/verify/${encodeURIComponent(input.reference)}`, { headers: paystackHeaders(input.env) });
    const raw = (await res.json().catch(() => ({}))) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string } };
    if (!res.ok || !raw.status || !raw.data) return { status: 'unknown', amount: null, currency: null };
    const v = String(raw.data.status ?? '').toLowerCase();
    const status: LocalStatus =
      v === 'success' ? 'success' : ['failed', 'abandoned', 'reversed'].includes(v) ? 'failed' : v ? 'pending' : 'unknown';
    return {
      status,
      amount: typeof raw.data.amount === 'number' ? raw.data.amount / 100 : null,
      currency: raw.data.currency ?? null,
    };
  } catch {
    return { status: 'unknown', amount: null, currency: null };
  }
}

/** x-paystack-signature = HMAC-SHA512 of the raw body with the secret key. */
export function verifyPaystackSignature(rawBody: string, header: string | null | undefined, secretKey: string): boolean {
  if (!header || !secretKey) return false;
  const want = Buffer.from(createHmac('sha512', secretKey).update(rawBody).digest('hex'), 'hex');
  const got = Buffer.from(header.trim(), 'hex');
  return got.length === want.length && got.length > 0 && timingSafeEqual(got, want);
}

/** The transaction reference a signed Paystack charge event names, or null. */
export function paystackEventReference(rawBody: string): string | null {
  try {
    const e = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
    if (!String(e.event ?? '').startsWith('charge.')) return null;
    return typeof e.data?.reference === 'string' && e.data.reference ? e.data.reference : null;
  } catch {
    return null;
  }
}

/** A confirmed amount covers what we asked for. */
export function localPaymentCovers(paid: number | null, expected: number): boolean {
  return paid != null && Number.isFinite(paid) && paid + 1e-9 >= expected;
}
