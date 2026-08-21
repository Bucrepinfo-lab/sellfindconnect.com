import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW = 1;
const TOTP_SECRET_BYTES = 20;

export const totpDefaults = {
  algorithm: 'SHA1',
  digits: TOTP_DIGITS,
  periodSeconds: TOTP_PERIOD_SECONDS,
  window: TOTP_WINDOW,
} as const;

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32(input: string): Uint8Array {
  const normalized = input.replace(/=+$/g, '').toUpperCase().replace(/[\s-]/g, '');
  if (!normalized) {
    throw new Error('Authenticator secret is required.');
  }

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new Error('Authenticator secret is invalid.');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

export function generateTotpSecret(bytes = TOTP_SECRET_BYTES): string {
  return encodeBase32(randomBytes(bytes));
}

export function generateTotpCodeFromSecret(
  secret: Uint8Array | string,
  atMs = Date.now(),
  digits = TOTP_DIGITS,
): string {
  const key = typeof secret === 'string' ? decodeBase32(secret) : secret;
  return hotp(key, Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS), digits);
}

export function generateTotpCode(secretBase32: string, atMs = Date.now()): string {
  return generateTotpCodeFromSecret(secretBase32, atMs);
}

export function totpTimeStep(atMs = Date.now()): number {
  return Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
}

export type TotpVerifyResult = {
  ok: boolean;
  step?: number;
};

export function verifyTotpCode(
  secretBase32: string | undefined,
  code: string,
  options?: { atMs?: number; window?: number; lastUsedStep?: number },
): TotpVerifyResult {
  if (!secretBase32 || !/^\d{6}$/.test(code)) {
    return { ok: false };
  }

  let secret: Uint8Array;
  try {
    secret = decodeBase32(secretBase32);
  } catch {
    return { ok: false };
  }

  const atMs = options?.atMs ?? Date.now();
  const window = options?.window ?? TOTP_WINDOW;
  const currentStep = totpTimeStep(atMs);
  const expected = Buffer.from(code);

  for (let offset = -window; offset <= window; offset += 1) {
    const step = currentStep + offset;
    if (step < 0 || step === options?.lastUsedStep) {
      continue;
    }
    const candidate = Buffer.from(hotp(secret, step, TOTP_DIGITS));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return { ok: true, step };
    }
  }

  return { ok: false };
}

export function buildOtpauthUri(input: {
  issuer: string;
  account: string;
  secret: string;
}): string {
  const issuer = input.issuer.trim() || 'Telpen Adverts';
  const account = input.account.trim();
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: input.secret.replace(/=+$/g, ''),
    issuer,
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function hotp(secret: Uint8Array, counter: number, digits: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', Buffer.from(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}
