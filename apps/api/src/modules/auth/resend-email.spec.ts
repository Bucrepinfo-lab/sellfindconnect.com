import { describe, expect, it, vi } from 'vitest';

import {
  ResendAuthEmailSender,
  buildAuthEmailMessage,
  createAuthEmailSender,
  resolveAuthEmailAppOrigin,
} from './resend-email';

function jsonFetch(status: number, body: unknown) {
  return vi.fn(
    async (_input: string, _init?: { method?: string; headers?: Record<string, string>; body?: string }) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe('auth email sender', () => {
  it('builds verification copy with an app-origin link and no HTML injection', () => {
    const message = buildAuthEmailMessage({
      purpose: 'EMAIL_VERIFICATION',
      to: 'owner@example.com',
      token: 'verify-token',
      expiresAt: '2026-08-22T12:00:00.000Z',
      idempotencyKey: 'challenge-1',
      tenantId: 'tenant-1',
      env: { WEB_URL: 'https://sellfindconnect.com/' },
    });

    expect(message.subject).toContain('Verify');
    expect(message.text).toContain('https://sellfindconnect.com/auth/verify-email?token=verify-token');
    expect(message.text).toContain('verify-token');
    expect(message.html).toContain('verify-token');
    expect(resolveAuthEmailAppOrigin({ WEB_URL: 'https://app.example/' })).toBe('https://app.example');
  });

  it('sends through Resend and omits the API key from the result', async () => {
    const fetcher = jsonFetch(200, { id: 're_123' });
    const sender = new ResendAuthEmailSender(
      {
        RESEND_API_KEY: 're_secret',
        EMAIL_FROM: 'Telpen Adverts <no-reply@sellfindconnect.com>',
      },
      fetcher,
    );

    const result = await sender.sendAuthEmail(
      buildAuthEmailMessage({
        purpose: 'PASSWORD_RESET',
        to: 'owner@example.com',
        token: 'reset-token',
        expiresAt: '2026-08-21T18:30:00.000Z',
        idempotencyKey: 'reset-1',
      }),
    );

    expect(result).toEqual({ ok: true, providerRef: 're_123', raw: { id: 're_123' } });
    expect(JSON.stringify(result)).not.toContain('re_secret');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_secret',
          'Idempotency-Key': 'reset-1',
          'User-Agent': expect.stringContaining('SellFindConnect-Auth'),
        }),
      }),
    );
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
      to: string[];
      tags: { name: string; value: string }[];
    };
    expect(body.to).toEqual(['owner@example.com']);
    expect(body.tags).toContainEqual({ name: 'purpose', value: 'password_reset' });
  });

  it('returns ok:false when Resend rejects the request or keys are missing', async () => {
    const fetcher = jsonFetch(401, { message: 'invalid API key' });
    const sender = new ResendAuthEmailSender(
      {
        RESEND_API_KEY: 're_secret',
        EMAIL_FROM: 'no-reply@sellfindconnect.com',
      },
      fetcher,
    );

    await expect(
      sender.sendAuthEmail(
        buildAuthEmailMessage({
          purpose: 'MFA',
          to: 'owner@example.com',
          code: '123456',
          expiresAt: '2026-08-21T18:10:00.000Z',
          idempotencyKey: 'mfa-1',
        }),
      ),
    ).resolves.toMatchObject({ ok: false });

    const unconfigured = new ResendAuthEmailSender({}, fetcher);
    await expect(
      unconfigured.sendAuthEmail(
        buildAuthEmailMessage({
          purpose: 'TENANT_INVITE',
          to: 'agent@example.com',
          token: 'invite-token',
          tenantDisplayName: 'Nairobi Fresh Produce Cooperative',
          expiresAt: '2026-08-28T12:00:00.000Z',
          idempotencyKey: 'invite-1',
        }),
      ),
    ).resolves.toEqual({ ok: false, raw: { error: 'resend_not_configured' } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('overlays Resend from credentials and fail-closes when the provider is selected without keys', () => {
    expect(createAuthEmailSender({})).toBeUndefined();
    expect(
      createAuthEmailSender({
        AUTH_EMAIL_PROVIDER: 'development',
        RESEND_API_KEY: 're_secret',
        EMAIL_FROM: 'no-reply@sellfindconnect.com',
      }),
    ).toBeUndefined();
    expect(
      createAuthEmailSender({
        RESEND_API_KEY: 're_secret',
        EMAIL_FROM: 'no-reply@sellfindconnect.com',
      }),
    ).toBeInstanceOf(ResendAuthEmailSender);
    expect(() => createAuthEmailSender({ AUTH_EMAIL_PROVIDER: 'resend' })).toThrow(
      'RESEND_API_KEY is required when AUTH_EMAIL_PROVIDER=resend.',
    );
    expect(() =>
      createAuthEmailSender({ AUTH_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_secret' }),
    ).toThrow('EMAIL_FROM is required when AUTH_EMAIL_PROVIDER=resend.');
  });
});
