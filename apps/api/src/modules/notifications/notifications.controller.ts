import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import { CreateNotificationPlanDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before notification routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('preferences')
  getPreferences(@TenantId() tenantId: string) {
    return this.notifications.getPreferences(tenantId);
  }

  @Patch('preferences')
  updatePreferences(@TenantId() tenantId: string, @Body() body: UpdateNotificationPreferencesDto) {
    return this.notifications.updatePreferences(tenantId, body);
  }

  @Post('plan')
  planAndQueue(@TenantId() tenantId: string, @Body() body: CreateNotificationPlanDto) {
    return this.notifications.planAndQueue(tenantId, body);
  }

  @Get('outbox')
  listOutbox(@TenantId() tenantId: string) {
    return this.notifications.listOutbox(tenantId);
  }
}
