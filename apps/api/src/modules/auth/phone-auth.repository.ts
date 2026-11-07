/** Storage for phone sign-in: SMS codes, PINs and trusted devices. */
export const PHONE_AUTH_REPOSITORY = Symbol('PHONE_AUTH_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export type PhoneCodePurpose = 'SMS_CODE' | 'REGISTRATION_TICKET';

export type PhoneCodeRecord = {
  id: string;
  phone: string;
  purpose: PhoneCodePurpose;
  codeHash: string;
  expiresAt: string;
  consumedAt?: string;
  failedAttempts: number;
  createdAt: string;
};

export type UserPinRecord = {
  userId: string;
  pinHash: string;
  pinSalt: string;
  failedAttempts: number;
  lockedAt?: string;
  setAt: string;
  updatedAt: string;
};

export type TrustedDeviceRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  label?: string;
  expiresAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export interface PhoneAuthRepository {
  createCode(record: PhoneCodeRecord): RepositoryResult<void>;
  /** Newest code for the phone and purpose that is not consumed. */
  findLatestOpenCode(phone: string, purpose: PhoneCodePurpose): RepositoryResult<PhoneCodeRecord | undefined>;
  findOpenCodeByHash(purpose: PhoneCodePurpose, codeHash: string): RepositoryResult<PhoneCodeRecord | undefined>;
  updateCode(record: PhoneCodeRecord): RepositoryResult<void>;
  countCodesSince(phone: string, purpose: PhoneCodePurpose, since: string): RepositoryResult<number>;
  findPin(userId: string): RepositoryResult<UserPinRecord | undefined>;
  savePin(record: UserPinRecord): RepositoryResult<void>;
  deletePin(userId: string): RepositoryResult<void>;
  createDevice(record: TrustedDeviceRecord): RepositoryResult<void>;
  findDeviceByTokenHash(tokenHash: string): RepositoryResult<TrustedDeviceRecord | undefined>;
  updateDevice(record: TrustedDeviceRecord): RepositoryResult<void>;
  revokeDevicesForUser(userId: string, revokedAt: string): RepositoryResult<number>;
}
