import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationAdapterRegistry,
  resolveNotificationDispatchContent,
  type NotificationChannel,
  type NotificationEventType,
} from '@telpen/domain';

export type DispatchRequest = {
  outboxRecordId: string;
  tenantId: string;
  userId?: string;
  channel: NotificationChannel;
  to: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  idempotencyKey: string;
  locale?: string;
  metadata?: Record<string, unknown>;
};

export type DispatchResult = {
  outboxRecordId: string;
  channel: NotificationChannel;
  provider: string;
  providerRef: string;
  status: 'SENT' | 'FAILED' | 'SUPPRESSED' | 'NO_ADAPTER';
  failureReason?: string;
};

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(private readonly registry: NotificationAdapterRegistry) {}

  availableChannels(): NotificationChannel[] {
    return this.registry.available();
  }

  async dispatch(req: DispatchRequest): Promise<DispatchResult> {
    const adapter = this.registry.get(req.channel);
    if (!adapter) {
      this.logger.warn(`No adapter for channel ${req.channel}`);
      return {
        outboxRecordId: req.outboxRecordId,
        channel: req.channel,
        provider: '',
        providerRef: '',
        status: 'NO_ADAPTER',
        failureReason: `No adapter registered for ${req.channel}.`,
      };
    }

    const content = resolveNotificationDispatchContent({
      title: req.title,
      message: req.message,
    });

    try {
      const result = await adapter.send({
        to: req.to,
        subject: content.subject,
        title: content.subject,
        body: content.body,
        idempotencyKey: req.idempotencyKey,
        tenantId: req.tenantId,
        channel: req.channel,
        locale: req.locale,
        metadata: req.metadata,
      });
      this.logger.log(`[${req.channel}] ${result.status} via ${adapter.name}`);
      return {
        outboxRecordId: req.outboxRecordId,
        channel: req.channel,
        provider: adapter.name,
        providerRef: result.providerRef,
        status: result.status,
        failureReason: result.failureReason,
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Notification adapter failed.';
      this.logger.error(`[${req.channel}] ${failureReason}`);
      return {
        outboxRecordId: req.outboxRecordId,
        channel: req.channel,
        provider: adapter.name,
        providerRef: '',
        status: 'FAILED',
        failureReason,
      };
    }
  }

  async dispatchMany(requests: DispatchRequest[]): Promise<DispatchResult[]> {
    return Promise.all(requests.map((request) => this.dispatch(request)));
  }
}
