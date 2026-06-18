import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import { CreateProfileDraftDto } from './dto/create-profile-draft.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before profile routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post('drafts')
  createDraft(@TenantId() tenantId: string, @Body() body: CreateProfileDraftDto) {
    return this.profiles.createDraft(tenantId, body);
  }

  @Get('drafts/:id')
  getDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.profiles.getDraft(tenantId, id);
  }

  @Post('drafts/:id/preview')
  previewDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.profiles.previewDraft(tenantId, id);
  }
}
