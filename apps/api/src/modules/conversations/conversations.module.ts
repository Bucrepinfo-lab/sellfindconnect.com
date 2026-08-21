import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './conversations.controller';
import { CONVERSATIONS_REPOSITORY } from './conversations.repository';
import { ConversationsService } from './conversations.service';
import { InMemoryConversationsRepository } from './in-memory-conversations.repository';

@Module({
  imports: [AuthModule],
  controllers: [ConversationsController],
  providers: [
    InMemoryConversationsRepository,
    {
      provide: CONVERSATIONS_REPOSITORY,
      inject: [ConfigService, InMemoryConversationsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryConversationsRepository) => {
        const repositoryMode = (
          config.get<string>('CONVERSATIONS_REPOSITORY') ??
          config.get<string>('ADVERT_REPOSITORY') ??
          config.get<string>('ADVERTS_REPOSITORY') ??
          config.get<string>('AUTH_REPOSITORY') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when CONVERSATIONS_REPOSITORY=prisma.');
        }

        const { PrismaConversationsRepository, createConversationsPrismaClient } = await import(
          './prisma-conversations.repository.js'
        );
        return new PrismaConversationsRepository(createConversationsPrismaClient(databaseUrl));
      },
    },
    ConversationsService,
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}
