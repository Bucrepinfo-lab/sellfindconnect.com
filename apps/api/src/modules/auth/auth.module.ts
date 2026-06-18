import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';

@Module({
  controllers: [AuthController],
  providers: [InMemoryAuthRepository, { provide: AUTH_REPOSITORY, useExisting: InMemoryAuthRepository }, AuthService],
})
export class AuthModule {}
