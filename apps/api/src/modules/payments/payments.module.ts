import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { AT_PAYMENTS, AfricasTalkingPaymentsProvider } from './africastalking-payments';
import { InMemoryPaymentsRepository } from './in-memory-payments.repository';
import { PaymentsController } from './payments.controller';
import { PAYMENTS_REPOSITORY } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [
    InMemoryPaymentsRepository,
    { provide: AT_PAYMENTS, useClass: AfricasTalkingPaymentsProvider },
    {
      provide: PAYMENTS_REPOSITORY,
      inject: [ConfigService, InMemoryPaymentsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryPaymentsRepository) => {
        const mode = (config.get<string>('AUTH_REPOSITORY') ?? 'memory').toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(mode);
        if (!usePrisma) {
          return inMemory;
        }
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when AUTH_REPOSITORY=prisma.');
        }
        const { PrismaPaymentsRepository, createPaymentsPrismaClient } = await import(
          './prisma-payments.repository.js'
        );
        return new PrismaPaymentsRepository(createPaymentsPrismaClient(databaseUrl));
      },
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
