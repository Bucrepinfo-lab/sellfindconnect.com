import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { CreateUgcBlockDto, CreateUgcReportDto } from './dto/ugc.dto';
import { UgcService } from './ugc.service';

@ApiTags('ugc')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before report and block routes.',
})
@UseGuards(TenantSessionGuard)
@Controller('ugc')
export class UgcController {
  constructor(private readonly ugc: UgcService) {}

  @Post('reports')
  createReport(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateUgcReportDto,
  ) {
    return this.ugc.createReport(tenantId, session.userId, body);
  }

  @Get('reports')
  listReports(@TenantId() tenantId: string) {
    return this.ugc.listReports(tenantId);
  }

  @Post('blocks')
  createBlock(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateUgcBlockDto,
  ) {
    return this.ugc.createBlock(tenantId, session.userId, body);
  }

  @Get('blocks')
  listBlocks(@TenantId() tenantId: string) {
    return this.ugc.listBlocks(tenantId);
  }

  @Delete('blocks/:targetId')
  removeBlock(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('targetId') targetId: string,
  ) {
    return this.ugc.removeBlock(tenantId, session.userId, targetId);
  }
}
