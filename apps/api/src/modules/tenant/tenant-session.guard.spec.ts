import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { AuthService } from '../auth/auth.service';
import { TenantSessionGuard } from './tenant-session.guard';

const tenantId = '11111111-1111-4111-8111-111111111111';
const sessionToken = 'session-token';

function createContext(headers: Record<string, string | undefined>) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const request = {
    header: (name: string) => normalizedHeaders[name.toLowerCase()],
  };

  return {
    request,
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext,
  };
}

describe('TenantSessionGuard', () => {
  it('attaches a verified tenant session to the request', async () => {
    const auth = {
      checkTenantSession: async () => ({
        allowed: true as const,
        tenantId,
        userId: 'user-1',
        role: 'OWNER',
        mfaVerified: true,
      }),
    };
    const guard = new TenantSessionGuard(auth as unknown as AuthService);
    const { context, request } = createContext({
      'x-tenant-id': tenantId,
      'x-session-token': sessionToken,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({
      tenantId,
      authSession: { tenantId, userId: 'user-1', role: 'OWNER', mfaVerified: true },
    });
  });

  it('requires a session token', async () => {
    const guard = new TenantSessionGuard({ checkTenantSession: async () => undefined } as unknown as AuthService);
    const { context } = createContext({ 'x-tenant-id': tenantId });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires MFA verification', async () => {
    const auth = {
      checkTenantSession: async () => ({
        allowed: true as const,
        tenantId,
        userId: 'user-1',
        role: 'OWNER',
        mfaVerified: false,
      }),
    };
    const guard = new TenantSessionGuard(auth as unknown as AuthService);
    const { context } = createContext({
      'x-tenant-id': tenantId,
      'x-session-token': sessionToken,
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
