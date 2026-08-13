import { Injectable } from '@nestjs/common';

/**
 * Africa's Talking Payments (M-Pesa & other mobile money). The login phone IS the
 * payment phone: `mobileCheckout` fires an STK push to the payer; `mobileB2C` pays
 * a recipient. Money-block: only explicit, human-authorised flows call these.
 *
 * Env: AT_USERNAME, AT_API_KEY, AT_PAYMENTS_PRODUCT_NAME. Async results arrive at
 * /payments/at/callback → reconcile the ledger.
 */
export const AT_PAYMENTS = Symbol('AT_PAYMENTS');

export interface CheckoutInput {
  phoneNumber: string;
  amount: number;
  currencyCode?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  ok: boolean;
  transactionId: string | null;
  raw: unknown;
}

export interface PayoutRecipient {
  phoneNumber: string;
  amount: number;
  currencyCode?: string;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface AtPaymentsProvider {
  mobileCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  mobileB2C(recipients: PayoutRecipient[]): Promise<{ ok: boolean; raw: unknown }>;
}

const isSandbox = () => process.env.AT_USERNAME === 'sandbox';
const payBase = () =>
  isSandbox()
    ? 'https://payments.sandbox.africastalking.com'
    : 'https://payments.africastalking.com';

function headers() {
  return {
    apiKey: process.env.AT_API_KEY ?? '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

@Injectable()
export class AfricasTalkingPaymentsProvider implements AtPaymentsProvider {
  async mobileCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      return { ok: false, transactionId: null, raw: { error: 'africastalking_not_configured' } };
    }
    const response = await fetch(`${payBase()}/mobile/checkout/request`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        username: process.env.AT_USERNAME,
        productName: process.env.AT_PAYMENTS_PRODUCT_NAME,
        phoneNumber: input.phoneNumber,
        currencyCode: input.currencyCode ?? 'KES',
        amount: input.amount,
        metadata: input.metadata ?? {},
      }),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    const parsed = raw as { status?: string; transactionId?: string };
    return {
      ok: response.ok && parsed.status === 'PendingConfirmation',
      transactionId: parsed.transactionId ?? null,
      raw,
    };
  }

  async mobileB2C(recipients: PayoutRecipient[]): Promise<{ ok: boolean; raw: unknown }> {
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      return { ok: false, raw: { error: 'africastalking_not_configured' } };
    }
    const response = await fetch(`${payBase()}/mobile/b2c/request`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        username: process.env.AT_USERNAME,
        productName: process.env.AT_PAYMENTS_PRODUCT_NAME,
        recipients: recipients.map((recipient) => ({
          phoneNumber: recipient.phoneNumber,
          currencyCode: recipient.currencyCode ?? 'KES',
          amount: recipient.amount,
          reason: recipient.reason ?? 'BusinessPayment',
          metadata: recipient.metadata ?? {},
        })),
      }),
    });
    const raw: unknown = await response.json().catch(() => ({}));
    return { ok: response.ok, raw };
  }
}
