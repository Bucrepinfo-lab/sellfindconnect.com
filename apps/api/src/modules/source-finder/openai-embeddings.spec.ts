import { describe, expect, it, vi } from 'vitest';

import {
  OpenAiSourceFinderEmbedder,
  createConfiguredSourceFinderEmbedder,
} from './openai-embeddings';

function jsonFetch(status: number, body: unknown) {
  return vi.fn(async (input: string, init?: { headers?: Record<string, string>; body?: string }) => {
    expect(input).toBe('https://api.openai.com/v1/embeddings');
    expect(JSON.stringify(init?.headers ?? {})).toContain('Bearer sk-test');
    expect(init?.body).toContain('text-embedding-3-small');
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  });
}

describe('Source Finder OpenAI embedding overlay', () => {
  it('overlays when OPENAI_API_KEY is set and fail-closes named providers without a key', () => {
    expect(
      createConfiguredSourceFinderEmbedder({
        get: (key) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined),
      }),
    ).toBeInstanceOf(OpenAiSourceFinderEmbedder);
    expect(createConfiguredSourceFinderEmbedder({ get: () => undefined })).toBeUndefined();
    expect(
      createConfiguredSourceFinderEmbedder({
        get: (key) =>
          ({
            SOURCE_FINDER_EMBEDDING_PROVIDER: 'development',
            OPENAI_API_KEY: 'sk-test',
          })[key],
      }),
    ).toBeUndefined();
    expect(() =>
      createConfiguredSourceFinderEmbedder({
        get: (key) => (key === 'SOURCE_FINDER_EMBEDDING_PROVIDER' ? 'openai' : undefined),
      }),
    ).toThrow('OPENAI_API_KEY is required');
    expect(() =>
      createConfiguredSourceFinderEmbedder({
        get: (key) => (key === 'SOURCE_FINDER_EMBEDDING_PROVIDER' ? 'cohere' : undefined),
      }),
    ).toThrow('Unsupported SOURCE_FINDER_EMBEDDING_PROVIDER "cohere"');
  });

  it('embeds text through OpenAI and omits the API key from the result', async () => {
    const fetchImpl = jsonFetch(200, {
      data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
    });
    const embedder = new OpenAiSourceFinderEmbedder('sk-test', 'text-embedding-3-small', fetchImpl);

    await expect(embedder.embed('fresh produce suppliers in Nairobi')).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(JSON.stringify(await fetchImpl.mock.results[0]?.value)).not.toContain('sk-test');
  });

  it('fail-closes when the OpenAI embeddings endpoint is unavailable', async () => {
    const embedder = new OpenAiSourceFinderEmbedder(
      'sk-test',
      'text-embedding-3-small',
      jsonFetch(503, { error: { message: 'busy' } }),
    );

    await expect(embedder.embed('fresh produce')).rejects.toThrow('SOURCE_FINDER_EMBEDDING_UNAVAILABLE');
  });
});
