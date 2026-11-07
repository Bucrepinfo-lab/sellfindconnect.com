import { ANDROID_APP_CLIENT_CONTEXT, ANDROID_APP_SESSION_KEY, CLIENT_CONTEXT_HEADER } from '@telpen/domain';

export const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export const SESSION_TOKEN_STORAGE_KEY = 'sfc.sessionToken';
export const TENANT_ID_STORAGE_KEY = 'sfc.tenantId';

export function readTenantSession(): { sessionToken: string; tenantId: string } {
  if (typeof window === 'undefined') {
    return { sessionToken: '', tenantId: '' };
  }

  return {
    sessionToken: window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) ?? '',
    tenantId: window.localStorage.getItem(TENANT_ID_STORAGE_KEY) ?? '',
  };
}

/** Marks API calls made inside the Android (TWA) app so the API can refuse non-Play checkout. */
export function clientContextHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return window.sessionStorage.getItem(ANDROID_APP_SESSION_KEY) === ANDROID_APP_CLIENT_CONTEXT
      ? { [CLIENT_CONTEXT_HEADER]: ANDROID_APP_CLIENT_CONTEXT }
      : {};
  } catch {
    return {};
  }
}

export function tenantSessionHeaders(): HeadersInit {
  const { sessionToken, tenantId } = readTenantSession();
  return {
    'content-type': 'application/json',
    ...clientContextHeaders(),
    ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
  };
}

export const ROLE_STORAGE_KEY = 'sfc.role';
