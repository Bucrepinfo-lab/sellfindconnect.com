import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toE164 } from '@telpen/domain';
import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

import { SMS_SENDER, type SmsSender } from './africastalking-sms';
import { AuthService } from './auth.service';
import type { RegisterPhoneOwnerDto } from './dto/phone-auth.dto';
import { InMemoryPhoneAuthRepository } from './in-memory-phone-auth.repository';
import {
  PHONE_AUTH_REPOSITORY,
  type PhoneAuthRepository,
  type PhoneCodeRecord,
  type TrustedDeviceRecord,
} from './phone-auth.repository';
import { SlidingWindowLimiter } from './rate-limiter';

export const SMS_CODE_TTL_MS = 5 * 60 * 1000;
export const SMS_CODE_MAX_ATTEMPTS = 5;
export const PIN_MAX_ATTEMPTS = 5;
const REGISTRATION_TICKET_TTL_MS = 30 * 60 * 1000;
export const TRUSTED_DEVICE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const PHONE_CODES_PER_10_MIN = 3;
const PHONE_CODES_PER_DAY = 10;
const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '1212', '0123', '9876']);

const GENERIC_CODE_ERROR = 'That code is wrong or has expired. Request a new code.';

export type PhoneSignInResult = Awaited<ReturnType<AuthService['issuePhoneVerifiedSession']>> & {
  status: 'SIGNED_IN';
  pinSet: boolean;
};

export type PhoneVerifyResult =
  | { result: PhoneSignInResult; deviceToken: string }
  | { result: { status: 'REGISTRATION_REQUIRED'; registrationToken: string; expiresInSeconds: number } };

function tooMany(): HttpException {
  return new HttpException('Too many attempts. Wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);
}

function smsRequired(code: 'SMS_REQUIRED' | 'PIN_LOCKED' | 'PIN_NOT_SET', message: string): UnauthorizedException {
  return new UnauthorizedException({ code, message });
}

/**
 * Owner standing rule (07/11/26): phone number is the sign-in. First sign-in on
 * a device = 6-digit SMS code (5 minutes, single use, rate limited per number
 * and per IP). Later sign-ins on that trusted device = 4-digit PIN. New device,
 * forgotten PIN or 5 wrong PINs = new SMS code. Email is optional.
 */
@Injectable()
export class PhoneAuthService {
  private readonly codeRequestsByIp = new SlidingWindowLimiter(10, 10 * 60 * 1000);
  private readonly codeChecksByIp = new SlidingWindowLimiter(30, 10 * 60 * 1000);
  private readonly pinChecksByIp = new SlidingWindowLimiter(30, 10 * 60 * 1000);

  constructor(
    private readonly auth: AuthService,
    @Optional()
    @Inject(PHONE_AUTH_REPOSITORY)
    private readonly repository: PhoneAuthRepository = new InMemoryPhoneAuthRepository(),
    @Optional()
    @Inject(SMS_SENDER)
    private readonly smsSender?: SmsSender,
  ) {}

  async requestCode(rawPhone: string, ip: string) {
    const phone = toE164(rawPhone);
    if (!phone) {
      throw new UnprocessableEntityException('Enter a valid phone number.');
    }
    if (!this.codeRequestsByIp.hit(ip)) {
      throw tooMany();
    }
    const response = { sent: true, expiresInSeconds: SMS_CODE_TTL_MS / 1000 };
    if (this.isPlayReviewPhone(phone)) {
      // Google Play reviewer: fixed code from PLAY_REVIEW_CODE, no SMS sent.
      return response;
    }

    const now = Date.now();
    const [recent, today] = await Promise.all([
      this.repository.countCodesSince(phone, 'SMS_CODE', new Date(now - 10 * 60 * 1000).toISOString()),
      this.repository.countCodesSince(phone, 'SMS_CODE', new Date(now - 24 * 60 * 60 * 1000).toISOString()),
    ]);
    if (recent >= PHONE_CODES_PER_10_MIN || today >= PHONE_CODES_PER_DAY) {
      throw tooMany();
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const record: PhoneCodeRecord = {
      id: randomUUID(),
      phone,
      purpose: 'SMS_CODE',
      codeHash: this.hashCode(phone, code),
      expiresAt: new Date(now + SMS_CODE_TTL_MS).toISOString(),
      failedAttempts: 0,
      createdAt: new Date(now).toISOString(),
    };
    await this.repository.createCode(record);

    const delivery = this.smsSender
      ? await this.smsSender
          .sendSms(phone, `${code} is your SellFindConnect code. It expires in 5 minutes. Never share it.`)
          .catch(() => ({ ok: false, raw: undefined }))
      : { ok: false, raw: undefined };
    if (!delivery.ok && this.isProduction()) {
      throw new ServiceUnavailableException('We could not send the SMS right now. Try again shortly.');
    }
    return this.isProduction() ? response : { ...response, developmentCode: code };
  }

  async verifyCode(rawPhone: string, code: string, ip: string, deviceLabel?: string): Promise<PhoneVerifyResult> {
    if (!this.codeChecksByIp.hit(ip)) {
      throw tooMany();
    }
    const phone = toE164(rawPhone);
    if (!phone || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException(GENERIC_CODE_ERROR);
    }

    const playReview = this.isPlayReviewCode(phone, code);
    if (!playReview) {
      const challenge = await this.repository.findLatestOpenCode(phone, 'SMS_CODE');
      if (
        !challenge ||
        Date.parse(challenge.expiresAt) <= Date.now() ||
        challenge.failedAttempts >= SMS_CODE_MAX_ATTEMPTS
      ) {
        throw new UnauthorizedException(GENERIC_CODE_ERROR);
      }
      if (!this.equal(challenge.codeHash, this.hashCode(phone, code))) {
        const failedAttempts = challenge.failedAttempts + 1;
        await this.repository.updateCode({
          ...challenge,
          failedAttempts,
          // Burn the code after the last allowed miss.
          consumedAt: failedAttempts >= SMS_CODE_MAX_ATTEMPTS ? new Date().toISOString() : undefined,
        });
        throw new UnauthorizedException(GENERIC_CODE_ERROR);
      }
      await this.repository.updateCode({ ...challenge, consumedAt: new Date().toISOString() });
    }

    const user = await this.auth.findUserByVerifiablePhone(phone);
    if (!user) {
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
      return {
        result: {
          status: 'REGISTRATION_REQUIRED',
          registrationToken,
          expiresInSeconds: REGISTRATION_TICKET_TTL_MS / 1000,
        },
      };
    }

    if (await this.auth.isStaffUser(user.id)) {
      throw new ForbiddenException('Staff accounts sign in with email and an authenticator app.');
    }

    // A fresh SMS code proves the phone: it clears a PIN lockout.
    const pin = await this.repository.findPin(user.id);
    if (pin && (pin.failedAttempts > 0 || pin.lockedAt)) {
      await this.repository.savePin({ ...pin, failedAttempts: 0, lockedAt: undefined, updatedAt: new Date().toISOString() });
    }
    const signedIn = await this.auth.issuePhoneVerifiedSession(user, playReview ? 'PLAY_REVIEW' : 'SMS_CODE');
    const deviceToken = await this.createDevice(user.id, deviceLabel);
    return { result: { ...signedIn, status: 'SIGNED_IN', pinSet: Boolean(pin) }, deviceToken };
  }

  async register(input: RegisterPhoneOwnerDto) {
    const ticket = await this.repository.findOpenCodeByHash(
      'REGISTRATION_TICKET',
      this.hashTicket(input.registrationToken),
    );
    if (!ticket || Date.parse(ticket.expiresAt) <= Date.now()) {
      throw new UnauthorizedException('Your sign-up timed out. Request a new SMS code.');
    }
    await this.repository.updateCode({ ...ticket, consumedAt: new Date().toISOString() });
    const { registrationToken: _ticket, ...details } = input;
    const registered = await this.auth.registerPhoneOwner(details, ticket.phone);
    const deviceToken = await this.createDevice(registered.user.id);
    return { result: { ...registered, status: 'SIGNED_IN' as const, pinSet: false }, deviceToken };
  }

  /** Sets (or resets) the PIN. Needs a session whose MFA was satisfied (SMS code or PIN). */
  async setPin(sessionToken: string, pinValue: string, deviceToken?: string) {
    const current = await this.auth.getSession(sessionToken);
    if (!current.session.mfaVerified || !current.user) {
      throw new UnauthorizedException('Sign in with an SMS code first.');
    }
    if (!/^\d{4}$/.test(pinValue) || WEAK_PINS.has(pinValue)) {
      throw new UnprocessableEntityException('Choose a 4-digit PIN that is not easy to guess (not 1234 or 0000).');
    }
    const userId = current.session.userId;
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
    const device = await this.findValidDevice(deviceToken);
    const newDeviceToken = device && device.userId === userId ? undefined : await this.createDevice(userId);
    return { result: { pinSet: true }, deviceToken: newDeviceToken };
  }

  /** PIN sign-in. Works only with this user's trusted-device token; the PIN alone, or a phone number, gets nothing. */
  async signInWithPin(pinValue: string, deviceToken: string | undefined, ip: string) {
    if (!this.pinChecksByIp.hit(ip)) {
      throw tooMany();
    }
    const device = await this.findValidDevice(deviceToken);
    if (!device) {
      throw smsRequired('SMS_REQUIRED', 'Sign in with an SMS code on this device.');
    }
    const user = await this.auth.findUserRecordById(device.userId);
    if (!user || (await this.auth.isStaffUser(user.id))) {
      throw smsRequired('SMS_REQUIRED', 'Sign in with an SMS code on this device.');
    }
    const pin = await this.repository.findPin(user.id);
    if (!pin) {
      throw smsRequired('PIN_NOT_SET', 'Sign in with an SMS code, then set a PIN.');
    }
    if (pin.lockedAt || pin.failedAttempts >= PIN_MAX_ATTEMPTS) {
      throw smsRequired('PIN_LOCKED', 'Too many wrong PINs. Sign in with an SMS code to unlock.');
    }
    const now = new Date().toISOString();
    if (!/^\d{4}$/.test(pinValue) || !this.equal(pin.pinHash, this.hashPin(user.id, pinValue, pin.pinSalt))) {
      const failedAttempts = pin.failedAttempts + 1;
      const locked = failedAttempts >= PIN_MAX_ATTEMPTS;
      await this.repository.savePin({ ...pin, failedAttempts, lockedAt: locked ? now : undefined, updatedAt: now });
      if (locked) {
        throw smsRequired('PIN_LOCKED', 'Too many wrong PINs. Sign in with an SMS code to unlock.');
      }
      throw new UnauthorizedException({
        code: 'PIN_WRONG',
        message: `Wrong PIN. ${PIN_MAX_ATTEMPTS - failedAttempts} tries left.`,
        attemptsLeft: PIN_MAX_ATTEMPTS - failedAttempts,
      });
    }
    await this.repository.savePin({ ...pin, failedAttempts: 0, lockedAt: undefined, updatedAt: now });
    await this.repository.updateDevice({ ...device, lastUsedAt: now });
    const signedIn = await this.auth.issuePhoneVerifiedSession(user, 'PIN');
    return { ...signedIn, status: 'SIGNED_IN' as const, pinSet: true };
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
      throw new UnauthorizedException('Sign in with an SMS code first.');
    }
    const revoked = await this.repository.revokeDevicesForUser(current.session.userId, new Date().toISOString());
    return { revoked };
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

  private isPlayReviewPhone(phone: string): boolean {
    const reviewPhone = process.env.PLAY_REVIEW_PHONE?.trim();
    const reviewCode = process.env.PLAY_REVIEW_CODE?.trim();
    return Boolean(reviewPhone && reviewCode && /^\d{6}$/.test(reviewCode) && toE164(reviewPhone) === phone);
  }

  private isPlayReviewCode(phone: string, code: string): boolean {
    const reviewCode = process.env.PLAY_REVIEW_CODE?.trim() ?? '';
    return this.isPlayReviewPhone(phone) && this.equal(code, reviewCode);
  }

  private maskPhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    return `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
  }

  private hashCode(phone: string, code: string): string {
    return createHash('sha256').update(`phone-code:${phone}:${code}`).digest('base64url');
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

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}

