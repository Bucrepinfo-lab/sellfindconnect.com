import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import {
  ApproveTaxReturnDto,
  AttachTaxReturnEvidenceDto,
  CalculateTaxDto,
  ConfigureCountryTaxProfileDto,
  CreateInvoiceDto,
  CreateTaxRuleDto,
  ExportTaxReturnQueryDto,
  FileTaxReturnDto,
  GenerateTaxReturnDto,
  IssueInvoiceDto,
  IssueReceiptDto,
  LockTaxReturnDto,
  OpenChargebackDto,
  CorrectTaxReturnDto,
  PayInvoiceDto,
  ReconcileSettlementDto,
  SettleProviderCaptureDto,
  RefundInvoiceDto,
  RemitTaxReturnDto,
  RequestRefundDto,
  RunDunningDto,
  RunFinanceAlertsDto,
  SubmitTaxReturnDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before finance routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Post('country-tax-profiles')
  configureCountryTaxProfile(@Body() body: ConfigureCountryTaxProfileDto) {
    return this.finance.configureCountryTaxProfile(body);
  }

  @Get('country-tax-profiles')
  listCountryTaxProfiles() {
    return this.finance.listCountryTaxProfiles();
  }

  @Get('launch-readiness')
  getPaidLaunchReadiness(@Query('country') country = 'KE') {
    return this.finance.getPaidLaunchReadiness(country);
  }

  @Post('tax-rules')
  createTaxRule(@Body() body: CreateTaxRuleDto) {
    return this.finance.createTaxRule(body);
  }

  @Get('tax-rules')
  listTaxRules() {
    return this.finance.listTaxRules();
  }

  @Post('tax-calculations')
  calculateTax(@TenantId() tenantId: string, @Body() body: CalculateTaxDto) {
    return this.finance.calculateTax(tenantId, body);
  }

  @Get('tax-calculations')
  listTaxCalculations(@TenantId() tenantId: string) {
    return this.finance.listTaxCalculations(tenantId);
  }

  @Post('tax-returns')
  generateTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: GenerateTaxReturnDto,
  ) {
    return this.finance.generateTaxReturn(body, {
      tenantId,
      sessionRole: session.role,
    });
  }

  @Get('tax-returns')
  listTaxReturns(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
  ) {
    return this.finance.listTaxReturns({ tenantId, sessionRole: session.role });
  }

  @Get('tax-returns/:id/export')
  exportTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Query() query: ExportTaxReturnQueryDto,
  ) {
    return this.finance.exportTaxReturn(id, query, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Get('tax-returns/:id')
  getTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
  ) {
    return this.finance.getTaxReturn(id, { tenantId, sessionRole: session.role });
  }

  @Post('tax-returns/:id/submit')
  submitTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: SubmitTaxReturnDto,
  ) {
    return this.finance.submitTaxReturn(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('tax-returns/:id/approve')
  approveTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: ApproveTaxReturnDto,
  ) {
    return this.finance.approveTaxReturn(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('tax-returns/:id/evidence')
  attachTaxReturnEvidence(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: AttachTaxReturnEvidenceDto,
  ) {
    return this.finance.attachTaxReturnEvidence(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('tax-returns/:id/file')
  fileTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: FileTaxReturnDto,
  ) {
    return this.finance.fileTaxReturn(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('tax-returns/:id/remit')
  remitTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: RemitTaxReturnDto,
  ) {
    return this.finance.remitTaxReturn(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('tax-returns/:id/lock')
  lockTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: LockTaxReturnDto,
  ) {
    return this.finance.lockTaxReturn(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('tax-returns/:id/corrections')
  correctTaxReturn(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: CorrectTaxReturnDto,
  ) {
    return this.finance.correctTaxReturn(id, body, {
      tenantId,
      sessionRole: session.role,
      actorUserId: session.userId,
    });
  }

  @Post('invoices')
  createInvoice(@TenantId() tenantId: string, @Body() body: CreateInvoiceDto) {
    return this.finance.createInvoice(tenantId, body);
  }

  @Get('invoices')
  listInvoices(@TenantId() tenantId: string) {
    return this.finance.listInvoices(tenantId);
  }

  @Post('receipts')
  issueReceipt(@TenantId() tenantId: string, @Body() body: IssueReceiptDto) {
    return this.finance.issueReceipt(tenantId, body);
  }

  @Get('receipts')
  listReceipts(@TenantId() tenantId: string) {
    return this.finance.listReceipts(tenantId);
  }

  @Post('refunds')
  requestRefund(@TenantId() tenantId: string, @Body() body: RequestRefundDto) {
    return this.finance.requestRefund(tenantId, body);
  }

  @Post('chargebacks')
  openChargeback(@TenantId() tenantId: string, @Body() body: OpenChargebackDto) {
    return this.finance.openChargeback(tenantId, body);
  }

  @Get('adjustments')
  listAdjustments(@TenantId() tenantId: string) {
    return this.finance.listAdjustments(tenantId);
  }

  @Post('dunning/run')
  runDunning(@TenantId() tenantId: string, @Body() body: RunDunningDto) {
    return this.finance.runDunning(tenantId, body);
  }

  @Get('dunning-notices')
  listDunningNotices(@TenantId() tenantId: string) {
    return this.finance.listDunningNotices(tenantId);
  }

  @Post('alerts/run')
  runFinanceAlerts(@Body() body: RunFinanceAlertsDto) {
    return this.finance.runFinanceAlerts(body);
  }

  @Get('alerts')
  listFinanceAlerts() {
    return this.finance.listFinanceAlerts();
  }

  @Post('payment-invoices')
  issueInvoice(@TenantId() tenantId: string, @Body() body: IssueInvoiceDto) {
    return this.finance.issueInvoice(tenantId, body);
  }

  @Get('payment-invoices')
  listPaymentInvoices(@TenantId() tenantId: string) {
    return this.finance.listPaymentInvoices(tenantId);
  }

  @Post('payment-invoices/pay')
  payInvoice(@TenantId() tenantId: string, @Body() body: PayInvoiceDto) {
    return this.finance.payInvoice(tenantId, body);
  }

  @Post('payments/settle')
  settleProviderCapture(@TenantId() tenantId: string, @Body() body: SettleProviderCaptureDto) {
    return this.finance.settleProviderCapture(tenantId, body);
  }

  @Post('payment-invoices/refund')
  refundInvoice(@TenantId() tenantId: string, @Body() body: RefundInvoiceDto) {
    return this.finance.refundInvoice(tenantId, body);
  }

  @Get('payments')
  listPayments(@TenantId() tenantId: string) {
    return this.finance.listPayments(tenantId);
  }

  @Get('payment-receipts')
  listPaymentReceipts(@TenantId() tenantId: string) {
    return this.finance.listPaymentReceipts(tenantId);
  }

  @Post('reconciliation/run')
  reconcileSettlement(@TenantId() tenantId: string, @Body() body: ReconcileSettlementDto) {
    return this.finance.reconcileProviderSettlement(tenantId, body);
  }

  @Get('reconciliation')
  listReconciliationRuns(@TenantId() tenantId: string) {
    return this.finance.listReconciliationRuns(tenantId);
  }
}
