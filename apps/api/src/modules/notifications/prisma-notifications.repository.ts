import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type NotificationChannel as PrismaChannel,
  type NotificationConsentState as PrismaConsent,
  type NotificationDeliveryAttempt as PrismaAttempt,
  type NotificationDeliveryStatus as PrismaDeliveryStatus,
  type NotificationOutboxRecord as PrismaOutbox,
  type NotificationPreference as PrismaPreference,
} from '@prisma/client';
import {
  notificationChannels,
  shouldRetryNotificationChannel,
  type NotificationChannel,
  type NotificationConsentState,
  type NotificationDestination,
  type NotificationEventType,
  type NotificationPreference,
  type NotificationSeverity,
} from '@telpen/domain';

import type {
  NotificationChannelStatus,
  NotificationDeliveryAttemptRecord,
  NotificationOutboxRecord,
} from './notifications.records';
import type { NotificationsRepository } from './notifications.repository';

export function createNotificationsPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

type PrismaOutboxWithAttempts = PrismaOutbox & { deliveryAttempts: PrismaAttempt[] };

export class PrismaNotificationsRepository implements NotificationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getPreferences(tenantId: string): Promise<NotificationPreference[]> {
    const records = await this.prisma.notificationPreference.findMany({
      where: { tenantId, userId: null },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.fromPreference(record));
  }

  async replacePreferences(
    tenantId: string,
    preferences: NotificationPreference[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationPreference.deleteMany({ where: { tenantId, userId: null } });
      if (preferences.length === 0) {
        return;
      }
      await tx.notificationPreference.createMany({
        data: preferences.map((preference) => ({
          tenantId,
          userId: null,
          channel: preference.channel as PrismaChannel,
          enabled: preference.enabled,
          consentState: preference.consentState as PrismaConsent,
        })),
      });
    });
  }

  async saveOutbox(record: NotificationOutboxRecord): Promise<void> {
    await this.prisma.notificationOutboxRecord.create({
      data: {
        ...this.toOutboxData(record),
        deliveryAttempts: {
          create: record.deliveryAttempts.map((attempt) => this.toAttemptData(attempt)),
        },
      },
    });
  }

  async updateOutbox(record: NotificationOutboxRecord): Promise<void> {
    const data = this.toOutboxData(record);
    await this.prisma.notificationOutboxRecord.update({
      where: { id: record.id },
      data: {
        eventType: data.eventType,
        severity: data.severity,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        selectedChannels: data.selectedChannels,
        suppressedChannels: data.suppressedChannels,
        destination: data.destination,
        channelStatuses: data.channelStatuses,
        requiresImmediateAttention: data.requiresImmediateAttention,
        updatedAt: data.updatedAt,
        deliveryAttempts: {
          deleteMany: {},
          create: record.deliveryAttempts.map((attempt) => this.toAttemptData(attempt)),
        },
      },
    });
  }

  async findOutbox(tenantId: string, id: string): Promise<NotificationOutboxRecord | undefined> {
    const record = await this.prisma.notificationOutboxRecord.findFirst({
      where: { id, tenantId },
      include: { deliveryAttempts: { orderBy: { createdAt: 'asc' } } },
    });
    return record ? this.fromOutbox(record) : undefined;
  }

  async listOutbox(tenantId: string): Promise<NotificationOutboxRecord[]> {
    const records = await this.prisma.notificationOutboxRecord.findMany({
      where: { tenantId },
      include: { deliveryAttempts: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromOutbox(record));
  }

  async listRetryableOutbox(input: {
    tenantId?: string;
    limit?: number;
  } = {}): Promise<NotificationOutboxRecord[]> {
    const records = await this.prisma.notificationOutboxRecord.findMany({
      where: input.tenantId ? { tenantId: input.tenantId } : undefined,
      include: { deliveryAttempts: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return records
      .map((record) => this.fromOutbox(record))
      .filter((record) =>
        record.channelStatuses.some((item) => shouldRetryNotificationChannel(item.status)),
      )
      .slice(0, input.limit ?? 100);
  }

  private toOutboxData(record: NotificationOutboxRecord) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      eventType: record.plan.eventType,
      severity: record.plan.severity,
      title: record.plan.title,
      message: record.plan.message,
      entityType: record.entityType ?? null,
      entityId: record.entityId ?? null,
      selectedChannels: record.plan.selectedChannels as Prisma.InputJsonValue,
      suppressedChannels: record.plan.suppressedChannels as Prisma.InputJsonValue,
      destination: this.jsonValue(record.destination as Record<string, unknown> | undefined),
      channelStatuses: record.channelStatuses.map((item) =>
        this.jsonValue(item as Record<string, unknown>),
      ) as Prisma.InputJsonValue,
      requiresImmediateAttention: record.plan.requiresImmediateAttention,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }

  private toAttemptData(attempt: NotificationDeliveryAttemptRecord) {
    return {
      id: attempt.id,
      channel: attempt.channel as PrismaChannel,
      status: attempt.status as PrismaDeliveryStatus,
      provider: attempt.provider ?? null,
      providerReference: attempt.providerReference ?? null,
      failureReason: attempt.failureReason ?? null,
      attemptedAt: new Date(attempt.attemptedAt),
    };
  }

  private fromPreference(record: PrismaPreference): NotificationPreference {
    return {
      channel: this.channel(record.channel),
      enabled: record.enabled,
      consentState: record.consentState as NotificationConsentState,
    };
  }

  private fromOutbox(record: PrismaOutboxWithAttempts): NotificationOutboxRecord {
    const selectedChannels = this.channels(record.selectedChannels);
    const suppressedChannels = Array.isArray(record.suppressedChannels)
      ? record.suppressedChannels
          .map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              return null;
            }
            const channel = this.optionalChannel((item as { channel?: unknown }).channel);
            const reason = (item as { reason?: unknown }).reason;
            if (!channel || typeof reason !== 'string') {
              return null;
            }
            return { channel, reason };
          })
          .filter((item): item is { channel: NotificationChannel; reason: string } => Boolean(item))
      : [];

    return {
      id: record.id,
      tenantId: record.tenantId,
      entityType: record.entityType ?? undefined,
      entityId: record.entityId ?? undefined,
      destination: this.destination(record.destination),
      plan: {
        eventType: record.eventType as NotificationEventType,
        severity: record.severity as NotificationSeverity,
        selectedChannels,
        suppressedChannels,
        requiresImmediateAttention: record.requiresImmediateAttention,
        title: record.title,
        message: record.message,
      },
      channelStatuses: this.channelStatuses(record.channelStatuses, selectedChannels),
      deliveryAttempts: record.deliveryAttempts.map((attempt) => this.fromAttempt(attempt)),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private fromAttempt(record: PrismaAttempt): NotificationDeliveryAttemptRecord {
    return {
      id: record.id,
      channel: this.channel(record.channel),
      status: record.status === 'QUEUED' ? 'FAILED' : record.status,
      provider: record.provider ?? undefined,
      providerReference: record.providerReference ?? undefined,
      failureReason: record.failureReason ?? undefined,
      attemptedAt: (record.attemptedAt ?? record.createdAt).toISOString(),
    };
  }

  private destination(value: Prisma.JsonValue | null): NotificationDestination | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    const destination: NotificationDestination = {
      userId: typeof record.userId === 'string' ? record.userId : undefined,
      email: typeof record.email === 'string' ? record.email : undefined,
      phone: typeof record.phone === 'string' ? record.phone : undefined,
      pushToken: typeof record.pushToken === 'string' ? record.pushToken : undefined,
    };
    return destination.userId || destination.email || destination.phone || destination.pushToken
      ? destination
      : undefined;
  }

  private channelStatuses(
    value: Prisma.JsonValue,
    selectedChannels: NotificationChannel[],
  ): NotificationChannelStatus[] {
    const parsed = Array.isArray(value)
      ? value
          .map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              return null;
            }
            const record = item as Record<string, unknown>;
            const channel = this.optionalChannel(record.channel);
            const status = record.status;
            if (
              !channel ||
              (status !== 'QUEUED' &&
                status !== 'SUPPRESSED' &&
                status !== 'SENT' &&
                status !== 'FAILED')
            ) {
              return null;
            }
            const parsed: NotificationChannelStatus = { channel, status };
            if (typeof record.reason === 'string') {
              parsed.reason = record.reason;
            }
            if (typeof record.provider === 'string') {
              parsed.provider = record.provider;
            }
            if (typeof record.providerReference === 'string') {
              parsed.providerReference = record.providerReference;
            }
            return parsed;
          })
          .filter((item): item is NotificationChannelStatus => Boolean(item))
      : [];
    if (parsed.length > 0) {
      return parsed;
    }
    return selectedChannels.map((channel) => ({ channel, status: 'QUEUED' as const }));
  }

  private jsonValue(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (!value) {
      return Prisma.JsonNull;
    }
    const cleaned: Record<string, string | number | boolean | null> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        cleaned[key] = item;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : Prisma.JsonNull;
  }

  private channels(value: Prisma.JsonValue): NotificationChannel[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => this.optionalChannel(item))
      .filter((item): item is NotificationChannel => Boolean(item));
  }

  private channel(value: PrismaChannel): NotificationChannel {
    return this.optionalChannel(value) ?? 'IN_APP';
  }

  private optionalChannel(value: unknown): NotificationChannel | undefined {
    return notificationChannels.includes(value as NotificationChannel)
      ? (value as NotificationChannel)
      : undefined;
  }
}
