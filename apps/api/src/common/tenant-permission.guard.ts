import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { accessRoles, roleHasPermission, type AccessPermission, type AccessRole } from '@telpen/domain';

export const TENANT_PERMISSION_KEY = 'sfc:tenant-permission';

type RequestWithSession = { authSession?: { role?: string } };

/**
 * Least-privilege check for tenant routes. Runs after TenantSessionGuard (which
 * sets request.authSession) and refuses roles that lack the permission, e.g. a
 * SALES_CHAT_AGENT or READ_ONLY_VIEWER cannot edit the profile or publish adverts.
 */
@Injectable()
export class TenantPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<AccessPermission | undefined>(
      TENANT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const role = request.authSession?.role;
    if (role && (accessRoles as readonly string[]).includes(role) && roleHasPermission(role as AccessRole, permission)) {
      return true;
    }
    throw new ForbiddenException('Your role cannot do this. Ask the account owner.');
  }
}

/** Requires a tenant permission on top of the controller's TenantSessionGuard. */
export function RequireTenantPermission(permission: AccessPermission) {
  return applyDecorators(SetMetadata(TENANT_PERMISSION_KEY, permission), UseGuards(TenantPermissionGuard));
}
