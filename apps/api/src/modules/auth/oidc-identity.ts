import { createPublicKey, createVerify } from 'node:crypto';

export const HOSTED_IDENTITY_VERIFIER = Symbol('HOSTED_IDENTITY_VERIFIER');

export type HostedIdentityClaims = {
  issuer: string;
  audience: string;
  subject: string;
  email: string;
  emailVerified: true;
};

export interface HostedIdentityVerifier {
  verifyIdToken(idToken: string, now?: Date): Promise<HostedIdentityClaims>;
}

type ConfigReader = {
  get(key: string): string | undefined;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

type JsonWebKeyRecord = {
  kty?: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
};

const LIVE_PROVIDERS = new Set(['auth0', 'clerk', 'oidc', 'live']);
const DISABLED_PROVIDERS = new Set(['development', 'memory', 'off', 'none']);
const JWKS_TIMEOUT_MS = 5_000;
const JWKS_CACHE_MS = 10 * 60 * 1000;
const MAX_TOKEN_CHARS = 8_192;
const CLOCK_SKEW_SECONDS = 60;

function optionalConfig(config: ConfigReader | undefined, key: string): string | undefined {
  const value = config?.get(key)?.trim();
  return value ? value : undefined;
}

function normalizeIssuer(value: string): string {
  return value.replace(/\/+$/, '');
}

function httpsUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export function resolveHostedIdentityConfig(config?: ConfigReader): {
  provider: string;
  issuer?: string;
  audience?: string;
  jwksUrl?: string;
} {
  return {
    provider: optionalConfig(config, 'AUTH_IDENTITY_PROVIDER')?.toLowerCase() ?? '',
    issuer: optionalConfig(config, 'AUTH_OIDC_ISSUER'),
    audience: optionalConfig(config, 'AUTH_OIDC_AUDIENCE'),
    jwksUrl: optionalConfig(config, 'AUTH_OIDC_JWKS_URL'),
  };
}

export function hasHostedIdentityConfig(config?: ConfigReader): boolean {
  const resolved = resolveHostedIdentityConfig(config);
  return Boolean(resolved.issuer && resolved.audience);
}

export function assertHostedIdentityConfig(config?: ConfigReader): void {
  const resolved = resolveHostedIdentityConfig(config);
  if (!resolved.issuer) {
    throw new Error('AUTH_OIDC_ISSUER is required when AUTH_IDENTITY_PROVIDER selects a hosted identity overlay.');
  }
  if (!resolved.audience) {
    throw new Error(
      'AUTH_OIDC_AUDIENCE is required when AUTH_IDENTITY_PROVIDER selects a hosted identity overlay.',
    );
  }
  if (!httpsUrl(resolved.issuer)) {
    throw new Error('AUTH_OIDC_ISSUER must be an https origin.');
  }
  if (resolved.jwksUrl && !httpsUrl(resolved.jwksUrl)) {
    throw new Error('AUTH_OIDC_JWKS_URL must be an https URL.');
  }
}

export function jwksUrlForIssuer(issuer: string, jwksUrl?: string): string {
  if (jwksUrl) {
    return jwksUrl;
  }
  return `${normalizeIssuer(issuer)}/.well-known/jwks.json`;
}

function decodeJwtPart(part: string): unknown {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function audienceMatches(aud: unknown, expected: string): boolean {
  if (typeof aud === 'string') {
    return aud === expected;
  }
  if (Array.isArray(aud)) {
    return aud.some((item) => item === expected);
  }
  return false;
}

function isVerifiedEmailClaim(value: unknown): boolean {
  return value === true || value === 'true';
}

export class OidcHostedIdentityVerifier implements HostedIdentityVerifier {
  private jwksKeys: JsonWebKeyRecord[] = [];
  private jwksFetchedAt = 0;

  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly jwksUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async verifyIdToken(idToken: string, now = new Date()): Promise<HostedIdentityClaims> {
    const token = idToken.trim();
    if (!token || token.length > MAX_TOKEN_CHARS) {
      throw new Error('INVALID_TOKEN');
    }

    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error('INVALID_TOKEN');
    }

    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      const parsedHeader = decodeJwtPart(parts[0]);
      const parsedPayload = decodeJwtPart(parts[1]);
      if (!isRecord(parsedHeader) || !isRecord(parsedPayload)) {
        throw new Error('INVALID_TOKEN');
      }
      header = parsedHeader;
      payload = parsedPayload;
    } catch {
      throw new Error('INVALID_TOKEN');
    }

    if (header.alg !== 'RS256') {
      throw new Error('INVALID_ALG');
    }
    if (typeof header.kid !== 'string' || !header.kid.trim()) {
      throw new Error('MISSING_KID');
    }

    const key = await this.lookupKey(header.kid.trim());
    const verified = createVerify('SHA256')
      .update(`${parts[0]}.${parts[1]}`)
      .verify(
        createPublicKey({ key, format: 'jwk' }),
        Buffer.from(parts[2], 'base64url'),
      );
    if (!verified) {
      throw new Error('INVALID_SIGNATURE');
    }

    const issuer = typeof payload.iss === 'string' ? payload.iss : '';
    if (normalizeIssuer(issuer) !== normalizeIssuer(this.issuer)) {
      throw new Error('INVALID_ISSUER');
    }
    if (!audienceMatches(payload.aud, this.audience)) {
      throw new Error('INVALID_AUDIENCE');
    }

    const nowSeconds = Math.floor(now.getTime() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS <= nowSeconds) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (typeof payload.nbf === 'number' && payload.nbf - CLOCK_SKEW_SECONDS > nowSeconds) {
      throw new Error('TOKEN_NOT_YET_VALID');
    }

    const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!subject || !email.includes('@')) {
      throw new Error('MISSING_IDENTITY_CLAIMS');
    }
    if (!isVerifiedEmailClaim(payload.email_verified)) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    return {
      issuer: normalizeIssuer(issuer),
      audience: this.audience,
      subject,
      email,
      emailVerified: true,
    };
  }

  private async lookupKey(kid: string): Promise<JsonWebKeyRecord> {
    const existing = (await this.loadKeys(false)).find((key) => key.kid === kid);
    if (existing) {
      return existing;
    }

    const refreshed = (await this.loadKeys(true)).find((key) => key.kid === kid);
    if (!refreshed) {
      throw new Error('UNKNOWN_KEY');
    }
    return refreshed;
  }

  private async loadKeys(force: boolean): Promise<JsonWebKeyRecord[]> {
    if (!force && this.jwksKeys.length && Date.now() - this.jwksFetchedAt < JWKS_CACHE_MS) {
      return this.jwksKeys;
    }

    let response: { ok: boolean; status: number; json(): Promise<unknown> };
    try {
      response = await this.fetchImpl(this.jwksUrl, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(JWKS_TIMEOUT_MS),
      });
    } catch {
      throw new Error('JWKS_UNAVAILABLE');
    }

    if (!response.ok) {
      throw new Error('JWKS_UNAVAILABLE');
    }

    const body = await response.json();
    const keys = isRecord(body) && Array.isArray(body.keys) ? body.keys : [];
    this.jwksKeys = keys.filter((item): item is JsonWebKeyRecord => {
      if (!isRecord(item) || item.kty !== 'RSA' || typeof item.kid !== 'string') {
        return false;
      }
      if (item.use && item.use !== 'sig') {
        return false;
      }
      if (item.alg && item.alg !== 'RS256') {
        return false;
      }
      return typeof item.n === 'string' && typeof item.e === 'string';
    });
    this.jwksFetchedAt = Date.now();
    return this.jwksKeys;
  }
}

export function createConfiguredHostedIdentityVerifier(
  config?: ConfigReader,
  fetchImpl: FetchLike = fetch,
): HostedIdentityVerifier | undefined {
  const resolved = resolveHostedIdentityConfig(config);
  if (DISABLED_PROVIDERS.has(resolved.provider)) {
    return undefined;
  }
  if (LIVE_PROVIDERS.has(resolved.provider)) {
    assertHostedIdentityConfig(config);
  } else if (resolved.provider && resolved.provider !== '') {
    throw new Error(
      `Unsupported AUTH_IDENTITY_PROVIDER "${resolved.provider}". Approve and wire auth0, clerk, or oidc before enabling it.`,
    );
  } else if (!hasHostedIdentityConfig(config)) {
    return undefined;
  } else {
    assertHostedIdentityConfig(config);
  }

  const issuer = resolved.issuer as string;
  const audience = resolved.audience as string;
  return new OidcHostedIdentityVerifier(
    issuer,
    audience,
    jwksUrlForIssuer(issuer, resolved.jwksUrl),
    fetchImpl,
  );
}
