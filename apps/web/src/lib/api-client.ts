'use client';

import { publicApiBaseUrl, tenantSessionHeaders } from './public-api';
import { clearSession } from './use-session';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const base = publicApiBaseUrl.replace(/\/$/, '');

function messageFrom(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const record = body as { message?: unknown; safety?: { policyCode?: string } };
  if (record.safety?.policyCode) {
    return 'This text matches something SellFindConnect never allows. Remove it and try again.';
  }
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.message)) return record.message.map(String).join(' ');
  if (record.message && typeof record.message === 'object') return messageFrom(record.message, fallback);
  return fallback;
}

/**
 * Calls the API with the signed-in tenant's headers. A 401 clears the stored
 * session (it expired or was revoked) so the page falls back to sign-in.
 */
export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> =
    init.auth === false
      ? { 'content-type': 'application/json' }
      : (tenantSessionHeaders() as Record<string, string>);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError('No connection. Check your data or Wi-Fi and try again.', 0);
  }
  const text = await response.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    if (response.status === 401 && init.auth !== false) {
      clearSession();
    }
    const fallback =
      response.status === 403
        ? 'Your role cannot do this. Ask the account owner.'
        : response.status === 404
          ? 'Not found.'
          : 'Something went wrong. Try again.';
    throw new ApiError(messageFrom(body, fallback), response.status);
  }
  return body as T;
}

export function isTermsError(error: unknown): boolean {
  return error instanceof ApiError && /terms/i.test(error.message);
}
