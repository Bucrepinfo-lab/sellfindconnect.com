import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { TenantScopedRequest } from './tenant-context.guard';

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<TenantScopedRequest>();
  return request.tenantId;
});
