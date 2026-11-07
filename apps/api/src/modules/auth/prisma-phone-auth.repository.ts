import type { PhoneCodeChallenge, PrismaClient, TrustedDevice, UserPin } from '@prisma/client';

import type {
  PhoneAuthRepository,
  PhoneCodePurpose,
  PhoneCodeRecord,
  TrustedDeviceRecord,
  UserPinRecord,
} from './phone-auth.repository';

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : undefined);
const date = (value: string | undefined) => (value ? new Date(value) : null);

export class PrismaPhoneAuthRepository implements PhoneAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCode(record: PhoneCodeRecord): Promise<void> {
    await this.prisma.phoneCodeChallenge.create({
      data: {
        id: record.id,
        phone: record.phone,
        purpose: record.purpose,
        codeHash: record.codeHash,
        expiresAt: new Date(record.expiresAt),
        consumedAt: date(record.consumedAt),
        failedAttempts: record.failedAttempts,
        createdAt: new Date(record.createdAt),
      },
    });
  }

  async findLatestOpenCode(phone: string, purpose: PhoneCodePurpose): Promise<PhoneCodeRecord | undefined> {
    const row = await this.prisma.phoneCodeChallenge.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapCode(row) : undefined;
  }

  async findOpenCodeByHash(purpose: PhoneCodePurpose, codeHash: string): Promise<PhoneCodeRecord | undefined> {
    const row = await this.prisma.phoneCodeChallenge.findFirst({
      where: { purpose, codeHash, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapCode(row) : undefined;
  }

  async updateCode(record: PhoneCodeRecord): Promise<void> {
    await this.prisma.phoneCodeChallenge.update({
      where: { id: record.id },
      data: { consumedAt: date(record.consumedAt), failedAttempts: record.failedAttempts },
    });
  }

  async countCodesSince(phone: string, purpose: PhoneCodePurpose, since: string): Promise<number> {
    return this.prisma.phoneCodeChallenge.count({
      where: { phone, purpose, createdAt: { gte: new Date(since) } },
    });
  }

  async findPin(userId: string): Promise<UserPinRecord | undefined> {
    const row = await this.prisma.userPin.findUnique({ where: { userId } });
    return row ? this.mapPin(row) : undefined;
  }

  async savePin(record: UserPinRecord): Promise<void> {
    const data = {
      pinHash: record.pinHash,
      pinSalt: record.pinSalt,
      failedAttempts: record.failedAttempts,
      lockedAt: date(record.lockedAt),
      setAt: new Date(record.setAt),
    };
    await this.prisma.userPin.upsert({
      where: { userId: record.userId },
      create: { userId: record.userId, ...data },
      update: data,
    });
  }

  async deletePin(userId: string): Promise<void> {
    await this.prisma.userPin.deleteMany({ where: { userId } });
  }

  async createDevice(record: TrustedDeviceRecord): Promise<void> {
    await this.prisma.trustedDevice.create({
      data: {
        id: record.id,
        userId: record.userId,
        tokenHash: record.tokenHash,
        label: record.label ?? null,
        expiresAt: new Date(record.expiresAt),
        lastUsedAt: date(record.lastUsedAt),
        revokedAt: date(record.revokedAt),
        createdAt: new Date(record.createdAt),
      },
    });
  }

  async findDeviceByTokenHash(tokenHash: string): Promise<TrustedDeviceRecord | undefined> {
    const row = await this.prisma.trustedDevice.findUnique({ where: { tokenHash } });
    return row ? this.mapDevice(row) : undefined;
  }

  async updateDevice(record: TrustedDeviceRecord): Promise<void> {
    await this.prisma.trustedDevice.update({
      where: { id: record.id },
      data: { lastUsedAt: date(record.lastUsedAt), revokedAt: date(record.revokedAt) },
    });
  }

  async revokeDevicesForUser(userId: string, revokedAt: string): Promise<number> {
    const result = await this.prisma.trustedDevice.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(revokedAt) },
    });
    return result.count;
  }

  private mapCode(row: PhoneCodeChallenge): PhoneCodeRecord {
    return {
      id: row.id,
      phone: row.phone,
      purpose: row.purpose as PhoneCodePurpose,
      codeHash: row.codeHash,
      expiresAt: row.expiresAt.toISOString(),
      consumedAt: iso(row.consumedAt),
      failedAttempts: row.failedAttempts,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapPin(row: UserPin): UserPinRecord {
    return {
      userId: row.userId,
      pinHash: row.pinHash,
      pinSalt: row.pinSalt,
      failedAttempts: row.failedAttempts,
      lockedAt: iso(row.lockedAt),
      setAt: row.setAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDevice(row: TrustedDevice): TrustedDeviceRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      label: row.label ?? undefined,
      expiresAt: row.expiresAt.toISOString(),
      lastUsedAt: iso(row.lastUsedAt),
      revokedAt: iso(row.revokedAt),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
