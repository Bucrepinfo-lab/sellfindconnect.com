import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import {
  CreateRelationshipClaimDto,
  DecideRelationshipClaimDto,
  RemoveRelationshipClaimDto,
} from './dto/relationships.dto';
import { RelationshipsService } from './relationships.service';

@ApiTags('relationships')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued owner session token. MFA must be verified before relationship routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationships: RelationshipsService) {}

  @Post()
  createClaim(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateRelationshipClaimDto,
  ) {
    return this.relationships.createClaim(tenantId, session.userId, body);
  }

  @Get()
  listClaims(@TenantId() tenantId: string) {
    return this.relationships.listClaims(tenantId);
  }

  @Get('inbox')
  listInbox(@TenantId() tenantId: string) {
    return this.relationships.listInbox(tenantId);
  }

  @Get('graph')
  listGraph() {
    return this.relationships.listGraph();
  }

  @Post(':id/decide')
  decideClaim(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: DecideRelationshipClaimDto,
  ) {
    return this.relationships.decideClaim(tenantId, session.userId, id, body);
  }

  @Post(':id/remove')
  removeClaim(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: RemoveRelationshipClaimDto,
  ) {
    return this.relationships.removeClaim(tenantId, session.userId, id, body);
  }
}
