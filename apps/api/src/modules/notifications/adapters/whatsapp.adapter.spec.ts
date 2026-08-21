import { describe, expect, it, vi } from 'vitest';

import type { NotificationPayload } from '@telpen/domain';

import {
  AfricasTalkingWhatsAppAdapter,
  MetaWhatsAppAdapter,
  registerWhatsAppAdapter,
} from './whatsapp.adapter';

const payload: NotificationPayload = {
  to: '+254700000001',
  title: 'SLA breached',
  body: 'A high-priority conversation has missed its response SLA.',
  idempotencyKey: 'outbox-1:WHATSAPP',
  tenantId: '11111111-1111-4111-8111-111111111111',
  channel: 'WHATSAPP',
};

function jsonFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

function requestBody(fetchImpl: typeof fetch): Record<string, unknown> {
  const call = (fetchImpl as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock
    .calls[0];
  if (!call?.[1]?.body) {
    throw new Error('WhatsApp adapter did not send a request body.');
  }
  return JSON.parse(call[1].body) as Record<string, unknown>;
}

describe('WhatsApp notification adapters', () => {
  it('sends a WhatsApp Cloud text message for an E.164 destination', async () => {
    const fetchImpl = jsonFetch(200, { messages: [{ id: 'wamid.123' }] });
    const adapter = new MetaWhatsAppAdapter(
      {
        WHATSAPP_TOKEN: 'eaak-test',
        WHATSAPP_PHONE_NUMBER_ID: '123456789',
      },
      fetchImpl,
    );

    await expect(adapter.send(payload)).resolves.toMatchObject({
      status: 'SENT',
      providerRef: 'wamid.123',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/123456789/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer eaak-test' }),
      }),
    );
    const body = requestBody(fetchImpl);
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '254700000001',
      type: 'text',
    });
  });

  it('uses an approved template when WHATSAPP_TEMPLATE_NAME is set', async () => {
    const fetchImpl = jsonFetch(200, { messages: [{ id: 'wamid.template' }] });
    const adapter = new MetaWhatsAppAdapter(
      {
        WHATSAPP_ACCESS_TOKEN: 'eaak-test',
        WHATSAPP_PHONE_NUMBER_ID: '123456789',
        WHATSAPP_TEMPLATE_NAME: 'sla_alert',
        WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
      },
      fetchImpl,
    );

    await expect(adapter.send(payload)).resolves.toMatchObject({ status: 'SENT' });
    const body = requestBody(fetchImpl);
    expect(body).toMatchObject({
      type: 'template',
      template: { name: 'sla_alert', language: { code: 'en_US' } },
    });
  });

  it('fails closed for destinations that are not E.164 phone numbers', async () => {
    const fetchImpl = jsonFetch(200, { messages: [{ id: 'wamid.123' }] });
    const adapter = new MetaWhatsAppAdapter(
      {
        WHATSAPP_TOKEN: 'eaak-test',
        WHATSAPP_PHONE_NUMBER_ID: '123456789',
      },
      fetchImpl,
    );

    await expect(adapter.send({ ...payload, to: 'not-a-phone' })).resolves.toMatchObject({
      status: 'FAILED',
      failureReason: 'WhatsApp destination must be an E.164 phone number.',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns FAILED when WhatsApp Cloud rejects the message', async () => {
    const adapter = new MetaWhatsAppAdapter(
      {
        WHATSAPP_TOKEN: 'eaak-test',
        WHATSAPP_PHONE_NUMBER_ID: '123456789',
      },
      jsonFetch(400, { error: { message: 'Invalid parameter' } }),
    );

    await expect(adapter.send(payload)).resolves.toMatchObject({
      status: 'FAILED',
      failureReason: 'Invalid parameter',
    });
  });

  it("sends through Africa's Talking WhatsApp when configured", async () => {
    const fetchImpl = jsonFetch(201, { messageId: 'ATWAPP_1' });
    const adapter = new AfricasTalkingWhatsAppAdapter(
      {
        AT_API_KEY: 'at-key',
        AT_USERNAME: 'sellfindconnect',
        AT_WHATSAPP_FROM: '+254711000000',
      },
      fetchImpl,
    );

    await expect(adapter.send({ ...payload, to: '0700000001' })).resolves.toMatchObject({
      status: 'SENT',
      providerRef: 'ATWAPP_1',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://chat.africastalking.com/whatsapp/message/send',
      expect.objectContaining({
        headers: expect.objectContaining({ apiKey: 'at-key' }),
      }),
    );
    const body = requestBody(fetchImpl);
    expect(body).toMatchObject({
      username: 'sellfindconnect',
      from: '+254711000000',
      to: '+254700000001',
      type: 'text',
    });
  });

  it('registers a live adapter from credentials and fail-closes when a provider is selected without keys', () => {
    const adapters: Array<{ name: string }> = [];
    registerWhatsAppAdapter((adapter) => adapters.push(adapter), {
      WHATSAPP_TOKEN: 'eaak-test',
      WHATSAPP_PHONE_NUMBER_ID: '123456789',
    });
    expect(adapters[0]?.name).toBe('whatsapp-cloud');

    adapters.length = 0;
    registerWhatsAppAdapter((adapter) => adapters.push(adapter), {
      AT_API_KEY: 'at-key',
      AT_USERNAME: 'sellfindconnect',
      WHATSAPP_FROM: '+254711000000',
    });
    expect(adapters[0]?.name).toBe('africas-talking-whatsapp');

    expect(() =>
      registerWhatsAppAdapter(
        () => undefined,
        { WHATSAPP_PROVIDER: 'meta' },
      ),
    ).toThrow('WHATSAPP_TOKEN is required when WHATSAPP_PROVIDER=meta.');
    expect(() =>
      registerWhatsAppAdapter(
        () => undefined,
        { WHATSAPP_PROVIDER: 'africastalking', AT_API_KEY: 'at-key', AT_USERNAME: 'sellfindconnect' },
      ),
    ).toThrow('AT_WHATSAPP_FROM is required when WHATSAPP_PROVIDER=africastalking.');
  });
});
