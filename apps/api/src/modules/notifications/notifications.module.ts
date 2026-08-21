import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapterRegistry } from '@telpen/domain';

import { AuthModule } from '../auth/auth.module';
import { createDefaultNotificationAdapters } from './notification-adapters';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NotificationAdapterRegistry,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDefaultNotificationAdapters({
          RESEND_API_KEY: config.get<string>('RESEND_API_KEY'),
          EMAIL_FROM: config.get<string>('EMAIL_FROM'),
          AT_API_KEY: config.get<string>('AT_API_KEY'),
          AT_USERNAME: config.get<string>('AT_USERNAME'),
          AT_SENDER_ID: config.get<string>('AT_SENDER_ID'),
          FCM_SERVICE_ACCOUNT_JSON: config.get<string>('FCM_SERVICE_ACCOUNT_JSON'),
          FCM_PROJECT_ID: config.get<string>('FCM_PROJECT_ID'),
        }),
    },
    NotificationDispatchService,
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationDispatchService, NotificationAdapterRegistry],
})
export class NotificationsModule {}
