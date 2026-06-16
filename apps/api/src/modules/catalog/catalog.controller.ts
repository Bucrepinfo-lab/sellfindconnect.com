import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { continents, countries, industryCategories, supplyChainRoles } from '@telpen/domain';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  @Get('geography')
  geography() {
    return {
      continents,
      countries,
    };
  }

  @Get('industries')
  industries() {
    return {
      industries: industryCategories,
      supplyChainRoles,
    };
  }
}
