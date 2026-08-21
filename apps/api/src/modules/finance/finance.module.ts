import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: FinanceService,
      inject: [AuthService],
      useFactory: (auth: AuthService) => new FinanceService(undefined, auth),
    },
  ],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
