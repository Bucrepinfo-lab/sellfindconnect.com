import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { PlatformAuthSession } from '../access/platform-access.decorator';
import { PlatformModerationGuard } from '../access/platform-moderation.guard';
import type { PlatformAccessSession } from '../auth/auth.records';
import { DecideRelationshipClaimDto, RemoveRelationshipClaimDto } from './dto/relationships.dto';
import { RelationshipsService } from './relationships.service';

@ApiTags('relationship-moderation')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active MODERATE_CONTENT platform access assignment. MFA is required.',
})
@UseGuards(PlatformModerationGuard)
@Controller('platform/relationships')
export class RelationshipModerationController {
  constructor(private readonly relationships: RelationshipsService) {}

  @Get()
  listClaims() {
    return this.relationships.listAllForModeration();
  }

  @Post(':id/decide')
  decideClaim(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('id') id: string,
    @Body() body: DecideRelationshipClaimDto,
  ) {
    return this.relationships.decideClaim(session.sessionTenantId, session.userId, id, body, true);
  }

  @Post(':id/remove')
  removeClaim(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('id') id: string,
    @Body() body: RemoveRelationshipClaimDto,
  ) {
    return this.relationships.removeClaim(session.sessionTenantId, session.userId, id, body, true);
  }
}
