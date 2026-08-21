import { describe, expect, it } from 'vitest';

import {
  buildOtpauthUri,
  decodeBase32,
  encodeBase32,
  generateTotpCode,
  generateTotpCodeFromSecret,
  generateTotpSecret,
  verifyTotpCode,
} from './totp';

describe('TOTP helpers', () => {
  it('matches RFC 6238 SHA-1 8-digit test vectors', () => {
    const secret = Buffer.from('12345678901234567890', 'ascii');
    expect(generateTotpCodeFromSecret(secret, 59_000, 8)).toBe('94287082');
    expect(generateTotpCodeFromSecret(secret, 1_111_111_109_000, 8)).toBe('07081804');
    expect(generateTotpCodeFromSecret(secret, 1_111_111_111_000, 8)).toBe('14050471');
    expect(generateTotpCodeFromSecret(secret, 1_234_567_890_000, 8)).toBe('89005924');
    expect(generateTotpCodeFromSecret(secret, 2_000_000_000_000, 8)).toBe('69279037');
  });

  it('verifies a current 6-digit code and rejects replay of the same step', () => {
    const secret = generateTotpSecret();
    const atMs = Date.parse('2026-08-21T18:00:00.000Z');
    const code = generateTotpCode(secret, atMs);

    expect(verifyTotpCode(secret, code, { atMs })).toEqual({
      ok: true,
      step: Math.floor(atMs / 1000 / 30),
    });
    expect(
      verifyTotpCode(secret, code, {
        atMs,
        lastUsedStep: Math.floor(atMs / 1000 / 30),
      }),
    ).toEqual({ ok: false });
    expect(verifyTotpCode(secret, '000000', { atMs })).toEqual({ ok: false });
    expect(verifyTotpCode(undefined, code, { atMs })).toEqual({ ok: false });
  });

  it('accepts adjacent time steps and builds an otpauth URI without extra algorithm params', () => {
    const secret = generateTotpSecret();
    const atMs = Date.parse('2026-08-21T18:00:15.000Z');
    const previous = generateTotpCode(secret, atMs - 30_000);

    expect(verifyTotpCode(secret, previous, { atMs }).ok).toBe(true);
    expect(Array.from(decodeBase32(encodeBase32(Uint8Array.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]))))).toEqual([
      0x48, 0x65, 0x6c, 0x6c, 0x6f,
    ]);

    const uri = buildOtpauthUri({
      issuer: 'SellFindConnect',
      account: 'owner@example.com',
      secret,
    });
    expect(uri).toContain(`otpauth://totp/${encodeURIComponent('SellFindConnect:owner@example.com')}`);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('issuer=SellFindConnect');
    expect(uri).not.toContain('algorithm=');
    expect(uri).not.toContain('digits=');
    expect(uri).not.toContain('period=');
  });
});
