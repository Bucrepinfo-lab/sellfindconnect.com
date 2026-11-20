import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toE164 } from '@telpen/domain';
import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

import { AuthService } from './auth.service';
import type { RegisterPhoneOwnerDto } from './dto/phone-auth.dto';
import { InMemoryPhoneAuthRepository } from './in-memory-phone-auth.repository';
import {
  PHONE_AUTH_REPOSITORY,
  type PhoneAuthRepository,
  type TrustedDeviceRecord,
} from './phone-auth.repository';
import { SlidingWindowLimiter } from './rate-limiter';

export const RESET_CODE_TTL_MS = 48 * 60 * 60 * 1000;
export const RESET_CODE_MAX_ATTEMPTS = 5;
export const PIN_MAX_ATTEMPTS = 5;
const REGISTRATION_TICKET_TTL_MS = 30 * 60 * 1000;
export const TRUSTED_DEVICE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '1212', '0123', '9876']);

const NO_MATCH = 'That phone number and PIN do not match.';
const ASK_SUPPORT = 'Ask SellFindConnect support for a PIN reset code.';
const GENERIC_CODE_ERROR = 'That reset code is wrong or has expired. Ask support for a new one.';

export type PhoneSignInResult = Awaited<ReturnType<AuthService['issuePhoneVerifiedSession']>> & {
  status: 'SIGNED_IN';
  pinSet: boolean;
};

function tooMany(): HttpException {
  return new HttpException('Too many attempts. Wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);
}

function resetRequired(code: 'RESET_REQUIRED' | 'PIN_LOCKED' | 'PIN_NOT_SET', message: string): UnauthorizedException {
  return new UnauthorizedException({ code, message });
}

/**
 * Phone sign-in without SMS (owner 20/11/26). Step 1 the phone number, step 2
 * the person's own 4-digit PIN — on any device. A new number registers a
 * business and chooses a PIN. A forgotten or locked PIN is reset with a
 * one-time code from SellFindConnect support staff (staff sign in with email
 * and an authenticator app): 6 digits, one phone, once, 48 hours, 5 tries.
 * Email is optional. Staff never use the phone/PIN path.
 */
@Injectable()
export class PhoneAuthService {
  private readonly startsByIp = new SlidingWindowLimiter(20, 10 * 60 * 1000);
  private readonly codeChecksByIp = new SlidingWindowLimiter(30, 10 * 60 * 1000);
  private readonly pinChecksByIp = new SlidingWindowLimiter(30, 10 * 60 * 1000);
  private readonly pinChecksByPhone = new SlidingWindowLimiter(10, 10 * 60 * 1000);

  constructor(
    private readonly auth: AuthService,
    @Optional()
    @Inject(PHONE_AUTH_REPOSITORY)
    private readonly repository: PhoneAuthRepository = new InMemoryPhoneAuthRepository(),
  ) {}

  /**
   * Step 1: which step comes next for this number — its PIN, a reset code (no
   * PIN yet, or locked), or registering a new business (with a ticket).
   */
  async start(
    rawPhone: string,
    ip: string,
  ): Promise<{ next: 'pin' | 'reset' } | { next: 'register'; registrationToken: string; expiresInSeconds: number }> {
    const phone = toE164(rawPhone);
    if (!phone) {
      throw new UnprocessableEntityException('Enter a valid phone number.');
    }
    if (!this.startsByIp.hit(ip)) {
      throw tooMany();
    }
    const reviewPhone = process.env.PLAY_REVIEW_PHONE?.trim();
    if (reviewPhone && toE164(reviewPhone) === phone) {
      return { next: 'pin' };
    }
    const user = await this.auth.findUserByVerifiablePhone(phone);
    if (user) {
      if (await this.auth.isStaffUser(user.id)) {
        throw new ForbiddenException('Staff accounts sign in with email and an authenticator app.');
      }
      const pin = await this.repository.findPin(user.id);
      return { next: pin && !pin.lockedAt && pin.failedAttempts < PIN_MAX_ATTEMPTS ? 'pin' : 'reset' };
    }
    const registrationToken = randomBytes(32).toString('base64url');
    const now = Date.now();
    await this.repository.createCode({
      id: randomUUID(),
      phone,
      purpose: 'REGISTRATION_TICKET',
      codeHash: this.hashTicket(registrationToken),
      expiresAt: new Date(now + REGISTRATION_TICKET_TTL_MS).toISOString(),
      failedAttempts: 0,
      createdAt: new Date(now).toISOString(),
    });
    return { next: 'register', registrationToken, expiresInSeconds: REGISTRATION_TICKET_TTL_MS / 1000 };
  }

  /** A new number: register the business and set the PIN in one step. */
  async register(input: RegisterPhoneOwnerDto, deviceLabel?: string) {
    const ticket = await this.repository.findOpenCodeByHash(
      'REGISTRATION_TICKET',
      this.hashTicket(input.registrationToken),
    );
    if (!ticket || Date.parse(ticket.expiresAt) <= Date.now()) {
      throw new UnauthorizedException('Your sign-up timed out. Enter your phone number again.');
    }
    if (!/^\d{4}$/.test(input.pin) || WEAK_PINS.has(input.pin)) {
      throw new UnprocessableEntityException('Choose a 4-digit PIN that is not easy to guess (not 1234 or 0000).');
    }
    await this.repository.updateCode({ ...ticket, consumedAt: new Date().toISOString() });
    const { registrationToken: _ticket, pin, ...details } = input;
    const registered = await this.auth.registerPhoneOwner(details, ticket.phone);
    await this.savePinFor(registered.user.id, pin);
    const deviceToken = await this.createDevice(registered.user.id, deviceLabel);
    return { result: { ...registered, status: 'SIGNED_IN' as const, pinSet: true }, deviceToken };
  }

  /** Sets (or resets) the PIN. Needs a session whose MFA was satisfied (PIN or a staff reset code). */
  async setPin(sessionToken: string, pinValue: string, deviceToken?: string) {
    const current = await this.auth.getSession(sessionToken);
    if (!current.session.mfaVerified || !current.user) {
      throw new UnauthorizedException('Sign in first.');
    }
    if (!/^\d{4}$/.test(pinValue) || WEAK_PINS.has(pinValue)) {
      throw new UnprocessableEntityException('Choose a 4-digit PIN that is not easy to guess (not 1234 or 0000).');
    }
    const userId = current.session.userId;
    await this.savePinFor(userId, pinValue);
    const device = await this.findValidDevice(deviceToken);
    const newDeviceToken = device && device.userId === userId ? undefined : await this.createDevice(userId);
    return { result: { pinSet: true }, deviceToken: newDeviceToken };
  }

  /**
   * Step 2: phone + PIN, on any device. A trusted device may leave the phone
   * out (it remembers the number). Five wrong PINs lock it until a reset code.
   */
  async signInWithPin(pinValue: string, deviceToken: string | undefined, ip: string, rawPhone?: string, deviceLabel?: string) {
    if (!this.pinChecksByIp.hit(ip)) {
      throw tooMany();
    }
    const device = await this.findValidDevice(deviceToken);
    const typed = rawPhone ? toE164(rawPhone) : undefined;
    if (rawPhone && !typed) {
      throw new UnprocessableEntityException('Enter a valid phone number.');
    }
    const deviceUser = device ? await this.auth.findUserRecordById(device.userId) : undefined;
    const phone = typed ?? deviceUser?.phone;
    if (!phone) {
      throw resetRequired('RESET_REQUIRED', 'Enter your phone number and PIN.');
    }
    if (!this.pinChecksByPhone.hit(phone)) {
      throw tooMany();
    }
    const user = typed ? await this.auth.findUserByVerifiablePhone(typed) : deviceUser;

    if (user && this.isPlayReviewPin(phone, pinValue) && !(await this.auth.isStaffUser(user.id))) {
      const signedIn = await this.auth.issuePhoneVerifiedSession(user, 'PLAY_REVIEW');
      const reviewDevice = device && device.userId === user.id ? undefined : await this.createDevice(user.id, deviceLabel);
      return { result: { ...signedIn, status: 'SIGNED_IN' as const, pinSet: true }, deviceToken: reviewDevice };
    }
    // Same answer for an unknown number and a wrong PIN.
    if (!user || (await this.auth.isStaffUser(user.id))) {
      throw new UnauthorizedException({ code: 'PIN_WRONG', message: NO_MATCH });
    }
    const pin = await this.repository.findPin(user.id);
    if (!pin) {
      throw resetRequired('PIN_NOT_SET', `No PIN is set for this number yet. ${ASK_SUPPORT}`);
    }
    if (pin.lockedAt || pin.failedAttempts >= PIN_MAX_ATTEMPTS) {
      throw resetRequired('PIN_LOCKED', `Too many wrong PINs. ${ASK_SUPPORT}`);
    }
    const now = new Date().toISOString();
    if (!/^\d{4}$/.test(pinValue) || !this.equal(pin.pinHash, this.hashPin(user.id, pinValue, pin.pinSalt))) {
      const failedAttempts = pin.failedAttempts + 1;
      const locked = failedAttempts >= PIN_MAX_ATTEMPTS;
      await this.repository.savePin({ ...pin, failedAttempts, lockedAt: locked ? now : undefined, updatedAt: now });
      if (locked) {
        throw resetRequired('PIN_LOCKED', `Too many wrong PINs. ${ASK_SUPPORT}`);
      }
      throw new UnauthorizedException({
        code: 'PIN_WRONG',
        message: `${NO_MATCH} ${PIN_MAX_ATTEMPTS - failedAttempts} tries left.`,
        attemptsLeft: PIN_MAX_ATTEMPTS - failedAttempts,
      });
    }
    await this.repository.savePin({ ...pin, failedAttempts: 0, lockedAt: undefined, updatedAt: now });
    let newDeviceToken: string | undefined;
    if (device && device.userId === user.id) {
      await this.repository.updateDevice({ ...device, lastUsedAt: now });
    } else {
      newDeviceToken = await this.createDevice(user.id, deviceLabel);
    }
    const signedIn = await this.auth.issuePhoneVerifiedSession(user, 'PIN');
    return { result: { ...signedIn, status: 'SIGNED_IN' as const, pinSet: true }, deviceToken: newDeviceToken };
  }

  /**
   * Support staff give a business owner a one-time PIN reset code, to hand over
   * on a call or WhatsApp after checking it is them. Staff only (platform access
   * assignment) with a session whose MFA is satisfied; never for a staff number.
   */
  async issueResetCode(sessionToken: string, rawPhone: string) {
    const current = await this.auth.getSession(sessionToken);
    if (!current.session.mfaVerified || !(await this.auth.isStaffUser(current.session.userId))) {
      throw new ForbiddenException('Only SellFindConnect support staff can give PIN reset codes.');
    }
    const phone = toE164(rawPhone);
    const user = phone ? await this.auth.findUserByVerifiablePhone(phone) : undefined;
    if (!phone || !user || (await this.auth.isStaffUser(user.id))) {
      throw new UnprocessableEntityException('No business account uses that phone number.');
    }
    const now = Date.now();
    const open = await this.repository.findLatestOpenCode(phone, 'RESET_CODE');
    if (open) {
      await this.repository.updateCode({ ...open, consumedAt: new Date(now).toISOString() });
    }
    const code = randomInt(1, 1_000_000).toString().padStart(6, '0');
    await this.repository.createCode({
      id: randomUUID(),
      phone,
      purpose: 'RESET_CODE',
      codeHash: this.hashCode(phone, code),
      expiresAt: new Date(now + RESET_CODE_TTL_MS).toISOString(),
      failedAttempts: 0,
      createdAt: new Date(now).toISOString(),
    });
    const first = (user.displayName ?? '').trim().split(/\s+/)[0] || 'there';
    return {
      code,
      expiresInSeconds: RESET_CODE_TTL_MS / 1000,
      message: `Hello ${first}. Your SellFindConnect PIN reset code is ${code}. Open sellfindconnect.com, sign in with your phone number, choose "Forgot PIN?", enter this code and set a new PIN. It works once within 48 hours. Never share it.`,
    };
  }

  /** Forgotten or locked PIN: phone + the support reset code → signed in, then choose a new PIN. */
  async redeemResetCode(rawPhone: string, code: string, ip: string, deviceLabel?: string) {
    if (!this.codeChecksByIp.hit(ip)) {
      throw tooMany();
    }
    const phone = toE164(rawPhone);
    if (!phone || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException(GENERIC_CODE_ERROR);
    }
    const challenge = await this.repository.findLatestOpenCode(phone, 'RESET_CODE');
    if (
      !challenge ||
      Date.parse(challenge.expiresAt) <= Date.now() ||
      challenge.failedAttempts >= RESET_CODE_MAX_ATTEMPTS
    ) {
      throw new UnauthorizedException(GENERIC_CODE_ERROR);
    }
    if (!this.equal(challenge.codeHash, this.hashCode(phone, code))) {
      const failedAttempts = challenge.failedAttempts + 1;
      await this.repository.updateCode({
        ...challenge,
        failedAttempts,
        // Burn the code after the last allowed miss.
        consumedAt: failedAttempts >= RESET_CODE_MAX_ATTEMPTS ? new Date().toISOString() : undefined,
      });
      throw new UnauthorizedException(GENERIC_CODE_ERROR);
    }
    await this.repository.updateCode({ ...challenge, consumedAt: new Date().toISOString() });
    const user = await this.auth.findUserByVerifiablePhone(phone);
    if (!user || (await this.auth.isStaffUser(user.id))) {
      throw new UnauthorizedException(GENERIC_CODE_ERROR);
    }
    // The old PIN (forgotten or locked) is gone; a new one is chosen next.
    await this.repository.deletePin(user.id);
    const signedIn = await this.auth.issuePhoneVerifiedSession(user, 'RESET_CODE');
    const deviceToken = await this.createDevice(user.id, deviceLabel);
    return { result: { ...signedIn, status: 'SIGNED_IN' as const, pinSet: false }, deviceToken };
  }

  /** What the sign-in screen should offer on this device. Reveals nothing without a valid device token. */
  async deviceStatus(deviceToken: string | undefined) {
    const device = await this.findValidDevice(deviceToken);
    const user = device ? await this.auth.findUserRecordById(device.userId) : undefined;
    if (!device || !user) {
      return { trusted: false as const };
    }
    const pin = await this.repository.findPin(user.id);
    return {
      trusted: true as const,
      pinSet: Boolean(pin),
      pinLocked: Boolean(pin && (pin.lockedAt || pin.failedAttempts >= PIN_MAX_ATTEMPTS)),
      phoneHint: this.maskPhone(user.phone),
      displayName: user.displayName,
    };
  }

  async forgetDevice(deviceToken: string | undefined) {
    const device = await this.findValidDevice(deviceToken);
    if (device) {
      await this.repository.updateDevice({ ...device, revokedAt: new Date().toISOString() });
    }
    return { forgotten: true };
  }

  async revokeAllDevices(sessionToken: string) {
    const current = await this.auth.getSession(sessionToken);
    if (!current.session.mfaVerified) {
      throw new UnauthorizedException('Sign in first.');
    }
    const revoked = await this.repository.revokeDevicesForUser(current.session.userId, new Date().toISOString());
    return { revoked };
  }

  private async savePinFor(userId: string, pinValue: string) {
    const now = new Date().toISOString();
    const salt = randomBytes(16).toString('base64url');
    await this.repository.savePin({
      userId,
      pinHash: this.hashPin(userId, pinValue, salt),
      pinSalt: salt,
      failedAttempts: 0,
      setAt: now,
      updatedAt: now,
    });
  }

  /** Account deletion: forget every device and the PIN. */
  async eraseForUser(userId: string) {
    await this.repository.revokeDevicesForUser(userId, new Date().toISOString());
    await this.repository.deletePin(userId);
  }

  private async createDevice(userId: string, label?: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    const record: TrustedDeviceRecord = {
      id: randomUUID(),
      userId,
      tokenHash: this.hashDeviceToken(token),
      label: label?.trim().slice(0, 120) || undefined,
      expiresAt: new Date(now + TRUSTED_DEVICE_TTL_MS).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
    await this.repository.createDevice(record);
    return token;
  }

  private async findValidDevice(deviceToken: string | undefined): Promise<TrustedDeviceRecord | undefined> {
    if (!deviceToken || deviceToken.length < 20 || deviceToken.length > 200) {
      return undefined;
    }
    const device = await this.repository.findDeviceByTokenHash(this.hashDeviceToken(deviceToken));
    if (!device || device.revokedAt || Date.parse(device.expiresAt) <= Date.now()) {
      return undefined;
    }
    return device;
  }

  /** Google Play reviewer: PLAY_REVIEW_PHONE + a fixed 4-digit PLAY_REVIEW_PIN, both set, never staff. */
  private isPlayReviewPin(phone: string, pin: string): boolean {
    const reviewPhone = process.env.PLAY_REVIEW_PHONE?.trim();
    const reviewPin = process.env.PLAY_REVIEW_PIN?.trim() ?? '';
    return Boolean(reviewPhone && /^\d{4}$/.test(reviewPin) && toE164(reviewPhone) === phone && this.equal(pin, reviewPin));
  }

  private maskPhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    return `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
  }

  private hashCode(phone: string, code: string): string {
    return createHash('sha256').update(`phone-reset:${phone}:${code}`).digest('base64url');
  }

  private hashTicket(token: string): string {
    return createHash('sha256').update(`phone-registration:${token}`).digest('base64url');
  }

  private hashDeviceToken(token: string): string {
    return createHash('sha256').update(`trusted-device:${token}`).digest('base64url');
  }

  private hashPin(userId: string, pin: string, salt: string): string {
    return scryptSync(`${userId}:${pin}`, salt, 32).toString('base64url');
  }

  private equal(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

}

