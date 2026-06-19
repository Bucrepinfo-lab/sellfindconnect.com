import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { TenantScopedRequest } from './tenant-request';

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<TenantScopedRequest>();
  return request.tenantId;
});

export const TenantAuthSession = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<TenantScopedRequest>();
  return request.authSession;
});
