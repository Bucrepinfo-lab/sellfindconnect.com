import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantContextGuard } from '../tenant/tenant-context.guard';
import {
  CalculateTaxDto,
  ConfigureCountryTaxProfileDto,
  CreateTaxRuleDto,
  GenerateTaxReturnDto,
  RunFinanceAlertsDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID. Temporary local-development tenant scope until auth is added.',
})
@UseGuards(TenantContextGuard)
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
}
