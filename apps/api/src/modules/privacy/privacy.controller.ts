import { Body, Controller, Delete, Get, Post, Req } from "@nestjs/common";
import { PrivacyService } from "./privacy.service";

@Controller("v1/privacy")
export class PrivacyController {
  constructor(private readonly svc: PrivacyService) {}
  @Get("data-summary") dataSummary(@Req() req) { return this.svc.dataSummary(req.tenantId, req.userId); }
  @Post("export") requestExport(@Req() req) { return this.svc.requestExport(req.tenantId, req.userId); }
  @Post("deletion") requestDeletion(@Req() req, @Body() body) { return this.svc.requestDeletion(req.tenantId, req.userId, body.reason); }
  @Delete("deletion") cancelDeletion(@Req() req) { return this.svc.cancelDeletion(req.tenantId, req.userId); }
  @Get("deletion") getDeletion(@Req() req) { return this.svc.getDeletion(req.tenantId, req.userId); }
}
