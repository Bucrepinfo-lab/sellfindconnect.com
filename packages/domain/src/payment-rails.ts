/**
 * Which ways a customer can pay for the subscription, by country, best first
 * (owner rules 19/11/26):
 *
 * 1. Where one local method is the most convenient for most people AND we can
 *    charge it, it leads. Kenya: M-Pesa holds 89.1% of 53.4 million mobile
 *    money subscriptions (Communications Authority of Kenya, Q3 FY 2025/26,
 *    March 2026); most Kenyans pay by M-Pesa, not by card. M-Pesa is a direct
 *    sale with no VAT until the company is VAT-registered.
 * 2. Paddle wherever Paddle sells: first where no such local method can be
 *    charged, and second (for card payers) where one leads. Paddle is the
 *    merchant of record and remits the tax before the money reaches us.
 * 3. Where Paddle does not sell: another merchant of record that remits the
 *    tax. Checked 19/11/26: none takes M-Pesa or African mobile money (Dodo
 *    Payments lists cards, wallets and some Asian/European methods only), and
 *    they block the same sanctioned countries. None to add today.
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

/**
 * Countries whose most convenient local method we can charge today, and so
 * lead with it: Kenya, M-Pesa by STK (Africa's Talking).
 */
export const MPESA_COUNTRIES: ReadonlySet<string> = new Set(['KE']);

export type SubscriptionRail = 'PADDLE' | 'MPESA' | 'NONE';

/** Every way to pay here, best first; empty when there is none yet. */
export function subscriptionRails(input: {
  country: string | null | undefined;
  paddleOn: boolean;
}): Array<Exclude<SubscriptionRail, 'NONE'>> {
  const code = (input.country ?? '').trim().toUpperCase();
  const rails: Array<Exclude<SubscriptionRail, 'NONE'>> = [];
  if (MPESA_COUNTRIES.has(code)) rails.push('MPESA');
  if (input.paddleOn && paddleSellsIn(code)) rails.push('PADDLE');
  return rails;
}

/** The leading way to pay here, or NONE. */
export function subscriptionRail(input: { country: string | null | undefined; paddleOn: boolean }): SubscriptionRail {
  return subscriptionRails(input)[0] ?? 'NONE';
}
