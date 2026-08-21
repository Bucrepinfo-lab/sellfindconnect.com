import { Body, Controller, Delete, Get, Post, Req } from "@nestjs/common";
import { PrivacyService } from "./privacy.service";

interface AuthenticatedRequest {
  tenantId: string;
  userId: string;
}

interface DeletionRequestBody {
  reason?: string;
}

@Controller("v1/privacy")
export class PrivacyController {
  constructor(private readonly svc: PrivacyService) {}
  @Get("data-summary") dataSummary(@Req() req: AuthenticatedRequest) { return this.svc.dataSummary(req.tenantId, req.userId); }
  @Post("export") requestExport(@Req() req: AuthenticatedRequest) { return this.svc.requestExport(req.tenantId, req.userId); }
  @Post("deletion") requestDeletion(@Req() req: AuthenticatedRequest, @Body() body: DeletionRequestBody) { return this.svc.requestDeletion(req.tenantId, req.userId, body.reason); }
  @Delete("deletion") cancelDeletion(@Req() req: AuthenticatedRequest) { return this.svc.cancelDeletion(req.tenantId, req.userId); }
  @Get("deletion") getDeletion(@Req() req: AuthenticatedRequest) { return this.svc.getDeletion(req.tenantId, req.userId); }
}
