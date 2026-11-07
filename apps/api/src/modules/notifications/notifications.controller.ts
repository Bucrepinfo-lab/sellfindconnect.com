import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { RequireTenantPermission } from '../../common/tenant-permission.guard';
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
  @RequireTenantPermission('MANAGE_TENANT')
  updatePreferences(@TenantId() tenantId: string, @Body() body: UpdateNotificationPreferencesDto) {
    return this.notifications.updatePreferences(tenantId, body);
  }

  @Get('adapters')
  listAdapters() {
    return { adapters: this.notifications.availableAdapters() };
  }

  @Post('plan')
  @RequireTenantPermission('MANAGE_TENANT')
  planAndQueue(@TenantId() tenantId: string, @Body() body: CreateNotificationPlanDto) {
    return this.notifications.planAndQueue(tenantId, body);
  }

  @Get('outbox')
  listOutbox(@TenantId() tenantId: string) {
    return this.notifications.listOutbox(tenantId);
  }

  @Post('outbox/:outboxId/dispatch')
  @RequireTenantPermission('MANAGE_TENANT')
  dispatchOutbox(
    @TenantId() tenantId: string,
    @Param('outboxId') outboxId: string,
  ) {
    return this.notifications.dispatchOutbox(tenantId, outboxId);
  }
}
