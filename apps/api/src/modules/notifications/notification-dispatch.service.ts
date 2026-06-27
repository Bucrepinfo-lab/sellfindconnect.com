import { Injectable, Logger } from "@nestjs/common";
import { NotificationAdapterRegistry } from "../../../domain/src/notification-adapter";
import type { NotificationChannel } from "../../../domain/src/notification-adapter";
import { resolveTemplate } from "../../../domain/src/notification-templates";
import type { EventType } from "../../../domain/src/notification-templates";

export interface DispatchRequest {
  outboxRecordId: string; tenantId: string; userId?: string;
  channel: NotificationChannel; to: string;
  eventType: EventType; templateVars: Record<string,string>;
  idempotencyKey: string; locale?: string; metadata?: Record<string,unknown>;
}

export interface DispatchResult {
  outboxRecordId: string; channel: NotificationChannel;
  providerRef: string; status: "SENT"|"FAILED"|"SUPPRESSED"|"NO_ADAPTER";
  failureReason?: string;
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);
  constructor(private readonly registry: NotificationAdapterRegistry) {}

  async dispatch(req: DispatchRequest): Promise<DispatchResult> {
    const adapter = this.registry.get(req.channel);
    if (!adapter) {
      this.logger.warn("No adapter for channel " + req.channel);
      return { outboxRecordId: req.outboxRecordId, channel: req.channel, providerRef: "", status: "NO_ADAPTER" };
    }
    const tpl = resolveTemplate(req.eventType, req.templateVars);
    try {
      const result = await adapter.send({ to: req.to, subject: tpl.subject, title: tpl.subject, body: tpl.body, idempotencyKey: req.idempotencyKey, tenantId: req.tenantId, channel: req.channel, locale: req.locale, metadata: req.metadata });
      this.logger.log("[" + req.channel + "] " + result.status + " via " + adapter.name);
      return { outboxRecordId: req.outboxRecordId, channel: req.channel, providerRef: result.providerRef, status: result.status, failureReason: result.failureReason };
    } catch (err: any) {
      this.logger.error("[" + req.channel + "] " + err.message, err.stack);
      return { outboxRecordId: req.outboxRecordId, channel: req.channel, providerRef: "", status: "FAILED", failureReason: err.message };
    }
  }

  async dispatchMany(requests: DispatchRequest[]): Promise<DispatchResult[]> {
    return Promise.all(requests.map(r => this.dispatch(r)));
  }
}
