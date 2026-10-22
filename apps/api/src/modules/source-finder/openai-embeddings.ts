export const SOURCE_FINDER_EMBEDDER = Symbol('SOURCE_FINDER_EMBEDDER');

export type SourceFinderEmbedding = number[];

export interface SourceFinderEmbedder {
  readonly provider: string;
  readonly required: boolean;
  embed(text: string): Promise<SourceFinderEmbedding | undefined>;
  embedBatch(texts: string[]): Promise<Array<SourceFinderEmbedding | undefined>>;
}

type ConfigReader = {
  get(key: string): string | undefined;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const LIVE_PROVIDERS = new Set(['openai', 'live']);
const DISABLED_PROVIDERS = new Set(['development', 'memory', 'off', 'none']);
const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const DEFAULT_MODEL = 'text-embedding-3-small';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_INPUT_CHARS = 8_000;

function optionalConfig(config: ConfigReader | undefined, key: string): string | undefined {
  const value = config?.get(key)?.trim();
  return value ? value : undefined;
}

export function hasSourceFinderEmbeddingConfig(config?: ConfigReader): boolean {
  return Boolean(optionalConfig(config, 'OPENAI_API_KEY'));
}

export function assertSourceFinderEmbeddingConfig(config?: ConfigReader): void {
  if (!optionalConfig(config, 'OPENAI_API_KEY')) {
    throw new Error(
      'OPENAI_API_KEY is required when SOURCE_FINDER_EMBEDDING_PROVIDER selects the OpenAI overlay.',
    );
  }
}

function parseEmbedding(value: unknown): SourceFinderEmbedding | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const embedding = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
  return embedding.length === value.length ? embedding : undefined;
}

export class OpenAiSourceFinderEmbedder implements SourceFinderEmbedder {
  readonly provider = 'openai';

  constructor(
    private readonly apiKey: string,
    private readonly model = DEFAULT_MODEL,
    private readonly fetchImpl: FetchLike = fetch,
    readonly required = false,
  ) {}

  async embed(text: string): Promise<SourceFinderEmbedding | undefined> {
    const [first] = await this.embedBatch([text]);
    return first;
  }

  async embedBatch(texts: string[]): Promise<Array<SourceFinderEmbedding | undefined>> {
    const inputs = texts.map((text) => text.trim().slice(0, MAX_INPUT_CHARS));
    if (inputs.every((text) => !text)) {
      return texts.map(() => undefined);
    }

    let response: { ok: boolean; status: number; json(): Promise<unknown> };
    try {
      response = await this.fetchImpl(OPENAI_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: inputs.map((text) => text || ' '),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new Error('SOURCE_FINDER_EMBEDDING_UNAVAILABLE');
    }

    if (!response.ok) {
      throw new Error('SOURCE_FINDER_EMBEDDING_UNAVAILABLE');
    }

    const body = await response.json();
    const data =
      body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: Array<{ embedding?: unknown; index?: number }> }).data)
        : [];
    const embeddings: Array<SourceFinderEmbedding | undefined> = inputs.map(() => undefined);
    for (const [fallbackIndex, item] of data.entries()) {
      const index = typeof item.index === 'number' ? item.index : fallbackIndex;
      embeddings[index] = parseEmbedding(item.embedding);
    }
    return embeddings;
  }
}

export function createConfiguredSourceFinderEmbedder(
  config?: ConfigReader,
  fetchImpl: FetchLike = fetch,
): SourceFinderEmbedder | undefined {
  const provider = optionalConfig(config, 'SOURCE_FINDER_EMBEDDING_PROVIDER')?.toLowerCase() ?? '';
  if (DISABLED_PROVIDERS.has(provider)) {
    return undefined;
  }
  if (LIVE_PROVIDERS.has(provider)) {
    assertSourceFinderEmbeddingConfig(config);
  } else if (provider) {
    throw new Error(
      `Unsupported SOURCE_FINDER_EMBEDDING_PROVIDER "${provider}". Approve and wire openai before enabling it.`,
    );
  } else if (!hasSourceFinderEmbeddingConfig(config)) {
    return undefined;
  }

  return new OpenAiSourceFinderEmbedder(
    optionalConfig(config, 'OPENAI_API_KEY') as string,
    optionalConfig(config, 'OPENAI_EMBEDDING_MODEL') ?? DEFAULT_MODEL,
    fetchImpl,
    LIVE_PROVIDERS.has(provider),
  );
}
