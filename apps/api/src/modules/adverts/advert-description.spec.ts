import { describe, expect, it, vi } from 'vitest';

import { AdvertDescriptionService } from './advert-description.service';
import { AnthropicAdvertDrafter, createConfiguredAdvertDrafter, type AdvertDrafter } from './advert-drafter';

const tenantId = '11111111-1111-4111-8111-111111111111';

function fakeAuth(existing: Array<{ action: string; createdAt: string; metadata?: Record<string, unknown> }> = []) {
  const recorded: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
  return {
    recorded,
    listAuditLogsForTenant: vi.fn(async () => ({ tenantId, auditLogs: existing })),
    recordTenantAudit: vi.fn(async (record: { action: string; metadata?: Record<string, unknown> }) => {
      recorded.push(record);
    }),
  };
}

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] });

describe('createConfiguredAdvertDrafter', () => {
  it('stays on the free template unless a provider and key are set', () => {
    expect(createConfiguredAdvertDrafter(config({}))).toBeUndefined();
    expect(createConfiguredAdvertDrafter(config({ ADVERT_DRAFT_PROVIDER: 'off', ANTHROPIC_API_KEY: 'k' }))).toBeUndefined();
    expect(() => createConfiguredAdvertDrafter(config({ ADVERT_DRAFT_PROVIDER: 'anthropic' }))).toThrow(/ANTHROPIC_API_KEY/);
    expect(createConfiguredAdvertDrafter(config({ ADVERT_DRAFT_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }))?.provider).toBe(
      'anthropic',
    );
  });
});

describe('AnthropicAdvertDrafter', () => {
  it('returns parsed, screened copy with token usage, or undefined on failure', async () => {
    const ok = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: 'thinking', thinking: '...' }, { type: 'text', text: '{"title":"Fresh greens","description":"Crisp sukuma wiki harvested daily for shops and hotels."}' }],
        usage: { input_tokens: 900, output_tokens: 250 },
      }),
    }));
    const drafter = new AnthropicAdvertDrafter('key', 'claude-haiku-5-5', ok);
    const input = { businessName: 'Kamau Farm', roleLabel: 'Producer', industryLabel: 'Agriculture' };
    await expect(drafter.draft(input)).resolves.toMatchObject({ title: 'Fresh greens', inputTokens: 900, outputTokens: 250 });

    const bad = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await expect(new AnthropicAdvertDrafter('key', 'm', bad).draft(input)).resolves.toBeUndefined();
    const throws = vi.fn(async () => {
      throw new Error('network');
    });
    await expect(new AnthropicAdvertDrafter('key', 'm', throws).draft(input)).resolves.toBeUndefined();
  });
});

describe('AdvertDescriptionService', () => {
  it('uses the free template when AI is off and records the draft', async () => {
    const auth = fakeAuth();
    const service = new AdvertDescriptionService(undefined, auth as never);
    const result = await service.draft(tenantId, 'owner-1', { title: 'Fresh sukuma wiki', notes: 'Sold by the crate' });
    expect(result.usedModel).toBe(false);
    expect(result.aiDraftsLeft).toBe(0);
    expect(result.description).toContain('Sold by the crate.');
    expect(auth.recorded[0]).toMatchObject({ action: 'ADVERT_DESCRIPTION_DRAFTED', metadata: { usedModel: false, reason: 'ai_off' } });
  });

  it('uses AI until the monthly cap, then falls back to the template', async () => {
    const drafter: AdvertDrafter = {
      provider: 'test',
      draft: vi.fn(async () => ({ title: 'AI title', description: 'AI written description for the advert.', inputTokens: 10, outputTokens: 5 })),
    };
    const now = '2026-11-11T10:00:00.000Z';
    const four = Array.from({ length: 4 }, () => ({
      action: 'ADVERT_DESCRIPTION_DRAFTED',
      createdAt: '2026-11-05T10:00:00.000Z',
      metadata: { usedModel: true },
    }));
    const service = new AdvertDescriptionService(drafter, fakeAuth(four) as never);
    const fifth = await service.draft(tenantId, 'owner-1', { title: 'Greens' }, now);
    expect(fifth).toMatchObject({ usedModel: true, title: 'AI title', aiDraftsLeft: 0 });

    const five = [...four, four[0]!];
    const capped = new AdvertDescriptionService(drafter, fakeAuth(five) as never);
    const sixth = await capped.draft(tenantId, 'owner-1', { title: 'Greens' }, now);
    expect(sixth.usedModel).toBe(false);
    expect(drafter.draft).toHaveBeenCalledTimes(1);
  });

  it('refuses blocked words before any AI call', async () => {
    const drafter: AdvertDrafter = { provider: 'test', draft: vi.fn() };
    const service = new AdvertDescriptionService(drafter, fakeAuth() as never);
    await expect(service.draft(tenantId, 'owner-1', { notes: 'ammunition in bulk' })).rejects.toThrow();
    expect(drafter.draft).not.toHaveBeenCalled();
  });
});
