import { HttpException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { InMemoryPhoneAuthRepository } from './in-memory-phone-auth.repository';
import { PhoneAuthService, smsFailureReason } from './phone-auth.service';

const ip = '203.0.113.7';
const details = {
  displayName: 'Amina Wanjiru',
  tenantDisplayName: 'Nairobi Fresh Produce',
  countryCode: 'KE',
  industryCode: 'AGRICULTURE',
  primaryRole: 'SUPPLIER' as const,
  userType: 'ADVERTISER' as const,
  acceptedTerms: true as const,
};

function setup() {
  const authRepository = new InMemoryAuthRepository();
  const phoneRepository = new InMemoryPhoneAuthRepository();
  const sent: Array<{ to: string; message: string }> = [];
  const sms = {
    sendSms: async (to: string, message: string) => {
      sent.push({ to, message });
      return { ok: true, raw: {} };
    },
  };
  const auth = new AuthService(authRepository, sms, undefined, undefined, phoneRepository);
  const phone = new PhoneAuthService(auth, phoneRepository, sms);
  return { auth, phone, sent, authRepository, phoneRepository };
}

function codeFrom(response: { developmentCode?: string }): string {
  expect(response.developmentCode).toMatch(/^\d{6}$/);
  return response.developmentCode ?? '';
}

async function signUp(service: PhoneAuthService, number = '0712345678') {
  const code = codeFrom(await service.requestCode(number, ip));
  const verified = await service.verifyCode(number, code, ip);
  if (verified.result.status !== 'REGISTRATION_REQUIRED') throw new Error('expected registration');
  return service.register({ ...details, registrationToken: verified.result.registrationToken });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('PhoneAuthService', () => {
  it('signs up with phone + SMS code, no email or password, and the session satisfies MFA', async () => {
    const { auth, phone, sent } = setup();
    const registered = await signUp(phone);

    expect(sent[0]?.to).toBe('+254712345678');
    expect(sent[0]?.message).toMatch(/expires in 5 minutes/);
    expect(registered.result.user.email).toBeUndefined();
    expect(registered.result.user.phone).toBe('+254712345678');
    expect(registered.result.pinSet).toBe(false);
    expect(registered.deviceToken.length).toBeGreaterThan(20);
    const decision = await auth.checkTenantSession({
      tenantId: registered.result.tenant?.id ?? '',
      sessionToken: registered.result.session.token ?? '',
    });
    expect(decision.mfaVerified).toBe(true);
    expect(decision.role).toBe('OWNER');
  });

  it('keeps tenant isolation: a phone session cannot act for another tenant', async () => {
    const { auth, phone } = setup();
    const first = await signUp(phone, '0712345678');
    const second = await signUp(phone, '0722000111');

    await expect(
      auth.checkTenantSession({
        tenantId: second.result.tenant?.id ?? '',
        sessionToken: first.result.session.token ?? '',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('gives a typed phone number nothing: no session, no device, no account hints', async () => {
    const { phone } = setup();
    await signUp(phone, '0712345678');

    await expect(phone.verifyCode('0712345678', '000000', ip)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(phone.signInWithPin('4829', undefined, ip)).rejects.toMatchObject({
      response: { code: 'SMS_REQUIRED' },
    });
    await expect(phone.deviceStatus(undefined)).resolves.toEqual({ trusted: false });
    const known = await phone.requestCode('0712345678', '198.51.100.1');
    const unknown = await phone.requestCode('0733999888', '198.51.100.1');
    expect(Object.keys(known).sort()).toEqual(Object.keys(unknown).sort());
  });

  it('expires codes after 5 minutes and uses each code once', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T09:00:00.000Z'));
    const { phone } = setup();
    const code = codeFrom(await phone.requestCode('0712345678', ip));
    vi.setSystemTime(new Date('2026-11-07T09:05:01.000Z'));
    await expect(phone.verifyCode('0712345678', code, ip)).rejects.toBeInstanceOf(UnauthorizedException);

    const fresh = codeFrom(await phone.requestCode('0712345678', ip));
    await expect(phone.verifyCode('0712345678', fresh, ip)).resolves.toBeTruthy();
    await expect(phone.verifyCode('0712345678', fresh, ip)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('burns a code after 5 wrong tries', async () => {
    const { phone } = setup();
    const code = codeFrom(await phone.requestCode('0712345678', ip));
    const wrong = code === '111111' ? '222222' : '111111';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(phone.verifyCode('0712345678', wrong, ip)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(phone.verifyCode('0712345678', code, ip)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rate limits SMS codes per number and per IP', async () => {
    const { phone } = setup();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await phone.requestCode('0712345678', `198.51.100.${attempt}`);
    }
    await expect(phone.requestCode('0712345678', '198.51.100.9')).rejects.toBeInstanceOf(HttpException);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await phone.requestCode(`07120000${String(attempt).padStart(2, '0')}`, '192.0.2.50');
    }
    await expect(phone.requestCode('0799000000', '192.0.2.50')).rejects.toMatchObject({ status: 429 });
  });

  it('signs in with PIN on the trusted device, locks after 5 wrong PINs, and a new SMS code unlocks', async () => {
    const { phone } = setup();
    const registered = await signUp(phone);
    const device = registered.deviceToken;
    const session = registered.result.session.token ?? '';

    await expect(phone.setPin(session, '1234', device)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(phone.setPin(session, '4829', device)).resolves.toMatchObject({ result: { pinSet: true } });

    const signedIn = await phone.signInWithPin('4829', device, ip);
    expect(signedIn.session.mfaVerified).toBe(true);
    await expect(phone.deviceStatus(device)).resolves.toMatchObject({ trusted: true, pinSet: true, pinLocked: false });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(phone.signInWithPin('9999', device, ip)).rejects.toMatchObject({
        response: { code: 'PIN_WRONG', attemptsLeft: 5 - attempt },
      });
    }
    await expect(phone.signInWithPin('9999', device, ip)).rejects.toMatchObject({ response: { code: 'PIN_LOCKED' } });
    await expect(phone.signInWithPin('4829', device, ip)).rejects.toMatchObject({ response: { code: 'PIN_LOCKED' } });

    const code = codeFrom(await phone.requestCode('0712345678', ip));
    await expect(phone.verifyCode('0712345678', code, ip)).resolves.toMatchObject({ result: { status: 'SIGNED_IN', pinSet: true } });
    await expect(phone.signInWithPin('4829', device, ip)).resolves.toMatchObject({ status: 'SIGNED_IN' });
  });

  it('refuses the PIN with another or a revoked device token', async () => {
    const { phone } = setup();
    const owner = await signUp(phone, '0712345678');
    await phone.setPin(owner.result.session.token ?? '', '4829', owner.deviceToken);

    await expect(phone.signInWithPin('4829', 'x'.repeat(43), ip)).rejects.toMatchObject({
      response: { code: 'SMS_REQUIRED' },
    });
    await phone.forgetDevice(owner.deviceToken);
    await expect(phone.signInWithPin('4829', owner.deviceToken, ip)).rejects.toMatchObject({
      response: { code: 'SMS_REQUIRED' },
    });
  });

  it('revokes devices and the PIN on account deletion', async () => {
    const { auth, phone } = setup();
    const owner = await signUp(phone);
    await phone.setPin(owner.result.session.token ?? '', '4829', owner.deviceToken);

    await auth.revokeSessionsForAccountDeletion(owner.result.user.id);
    await expect(phone.signInWithPin('4829', owner.deviceToken, ip)).rejects.toMatchObject({
      response: { code: 'SMS_REQUIRED' },
    });
  });

  it('lets the Google Play reviewer phone sign in with PLAY_REVIEW_CODE only when set, without an SMS', async () => {
    const { phone, sent } = setup();
    await signUp(phone, '0700111222');
    sent.length = 0;

    await expect(phone.verifyCode('0700111222', '246810', ip)).rejects.toBeInstanceOf(UnauthorizedException);

    vi.stubEnv('PLAY_REVIEW_PHONE', '+254700111222');
    vi.stubEnv('PLAY_REVIEW_CODE', '246810');
    await expect(phone.requestCode('0700111222', ip)).resolves.toEqual({ sent: true, expiresInSeconds: 300 });
    expect(sent).toHaveLength(0);
    await expect(phone.verifyCode('0700111222', '246810', ip)).resolves.toMatchObject({
      result: { status: 'SIGNED_IN' },
    });
    await expect(phone.verifyCode('0700111223', '246810', '192.0.2.99')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('smsFailureReason', () => {
  it('names the provider reason without keys or numbers', () => {
    expect(smsFailureReason({ error: 'africastalking_not_configured' })).toBe('africastalking_not_configured');
    expect(
      smsFailureReason({ SMSMessageData: { Recipients: [{ status: 'InsufficientBalance', statusCode: 405 }] } }),
    ).toBe('InsufficientBalance (405)');
    expect(smsFailureReason({ SMSMessageData: { Message: 'InvalidSenderId', Recipients: [] } })).toBe('InvalidSenderId');
    expect(smsFailureReason(undefined)).toBe('no provider response');
  });
});
