import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { TenantSessionRequest } from './tenant-session.guard';

export const TenantSession = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<TenantSessionRequest>();
  return request.authSession;
});
