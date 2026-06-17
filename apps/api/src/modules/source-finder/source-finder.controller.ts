import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantContextGuard } from '../tenant/tenant-context.guard';
import { SearchSourceFinderDto } from './dto/search-source-finder.dto';
import { SourceFinderService } from './source-finder.service';

@ApiTags('source-finder')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID. Temporary local-development tenant scope until auth is added.',
})
@UseGuards(TenantContextGuard)
@Controller('source-finder')
export class SourceFinderController {
  constructor(private readonly sourceFinder: SourceFinderService) {}

  @Post('search')
  search(@Body() body: SearchSourceFinderDto) {
    return this.sourceFinder.search(body);
  }
}
