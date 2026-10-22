import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  OidcHostedIdentityVerifier,
  createConfiguredHostedIdentityVerifier,
  jwksUrlForIssuer,
} from './oidc-identity';

const issuer = 'https://auth.sellfindconnect.test/';
const audience = 'https://api.sellfindconnect.test/v1';
const now = new Date('2026-08-21T18:00:00.000Z');

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' });

function jsonFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signIdToken(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'test-key', typ: 'JWT' },
) {
  const encodedHeader = encodePart(header);
  const encodedPayload = encodePart(payload);
  const signature = sign('sha256', Buffer.from(`${encodedHeader}.${encodedPayload}`), privateKey);
  return `${encodedHeader}.${encodedPayload}.${signature.toString('base64url')}`;
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    iss: issuer,
    aud: audience,
    sub: 'oidc|user-1',
    email: 'owner@example.com',
    email_verified: true,
    exp: Math.floor(now.getTime() / 1000) + 3600,
    iat: Math.floor(now.getTime() / 1000) - 60,
    ...overrides,
  };
}

function verifier(fetchImpl = jsonFetch(200, { keys: [{ ...publicJwk, kid: 'test-key', use: 'sig', alg: 'RS256' }] })) {
  return new OidcHostedIdentityVerifier(issuer, audience, jwksUrlForIssuer(issuer), fetchImpl);
}

describe('hosted identity OIDC overlay', () => {
  it('derives the JWKS URL from the issuer and overlays when issuer and audience exist', () => {
    expect(jwksUrlForIssuer(issuer)).toBe('https://auth.sellfindconnect.test/.well-known/jwks.json');
    expect(
      createConfiguredHostedIdentityVerifier({
        get: (key) =>
          ({
            AUTH_OIDC_ISSUER: issuer,
            AUTH_OIDC_AUDIENCE: audience,
          })[key],
      }),
    ).toBeInstanceOf(OidcHostedIdentityVerifier);
    expect(createConfiguredHostedIdentityVerifier({ get: () => undefined })).toBeUndefined();
  });

  it('fail-closes named providers without issuer and audience', () => {
    expect(() =>
      createConfiguredHostedIdentityVerifier({
        get: (key) => (key === 'AUTH_IDENTITY_PROVIDER' ? 'auth0' : undefined),
      }),
    ).toThrow('AUTH_OIDC_ISSUER is required');
    expect(() =>
      createConfiguredHostedIdentityVerifier({
        get: (key) => (key === 'AUTH_IDENTITY_PROVIDER' ? 'clerk' : undefined),
      }),
    ).toThrow('AUTH_OIDC_ISSUER is required');
    expect(
      createConfiguredHostedIdentityVerifier({
        get: (key) =>
          ({
            AUTH_IDENTITY_PROVIDER: 'development',
            AUTH_OIDC_ISSUER: issuer,
            AUTH_OIDC_AUDIENCE: audience,
          })[key],
      }),
    ).toBeUndefined();
    expect(() =>
      createConfiguredHostedIdentityVerifier({
        get: (key) => (key === 'AUTH_IDENTITY_PROVIDER' ? 'okta' : undefined),
      }),
    ).toThrow('Unsupported AUTH_IDENTITY_PROVIDER "okta"');
  });

  it('verifies an RS256 ID token and returns the email subject', async () => {
    const identity = await verifier().verifyIdToken(signIdToken(validPayload()), now);

    expect(identity).toEqual({
      issuer: 'https://auth.sellfindconnect.test',
      audience,
      subject: 'oidc|user-1',
      email: 'owner@example.com',
      emailVerified: true,
    });
  });

  it('rejects unsigned, expired, unverified, and wrong-audience tokens', async () => {
    const live = verifier();
    await expect(live.verifyIdToken('not-a-jwt', now)).rejects.toThrow('INVALID_TOKEN');
    await expect(
      live.verifyIdToken(signIdToken(validPayload(), { alg: 'none', kid: 'test-key' }), now),
    ).rejects.toThrow('INVALID_ALG');
    await expect(
      live.verifyIdToken(signIdToken(validPayload({ aud: 'https://other.example/api' })), now),
    ).rejects.toThrow('INVALID_AUDIENCE');
    await expect(
      live.verifyIdToken(signIdToken(validPayload({ exp: Math.floor(now.getTime() / 1000) - 120 })), now),
    ).rejects.toThrow('TOKEN_EXPIRED');
    await expect(
      live.verifyIdToken(signIdToken(validPayload({ email_verified: false })), now),
    ).rejects.toThrow('EMAIL_NOT_VERIFIED');
    await expect(
      live.verifyIdToken(signIdToken(validPayload({ email: 'not-an-email' })), now),
    ).rejects.toThrow('MISSING_IDENTITY_CLAIMS');
  });

  it('refuses HTTP JWKS origins when a live provider is selected', () => {
    expect(() =>
      createConfiguredHostedIdentityVerifier({
        get: (key) =>
          ({
            AUTH_IDENTITY_PROVIDER: 'oidc',
            AUTH_OIDC_ISSUER: 'http://auth.local.test',
            AUTH_OIDC_AUDIENCE: audience,
          })[key],
      }),
    ).toThrow('AUTH_OIDC_ISSUER must be an https origin.');
  });
});
