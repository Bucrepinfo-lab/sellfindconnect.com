import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import {
  CalculateTaxDto,
  ConfigureCountryTaxProfileDto,
  CreateTaxRuleDto,
  GenerateTaxReturnDto,
  IssueInvoiceDto,
  PayInvoiceDto,
  ReconcileSettlementDto,
  RefundInvoiceDto,
  RunFinanceAlertsDto,
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
  generateTaxReturn(@Body() body: GenerateTaxReturnDto) {
    return this.finance.generateTaxReturn(body);
  }

  @Get('tax-returns')
  listTaxReturns() {
    return this.finance.listTaxReturns();
  }

  @Post('alerts/run')
  runFinanceAlerts(@Body() body: RunFinanceAlertsDto) {
    return this.finance.runFinanceAlerts(body);
  }

  @Get('alerts')
  listFinanceAlerts() {
    return this.finance.listFinanceAlerts();
  }

  @Post('invoices')
  issueInvoice(@TenantId() tenantId: string, @Body() body: IssueInvoiceDto) {
    return this.finance.issueInvoice(tenantId, body);
  }

  @Get('invoices')
  listInvoices(@TenantId() tenantId: string) {
    return this.finance.listInvoices(tenantId);
  }

  @Post('invoices/pay')
  payInvoice(@TenantId() tenantId: string, @Body() body: PayInvoiceDto) {
    return this.finance.payInvoice(tenantId, body);
  }

  @Post('invoices/refund')
  refundInvoice(@TenantId() tenantId: string, @Body() body: RefundInvoiceDto) {
    return this.finance.refundInvoice(tenantId, body);
  }

  @Get('payments')
  listPayments(@TenantId() tenantId: string) {
    return this.finance.listPayments(tenantId);
  }

  @Get('receipts')
  listReceipts(@TenantId() tenantId: string) {
    return this.finance.listReceipts(tenantId);
  }

  @Post('reconciliation/run')
  reconcileSettlement(@Body() body: ReconcileSettlementDto) {
    return this.finance.reconcileProviderSettlement(body);
  }

  @Get('reconciliation')
  listReconciliationRuns() {
    return this.finance.listReconciliationRuns();
  }
}
