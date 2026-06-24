import {
  roundMoney,
  type PaymentCaptureRequest,
  type PaymentCaptureResult,
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
    const currencyCode = request.currencyCode.trim().toUpperCase();
    const amount = roundMoney(request.amount);

    if (amount <= 0 || currencyCode.length !== 3) {
      return {
        provider: this.provider,
        providerPaymentId: this.deterministicId('fail', request.idempotencyKey),
        status: 'FAILED',
        capturedAmount: 0,
        currencyCode,
        failureReason:
          amount <= 0
            ? 'Capture amount must be greater than zero.'
            : 'Currency code must be a 3-letter ISO currency.',
      };
    }

    return {
      provider: this.provider,
      providerPaymentId: this.deterministicId('pay', request.idempotencyKey),
      status: 'CAPTURED',
      capturedAmount: amount,
      currencyCode,
    };
  }

  refund(request: PaymentRefundRequest): PaymentRefundResult {
    const currencyCode = request.currencyCode.trim().toUpperCase();
    const amount = roundMoney(request.amount);

    if (amount <= 0 || currencyCode.length !== 3) {
      return {
        provider: this.provider,
        providerRefundId: this.deterministicId('refund-fail', request.providerPaymentId),
        status: 'FAILED',
        refundedAmount: 0,
        currencyCode,
        failureReason:
          amount <= 0
            ? 'Refund amount must be greater than zero.'
            : 'Currency code must be a 3-letter ISO currency.',
      };
    }

    return {
      provider: this.provider,
      providerRefundId: this.deterministicId('refund', `${request.providerPaymentId}:${amount}`),
      status: 'REFUNDED',
      refundedAmount: amount,
      currencyCode,
    };
  }

  private deterministicId(prefix: string, seed: string): string {
    const digest = createHash('sha256')
      .update(`${this.provider}:${prefix}:${seed}`)
      .digest('hex')
      .slice(0, 24);
    return `${prefix}_${digest}`;
  }
}

export type PaymentAdapterConfigReader = {
  get(key: string): string | undefined;
};

/**
 * Selects the configured payment adapter. Only the manual development adapter
 * is wired today; live providers are added here behind a `PAYMENT_PROVIDER`
 * switch once finance approves the vendor and credentials, keeping the rest of
 * the finance service provider-agnostic.
 */
export function createConfiguredPaymentAdapter(
  config?: PaymentAdapterConfigReader,
): PaymentAdapter {
  const provider = config?.get('PAYMENT_PROVIDER')?.trim().toLowerCase();

  switch (provider) {
    case undefined:
    case '':
    case 'manual':
    case 'development':
      return new ManualPaymentAdapter();
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
