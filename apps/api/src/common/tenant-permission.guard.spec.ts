import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { TenantPermissionGuard } from './tenant-permission.guard';

function contextFor(role: string | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ authSession: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(permission: string | undefined) {
  const reflector = { getAllAndOverride: () => permission } as unknown as Reflector;
  return new TenantPermissionGuard(reflector);
}

describe('TenantPermissionGuard', () => {
  it('lets owners, admins and editors manage listings and the profile', () => {
    for (const role of ['OWNER', 'ADMIN', 'EDITOR']) {
      expect(guardRequiring('MANAGE_LISTINGS').canActivate(contextFor(role))).toBe(true);
      expect(guardRequiring('EDIT_PROFILE').canActivate(contextFor(role))).toBe(true);
    }
  });

  it('refuses roles without the permission, and missing sessions', () => {
    for (const role of ['SALES_CHAT_AGENT', 'BILLING_MANAGER', 'ANALYTICS_VIEWER', 'READ_ONLY_VIEWER']) {
      expect(() => guardRequiring('MANAGE_LISTINGS').canActivate(contextFor(role))).toThrow(ForbiddenException);
    }
    expect(() => guardRequiring('EDIT_PROFILE').canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });

  it('does nothing on routes without a required permission', () => {
    expect(guardRequiring(undefined).canActivate(contextFor('READ_ONLY_VIEWER'))).toBe(true);
  });
});
