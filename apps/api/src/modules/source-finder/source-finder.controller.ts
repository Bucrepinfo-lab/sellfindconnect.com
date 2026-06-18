import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import { SearchSourceFinderDto } from './dto/search-source-finder.dto';
import { SourceFinderService } from './source-finder.service';

@ApiTags('source-finder')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before Source Finder routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('source-finder')
export class SourceFinderController {
  constructor(private readonly sourceFinder: SourceFinderService) {}

  @Post('search')
  search(@Body() body: SearchSourceFinderDto) {
    return this.sourceFinder.search(body);
  }
}
