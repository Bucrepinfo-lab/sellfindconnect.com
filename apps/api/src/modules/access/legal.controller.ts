import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthService } from '../auth/auth.service';
import { PlatformAuthSession } from './platform-access.decorator';
import type { PlatformAccessSession } from '../auth/auth.records';
import { LookupTermsAcceptanceDto } from './dto/lookup-terms-acceptance.dto';
import { PlatformLegalGuard } from './platform-legal.guard';

@ApiTags('legal')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active VIEW_TENANT platform access assignment. MFA is required.',
})
@UseGuards(PlatformLegalGuard)
@Controller('platform/legal')
export class LegalController {
  constructor(private readonly auth: AuthService) {}

  @Get('terms-acceptances')
  lookupTermsAcceptance(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Query() query: LookupTermsAcceptanceDto,
  ) {
    return this.auth.lookupTermsAcceptance(session, query);
  }
}
