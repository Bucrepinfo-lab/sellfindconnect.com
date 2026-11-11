import {
  ADVERT_DRAFT_MAX_TOKENS,
  ADVERT_DRAFT_MODEL,
  advertDraftPrompt,
  parseAdvertDraft,
  type AdvertDraft,
  type AdvertDraftInput,
} from '@telpen/domain';

/**
 * Advert description DRAFTER: the provider-neutral AI overlay behind
 * "Write it for me" (owner-approved 11/11/26). Same shape as the Source Finder
 * explainer: the default build has no provider and no secrets, so the service
 * uses the free template. The Anthropic overlay is chosen per environment,
 * fails to undefined on any error, and every output is re-screened.
 */

export const ADVERT_DRAFTER = Symbol('ADVERT_DRAFTER');

export type AdvertDrafterResult = AdvertDraft & { inputTokens: number; outputTokens: number };

export interface AdvertDrafter {
  readonly provider: string;
  draft(input: AdvertDraftInput): Promise<AdvertDrafterResult | undefined>;
}

type ConfigReader = { get(key: string): string | undefined };

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const LIVE_PROVIDERS = new Set(['anthropic', 'live']);
const DISABLED_PROVIDERS = new Set(['', 'development', 'memory', 'off', 'none']);
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 15_000;

function optionalConfig(config: ConfigReader | undefined, key: string): string | undefined {
  const value = config?.get(key)?.trim();
  return value ? value : undefined;
}

function extractText(body: unknown): string {
  const content = (body as { content?: unknown } | undefined)?.content;
  if (!Array.isArray(content)) return '';
  // Text blocks only; skips a leading thinking block.
  return content
    .map((block) =>
      block && typeof block === 'object' && (block as { type?: unknown }).type === 'text'
        ? String((block as { text?: unknown }).text ?? '')
        : '',
    )
    .join('')
    .trim();
}

function usageOf(body: unknown): { inputTokens: number; outputTokens: number } {
  const usage = (body as { usage?: { input_tokens?: unknown; output_tokens?: unknown } } | undefined)?.usage;
  const toNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  return { inputTokens: toNumber(usage?.input_tokens), outputTokens: toNumber(usage?.output_tokens) };
}

export class AnthropicAdvertDrafter implements AdvertDrafter {
  readonly provider = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = ADVERT_DRAFT_MODEL,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async draft(input: AdvertDraftInput): Promise<AdvertDrafterResult | undefined> {
    try {
      const response = await this.fetchImpl(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: ADVERT_DRAFT_MAX_TOKENS,
          system:
            'You are the SellFindConnect listing assistant. Use only the facts given and reply with strict JSON only.',
          messages: [{ role: 'user', content: advertDraftPrompt(input) }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) return undefined;
      const body = await response.json();
      const parsed = parseAdvertDraft(extractText(body));
      return parsed ? { ...parsed, ...usageOf(body) } : undefined;
    } catch {
      return undefined;
    }
  }
}

/** Undefined (template only) unless ADVERT_DRAFT_PROVIDER selects a live provider with a key. */
export function createConfiguredAdvertDrafter(
  config?: ConfigReader,
  fetchImpl: FetchLike = fetch,
): AdvertDrafter | undefined {
  const provider = optionalConfig(config, 'ADVERT_DRAFT_PROVIDER')?.toLowerCase() ?? '';
  if (DISABLED_PROVIDERS.has(provider)) return undefined;
  if (!LIVE_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported ADVERT_DRAFT_PROVIDER "${provider}".`);
  }
  const apiKey = optionalConfig(config, 'ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required when ADVERT_DRAFT_PROVIDER selects the Anthropic overlay.');
  }
  return new AnthropicAdvertDrafter(
    apiKey,
    optionalConfig(config, 'ADVERT_DRAFT_MODEL') ?? ADVERT_DRAFT_MODEL,
    fetchImpl,
  );
}
