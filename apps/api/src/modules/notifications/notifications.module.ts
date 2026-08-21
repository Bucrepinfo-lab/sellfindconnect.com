import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapterRegistry } from '@telpen/domain';

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
          FCM_SERVICE_ACCOUNT_JSON: config.get<string>('FCM_SERVICE_ACCOUNT_JSON'),
          FCM_PROJECT_ID: config.get<string>('FCM_PROJECT_ID'),
        }),
    },
    NotificationDispatchService,
    InMemoryNotificationsRepository,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      inject: [ConfigService, InMemoryNotificationsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryNotificationsRepository) => {
        const repositoryMode = (
          config.get<string>('NOTIFICATIONS_REPOSITORY') ??
          config.get<string>('AUTH_REPOSITORY') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when NOTIFICATIONS_REPOSITORY=prisma.');
        }

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
