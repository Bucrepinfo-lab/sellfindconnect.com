import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantContextGuard } from '../tenant/tenant-context.guard';
import { CreateNotificationPlanDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID. Temporary local-development tenant scope until auth is added.',
})
@UseGuards(TenantContextGuard)
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
