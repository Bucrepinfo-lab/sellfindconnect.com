import { Injectable } from '@nestjs/common';

import type {
  PhoneAuthRepository,
  PhoneCodePurpose,
  PhoneCodeRecord,
  TrustedDeviceRecord,
  UserPinRecord,
} from './phone-auth.repository';

@Injectable()
export class InMemoryPhoneAuthRepository implements PhoneAuthRepository {
  private readonly codes = new Map<string, PhoneCodeRecord>();
  private readonly pins = new Map<string, UserPinRecord>();
  private readonly devices = new Map<string, TrustedDeviceRecord>();

  createCode(record: PhoneCodeRecord): void {
    this.codes.set(record.id, { ...record });
  }

  findLatestOpenCode(phone: string, purpose: PhoneCodePurpose): PhoneCodeRecord | undefined {
    return [...this.codes.values()]
      .filter((code) => code.phone === phone && code.purpose === purpose && !code.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  }

  findOpenCodeByHash(purpose: PhoneCodePurpose, codeHash: string): PhoneCodeRecord | undefined {
    return [...this.codes.values()].find(
      (code) => code.purpose === purpose && code.codeHash === codeHash && !code.consumedAt,
    );
  }

  updateCode(record: PhoneCodeRecord): void {
    this.codes.set(record.id, { ...record });
  }

  countCodesSince(phone: string, purpose: PhoneCodePurpose, since: string): number {
    return [...this.codes.values()].filter(
      (code) => code.phone === phone && code.purpose === purpose && code.createdAt >= since,
    ).length;
  }

  findPin(userId: string): UserPinRecord | undefined {
    const pin = this.pins.get(userId);
    return pin ? { ...pin } : undefined;
  }

  savePin(record: UserPinRecord): void {
    this.pins.set(record.userId, { ...record });
  }

  deletePin(userId: string): void {
    this.pins.delete(userId);
  }

  createDevice(record: TrustedDeviceRecord): void {
    this.devices.set(record.id, { ...record });
  }

  findDeviceByTokenHash(tokenHash: string): TrustedDeviceRecord | undefined {
    const device = [...this.devices.values()].find((item) => item.tokenHash === tokenHash);
    return device ? { ...device } : undefined;
  }

  updateDevice(record: TrustedDeviceRecord): void {
    this.devices.set(record.id, { ...record });
  }

  revokeDevicesForUser(userId: string, revokedAt: string): number {
    let count = 0;
    for (const device of this.devices.values()) {
      if (device.userId === userId && !device.revokedAt) {
        device.revokedAt = revokedAt;
        count += 1;
      }
    }
    return count;
  }
}
