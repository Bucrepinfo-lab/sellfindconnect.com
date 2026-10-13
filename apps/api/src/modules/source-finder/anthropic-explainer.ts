import {
  matchExplanationPrompt,
  parseMatchExplanation,
  MATCH_EXPLANATION_MODEL,
  MATCH_EXPLANATION_MAX_TOKENS,
  type MatchExplanationInput,
} from '@telpen/domain';

/**
 * Source Finder match EXPLAINER — the provider-neutral AI overlay that turns a
 * match's reason codes into a plain-English "why this match" line.
 *
 * Mirrors the embedder adapter: the default build runs with NO secrets (the
 * factory returns undefined and the service uses the deterministic template from
 * @telpen/domain). The Anthropic overlay is selected per-env and is defensive —
 * any failure returns undefined so the caller falls back to the free template,
 * and every model output is re-screened by the domain safety core before use.
 */

export const SOURCE_FINDER_EXPLAINER = Symbol('SOURCE_FINDER_EXPLAINER');

export interface SourceFinderExplainer {
  readonly provider: string;
  readonly required: boolean;
  /** Returns the AI explanation, or undefined to fall back to the template. */
  explain(input: MatchExplanationInput): Promise<string | undefined>;
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

const LIVE_PROVIDERS = new Set(['anthropic', 'live']);
const DISABLED_PROVIDERS = new Set(['development', 'memory', 'off', 'none']);
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 12_000;

function optionalConfig(config: ConfigReader | undefined, key: string): string | undefined {
  const value = config?.get(key)?.trim();
  return value ? value : undefined;
}

export function hasSourceFinderExplainerConfig(config?: ConfigReader): boolean {
  return Boolean(optionalConfig(config, 'ANTHROPIC_API_KEY'));
}

export function assertSourceFinderExplainerConfig(config?: ConfigReader): void {
  if (!optionalConfig(config, 'ANTHROPIC_API_KEY')) {
    throw new Error(
      'ANTHROPIC_API_KEY is required when MATCH_EXPLANATION_PROVIDER selects the Anthropic overlay.',
    );
  }
}

/** Pull the first non-empty text block out of a Messages API response. */
function extractText(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return '';
  }
  // Text blocks only — skips any leading `thinking` block from 5.x models.
  for (const block of content) {
    if (block && typeof block === 'object' && (block as { type?: unknown }).type === 'text') {
      const text = (block as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim()) {
        return text;
      }
    }
  }
  return '';
}

export class AnthropicSourceFinderExplainer implements SourceFinderExplainer {
  readonly provider = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = MATCH_EXPLANATION_MODEL,
    private readonly fetchImpl: FetchLike = fetch,
    readonly required = false,
  ) {}

  async explain(input: MatchExplanationInput): Promise<string | undefined> {
    let response: { ok: boolean; status: number; json(): Promise<unknown> };
    try {
      response = await this.fetchImpl(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MATCH_EXPLANATION_MAX_TOKENS,
          messages: [{ role: 'user', content: matchExplanationPrompt(input) }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      return undefined;
    }

    if (!response.ok) {
      return undefined;
    }

    const text = extractText(await response.json());
    // parseMatchExplanation cleans, caps, AND runs the zero-tolerance safety core;
    // it returns null on anything unsafe or empty, so we fall back to the template.
    return parseMatchExplanation(text) ?? undefined;
  }
}

export function createConfiguredSourceFinderExplainer(
  config?: ConfigReader,
  fetchImpl: FetchLike = fetch,
): SourceFinderExplainer | undefined {
  const provider = optionalConfig(config, 'MATCH_EXPLANATION_PROVIDER')?.toLowerCase() ?? '';
  if (DISABLED_PROVIDERS.has(provider)) {
    return undefined;
  }
  if (LIVE_PROVIDERS.has(provider)) {
    assertSourceFinderExplainerConfig(config);
  } else if (provider) {
    throw new Error(
      `Unsupported MATCH_EXPLANATION_PROVIDER "${provider}". Approve and wire anthropic before enabling it.`,
    );
  } else {
    // No explicit provider: stay on the free template unless a key is present.
    return undefined;
  }

  return new AnthropicSourceFinderExplainer(
    optionalConfig(config, 'ANTHROPIC_API_KEY') as string,
    optionalConfig(config, 'MATCH_EXPLANATION_MODEL') ?? MATCH_EXPLANATION_MODEL,
    fetchImpl,
    LIVE_PROVIDERS.has(provider),
  );
}
