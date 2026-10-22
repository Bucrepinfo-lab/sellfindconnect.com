import { Injectable } from '@nestjs/common';

/**
 * Auth email delivery abstraction. Injected optionally into AuthService so unit
 * tests that construct the service without Nest DI keep working with no sender.
 */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export type AuthEmailPurpose =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'TENANT_INVITE'
  | 'MFA';

export type AuthEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose: AuthEmailPurpose;
  idempotencyKey: string;
  tenantId?: string;
};

export type AuthEmailSendResult = {
  ok: boolean;
  providerRef?: string;
  raw?: unknown;
};

export interface AuthEmailSender {
  sendAuthEmail(message: AuthEmailMessage): Promise<AuthEmailSendResult>;
}

type AuthEmailEnv = Record<string, string | undefined>;

type AuthEmailFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

function trimEnv(env: AuthEmailEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function hasResendAuthEmailConfig(env: AuthEmailEnv = process.env): boolean {
  return Boolean(trimEnv(env, 'RESEND_API_KEY') && trimEnv(env, 'EMAIL_FROM'));
}

export function assertResendAuthEmailConfig(env: AuthEmailEnv = process.env): void {
  if (!trimEnv(env, 'RESEND_API_KEY')) {
    throw new Error('RESEND_API_KEY is required when AUTH_EMAIL_PROVIDER=resend.');
  }
  if (!trimEnv(env, 'EMAIL_FROM')) {
    throw new Error('EMAIL_FROM is required when AUTH_EMAIL_PROVIDER=resend.');
  }
}

export function resolveAuthEmailAppOrigin(env: AuthEmailEnv = process.env): string {
  const origin =
    trimEnv(env, 'WEB_URL') ??
    trimEnv(env, 'WEB_ORIGIN') ??
    trimEnv(env, 'APP_URL') ??
    'https://sellfindconnect.com';
  return origin.replace(/\/+$/, '');
}

function linkForPurpose(purpose: AuthEmailPurpose, origin: string, token?: string): string | undefined {
  if (!token) {
    return undefined;
  }
  const encoded = encodeURIComponent(token);
  if (purpose === 'EMAIL_VERIFICATION') {
    return `${origin}/auth/verify-email?token=${encoded}`;
  }
  if (purpose === 'PASSWORD_RESET') {
    return `${origin}/auth/reset-password?token=${encoded}`;
  }
  if (purpose === 'TENANT_INVITE') {
    return `${origin}/auth/invite?token=${encoded}`;
  }
  return undefined;
}

export function buildAuthEmailMessage(input: {
  purpose: AuthEmailPurpose;
  to: string;
  token?: string;
  code?: string;
  tenantDisplayName?: string;
  expiresAt: string;
  idempotencyKey: string;
  tenantId?: string;
  env?: AuthEmailEnv;
}): AuthEmailMessage {
  const origin = resolveAuthEmailAppOrigin(input.env);
  const link = linkForPurpose(input.purpose, origin, input.token);
  const tenantName = input.tenantDisplayName?.trim() || 'a Telpen Adverts workspace';

  let subject = 'Telpen Adverts account message';
  let text = 'This message was sent from Telpen Adverts.';

  if (input.purpose === 'EMAIL_VERIFICATION') {
    subject = 'Verify your Telpen Adverts email';
    text = [
      'Confirm your email for Telpen Adverts.',
      link ? `Open this link: ${link}` : undefined,
      input.token ? `Or paste this verification token: ${input.token}` : undefined,
      `This link expires at ${input.expiresAt}.`,
      'If you did not create this account, you can ignore this email.',
    ]
      .filter(Boolean)
      .join('\n\n');
  } else if (input.purpose === 'PASSWORD_RESET') {
    subject = 'Reset your Telpen Adverts password';
    text = [
      'Use this message to reset your Telpen Adverts password.',
      link ? `Open this link: ${link}` : undefined,
      input.token ? `Or paste this reset token: ${input.token}` : undefined,
      `This link expires at ${input.expiresAt}.`,
      'If you did not request a reset, you can ignore this email.',
    ]
      .filter(Boolean)
      .join('\n\n');
  } else if (input.purpose === 'TENANT_INVITE') {
    subject = `You are invited to join ${tenantName} on Telpen Adverts`;
    text = [
      `You were invited to join ${tenantName} on Telpen Adverts.`,
      link ? `Open this link to accept: ${link}` : undefined,
      input.token ? `Or paste this invite token: ${input.token}` : undefined,
      `This invite expires at ${input.expiresAt}.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  } else {
    subject = 'Your Telpen Adverts verification code';
    text = [
      input.code
        ? `${input.code} is your Telpen Adverts verification code.`
        : 'Your Telpen Adverts verification code was issued.',
      `It expires at ${input.expiresAt}. Do not share it.`,
    ].join('\n\n');
  }

  const html = `<p>${escapeHtml(text).replaceAll('\n\n', '</p><p>')}</p>`;

  return {
    to: input.to,
    subject,
    text,
    html,
    purpose: input.purpose,
    idempotencyKey: input.idempotencyKey,
    tenantId: input.tenantId,
  };
}

/**
 * Resend transactional mail for auth challenges. Returns ok:false (never throws)
 * when unconfigured or the provider rejects the request, so auth flows can keep
 * development tokens in non-production.
 *
 * Env: RESEND_API_KEY, EMAIL_FROM. Optional WEB_URL / WEB_ORIGIN / APP_URL for links.
 */
@Injectable()
export class ResendAuthEmailSender implements AuthEmailSender {
  constructor(
    private readonly env: AuthEmailEnv = process.env,
    private readonly fetchImpl: AuthEmailFetch = fetch,
  ) {}

  async sendAuthEmail(message: AuthEmailMessage): Promise<AuthEmailSendResult> {
    const apiKey = trimEnv(this.env, 'RESEND_API_KEY');
    const from = trimEnv(this.env, 'EMAIL_FROM');
    if (!apiKey || !from) {
      return { ok: false, raw: { error: 'resend_not_configured' } };
    }

    const tags = [{ name: 'purpose', value: message.purpose.toLowerCase() }];
    if (message.tenantId) {
      tags.push({ name: 'tenantId', value: message.tenantId });
    }

    try {
      const response = await this.fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey,
          'User-Agent': 'SellFindConnect-Auth/1.0 (+https://sellfindconnect.com)',
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          tags,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        return {
          ok: false,
          providerRef: '',
          raw: {
            status: response.status,
            message: json.error?.message ?? json.message ?? `HTTP ${response.status}`,
          },
        };
      }
      return {
        ok: true,
        providerRef: json.id ?? '',
        raw: { id: json.id ?? '' },
      };
    } catch {
      return { ok: false, raw: { error: 'resend_request_failed' } };
    }
  }
}

export function createAuthEmailSender(
  env: AuthEmailEnv = process.env,
  fetchImpl: AuthEmailFetch = fetch,
): AuthEmailSender | undefined {
  const provider = trimEnv(env, 'AUTH_EMAIL_PROVIDER')?.toLowerCase() ?? '';
  if (['development', 'memory', 'off', 'none'].includes(provider)) {
    return undefined;
  }
  if (['resend', 'live'].includes(provider)) {
    assertResendAuthEmailConfig(env);
    return new ResendAuthEmailSender(env, fetchImpl);
  }
  if (hasResendAuthEmailConfig(env)) {
    return new ResendAuthEmailSender(env, fetchImpl);
  }
  return undefined;
}
