import { ForbiddenException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { InMemoryPhoneAuthRepository } from './in-memory-phone-auth.repository';
import { PhoneAuthService } from './phone-auth.service';

/** Owner 20/11/26: phone + PIN, no SMS. 26/11/26: no codes; no PIN yet → choose one; support clears a forgotten PIN. */
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
    await expect(phone.start('0712345678', ip)).resolves.toEqual({ next: 'locked' });
  });

  it('an account with no PIN chooses one at sign-in: no code, and never over an existing PIN', async () => {
    const { phone, phoneRepository } = setup();
    const owner = await signUp(phone);
    await phoneRepository.deletePin(owner.result.user.id); // e.g. opened in the SMS days

    await expect(phone.signInWithPin('4829', undefined, ip, '0712345678')).rejects.toMatchObject({ response: { code: 'PIN_NOT_SET' } });
    const first = await phone.start('0712345678', ip);
    const second = await phone.start('0712345678', ip);
    if (first.next !== 'set' || second.next !== 'set') throw new Error('expected first-PIN step');

    await expect(phone.setFirstPin(first.pinToken, '1234', ip)).rejects.toBeInstanceOf(UnprocessableEntityException);
    const chosen = await phone.setFirstPin(first.pinToken, '6071', ip);
    expect(chosen.result.pinSet).toBe(true);
    expect(chosen.result.session.mfaVerified).toBe(true);
    // The other open ticket cannot replace the PIN now that one exists.
    await expect(phone.setFirstPin(second.pinToken, '3958', ip)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(phone.start('0712345678', ip)).resolves.toEqual({ next: 'pin' });
    await expect(phone.signInWithPin('6071', undefined, ip, '0712345678')).resolves.toMatchObject({ result: { status: 'SIGNED_IN' } });
  });

  it('keeps the two tickets apart: a first-PIN ticket cannot register, a registration ticket cannot set a PIN', async () => {
    const { phone, phoneRepository } = setup();
    const owner = await signUp(phone);
    await phoneRepository.deletePin(owner.result.user.id);
    const set = await phone.start('0712345678', ip);
    const fresh = await phone.start('0733444555', ip);
    if (set.next !== 'set' || fresh.next !== 'register') throw new Error('unexpected steps');

    await expect(phone.register({ ...details, registrationToken: set.pinToken, pin: '4829' })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(phone.setFirstPin(fresh.registrationToken, '4829', ip)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a first-PIN ticket expires after 30 minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T09:00:00.000Z'));
    const { phone, phoneRepository } = setup();
    const owner = await signUp(phone);
    await phoneRepository.deletePin(owner.result.user.id);
    const set = await phone.start('0712345678', ip);
    if (set.next !== 'set') throw new Error('expected first-PIN step');
    vi.setSystemTime(new Date('2026-11-26T09:30:01.000Z'));
    await expect(phone.setFirstPin(set.pinToken, '6071', ip)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('support clears a locked PIN; the person then chooses a new one with no code', async () => {
    const { auth, phone } = setup();
    const owner = await signUp(phone);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await phone.signInWithPin('9999', owner.deviceToken, ip).catch(() => undefined);
    }
    await expect(phone.start('0712345678', ip)).resolves.toEqual({ next: 'locked' });

    asStaff(auth);
    const cleared = await phone.clearPin('staff-session-token', '0712345678');
    expect(cleared.cleared).toBe(true);
    expect(cleared.message).not.toMatch(/\d{6}/);
    vi.restoreAllMocks();

    const set = await phone.start('0712345678', ip);
    if (set.next !== 'set') throw new Error('expected first-PIN step after clearing');
    await phone.setFirstPin(set.pinToken, '6071', ip);
    await expect(phone.signInWithPin('6071', undefined, ip, '0712345678')).resolves.toMatchObject({ result: { status: 'SIGNED_IN' } });
  });

  it('only MFA-verified support staff may clear a PIN', async () => {
    const { phone } = setup();
    const owner = await signUp(phone);
    await expect(phone.clearPin(owner.result.session.token ?? '', '0712345678')).rejects.toBeInstanceOf(ForbiddenException);
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

  // My profile (owner 26/11/26).
  it('lets a person change their own name, and refuses numbers, websites and unsafe words', async () => {
    const { auth, phone } = setup();
    const owner = await signUp(phone);
    const token = owner.result.session.token ?? '';

    await expect(phone.changeOwnName(token, '  Amina   W. Kamau ')).resolves.toEqual({ displayName: 'Amina W. Kamau' });
    expect((await auth.getSession(token)).user?.displayName).toBe('Amina W. Kamau');
    await expect(phone.changeOwnName(token, '0712345678')).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(phone.changeOwnName(token, 'Buy at shop.com')).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(phone.changeOwnName('not-a-session', 'Amina')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('moves the account to a new number only with the right PIN; the old number stops working', async () => {
    const { phone } = setup();
    const owner = await signUp(phone);
    const token = owner.result.session.token ?? '';

    await expect(phone.changeOwnPhone(token, '0722000111', '0000', ip)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(phone.changeOwnPhone(token, '0712345678', '4829', ip)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(phone.changeOwnPhone(token, '12', '4829', ip)).rejects.toBeInstanceOf(UnprocessableEntityException);

    await expect(phone.changeOwnPhone(token, '0722000111', '4829', ip)).resolves.toMatchObject({ phone: '+254722000111' });
    await expect(phone.signInWithPin('4829', undefined, ip, '0722000111')).resolves.toMatchObject({ result: { status: 'SIGNED_IN' } });
    await expect(phone.signInWithPin('4829', undefined, ip, '0712345678')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a number that already has an account, and locks after five wrong PINs', async () => {
    const { phone } = setup();
    const owner = await signUp(phone);
    await signUp(phone, '0733000222', '6071');
    const token = owner.result.session.token ?? '';

    await expect(phone.changeOwnPhone(token, '0733000222', '4829', ip)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(phone.signInWithPin('6071', undefined, ip, '0733000222')).resolves.toMatchObject({ result: { status: 'SIGNED_IN' } });

    for (let i = 0; i < 5; i += 1) {
      await expect(phone.changeOwnPhone(token, '0722000111', '0000', ip)).rejects.toBeTruthy();
    }
    await expect(phone.changeOwnPhone(token, '0722000111', '4829', ip)).rejects.toBeTruthy();
    await expect(phone.signInWithPin('4829', undefined, ip, '0712345678')).rejects.toBeTruthy();
  });
});
