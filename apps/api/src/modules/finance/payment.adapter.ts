import {
  fromPaymentProviderMinorUnits,
  looksLikeCardPan,
  mapAfricasTalkingCheckoutToFinanceStatus,
  mapStripePaymentIntentStatus,
  mapStripeRefundStatus,
  roundMoney,
  toE164,
  toPaymentProviderMinorUnits,
  type PaymentCaptureRequest,
  type PaymentCaptureResult,
  type PaymentMethod,
  type PaymentRefundRequest,
  type PaymentRefundResult,
} from '@telpen/domain';
import { createHash } from 'node:crypto';

/**
 * Provider-neutral payment adapter contract. Real providers (Stripe, local
 * mobile money, app-store billing) implement this interface behind an
 * env-selected factory, mirroring the media adapter pattern. The adapter never
 * decides tax: it only captures/refunds an already-computed, tax-snapshotted
 * amount and returns provider evidence.
 */
export interface PaymentAdapter {
  readonly provider: string;
  capture(request: PaymentCaptureRequest): Promise<PaymentCaptureResult> | PaymentCaptureResult;
  refund(request: PaymentRefundRequest): Promise<PaymentRefundResult> | PaymentRefundResult;
}

export type PaymentAdapterConfigReader = {
  get(key: string): string | undefined;
};

export type PaymentAdapterFetch = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/**
 * Deterministic, offline development adapter. It captures the requested amount
 * and fails closed on non-positive amounts or blank currency so the finance
 * workflow can be exercised end to end without a live provider. It performs no
 * network calls and stores no card data.
 */
export class ManualPaymentAdapter implements PaymentAdapter {
  readonly provider: string;

  constructor(provider = 'manual-development') {
    this.provider = provider;
  }

  capture(request: PaymentCaptureRequest): PaymentCaptureResult {
    const validated = validateMoney(request.amount, request.currencyCode, this.provider, 'fail', 'capture');
    if ('status' in validated) {
      return validated;
    }

    return {
      provider: this.provider,
      providerPaymentId: deterministicId(this.provider, 'pay', request.idempotencyKey),
      status: 'CAPTURED',
      capturedAmount: validated.amount,
      currencyCode: validated.currencyCode,
    };
  }

  refund(request: PaymentRefundRequest): PaymentRefundResult {
    const validated = validateMoney(request.amount, request.currencyCode, this.provider, 'refund-fail', 'refund');
    if ('status' in validated) {
      return {
        provider: this.provider,
        providerRefundId: deterministicId(
          this.provider,
          'refund-fail',
          request.providerPaymentId,
        ),
        status: 'FAILED',
        refundedAmount: 0,
        currencyCode: validated.currencyCode,
        failureReason: validated.failureReason,
      };
    }

    return {
      provider: this.provider,
      providerRefundId: deterministicId(
        this.provider,
        'refund',
        `${request.providerPaymentId}:${validated.amount}`,
      ),
      status: 'REFUNDED',
      refundedAmount: validated.amount,
      currencyCode: validated.currencyCode,
    };
  }
}

/**
 * Stripe PaymentIntents capture/refund. The adapter never accepts raw card
 * numbers — `customerReference` must be a provider token such as `pm_...`.
 */
export class StripePaymentAdapter implements PaymentAdapter {
  readonly provider = 'stripe';

  constructor(
    private readonly config: PaymentAdapterConfigReader,
    private readonly fetchImpl: PaymentAdapterFetch = fetch as PaymentAdapterFetch,
  ) {
    requiredConfig(config, 'STRIPE_SECRET_KEY', 'PAYMENT_PROVIDER=stripe');
  }

  async capture(request: PaymentCaptureRequest): Promise<PaymentCaptureResult> {
    const validated = validateMoney(request.amount, request.currencyCode, this.provider, 'fail', 'capture');
    if ('status' in validated) {
      return validated;
    }

    const paymentMethod = readProviderToken(request.customerReference);
    if (!paymentMethod.ok) {
      return failedCapture(this.provider, validated.currencyCode, paymentMethod.reason);
    }
    if (!paymentMethod.token) {
      return failedCapture(
        this.provider,
        validated.currencyCode,
        'Stripe capture requires a provider payment-method token in customerReference.',
      );
    }

    const payload = await this.request('/v1/payment_intents', request.idempotencyKey, {
      amount: String(toPaymentProviderMinorUnits(validated.amount, validated.currencyCode)),
      currency: validated.currencyCode.toLowerCase(),
      confirm: 'true',
      confirmation_method: 'automatic',
      capture_method: 'automatic',
      off_session: 'true',
      payment_method: paymentMethod.token,
      'metadata[tenantId]': request.tenantId,
      'metadata[invoiceId]': request.invoiceId,
    });

    if (!payload.ok) {
      return failedCapture(this.provider, validated.currencyCode, payload.error);
    }

    const intent = payload.body as { id?: string; amount?: number; status?: string };
    const status = mapStripePaymentIntentStatus(intent.status ?? '');
    const capturedAmount =
      status === 'CAPTURED'
        ? fromPaymentProviderMinorUnits(Number(intent.amount ?? 0), validated.currencyCode)
        : 0;

    return {
      provider: this.provider,
      providerPaymentId: intent.id ?? deterministicId(this.provider, 'pi', request.idempotencyKey),
      status,
      capturedAmount,
      currencyCode: validated.currencyCode,
      failureReason: status === 'FAILED' ? payload.error : undefined,
    };
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResult> {
    const validated = validateMoney(request.amount, request.currencyCode, this.provider, 'refund-fail', 'refund');
    if ('status' in validated) {
      return failedRefund(this.provider, validated.currencyCode, validated.failureReason ?? 'Refund amount is invalid.');
    }

    const payload = await this.request(
      '/v1/refunds',
      `${request.providerPaymentId}:refund:${validated.amount}`,
      {
        payment_intent: request.providerPaymentId,
        amount: String(toPaymentProviderMinorUnits(validated.amount, validated.currencyCode)),
        ...(request.reason ? { reason: 'requested_by_customer' } : {}),
      },
    );

    if (!payload.ok) {
      return failedRefund(this.provider, validated.currencyCode, payload.error);
    }

    const refund = payload.body as { id?: string; amount?: number; status?: string };
    const status = mapStripeRefundStatus(refund.status ?? '');
    return {
      provider: this.provider,
      providerRefundId: refund.id ?? deterministicId(this.provider, 're', request.providerPaymentId),
      status,
      refundedAmount:
        status === 'REFUNDED'
          ? fromPaymentProviderMinorUnits(Number(refund.amount ?? 0), validated.currencyCode)
          : 0,
      currencyCode: validated.currencyCode,
      failureReason: status === 'FAILED' ? payload.error : undefined,
    };
  }

  private async request(
    path: string,
    idempotencyKey: string,
    fields: Record<string, string>,
  ): Promise<{ ok: boolean; body: unknown; error: string }> {
    const secret = requiredConfig(this.config, 'STRIPE_SECRET_KEY', 'PAYMENT_PROVIDER=stripe');
    const base = optionalConfig(this.config, 'STRIPE_API_BASE') ?? 'https://api.stripe.com';
    const response = await this.fetchImpl(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: new URLSearchParams(fields).toString(),
    });
    const body: unknown = await response.json().catch(() => ({}));
    const error = stripeErrorMessage(body) ?? `HTTP ${response.status}`;
    return { ok: response.ok, body, error };
  }
}

/**
 * Africa's Talking mobile checkout (M-Pesa STK and other mobile money). The
 * login/payment phone is supplied as `customerReference` and normalized to E.164.
 * Successful checkout is typically pending until the payer confirms, so the
 * adapter returns REQUIRES_CAPTURE until finance settlement.
 */
export class AfricasTalkingPaymentAdapter implements PaymentAdapter {
  readonly provider = 'africastalking';

  constructor(
    private readonly config: PaymentAdapterConfigReader,
    private readonly fetchImpl: PaymentAdapterFetch = fetch as PaymentAdapterFetch,
  ) {
    requiredConfig(config, 'AT_API_KEY', 'PAYMENT_PROVIDER=africastalking');
    requiredConfig(config, 'AT_USERNAME', 'PAYMENT_PROVIDER=africastalking');
    requiredConfig(config, 'AT_PAYMENTS_PRODUCT_NAME', 'PAYMENT_PROVIDER=africastalking');
  }

  async capture(request: PaymentCaptureRequest): Promise<PaymentCaptureResult> {
    const validated = validateMoney(request.amount, request.currencyCode, this.provider, 'fail', 'capture');
    if ('status' in validated) {
      return validated;
    }

    const phone = toE164(request.customerReference ?? '');
    if (!phone) {
      return failedCapture(
        this.provider,
        validated.currencyCode,
        'Mobile-money capture requires an E.164 phone in customerReference.',
      );
    }

    const username = requiredConfig(this.config, 'AT_USERNAME', 'PAYMENT_PROVIDER=africastalking');
    const payload = await this.request('/mobile/checkout/request', {
      username,
      productName: requiredConfig(
        this.config,
        'AT_PAYMENTS_PRODUCT_NAME',
        'PAYMENT_PROVIDER=africastalking',
      ),
      phoneNumber: phone,
      currencyCode: validated.currencyCode,
      amount: validated.amount,
      metadata: { tenantId: request.tenantId, invoiceId: request.invoiceId },
    });

    const parsed = payload.body as { status?: string; transactionId?: string };
    const status = mapAfricasTalkingCheckoutToFinanceStatus(parsed.status ?? '');
    if (!payload.ok || status === 'FAILED') {
      return failedCapture(
        this.provider,
        validated.currencyCode,
        africasTalkingError(payload.body) ?? `HTTP ${payload.status}`,
      );
    }

    return {
      provider: this.provider,
      providerPaymentId:
        parsed.transactionId ?? deterministicId(this.provider, 'at', request.idempotencyKey),
      status,
      capturedAmount: status === 'CAPTURED' ? validated.amount : 0,
      currencyCode: validated.currencyCode,
    };
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResult> {
    const validated = validateMoney(request.amount, request.currencyCode, this.provider, 'refund-fail', 'refund');
    if ('status' in validated) {
      return failedRefund(
        this.provider,
        validated.currencyCode,
        validated.failureReason ?? 'Refund amount is invalid.',
      );
    }

    const phone = toE164(request.customerReference ?? '');
    if (!phone) {
      return failedRefund(
        this.provider,
        validated.currencyCode,
        'Mobile-money refund requires the original E.164 phone.',
      );
    }

    const username = requiredConfig(this.config, 'AT_USERNAME', 'PAYMENT_PROVIDER=africastalking');
    const payload = await this.request('/mobile/b2c/request', {
      username,
      productName: requiredConfig(
        this.config,
        'AT_PAYMENTS_PRODUCT_NAME',
        'PAYMENT_PROVIDER=africastalking',
      ),
      recipients: [
        {
          phoneNumber: phone,
          currencyCode: validated.currencyCode,
          amount: validated.amount,
          reason: 'BusinessPayment',
          metadata: { originalPaymentId: request.providerPaymentId },
        },
      ],
    });

    if (!payload.ok) {
      return failedRefund(
        this.provider,
        validated.currencyCode,
        africasTalkingError(payload.body) ?? `HTTP ${payload.status}`,
      );
    }

    return {
      provider: this.provider,
      providerRefundId: deterministicId(
        this.provider,
        'at-refund',
        `${request.providerPaymentId}:${validated.amount}`,
      ),
      status: 'REFUNDED',
      refundedAmount: validated.amount,
      currencyCode: validated.currencyCode,
    };
  }

  private async request(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; body: unknown }> {
    const username = requiredConfig(this.config, 'AT_USERNAME', 'PAYMENT_PROVIDER=africastalking');
    const apiKey = requiredConfig(this.config, 'AT_API_KEY', 'PAYMENT_PROVIDER=africastalking');
    const base =
      username === 'sandbox'
        ? 'https://payments.sandbox.africastalking.com'
        : 'https://payments.africastalking.com';
    const response = await this.fetchImpl(`${base}${path}`, {
      method: 'POST',
      headers: {
        apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.json().catch(() => ({})),
    };
  }
}

/**
 * Method-routed live adapter: CARD/WALLET → Stripe, MOBILE_MONEY → Africa's
 * Talking. Missing rails fail closed per capture instead of falling back to the
 * manual development adapter.
 */
export class RoutedPaymentAdapter implements PaymentAdapter {
  readonly provider = 'live';

  constructor(
    private readonly rails: {
      card?: PaymentAdapter;
      mobileMoney?: PaymentAdapter;
    },
  ) {}

  capture(request: PaymentCaptureRequest) {
    return this.route(request.method, request.currencyCode).capture(request);
  }

  refund(request: PaymentRefundRequest) {
    return this.adapterForProvider(request.provider, request.currencyCode).refund(request);
  }

  private route(method: PaymentMethod, currencyCode: string): PaymentAdapter {
    if (method === 'CARD' || method === 'WALLET') {
      return (
        this.rails.card ??
        unavailableAdapter(
          'stripe',
          currencyCode,
          'CARD capture requires STRIPE_SECRET_KEY when PAYMENT_PROVIDER=live.',
        )
      );
    }
    if (method === 'MOBILE_MONEY') {
      return (
        this.rails.mobileMoney ??
        unavailableAdapter(
          'africastalking',
          currencyCode,
          'MOBILE_MONEY capture requires Africa\'s Talking payment credentials when PAYMENT_PROVIDER=live.',
        )
      );
    }
    return unavailableAdapter(
      this.provider,
      currencyCode,
      `Payment method ${method} is not enabled for PAYMENT_PROVIDER=live.`,
    );
  }

  private adapterForProvider(provider: string, currencyCode: string): PaymentAdapter {
    const normalized = provider.trim().toLowerCase();
    if (normalized === 'stripe' || normalized.startsWith('stripe')) {
      return (
        this.rails.card ??
        unavailableAdapter('stripe', currencyCode, 'Stripe refund rail is not configured.')
      );
    }
    if (
      normalized === 'africastalking' ||
      normalized === 'at' ||
      normalized === 'mpesa' ||
      normalized.startsWith('africastalking')
    ) {
      return (
        this.rails.mobileMoney ??
        unavailableAdapter(
          'africastalking',
          currencyCode,
          'Africa\'s Talking refund rail is not configured.',
        )
      );
    }
    return unavailableAdapter(
      this.provider,
      currencyCode,
      `No live payment rail matches provider "${provider}".`,
    );
  }
}

/**
 * Selects the configured payment adapter. Manual/development remains the
 * default. Live Stripe and Africa's Talking adapters are selected with
 * `PAYMENT_PROVIDER=stripe`, `africastalking`, or `live` and fail closed when
 * credentials are missing.
 */
export function createConfiguredPaymentAdapter(
  config?: PaymentAdapterConfigReader,
  fetchImpl: PaymentAdapterFetch = fetch as PaymentAdapterFetch,
): PaymentAdapter {
  const provider = config?.get('PAYMENT_PROVIDER')?.trim().toLowerCase();

  switch (provider) {
    case undefined:
    case '':
    case 'manual':
    case 'development':
      return new ManualPaymentAdapter();
    case 'stripe':
      return new StripePaymentAdapter(requireReader(config, 'PAYMENT_PROVIDER=stripe'), fetchImpl);
    case 'africastalking':
    case 'at':
    case 'mpesa':
      return new AfricasTalkingPaymentAdapter(
        requireReader(config, 'PAYMENT_PROVIDER=africastalking'),
        fetchImpl,
      );
    case 'live': {
      const reader = requireReader(config, 'PAYMENT_PROVIDER=live');
      const stripeKey = optionalConfig(reader, 'STRIPE_SECRET_KEY');
      const atReady =
        Boolean(optionalConfig(reader, 'AT_API_KEY')) &&
        Boolean(optionalConfig(reader, 'AT_USERNAME')) &&
        Boolean(optionalConfig(reader, 'AT_PAYMENTS_PRODUCT_NAME'));
      if (!stripeKey && !atReady) {
        throw new Error(
          'PAYMENT_PROVIDER=live requires STRIPE_SECRET_KEY and/or Africa\'s Talking payment credentials.',
        );
      }
      return new RoutedPaymentAdapter({
        card: stripeKey ? new StripePaymentAdapter(reader, fetchImpl) : undefined,
        mobileMoney: atReady ? new AfricasTalkingPaymentAdapter(reader, fetchImpl) : undefined,
      });
    }
    default:
      throw new Error(
        `Unsupported PAYMENT_PROVIDER "${provider}". Approve and wire the provider adapter before enabling it.`,
      );
  }
}

export function createDefaultPaymentAdapter(): PaymentAdapter {
  return new ManualPaymentAdapter();
}

export const PAYMENT_ADAPTER = Symbol('PAYMENT_ADAPTER');

export function buildPaymentIdempotencyKey(input: {
  tenantId: string;
  invoiceId: string;
  attempt: number;
}): string {
  return `${input.tenantId}:${input.invoiceId}:${Math.max(1, Math.trunc(input.attempt))}`;
}

function requireReader(
  config: PaymentAdapterConfigReader | undefined,
  context: string,
): PaymentAdapterConfigReader {
  if (!config) {
    throw new Error(`A config reader is required when ${context}.`);
  }
  return config;
}

function requiredConfig(config: PaymentAdapterConfigReader, key: string, context: string): string {
  const value = config.get(key)?.trim();
  if (!value) {
    throw new Error(`${key} is required when ${context}.`);
  }
  return value;
}

function optionalConfig(config: PaymentAdapterConfigReader, key: string): string | undefined {
  const value = config.get(key)?.trim();
  return value ? value : undefined;
}

function deterministicId(provider: string, prefix: string, seed: string): string {
  const digest = createHash('sha256')
    .update(`${provider}:${prefix}:${seed}`)
    .digest('hex')
    .slice(0, 24);
  return `${prefix}_${digest}`;
}

function validateMoney(
  amount: number,
  currencyCode: string,
  provider: string,
  failPrefix: string,
  kind: 'capture' | 'refund',
): { amount: number; currencyCode: string } | PaymentCaptureResult {
  const normalizedCurrency = currencyCode.trim().toUpperCase();
  const normalizedAmount = roundMoney(amount);

  if (normalizedAmount <= 0 || normalizedCurrency.length !== 3) {
    return {
      provider,
      providerPaymentId: deterministicId(provider, failPrefix, `${amount}:${currencyCode}`),
      status: 'FAILED',
      capturedAmount: 0,
      currencyCode: normalizedCurrency,
      failureReason:
        normalizedAmount <= 0
          ? `${kind === 'refund' ? 'Refund' : 'Capture'} amount must be greater than zero.`
          : 'Currency code must be a 3-letter ISO currency.',
    };
  }

  return { amount: normalizedAmount, currencyCode: normalizedCurrency };
}

function readProviderToken(
  value: string | undefined,
): { ok: true; token?: string } | { ok: false; reason: string } {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { ok: true };
  }
  if (looksLikeCardPan(trimmed)) {
    return {
      ok: false,
      reason:
        'Card numbers must not be sent to the payment adapter. Use a provider payment-method token.',
    };
  }
  return { ok: true, token: trimmed };
}

function failedCapture(
  provider: string,
  currencyCode: string,
  failureReason: string,
): PaymentCaptureResult {
  return {
    provider,
    providerPaymentId: deterministicId(provider, 'fail', failureReason),
    status: 'FAILED',
    capturedAmount: 0,
    currencyCode,
    failureReason,
  };
}

function failedRefund(
  provider: string,
  currencyCode: string,
  failureReason: string,
): PaymentRefundResult {
  return {
    provider,
    providerRefundId: deterministicId(provider, 'refund-fail', failureReason),
    status: 'FAILED',
    refundedAmount: 0,
    currencyCode,
    failureReason,
  };
}

function unavailableAdapter(provider: string, currencyCode: string, reason: string): PaymentAdapter {
  return {
    provider,
    capture: () => failedCapture(provider, currencyCode, reason),
    refund: () => failedRefund(provider, currencyCode, reason),
  };
}

function stripeErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const error = (body as { error?: { message?: string } }).error;
  return error?.message;
}

function africasTalkingError(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const record = body as { errorMessage?: string; description?: string; status?: string };
  return record.errorMessage ?? record.description ?? record.status;
}
