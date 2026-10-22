import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { canViewTenantAuditLogs } from '@telpen/domain';

import { AuthService } from '../auth/auth.service';
import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto';

@ApiTags('audit')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before audit routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  async listAuditLogs(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Query() query: ListAuditLogsQueryDto,
  ) {
    if (!canViewTenantAuditLogs(session.role)) {
      throw new ForbiddenException('Only a tenant owner or admin can view audit logs.');
    }

    return this.auth.listAuditLogsForTenant(tenantId, query);
  }
}
