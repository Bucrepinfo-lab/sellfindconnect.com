import { describe, expect, it } from 'vitest';

import {
  AfricasTalkingPaymentAdapter,
  ManualPaymentAdapter,
  StripePaymentAdapter,
  createConfiguredPaymentAdapter,
  type PaymentAdapterFetch,
} from './payment.adapter';

function configReader(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] };
}

function jsonFetch(
  handler: (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    status: number;
    body: unknown;
  },
): PaymentAdapterFetch {
  return async (input, init) => {
    const result = handler(input, init);
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  };
}

const captureRequest = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  invoiceId: '22222222-2222-4222-8222-222222222222',
  amount: 11.3793,
  currencyCode: 'KES',
  method: 'CARD' as const,
  idempotencyKey: 'idem-stripe-001',
  customerReference: 'pm_card_visa',
};

describe('payment adapter factory', () => {
  it('uses the manual development adapter by default', () => {
    expect(createConfiguredPaymentAdapter().provider).toBe('manual-development');
    expect(createConfiguredPaymentAdapter(configReader({ PAYMENT_PROVIDER: 'manual' })).provider).toBe(
      'manual-development',
    );
  });

  it('fails closed when a live provider is selected without credentials', () => {
    expect(() =>
      createConfiguredPaymentAdapter(configReader({ PAYMENT_PROVIDER: 'stripe' })),
    ).toThrow('STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe.');
    expect(() =>
      createConfiguredPaymentAdapter(configReader({ PAYMENT_PROVIDER: 'africastalking' })),
    ).toThrow('AT_API_KEY is required when PAYMENT_PROVIDER=africastalking.');
    expect(() =>
      createConfiguredPaymentAdapter(configReader({ PAYMENT_PROVIDER: 'live' })),
    ).toThrow('PAYMENT_PROVIDER=live requires STRIPE_SECRET_KEY and/or Africa\'s Talking payment credentials.');
    expect(() =>
      createConfiguredPaymentAdapter(configReader({ PAYMENT_PROVIDER: 'paypal' })),
    ).toThrow('Unsupported PAYMENT_PROVIDER "paypal"');
  });

  it('selects Stripe, Africa\'s Talking, and method-routed live adapters', () => {
    expect(
      createConfiguredPaymentAdapter(
        configReader({ PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_123' }),
      ).provider,
    ).toBe('stripe');
    expect(
      createConfiguredPaymentAdapter(
        configReader({
          PAYMENT_PROVIDER: 'mpesa',
          AT_API_KEY: 'at-key',
          AT_USERNAME: 'sandbox',
          AT_PAYMENTS_PRODUCT_NAME: 'SFC',
        }),
      ).provider,
    ).toBe('africastalking');
    expect(
      createConfiguredPaymentAdapter(
        configReader({
          PAYMENT_PROVIDER: 'live',
          STRIPE_SECRET_KEY: 'sk_test_123',
          AT_API_KEY: 'at-key',
          AT_USERNAME: 'sandbox',
          AT_PAYMENTS_PRODUCT_NAME: 'SFC',
        }),
      ).provider,
    ).toBe('live');
  });

  it('routes live CARD captures to Stripe and fails closed without that rail', () => {
    const live = createConfiguredPaymentAdapter(
      configReader({
        PAYMENT_PROVIDER: 'live',
        AT_API_KEY: 'at-key',
        AT_USERNAME: 'sandbox',
        AT_PAYMENTS_PRODUCT_NAME: 'SFC',
      }),
      jsonFetch(() => {
        throw new Error('Africa\'s Talking must not receive CARD captures');
      }),
    );

    expect(live.capture(captureRequest)).toMatchObject({
      status: 'FAILED',
      failureReason: expect.stringContaining('STRIPE_SECRET_KEY'),
    });
  });
});

describe('ManualPaymentAdapter', () => {
  it('captures a positive amount without storing card data', () => {
    const adapter = new ManualPaymentAdapter();
    const result = adapter.capture(captureRequest);

    expect(result).toMatchObject({
      provider: 'manual-development',
      status: 'CAPTURED',
      capturedAmount: 11.3793,
      currencyCode: 'KES',
    });
    expect(result.providerPaymentId).toMatch(/^pay_/);
  });
});

describe('StripePaymentAdapter', () => {
  it('creates a confirmed PaymentIntent in minor units and refunds it', async () => {
    const calls: Array<{ url: string; headers?: Record<string, string>; body?: string }> = [];
    const adapter = new StripePaymentAdapter(
      configReader({ STRIPE_SECRET_KEY: 'sk_test_123' }),
      jsonFetch((url, init) => {
        calls.push({ url, headers: init?.headers, body: init?.body });
        if (url.endsWith('/v1/payment_intents')) {
          return {
            status: 200,
            body: { id: 'pi_123', amount: 1138, currency: 'kes', status: 'succeeded' },
          };
        }
        return {
          status: 200,
          body: { id: 're_123', amount: 1138, currency: 'kes', status: 'succeeded' },
        };
      }),
    );

    const captured = await adapter.capture(captureRequest);
    expect(captured).toMatchObject({
      provider: 'stripe',
      providerPaymentId: 'pi_123',
      status: 'CAPTURED',
      capturedAmount: 11.38,
    });
    expect(calls[0]?.headers).toMatchObject({
      authorization: 'Bearer sk_test_123',
      'idempotency-key': 'idem-stripe-001',
    });
    expect(calls[0]?.body).toContain('amount=1138');
    expect(calls[0]?.body).toContain('currency=kes');
    expect(calls[0]?.body).toContain('payment_method=pm_card_visa');
    expect(calls[0]?.body).not.toContain('4242');

    const refunded = await adapter.refund({
      provider: 'stripe',
      providerPaymentId: 'pi_123',
      amount: 11.38,
      currencyCode: 'KES',
    });
    expect(refunded).toMatchObject({
      provider: 'stripe',
      providerRefundId: 're_123',
      status: 'REFUNDED',
      refundedAmount: 11.38,
    });
  });

  it('rejects raw card numbers and missing payment-method tokens', async () => {
    const adapter = new StripePaymentAdapter(
      configReader({ STRIPE_SECRET_KEY: 'sk_test_123' }),
      jsonFetch(() => {
        throw new Error('Stripe must not be called');
      }),
    );

    await expect(
      adapter.capture({ ...captureRequest, customerReference: '4242424242424242' }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureReason: expect.stringContaining('Card numbers must not be sent'),
    });
    await expect(adapter.capture({ ...captureRequest, customerReference: undefined })).resolves.toMatchObject({
      status: 'FAILED',
      failureReason: expect.stringContaining('payment-method token'),
    });
  });
});

describe('AfricasTalkingPaymentAdapter', () => {
  it('starts an STK checkout as REQUIRES_CAPTURE on the sandbox host', async () => {
    const adapter = new AfricasTalkingPaymentAdapter(
      configReader({
        AT_API_KEY: 'at-key',
        AT_USERNAME: 'sandbox',
        AT_PAYMENTS_PRODUCT_NAME: 'SFC',
      }),
      jsonFetch((url, init) => {
        expect(url).toBe('https://payments.sandbox.africastalking.com/mobile/checkout/request');
        expect(init?.headers).toMatchObject({ apiKey: 'at-key' });
        expect(JSON.parse(init?.body ?? '{}')).toMatchObject({
          phoneNumber: '+254712345678',
          currencyCode: 'KES',
          amount: 11.3793,
        });
        return {
          status: 201,
          body: { status: 'PendingConfirmation', transactionId: 'ATX999' },
        };
      }),
    );

    await expect(
      adapter.capture({
        ...captureRequest,
        method: 'MOBILE_MONEY',
        customerReference: '0712345678',
      }),
    ).resolves.toMatchObject({
      provider: 'africastalking',
      providerPaymentId: 'ATX999',
      status: 'REQUIRES_CAPTURE',
      capturedAmount: 0,
    });
  });
});
