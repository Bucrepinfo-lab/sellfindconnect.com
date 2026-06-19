import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { AdvertsService } from './adverts.service';
import {
  CreateAdvertDto,
  CreateAdvertMediaDto,
  PrepareAdvertMediaUploadDto,
  RunAdvertLifecycleDto,
} from './dto/create-advert.dto';

@ApiTags('adverts')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before advert routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('adverts')
export class AdvertsController {
  constructor(private readonly adverts: AdvertsService) {}

  @Post()
  createAdvert(@TenantId() tenantId: string, @Body() body: CreateAdvertDto) {
    return this.adverts.createAdvert(tenantId, body);
  }

  @Get()
  listAdverts(@TenantId() tenantId: string) {
    return this.adverts.listAdverts(tenantId);
  }

  @Get('notifications')
  listNotifications(@TenantId() tenantId: string) {
    return this.adverts.listNotifications(tenantId);
  }

  @Get(':id/media')
  listAdvertMedia(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.listAdvertMedia(tenantId, id);
  }

  @Post(':id/media/uploads/prepare')
  prepareAdvertMediaUpload(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PrepareAdvertMediaUploadDto,
  ) {
    return this.adverts.prepareAdvertMediaUpload(tenantId, id, body, session.userId);
  }

  @Post(':id/media')
  addAdvertMedia(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: CreateAdvertMediaDto,
  ) {
    return this.adverts.addAdvertMedia(tenantId, id, body, session.userId);
  }

  @Post('lifecycle/run')
  runLifecycle(@TenantId() tenantId: string, @Body() body: RunAdvertLifecycleDto) {
    return this.adverts.runLifecycle(tenantId, body);
  }
}
