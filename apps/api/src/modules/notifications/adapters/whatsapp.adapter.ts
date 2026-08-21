import type { DeliveryResult, NotificationAdapter, NotificationPayload } from '@telpen/domain';
import { toE164, toWhatsAppCloudRecipient } from '@telpen/domain';

type WhatsAppEnv = Record<string, string | undefined>;
type WhatsAppFetch = typeof fetch;

function requiredEnv(env: WhatsAppEnv, key: string, context: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required when ${context}.`);
  }
  return value;
}

function firstEnv(env: WhatsAppEnv, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function hasMetaWhatsAppConfig(env: WhatsAppEnv): boolean {
  return Boolean(firstEnv(env, ['WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN']) && env.WHATSAPP_PHONE_NUMBER_ID?.trim());
}

export function hasAfricasTalkingWhatsAppConfig(env: WhatsAppEnv): boolean {
  return Boolean(
    env.AT_API_KEY?.trim() &&
      env.AT_USERNAME?.trim() &&
      firstEnv(env, ['AT_WHATSAPP_FROM', 'WHATSAPP_FROM']),
  );
}

export function assertMetaWhatsAppConfig(env: WhatsAppEnv): void {
  if (!firstEnv(env, ['WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN'])) {
    throw new Error('WHATSAPP_TOKEN is required when WHATSAPP_PROVIDER=meta.');
  }
  requiredEnv(env, 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PROVIDER=meta');
}

export function assertAfricasTalkingWhatsAppConfig(env: WhatsAppEnv): void {
  requiredEnv(env, 'AT_API_KEY', 'WHATSAPP_PROVIDER=africastalking');
  requiredEnv(env, 'AT_USERNAME', 'WHATSAPP_PROVIDER=africastalking');
  if (!firstEnv(env, ['AT_WHATSAPP_FROM', 'WHATSAPP_FROM'])) {
    throw new Error('AT_WHATSAPP_FROM is required when WHATSAPP_PROVIDER=africastalking.');
  }
}

function invalidPhoneResult(): DeliveryResult {
  return {
    providerRef: '',
    status: 'FAILED',
    failureReason: 'WhatsApp destination must be an E.164 phone number.',
  };
}

export class MetaWhatsAppAdapter implements NotificationAdapter {
  readonly channel = 'WHATSAPP' as const;
  readonly name = 'whatsapp-cloud';

  constructor(
    private readonly env: WhatsAppEnv = process.env,
    private readonly fetchImpl: WhatsAppFetch = fetch,
  ) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const to = toWhatsAppCloudRecipient(payload.to);
    if (!to) {
      return invalidPhoneResult();
    }

    const token = firstEnv(this.env, ['WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN']);
    const phoneNumberId = this.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) {
      return {
        providerRef: '',
        status: 'FAILED',
        failureReason: 'WhatsApp Cloud credentials are missing.',
      };
    }

    const version = this.env.WHATSAPP_API_VERSION?.trim() || 'v21.0';
    const templateName = this.env.WHATSAPP_TEMPLATE_NAME?.trim();
    const body = templateName
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: this.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en' },
          },
        }
      : {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: `${payload.title}\n\n${payload.body}`.slice(0, 4096),
            preview_url: false,
          },
        };

    const response = await this.fetchImpl(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      return {
        providerRef: '',
        status: 'FAILED',
        failureReason: json.error?.message ?? `HTTP ${response.status}`,
        raw: json,
      };
    }

    return {
      providerRef: json.messages?.[0]?.id ?? '',
      status: 'SENT',
      raw: json,
    };
  }
}

export class AfricasTalkingWhatsAppAdapter implements NotificationAdapter {
  readonly channel = 'WHATSAPP' as const;
  readonly name = 'africas-talking-whatsapp';

  constructor(
    private readonly env: WhatsAppEnv = process.env,
    private readonly fetchImpl: WhatsAppFetch = fetch,
  ) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const to = toE164(payload.to);
    if (!to) {
      return invalidPhoneResult();
    }

    const apiKey = this.env.AT_API_KEY?.trim();
    const username = this.env.AT_USERNAME?.trim();
    const from = firstEnv(this.env, ['AT_WHATSAPP_FROM', 'WHATSAPP_FROM']);
    if (!apiKey || !username || !from) {
      return {
        providerRef: '',
        status: 'FAILED',
        failureReason: "Africa's Talking WhatsApp credentials are missing.",
      };
    }

    const templateName = this.env.WHATSAPP_TEMPLATE_NAME?.trim();
    const message = templateName
      ? {
          username,
          productId: this.env.AT_WHATSAPP_PRODUCT_ID?.trim(),
          from,
          to,
          type: 'template',
          message: {
            template: {
              name: templateName,
              language: { code: this.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en' },
            },
          },
        }
      : {
          username,
          productId: this.env.AT_WHATSAPP_PRODUCT_ID?.trim(),
          from,
          to,
          type: 'text',
          message: { text: `${payload.title}\n\n${payload.body}`.slice(0, 4096) },
        };

    const response = await this.fetchImpl('https://chat.africastalking.com/whatsapp/message/send', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(message),
    });
    const json = (await response.json()) as {
      messageId?: string;
      id?: string;
      status?: string;
      errorMessage?: string;
      message?: string;
    };
    if (!response.ok) {
      return {
        providerRef: '',
        status: 'FAILED',
        failureReason: json.errorMessage ?? json.message ?? `HTTP ${response.status}`,
        raw: json,
      };
    }

    return {
      providerRef: json.messageId ?? json.id ?? '',
      status: 'SENT',
      raw: json,
    };
  }
}

export function registerWhatsAppAdapter(
  register: (adapter: NotificationAdapter) => void,
  env: WhatsAppEnv = process.env,
  fetchImpl: WhatsAppFetch = fetch,
): void {
  const provider = env.WHATSAPP_PROVIDER?.trim().toLowerCase() ?? '';
  if (['meta', 'cloud', 'whatsapp'].includes(provider)) {
    assertMetaWhatsAppConfig(env);
    register(new MetaWhatsAppAdapter(env, fetchImpl));
    return;
  }
  if (['africastalking', 'at', 'whatsapp-at'].includes(provider)) {
    assertAfricasTalkingWhatsAppConfig(env);
    register(new AfricasTalkingWhatsAppAdapter(env, fetchImpl));
    return;
  }
  if (hasMetaWhatsAppConfig(env)) {
    register(new MetaWhatsAppAdapter(env, fetchImpl));
    return;
  }
  if (hasAfricasTalkingWhatsAppConfig(env)) {
    register(new AfricasTalkingWhatsAppAdapter(env, fetchImpl));
  }
}
