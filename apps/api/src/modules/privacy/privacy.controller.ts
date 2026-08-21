import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { PrivacyService } from './privacy.service';

interface DeletionRequestBody {
  reason?: string;
}

@ApiTags('privacy')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued session token. MFA must be verified before privacy routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly svc: PrivacyService) {}

  @Get('data-summary')
  dataSummary(@TenantId() tenantId: string, @TenantAuthSession() session: TenantSessionDecision) {
    return this.svc.dataSummary(tenantId, session.userId);
  }

  @Post('export')
  requestExport(@TenantId() tenantId: string, @TenantAuthSession() session: TenantSessionDecision) {
    return this.svc.requestExport(tenantId, session.userId);
  }

  @Post('deletion')
  requestDeletion(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: DeletionRequestBody,
  ) {
    return this.svc.requestDeletion(tenantId, session.userId, body.reason);
  }

  @Delete('deletion')
  cancelDeletion(@TenantId() tenantId: string, @TenantAuthSession() session: TenantSessionDecision) {
    return this.svc.cancelDeletion(tenantId, session.userId);
  }

  @Get('deletion')
  getDeletion(@TenantId() tenantId: string, @TenantAuthSession() session: TenantSessionDecision) {
    return this.svc.getDeletion(tenantId, session.userId);
  }
}
