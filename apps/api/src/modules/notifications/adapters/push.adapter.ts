import type { NotificationAdapter, NotificationPayload, DeliveryResult } from "@telpen/domain";

export class FcmPushAdapter implements NotificationAdapter {
  readonly channel = "PUSH" as const;
  readonly name = "fcm";
  private tokenCache: { token: string; expiresAt: number } | null = null;
  constructor(private env: Record<string,string|undefined> = process.env, private fetchImpl: typeof fetch = fetch) {}
  private cfg(k: string): string { const v = this.env[k]; if (!v) throw new Error("FcmPushAdapter: missing env " + k); return v; }
  private sa() { return JSON.parse(Buffer.from(this.cfg("FCM_SERVICE_ACCOUNT_JSON"), "base64").toString("utf8")) as { client_email:string; private_key:string; project_id:string }; }
  private async accessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) return this.tokenCache.token;
    const sa = this.sa();
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const header = enc({ alg: "RS256", typ: "JWT" });
    const claim = enc({ iss: sa.client_email, sub: sa.client_email, aud: "https://oauth2.googleapis.com/token", scope: "https://www.googleapis.com/auth/firebase.messaging", iat: now, exp: now + 3600 });
    const { createSign } = await import("node:crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(header + "." + claim);
    const jwt = header + "." + claim + "." + sign.sign(sa.private_key, "base64url");
    const res = await this.fetchImpl("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
    const json = await res.json() as { access_token: string; expires_in: number };
    this.tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
    return this.tokenCache.token;
  }
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const projectId = this.env["FCM_PROJECT_ID"] ?? this.sa().project_id;
    const token = await this.accessToken();
    const res = await this.fetchImpl("https://fcm.googleapis.com/v1/projects/" + projectId + "/messages:send", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: payload.to, notification: { title: payload.title, body: payload.body }, data: { tenantId: payload.tenantId }, android: { priority: "high" }, apns: { payload: { aps: { sound: "default" } } } } }),
    });
    const json = await res.json() as { name?: string; error?: { message: string } };
    if (!res.ok) return { providerRef: "", status: "FAILED", failureReason: json.error?.message ?? "HTTP " + res.status, raw: json };
    return { providerRef: json.name ?? "", status: "SENT", raw: json };
  }
}
