import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { PrismaFinanceRepository } from './prisma-finance.repository';

const FINANCE_PERSISTENCE = Symbol('FINANCE_PERSISTENCE');

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaFinanceRepository,
    {
      provide: FINANCE_PERSISTENCE,
      useFactory: (prismaRepo: PrismaFinanceRepository) => {
        if (process.env.FINANCE_REPOSITORY === 'prisma') return prismaRepo;
        return null;
      },
      inject: [PrismaFinanceRepository],
    },
    {
      provide: FinanceService,
      useFactory: (repo: PrismaFinanceRepository | null) =>
        new FinanceService(repo ?? undefined),
      inject: [FINANCE_PERSISTENCE],
    },
  ],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
