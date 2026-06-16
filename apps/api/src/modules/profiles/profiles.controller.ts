import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantContextGuard } from '../tenant/tenant-context.guard';
import { CreateProfileDraftDto } from './dto/create-profile-draft.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID. Temporary local-development tenant scope until auth is added.',
})
@UseGuards(TenantContextGuard)
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
