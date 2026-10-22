import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { TenantAccessRole } from '@telpen/domain';

import { AuthService } from '../auth/auth.service';
import type { TenantScopedRequest } from './tenant-request';

export type TenantSessionDecision = {
  allowed: boolean;
  tenantId: string;
  userId: string;
  role: TenantAccessRole;
  mfaVerified: boolean;
};

export type TenantSessionRequest = TenantScopedRequest & {
  authSession?: TenantSessionDecision;
};

const uuidLike =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantSessionRequest>();
    const tenantId = request.header('x-tenant-id');
    const sessionToken = request.header('x-session-token');

    if (!tenantId || !uuidLike.test(tenantId)) {
      throw new UnauthorizedException('A valid x-tenant-id header is required for this route.');
    }

    if (!sessionToken) {
      throw new UnauthorizedException('A valid x-session-token header is required for this route.');
    }

    const decision = await this.auth.checkTenantSession({ tenantId, sessionToken });
    if (!decision.mfaVerified) {
      throw new UnauthorizedException('MFA verification is required for tenant routes.');
    }

    request.tenantId = tenantId;
    request.authSession = decision;
    return true;
  }
}
