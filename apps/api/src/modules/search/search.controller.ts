import { Controller, Get, Query, Req } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("v1/search")
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  async search(
    @Req() req: any,
    @Query("q") q: string,
    @Query("country") country?: string,
    @Query("industry") industry?: string,
    @Query("role") role?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.svc.search({
      text: q ?? "",
      countryCode: country,
      industryCode: industry,
      role,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      offset: offset ? Number(offset) : 0,
      tenantId: req.tenantId,
    });
  }
}
