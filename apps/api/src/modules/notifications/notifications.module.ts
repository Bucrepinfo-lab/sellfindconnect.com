import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapterRegistry } from '@telpen/domain';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AuthModule } from '../auth/auth.module';
import { InMemoryNotificationsRepository } from './in-memory-notifications.repository';
import { createDefaultNotificationAdapters } from './notification-adapters';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationsController } from './notifications.controller';
import { NOTIFICATIONS_REPOSITORY } from './notifications.repository';
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
          AT_WHATSAPP_FROM: config.get<string>('AT_WHATSAPP_FROM'),
          AT_WHATSAPP_PRODUCT_ID: config.get<string>('AT_WHATSAPP_PRODUCT_ID'),
          FCM_SERVICE_ACCOUNT_JSON: config.get<string>('FCM_SERVICE_ACCOUNT_JSON'),
          FCM_PROJECT_ID: config.get<string>('FCM_PROJECT_ID'),
          WHATSAPP_PROVIDER: config.get<string>('WHATSAPP_PROVIDER'),
          WHATSAPP_TOKEN: config.get<string>('WHATSAPP_TOKEN'),
          WHATSAPP_ACCESS_TOKEN: config.get<string>('WHATSAPP_ACCESS_TOKEN'),
          WHATSAPP_PHONE_NUMBER_ID: config.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
          WHATSAPP_API_VERSION: config.get<string>('WHATSAPP_API_VERSION'),
          WHATSAPP_TEMPLATE_NAME: config.get<string>('WHATSAPP_TEMPLATE_NAME'),
          WHATSAPP_TEMPLATE_LANGUAGE: config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE'),
          WHATSAPP_FROM: config.get<string>('WHATSAPP_FROM'),
        }),
    },
    NotificationDispatchService,
    InMemoryNotificationsRepository,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      inject: [ConfigService, InMemoryNotificationsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryNotificationsRepository) => {
        if (
          resolvePersistenceMode(config, ['NOTIFICATIONS_REPOSITORY', 'AUTH_REPOSITORY']) ===
          'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'NOTIFICATIONS_REPOSITORY');

        const { PrismaNotificationsRepository, createNotificationsPrismaClient } = await import(
          './prisma-notifications.repository.js'
        );
        return new PrismaNotificationsRepository(createNotificationsPrismaClient(databaseUrl));
      },
    },
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationDispatchService, NotificationAdapterRegistry],
})
export class NotificationsModule {}
