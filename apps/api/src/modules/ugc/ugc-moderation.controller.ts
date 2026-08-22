import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { PlatformAuthSession } from '../access/platform-access.decorator';
import { PlatformModerationGuard } from '../access/platform-moderation.guard';
import type { PlatformAccessSession } from '../auth/auth.records';
import { ResolveUgcReportDto } from './dto/ugc.dto';
import { UgcService } from './ugc.service';

@ApiTags('ugc-moderation')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active MODERATE_CONTENT platform access assignment. MFA is required.',
})
@UseGuards(PlatformModerationGuard)
@Controller('platform/ugc')
export class UgcModerationController {
  constructor(private readonly ugc: UgcService) {}

  @Get('reports')
  listReports() {
    return this.ugc.listAllReports();
  }

  @Post('reports/:id/resolve')
  resolveReport(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('id') id: string,
    @Body() body: ResolveUgcReportDto,
  ) {
    return this.ugc.resolveReport(id, session.userId, body);
  }
}
