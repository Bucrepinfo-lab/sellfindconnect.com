import { describe, expect, it, vi } from 'vitest';

import type { MatchExplanationInput } from '@telpen/domain';

import {
  AnthropicSourceFinderExplainer,
  createConfiguredSourceFinderExplainer,
} from './anthropic-explainer';

const input: MatchExplanationInput = {
  query: 'who packages avocados for export in Kenya',
  name: 'Rift Valley Pack House',
  role: 'PROCESSOR',
  location: 'Nakuru, Kenya',
  offers: ['Avocado packing', 'Cold storage'],
  verified: true,
  reasonCodes: ['OFFER_MATCH', 'COUNTRY_MATCH'],
  reasons: ['Offers avocado packing which matches the search.', 'Located in Kenya.'],
};

function anthropicFetch(status: number, body: unknown) {
  return vi.fn(async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(JSON.stringify(init?.headers ?? {})).toContain('x-api-key');
    expect(init?.body).toContain('claude-haiku-5-5');
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  });
}

function textMessage(text: string) {
  return { content: [{ type: 'text', text }] };
}

describe('Source Finder Anthropic explanation overlay', () => {
  it('overlays only when the provider is selected AND a key is present', () => {
    expect(
      createConfiguredSourceFinderExplainer({
        get: (key) =>
          ({ MATCH_EXPLANATION_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant-test' })[key],
      }),
    ).toBeInstanceOf(AnthropicSourceFinderExplainer);

    // No provider → stays on the free template even if a key is present.
    expect(
      createConfiguredSourceFinderExplainer({
        get: (key) => (key === 'ANTHROPIC_API_KEY' ? 'sk-ant-test' : undefined),
      }),
    ).toBeUndefined();

    // Explicitly disabled.
    expect(
      createConfiguredSourceFinderExplainer({
        get: (key) =>
          ({ MATCH_EXPLANATION_PROVIDER: 'development', ANTHROPIC_API_KEY: 'sk-ant-test' })[key],
      }),
    ).toBeUndefined();

    // Named provider without a key fails closed.
    expect(() =>
      createConfiguredSourceFinderExplainer({
        get: (key) => (key === 'MATCH_EXPLANATION_PROVIDER' ? 'anthropic' : undefined),
      }),
    ).toThrow(/ANTHROPIC_API_KEY/);

    // Unknown provider is rejected.
    expect(() =>
      createConfiguredSourceFinderExplainer({
        get: (key) => (key === 'MATCH_EXPLANATION_PROVIDER' ? 'gemini' : undefined),
      }),
    ).toThrow(/Unsupported/);
  });

  it('returns the cleaned model text on success', async () => {
    const explainer = new AnthropicSourceFinderExplainer(
      'sk-ant-test',
      'claude-haiku-5-5',
      anthropicFetch(200, textMessage('Matches your avocado export search — Kenyan packer with cold storage.')),
    );
    const out = await explainer.explain(input);
    expect(out).toBe('Matches your avocado export search — Kenyan packer with cold storage.');
  });

  it('skips a leading thinking block and reads the text block', async () => {
    const body = {
      content: [
        { type: 'thinking', thinking: '', signature: 'abc' },
        { type: 'text', text: 'A Kenyan avocado packer that fits your search.' },
      ],
    };
    const explainer = new AnthropicSourceFinderExplainer('sk-ant-test', 'claude-haiku-5-5', anthropicFetch(200, body));
    expect(await explainer.explain(input)).toBe('A Kenyan avocado packer that fits your search.');
  });

  it('falls back (undefined) on a non-ok response', async () => {
    const explainer = new AnthropicSourceFinderExplainer('sk-ant-test', 'claude-haiku-5-5', anthropicFetch(401, { error: {} }));
    expect(await explainer.explain(input)).toBeUndefined();
  });

  it('falls back (undefined) when the fetch throws', async () => {
    const explainer = new AnthropicSourceFinderExplainer(
      'sk-ant-test',
      'claude-haiku-5-5',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await explainer.explain(input)).toBeUndefined();
  });

  it('falls back (undefined) when the model returns no text', async () => {
    const explainer = new AnthropicSourceFinderExplainer('sk-ant-test', 'claude-haiku-5-5', anthropicFetch(200, textMessage('   ')));
    expect(await explainer.explain(input)).toBeUndefined();
  });
});
