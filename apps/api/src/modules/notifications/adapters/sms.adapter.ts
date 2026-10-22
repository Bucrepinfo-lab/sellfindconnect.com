import type { NotificationAdapter, NotificationPayload, DeliveryResult } from "@telpen/domain";

export class AfricasTalkingSmsAdapter implements NotificationAdapter {
  readonly channel = "SMS" as const;
  readonly name = "africas-talking";
  constructor(private env: Record<string,string|undefined> = process.env, private fetchImpl: typeof fetch = fetch) {}
  private cfg(k: string): string { const v = this.env[k]; if (!v) throw new Error("AfricasTalkingSmsAdapter: missing env " + k); return v; }
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const body = new URLSearchParams({ username: this.cfg("AT_USERNAME"), to: payload.to, message: payload.body });
    if (this.env["AT_SENDER_ID"]) body.set("from", this.env["AT_SENDER_ID"]!);
    const res = await this.fetchImpl("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { apiKey: this.cfg("AT_API_KEY"), "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    const json = await res.json() as { SMSMessageData?: { Recipients?: Array<{ status: string; messageId: string; statusCode: number }> } };
    const r = json?.SMSMessageData?.Recipients?.[0];
    if (!res.ok || !r) return { providerRef: "", status: "FAILED", failureReason: "HTTP " + res.status, raw: json };
    const ok = r.statusCode === 101;
    return { providerRef: r.messageId ?? "", status: ok ? "SENT" : "FAILED", failureReason: ok ? undefined : r.status, raw: json };
  }
}
