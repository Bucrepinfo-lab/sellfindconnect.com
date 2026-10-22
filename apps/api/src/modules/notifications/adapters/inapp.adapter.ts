import type { NotificationAdapter, NotificationPayload, DeliveryResult } from "@telpen/domain";

export interface InAppPersistencePort {
  saveNotification(params: { tenantId:string; userId:string; title:string; message:string; entityType:string; entityId:string; channel:string; scheduledFor:Date }): Promise<{ id:string }>;
}

export class InAppAdapter implements NotificationAdapter {
  readonly channel = "IN_APP" as const;
  readonly name = "in-app";
  constructor(private persistence: InAppPersistencePort) {}
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      const row = await this.persistence.saveNotification({
        tenantId: payload.tenantId, userId: payload.to,
        title: payload.title, message: payload.body,
        entityType: (payload.metadata?.entityType as string) ?? "SYSTEM",
        entityId: (payload.metadata?.entityId as string) ?? payload.idempotencyKey,
        channel: "IN_APP", scheduledFor: new Date(),
      });
      return { providerRef: row.id, status: "SENT" };
    } catch (e: any) {
      return { providerRef: "", status: "FAILED", failureReason: e.message };
    }
  }
}
