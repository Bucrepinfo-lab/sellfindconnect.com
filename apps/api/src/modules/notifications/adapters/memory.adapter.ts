import type { DeliveryResult, NotificationAdapter, NotificationChannel, NotificationPayload } from '@telpen/domain';

export class MemoryNotificationAdapter implements NotificationAdapter {
  readonly name = 'memory';
  readonly sent: NotificationPayload[] = [];

  constructor(readonly channel: NotificationChannel) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    this.sent.push(payload);
    return {
      providerRef: `memory:${payload.idempotencyKey}`,
      status: 'SENT',
    };
  }
}
