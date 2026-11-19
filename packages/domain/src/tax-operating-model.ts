/**
 * Tax operating model for every owner product that charges a subscription
 * (SellFindConnect, InsurOS, Telpen Edu, Stawi, HarvestHub). Owner decision
 * 19/11/26, replacing the 22/08/26 "self merchant of record, Paddle
 * forbidden" model:
 *
 * - Cards: Paddle is the merchant of record. Paddle is the seller, charges
 *   the tax for the buyer's country and files and remits it.
 * - M-Pesa (STK on the verified login phone): a direct sale by Telpen Systems
 *   Ltd. Paddle has no M-Pesa. While the company is not VAT-registered, no
 *   VAT is charged or shown (VAT Act 2013 s.42(2): an unregistered person may
 *   not issue a VAT invoice). It must register within 30 days of KES 5 million
 *   taxable sales in 12 months (s.34); from then on (SELLER_VAT_REGISTERED=true)
 *   M-Pesa checkout needs the APPROVED Kenya tax profile and files on iTax.
 * - Income tax on profits stays with the company on both rails.
 *
 * Canonical narrative: `docs/GROUP_TAX_OPERATING_MODEL.md`.
 */
export const TAX_OPERATING_MODEL = {
  cardMerchantOfRecord: 'paddle',
  mpesaMerchantOfRecord: 'self',
  firstCountryCode: 'KE',
  paymentRails: ['africastalking_stk', 'paddle'] as const,
  mpesaVat: 'none_until_vat_registered',
  vatRegistrationThresholdKes: 5_000_000,
  kenyaCompliancePathOnceRegistered: 'itax',
} as const;

export type TaxOperatingModel = typeof TAX_OPERATING_MODEL;

/**
 * Merchant-of-record checkouts we have not set up. Paddle is allowed for cards
 * (its own checkout, `paddle.ts`), not as a PAYMENT_PROVIDER for STK.
 */
export const FORBIDDEN_MERCHANT_OF_RECORD_PROVIDERS = [
  'paddle',
  'paddle_billing',
  'lemonsqueezy',
  'lemon_squeezy',
  'dodo',
  'dodo_payments',
  'dodopayments',
] as const;

export type ForbiddenMerchantOfRecordProvider =
  (typeof FORBIDDEN_MERCHANT_OF_RECORD_PROVIDERS)[number];

export function normalizePaymentProviderName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isForbiddenMerchantOfRecordProvider(name: string): boolean {
  const normalized = normalizePaymentProviderName(name);
  return (FORBIDDEN_MERCHANT_OF_RECORD_PROVIDERS as readonly string[]).includes(normalized);
}

export function merchantOfRecordProviderError(provider: string): string {
  return (
    `PAYMENT_PROVIDER "${provider}" is a merchant-of-record checkout and cannot run STK. ` +
    'Card sales go through Paddle\'s own checkout (PADDLE_ENABLED); this product stays ' +
    'the seller of record for M-Pesa. Use stripe, africastalking, or live.'
  );
}

export function assertSelfMerchantOfRecordProvider(provider: string): void {
  if (isForbiddenMerchantOfRecordProvider(provider)) {
    throw new Error(merchantOfRecordProviderError(provider));
  }
}

/** SELLER_VAT_REGISTERED=true once Telpen Systems Ltd is VAT-registered. */
export function sellerVatRegistered(env: Record<string, string | undefined> = {}): boolean {
  return env.SELLER_VAT_REGISTERED?.trim().toLowerCase() === 'true';
}

/**
 * Whether a direct M-Pesa subscription sale needs the APPROVED tax profile
 * first: only once the company is VAT-registered (it must then charge and
 * file VAT itself). Before that, no VAT is due on the sale.
 */
export function mpesaSaleNeedsApprovedTaxProfile(env: Record<string, string | undefined> = {}): boolean {
  return sellerVatRegistered(env);
}

export function describeTaxOperatingModel(): string {
  return 'Cards: Paddle (it remits the tax). M-Pesa: this platform, no VAT until VAT-registered';
}
