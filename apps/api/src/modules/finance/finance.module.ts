import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: FinanceService,
      useFactory: () => new FinanceService(),
    },
  ],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
