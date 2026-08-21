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

export function tenantSessionHeaders(): HeadersInit {
  const { sessionToken, tenantId } = readTenantSession();
  return {
    'content-type': 'application/json',
    ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
  };
}
