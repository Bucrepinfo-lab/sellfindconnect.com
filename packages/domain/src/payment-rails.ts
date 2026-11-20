/**
 * Which ways a customer can pay for the subscription, by country, best first.
 *
 * Owner standing order (19/11/26), every product and every country: always
 * lead with the way most people in that country pay, so no subscriber is lost.
 * The card never leads; it comes later, and a card payment goes through Paddle,
 * which takes the payment and remits the VAT.
 *
 * - Kenya: M-Pesa (89.1% of 53.4 million mobile money subscriptions, CA Kenya,
 *   March 2026), charged by STK on the payer's own phone.
 * - Mobile money countries (pawaPay): MTN MoMo, Airtel Money, Orange Money,
 *   M-Pesa Tanzania, Wave and others. Card penetration is under 30% in most of
 *   sub-Saharan Africa.
 * - Nigeria: bank transfer and USSD (Paystack). South Africa: instant EFT
 *   (Paystack).
 * - Everywhere else (including developed countries): Paddle's checkout, which
 *   itself shows each country's popular methods (PayPal, iDEAL, Pix, UPI and
 *   others) beside cards.
 *
 * Local methods are direct sales by Telpen Systems Ltd (the VAT is ours);
 * Paddle remits the VAT on what it sells. A local way only opens where its
 * provider is switched on AND the owner has approved that country's price.
 */

export type SubscriptionRail = 'MPESA' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'PADDLE' | 'NONE';
export type PayRail = Exclude<SubscriptionRail, 'NONE'>;

/**
 * Countries Paddle cannot sell into (Paddle help centre, "Which countries are
 * supported by Paddle", read 19/11/26). Occupied regions of Ukraine are also
 * blocked by Paddle but have no country code of their own.
 */
export const PADDLE_BLOCKED_COUNTRIES: ReadonlySet<string> = new Set([
  'AF', 'AQ', 'BY', 'MM', 'CF', 'CU', 'CD', 'HT', 'IR', 'IQ', 'LY', 'ML',
  'AN', 'NI', 'KP', 'RU', 'SO', 'SS', 'SD', 'SY', 'VE', 'YE', 'ZW',
]);

export function paddleSellsIn(country: string | null | undefined): boolean {
  const code = (country ?? '').trim().toUpperCase();
  return code.length === 2 && !PADDLE_BLOCKED_COUNTRIES.has(code);
}

/** The way most people pay, per country we can charge it in, and its currency. */
export const LOCAL_METHOD: Readonly<Record<string, { rail: Exclude<PayRail, 'PADDLE'>; label: string; currency: string }>> = {
  KE: { rail: 'MPESA', label: 'M-Pesa', currency: 'KES' },
  UG: { rail: 'MOBILE_MONEY', label: 'MTN MoMo or Airtel Money', currency: 'UGX' },
  TZ: { rail: 'MOBILE_MONEY', label: 'M-Pesa, Mixx, Airtel Money or Halopesa', currency: 'TZS' },
  RW: { rail: 'MOBILE_MONEY', label: 'MTN MoMo or Airtel Money', currency: 'RWF' },
  GH: { rail: 'MOBILE_MONEY', label: 'MTN MoMo, Telecel Cash or AirtelTigo Money', currency: 'GHS' },
  ZM: { rail: 'MOBILE_MONEY', label: 'MTN MoMo, Airtel Money or Zamtel Kwacha', currency: 'ZMW' },
  MW: { rail: 'MOBILE_MONEY', label: 'Airtel Money or TNM Mpamba', currency: 'MWK' },
  MZ: { rail: 'MOBILE_MONEY', label: 'M-Pesa (Vodacom)', currency: 'MZN' },
  CM: { rail: 'MOBILE_MONEY', label: 'MTN MoMo or Orange Money', currency: 'XAF' },
  CI: { rail: 'MOBILE_MONEY', label: 'Orange Money, MTN MoMo, Moov or Wave', currency: 'XOF' },
  SN: { rail: 'MOBILE_MONEY', label: 'Wave, Orange Money or Free Money', currency: 'XOF' },
  BJ: { rail: 'MOBILE_MONEY', label: 'MTN MoMo or Moov Money', currency: 'XOF' },
  BF: { rail: 'MOBILE_MONEY', label: 'Orange Money or Moov Money', currency: 'XOF' },
  CG: { rail: 'MOBILE_MONEY', label: 'MTN MoMo or Airtel Money', currency: 'XAF' },
  GA: { rail: 'MOBILE_MONEY', label: 'Airtel Money or Moov Money', currency: 'XAF' },
  SL: { rail: 'MOBILE_MONEY', label: 'Orange Money', currency: 'SLE' },
  // Added 20/11/26 from pawaPay's provider list (docs.pawapay.io/v2/docs/providers).
  // Paddle does not sell in CD or ZW, so mobile money is the only way there.
  CD: { rail: 'MOBILE_MONEY', label: 'Vodacom M-Pesa, Airtel Money or Orange Money', currency: 'CDF' },
  LS: { rail: 'MOBILE_MONEY', label: 'M-Pesa', currency: 'LSL' },
  ZW: { rail: 'MOBILE_MONEY', label: 'EcoCash', currency: 'USD' },
  ET: { rail: 'MOBILE_MONEY', label: 'telebirr, M-Pesa or CBE Birr', currency: 'ETB' },
  NG: { rail: 'BANK_TRANSFER', label: 'bank transfer or USSD', currency: 'NGN' },
  ZA: { rail: 'BANK_TRANSFER', label: 'instant EFT', currency: 'ZAR' },
};

export function localMethodFor(country: string | null | undefined) {
  return LOCAL_METHOD[(country ?? '').trim().toUpperCase()] ?? null;
}

export type RailSwitches = { mpesa?: boolean; pawapay: boolean; paystack: boolean; paddle: boolean };

/**
 * Every way to pay here, best first: the local way (when its provider is on
 * and `localPriceApproved`), then Paddle (when on and it sells here).
 */
export function subscriptionRails(input: {
  country: string | null | undefined;
  paddleOn?: boolean;
  switches?: Partial<RailSwitches>;
  localPriceApproved?: boolean;
}): PayRail[] {
  const code = (input.country ?? '').trim().toUpperCase();
  const s: RailSwitches = {
    mpesa: input.switches?.mpesa ?? true,
    pawapay: input.switches?.pawapay ?? false,
    paystack: input.switches?.paystack ?? false,
    paddle: input.switches?.paddle ?? input.paddleOn ?? false,
  };
  const rails: PayRail[] = [];
  const local = LOCAL_METHOD[code];
  const priced = input.localPriceApproved ?? true;
  if (local && priced) {
    const providerOn = local.rail === 'MPESA' ? s.mpesa : local.rail === 'MOBILE_MONEY' ? s.pawapay : s.paystack;
    if (providerOn) rails.push(local.rail);
  }
  if (s.paddle && paddleSellsIn(code)) rails.push('PADDLE');
  return rails;
}

/** The leading way to pay here, or NONE. */
export function subscriptionRail(input: Parameters<typeof subscriptionRails>[0]): SubscriptionRail {
  return subscriptionRails(input)[0] ?? 'NONE';
}
