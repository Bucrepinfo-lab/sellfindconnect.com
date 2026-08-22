import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UgcModule } from '../ugc/ugc.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsGateway } from './conversations.gateway';
import { CONVERSATIONS_REPOSITORY } from './conversations.repository';
import { ConversationsRealtimeService } from './conversations.realtime.service';
import { ConversationsService } from './conversations.service';
import { InMemoryConversationsRepository } from './in-memory-conversations.repository';

@Module({
  imports: [AuthModule, MediaModule, NotificationsModule, UgcModule],
  controllers: [ConversationsController],
  providers: [
    InMemoryConversationsRepository,
    {
      provide: CONVERSATIONS_REPOSITORY,
      inject: [ConfigService, InMemoryConversationsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryConversationsRepository) => {
        if (
          resolvePersistenceMode(config, [
            'CONVERSATIONS_REPOSITORY',
            'ADVERT_REPOSITORY',
            'ADVERTS_REPOSITORY',
            'AUTH_REPOSITORY',
          ]) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'CONVERSATIONS_REPOSITORY');
        const { PrismaConversationsRepository, createConversationsPrismaClient } = await import(
          './prisma-conversations.repository.js'
        );
        return new PrismaConversationsRepository(createConversationsPrismaClient(databaseUrl));
      },
    },
    ConversationsRealtimeService,
    ConversationsGateway,
    ConversationsService,
  ],
  exports: [ConversationsService, ConversationsRealtimeService],
})
export class ConversationsModule {}
