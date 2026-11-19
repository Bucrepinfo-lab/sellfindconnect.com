/**
 * Which way a customer pays for the subscription, by country (owner rule
 * 19/11/26):
 *
 * 1. Paddle wherever Paddle sells, Kenya included. Paddle is the merchant of
 *    record: it charges the tax and remits it to the country's tax authority
 *    before the money reaches us, so there is no tax work on our side.
 * 2. Where Paddle does not sell, another merchant of record that remits the
 *    tax. Checked 19/11/26: none takes M-Pesa or African mobile money (Dodo
 *    Payments lists cards, wallets and a few Asian/European methods only), and
 *    the countries Paddle blocks are blocked by the others for the same
 *    sanctions and risk reasons. So there is no such option today.
 * 3. Otherwise the most popular local method: M-Pesa in Kenya (the one we can
 *    charge, through Africa's Talking). M-Pesa is a direct sale with no VAT
 *    until the company is VAT-registered.
 *
 * While Paddle is switched off (keys not set, or the Paddle account still in
 * review), M-Pesa stays the way to pay in Kenya.
 */

/**
 * Countries Paddle cannot sell into (Paddle help centre, "Which countries are
 * supported by Paddle", read 19/11/26). Occupied regions of Ukraine are also
 * blocked by Paddle but have no country code of their own.
 */
export const PADDLE_BLOCKED_COUNTRIES: ReadonlySet<string> = new Set([
  'AF', // Afghanistan
  'AQ', // Antarctica
  'BY', // Belarus
  'MM', // Burma (Myanmar)
  'CF', // Central African Republic
  'CU', // Cuba
  'CD', // Democratic Republic of Congo
  'HT', // Haiti
  'IR', // Iran
  'IQ', // Iraq
  'LY', // Libya
  'ML', // Mali
  'AN', // Netherlands Antilles
  'NI', // Nicaragua
  'KP', // North Korea
  'RU', // Russia
  'SO', // Somalia
  'SS', // South Sudan
  'SD', // Sudan
  'SY', // Syria
  'VE', // Venezuela
  'YE', // Yemen
  'ZW', // Zimbabwe
]);

export function paddleSellsIn(country: string | null | undefined): boolean {
  const code = (country ?? '').trim().toUpperCase();
  return code.length === 2 && !PADDLE_BLOCKED_COUNTRIES.has(code);
}

/** Countries where we can charge M-Pesa by STK today (Africa's Talking). */
export const MPESA_COUNTRIES: ReadonlySet<string> = new Set(['KE']);

export type SubscriptionRail = 'PADDLE' | 'MPESA' | 'NONE';

export function subscriptionRail(input: { country: string | null | undefined; paddleOn: boolean }): SubscriptionRail {
  const code = (input.country ?? '').trim().toUpperCase();
  if (input.paddleOn && paddleSellsIn(code)) return 'PADDLE';
  if (MPESA_COUNTRIES.has(code)) return 'MPESA';
  return 'NONE';
}
