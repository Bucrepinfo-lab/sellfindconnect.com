import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
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
        if (
          resolvePersistenceMode(config, ['PAYMENTS_REPOSITORY', 'AUTH_REPOSITORY']) === 'memory'
        ) {
          return inMemory;
        }
        const databaseUrl = requireDatabaseUrl(config, 'PAYMENTS_REPOSITORY');
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
