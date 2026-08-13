/**
 * Phone normalization to E.164 — PURE & UNIT-TESTABLE.
 *
 * The phone number is the login identity AND the mobile-money identity: the SMS
 * OTP and the M-Pesa STK push both target the SAME E.164 number. Advertisers and
 * agents type many formats (0712…, 712 345 678, 254…, +254…), so we canonicalise
 * to E.164 (+2547XXXXXXXX) before storing or sending anything.
 *
 * Defaults to Kenya (+254); other E.164 numbers pass through unchanged.
 */
export interface NormalizePhoneOptions {
  /** Default calling code digits (no `+`), used for local formats. Kenya = "254". */
  defaultCountryCode?: string;
}

function cleanPhone(input: string): string {
  return input.trim().replace(/[\s()\-.]/g, '');
}

const E164_DIGITS = /^[1-9]\d{7,14}$/;

function e164OrNull(digits: string): string | null {
  return E164_DIGITS.test(digits) ? `+${digits}` : null;
}

/** Normalize a user-entered phone to E.164 (e.g. `+254712345678`), or null. */
export function toE164(input: string, options: NormalizePhoneOptions = {}): string | null {
  const cc = options.defaultCountryCode ?? '254';
  if (!input) return null;
  const s = cleanPhone(input);
  if (!s) return null;
  if (s.startsWith('+')) return e164OrNull(s.slice(1));
  if (s.startsWith('00')) return e164OrNull(s.slice(2));
  if (s.startsWith('0')) return e164OrNull(cc + s.slice(1));
  if (s.startsWith(cc)) return e164OrNull(s);
  return e164OrNull(cc + s);
}

/** True if the string is already a valid E.164 number. */
export function isE164(input: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(input.trim());
}
