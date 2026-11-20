import { ForbiddenException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { InMemoryPhoneAuthRepository } from './in-memory-phone-auth.repository';
import { PhoneAuthService } from './phone-auth.service';

/** Owner 20/11/26: phone + PIN, staff PIN reset codes, no SMS. */
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
  const auth = new AuthService(authRepository, undefined, undefined, phoneRepository);
  const phone = new PhoneAuthService(auth, phoneRepository);
  return { auth, phone, authRepository, phoneRepository };
}

async function signUp(service: PhoneAuthService, number = '0712345678', pin = '4829') {
  const started = await service.start(number, ip);
  if (started.next !== 'register') throw new Error('expected registration');
  return service.register({ ...details, registrationToken: started.registrationToken, pin });
}

/** Pretend the caller is support staff with an MFA-verified session. */
function asStaff(auth: AuthService) {
  vi.spyOn(auth, 'getSession').mockResolvedValue({ session: { userId: 'staff-1', mfaVerified: true } } as never);
  const real = auth.isStaffUser.bind(auth);
  vi.spyOn(auth, 'isStaffUser').mockImplementation(async (userId: string) => userId === 'staff-1' || real(userId));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('PhoneAuthService (no SMS)', () => {
  it('signs up with phone + PIN, no email, password or SMS, and the session satisfies MFA', async () => {
    const { auth, phone } = setup();
    const registered = await signUp(phone);

    expect(registered.result.user.email).toBeUndefined();
    expect(registered.result.user.phone).toBe('+254712345678');
    expect(registered.result.pinSet).toBe(true);
    expect(registered.deviceToken.length).toBeGreaterThan(20);
    const decision = await auth.checkTenantSession({
      tenantId: registered.result.tenant?.id ?? '',
      sessionToken: registered.result.session.token ?? '',
    });
    expect(decision.mfaVerified).toBe(true);
    expect(decision.role).toBe('OWNER');
  });

  it('refuses a guessable PIN at sign-up', async () => {
    const { phone } = setup();
    const started = await phone.start('0712345678', ip);
    if (started.next !== 'register') throw new Error('expected registration');
    await expect(phone.register({ ...details, registrationToken: started.registrationToken, pin: '1234' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
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

  it('gives a typed phone number nothing without the PIN; unknown number and wrong PIN look the same', async () => {
    const { phone } = setup();
    await signUp(phone, '0712345678');

    const wrong = await phone.signInWithPin('9137', undefined, ip, '0712345678').catch((e: { response?: { message?: string } }) => e.response?.message);
    const unknown = await phone.signInWithPin('9137', undefined, '198.51.100.2', '0733999888').catch((e: { response?: { message?: string } }) => e.response?.message);
    expect(String(wrong)).toMatch(/do not match/);
    expect(String(unknown)).toMatch(/do not match/);
    await expect(phone.signInWithPin('4829', undefined, ip)).rejects.toMatchObject({ response: { code: 'RESET_REQUIRED' } });
    await expect(phone.deviceStatus(undefined)).resolves.toEqual({ trusted: false });
  });

  it('signs in with phone + PIN on any device; locks after 5 wrong PINs', async () => {
    const { phone } = setup();
    await signUp(phone);

    const elsewhere = await phone.signInWithPin('4829', undefined, ip, '0712345678');
    expect(elsewhere.result.session.mfaVerified).toBe(true);
    expect(elsewhere.deviceToken?.length).toBeGreaterThan(20);
    await expect(phone.start('0712345678', ip)).resolves.toEqual({ next: 'pin' });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(phone.signInWithPin('9999', elsewhere.deviceToken, ip)).rejects.toMatchObject({
        response: { code: 'PIN_WRONG', attemptsLeft: 5 - attempt },
      });
    }
    await expect(phone.signInWithPin('9999', elsewhere.deviceToken, ip)).rejects.toMatchObject({ response: { code: 'PIN_LOCKED' } });
    await expect(phone.signInWithPin('4829', undefined, '198.51.100.3', '0712345678')).rejects.toMatchObject({
      response: { code: 'PIN_LOCKED' },
    });
    await expect(phone.start('0712345678', ip)).resolves.toEqual({ next: 'reset' });
  });

  it('a support reset code unlocks: one phone, once, then a new PIN', async () => {
    const { auth, phone } = setup();
    const owner = await signUp(phone);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await phone.signInWithPin('9999', owner.deviceToken, ip).catch(() => undefined);
    }

    asStaff(auth);
    const issued = await phone.issueResetCode('staff-session-token', '0712345678');
    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.message).toContain(issued.code);
    expect(issued.message).not.toMatch(/https?:/);
    vi.restoreAllMocks();

    await expect(phone.redeemResetCode('0722000111', issued.code, ip)).rejects.toBeInstanceOf(UnauthorizedException);
    const redeemed = await phone.redeemResetCode('0712345678', issued.code, ip);
    expect(redeemed.result.pinSet).toBe(false);
    expect(redeemed.result.session.mfaVerified).toBe(true);
    await expect(phone.redeemResetCode('0712345678', issued.code, ip)).rejects.toBeInstanceOf(UnauthorizedException);

    await phone.setPin(redeemed.result.session.token ?? '', '6071', redeemed.deviceToken);
    await expect(phone.signInWithPin('6071', undefined, ip, '0712345678')).resolves.toMatchObject({
      result: { status: 'SIGNED_IN' },
    });
  });

  it('burns a reset code after 5 wrong tries and expires it after 48 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T09:00:00.000Z'));
    const { auth, phone } = setup();
    await signUp(phone);
    asStaff(auth);
    const first = await phone.issueResetCode('staff-session-token', '0712345678');
    const wrong = first.code === '111111' ? '222222' : '111111';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(phone.redeemResetCode('0712345678', wrong, `198.51.100.${attempt}`)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(phone.redeemResetCode('0712345678', first.code, ip)).rejects.toBeInstanceOf(UnauthorizedException);

    const second = await phone.issueResetCode('staff-session-token', '0712345678');
    vi.setSystemTime(new Date('2026-11-22T09:00:01.000Z'));
    await expect(phone.redeemResetCode('0712345678', second.code, ip)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('only MFA-verified support staff may give reset codes', async () => {
    const { phone } = setup();
    const owner = await signUp(phone);
    await expect(phone.issueResetCode(owner.result.session.token ?? '', '0712345678')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes devices and the PIN on account deletion', async () => {
    const { auth, phone } = setup();
    const owner = await signUp(phone);

    await auth.revokeSessionsForAccountDeletion(owner.result.user.id);
    await expect(phone.signInWithPin('4829', owner.deviceToken, ip)).rejects.toBeTruthy();
  });

  it('lets the Google Play reviewer sign in with PLAY_REVIEW_PIN only when set', async () => {
    const { phone } = setup();
    await signUp(phone, '0700111222', '5823');

    await expect(phone.signInWithPin('2580', undefined, ip, '0700111222')).rejects.toBeInstanceOf(UnauthorizedException);
    vi.stubEnv('PLAY_REVIEW_PHONE', '+254700111222');
    vi.stubEnv('PLAY_REVIEW_PIN', '2580');
    await expect(phone.signInWithPin('2580', undefined, '192.0.2.98', '0700111222')).resolves.toMatchObject({
      result: { status: 'SIGNED_IN' },
    });
    await expect(phone.signInWithPin('2580', undefined, '192.0.2.99', '0700111223')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
