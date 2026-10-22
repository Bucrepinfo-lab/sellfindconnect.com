import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { PlatformAccessSession } from '../auth/auth.records';

export type PlatformAccessRequest = {
  platformAccess?: PlatformAccessSession;
};

export const PlatformAuthSession = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<PlatformAccessRequest>();
  return request.platformAccess;
});
