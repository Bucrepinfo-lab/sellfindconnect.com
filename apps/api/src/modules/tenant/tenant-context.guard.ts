import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export type TenantScopedRequest = Request & {
  tenantId?: string;
};

const uuidLike =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const tenantId = request.header('x-tenant-id');

    if (!tenantId || !uuidLike.test(tenantId)) {
      throw new UnauthorizedException('A valid x-tenant-id header is required for this route.');
    }

    request.tenantId = tenantId;
    return true;
  }
}
