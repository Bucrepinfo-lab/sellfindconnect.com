export type NotificationChannel = "EMAIL"|"SMS"|"PUSH"|"WHATSAPP"|"IN_APP";
export type DeliveryStatus = "SENT"|"FAILED"|"SUPPRESSED";

export interface NotificationPayload {
  to: string; subject?: string; title: string; body: string;
  templateId?: string; templateVars?: Record<string,string>;
  idempotencyKey: string; tenantId: string; channel: NotificationChannel;
  locale?: string; metadata?: Record<string,unknown>;
}

export interface DeliveryResult {
  providerRef: string; status: DeliveryStatus; failureReason?: string; raw?: unknown;
}

export interface NotificationAdapter {
  readonly channel: NotificationChannel;
  readonly name: string;
  send(payload: NotificationPayload): Promise<DeliveryResult>;
}

export class NotificationAdapterRegistry {
  private adapters = new Map<NotificationChannel, NotificationAdapter>();
  register(adapter: NotificationAdapter) { this.adapters.set(adapter.channel, adapter); }
  get(channel: NotificationChannel): NotificationAdapter | null { return this.adapters.get(channel) ?? null; }
  available(): NotificationChannel[] { return Array.from(this.adapters.keys()); }
}
