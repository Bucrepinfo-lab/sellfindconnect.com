import type { NotificationAdapter, NotificationPayload, DeliveryResult } from "@telpen/domain";

export class ResendEmailAdapter implements NotificationAdapter {
  readonly channel = "EMAIL" as const;
  readonly name = "resend";
  constructor(private env: Record<string,string|undefined> = process.env, private fetchImpl: typeof fetch = fetch) {}
  private cfg(k: string): string { const v = this.env[k]; if (!v) throw new Error("ResendEmailAdapter: missing env " + k); return v; }
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + this.cfg("RESEND_API_KEY"), "Content-Type": "application/json", "Idempotency-Key": payload.idempotencyKey },
      body: JSON.stringify({ from: this.cfg("EMAIL_FROM"), to: [payload.to], subject: payload.subject ?? payload.title, text: payload.body, tags: [{ name: "tenantId", value: payload.tenantId }] }),
    });
    const json = await res.json() as { id?: string; message?: string };
    if (!res.ok) return { providerRef: "", status: "FAILED", failureReason: json.message ?? "HTTP " + res.status, raw: json };
    return { providerRef: json.id ?? "", status: "SENT", raw: json };
  }
}
