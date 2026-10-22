import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UgcModule } from '../ugc/ugc.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AuthModule, UgcModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
