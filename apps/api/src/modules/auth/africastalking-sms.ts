import { Injectable } from '@nestjs/common';

/**
 * SMS delivery abstraction. Injected optionally into AuthService so unit tests
 * (which construct the service without Nest DI) keep working with no sender.
 */
export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSendResult {
  ok: boolean;
  raw: unknown;
}

export interface SmsSender {
  sendSms(to: string, message: string): Promise<SmsSendResult>;
}

/**
 * Africa's Talking SMS — delivers the phone-login OTP. Uses the sandbox endpoint
 * automatically when AT_USERNAME === 'sandbox'. Returns ok:false (never throws)
 * when unconfigured, so the auth flow degrades gracefully (dev returns the code
 * in the response instead).
 *
 * Env: AT_USERNAME, AT_API_KEY, AT_SENDER_ID (optional alphanumeric sender).
 */
@Injectable()
export class AfricasTalkingSmsSender implements SmsSender {
  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;
    if (!username || !apiKey) {
      return { ok: false, raw: { error: 'africastalking_not_configured' } };
    }

    const base =
      username === 'sandbox'
        ? 'https://api.sandbox.africastalking.com'
        : 'https://api.africastalking.com';

    const body = new URLSearchParams({ username, to, message });
    const from = process.env.AT_SENDER_ID;
    if (from) {
      body.set('from', from);
    }

    const response = await fetch(`${base}/version1/messaging`, {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    const raw: unknown = await response.json().catch(() => ({}));
    const recipients =
      (raw as { SMSMessageData?: { Recipients?: { statusCode?: number; status?: string }[] } })
        ?.SMSMessageData?.Recipients ?? [];
    const ok =
      response.ok &&
      recipients.some((recipient) => recipient.statusCode === 101 || /success/i.test(recipient.status ?? ''));

    return { ok, raw };
  }
}
