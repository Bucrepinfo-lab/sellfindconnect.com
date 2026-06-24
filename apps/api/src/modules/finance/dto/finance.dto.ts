import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  filingFrequencies,
  paymentMethods,
  type FilingFrequency,
  type PaymentMethod,
} from '@telpen/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConfigureCountryTaxProfileDto {
  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiProperty({ example: 'Kenya Revenue Authority' })
  @IsString()
  @Length(2, 200)
  declare taxAuthorityName: string;

  @ApiProperty({ example: 'REGISTERED' })
  @IsString()
  @Length(2, 80)
  declare taxRegistrationStatus: string;

  @ApiPropertyOptional({ example: 'https://example.tax-authority.local' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  declare filingPortalUrl?: string;

  @ApiProperty({ example: 'Country Finance Admin' })
  @IsString()
  @Length(2, 160)
  declare localFinanceOwner: string;

  @ApiProperty({ enum: filingFrequencies, example: 'MONTHLY' })
  @IsIn(filingFrequencies)
  declare filingFrequency: FilingFrequency;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  @Max(20)
  declare recordRetentionYears: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare taxInclusivePricing?: boolean;

  @ApiPropertyOptional({ example: 'global-finance-admin' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare approvedBy?: string;
}

export class CreateTaxRuleDto {
  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiProperty({ example: 'VAT' })
  @IsString()
  @Length(2, 80)
  declare taxType: string;

  @ApiProperty({ example: 0.16 })
  @IsNumber()
  @Min(0)
  @Max(1)
  declare taxRate: number;

  @ApiProperty({ example: 'SFC_SUBSCRIPTION' })
  @IsString()
  @Length(2, 120)
  declare productTaxCode: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare registrationThreshold?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsISO8601()
  declare effectiveFrom: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  declare effectiveTo?: string;

  @ApiPropertyOptional({ example: 'Approved launch rule for subscription revenue.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare notes?: string;
}

export class CalculateTaxDto {
  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  declare grossAmount: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  declare presentmentCurrency: string;

  @ApiPropertyOptional({ example: 'KES' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  declare filingCurrency?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare exchangeRate?: number;

  @ApiPropertyOptional({ example: 'VAT' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare taxType?: string;

  @ApiPropertyOptional({ example: 'SFC_SUBSCRIPTION' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare productTaxCode?: string;

  @ApiPropertyOptional({ example: 'MANUAL_RULE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare provider?: string;

  @ApiPropertyOptional({ example: 'checkout-session-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare providerReference?: string;

  @ApiPropertyOptional({ example: '2026-06-17T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare transactionAt?: string;

  @ApiProperty({
    example: {
      billingCountry: 'KE',
      customerType: 'BUSINESS',
      taxIdProvided: false,
    },
  })
  @IsObject()
  declare customerEvidence: Record<string, unknown>;
}

export class GenerateTaxReturnDto {
  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiProperty({ example: 'VAT' })
  @IsString()
  @Length(2, 80)
  declare taxType: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsISO8601()
  declare periodStart: string;

  @ApiProperty({ example: '2026-06-30T23:59:59.999Z' })
  @IsISO8601()
  declare periodEnd: string;

  @ApiProperty({ example: '2026-07-20T00:00:00.000Z' })
  @IsISO8601()
  declare filingDeadline: string;

  @ApiProperty({ example: '2026-07-31T00:00:00.000Z' })
  @IsISO8601()
  declare paymentDeadline: string;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  declare filingCurrency: string;
}

export class RunFinanceAlertsDto {
  @ApiPropertyOptional({ example: '2026-07-24T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;
}

export class InvoiceLineDto {
  @ApiProperty({ example: 'Sell Find Connect subscription (monthly)' })
  @IsString()
  @Length(2, 200)
  declare description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  @Max(100000)
  declare quantity: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  declare unitAmount: number;
}

export class IssueInvoiceDto {
  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  declare currencyCode: string;

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  declare lines: InvoiceLineDto[];

  @ApiPropertyOptional({ example: 1.3793 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Link an immutable tax calculation snapshot; overrides taxAmount and currency.',
  })
  @IsOptional()
  @IsString()
  @Length(8, 64)
  declare taxCalculationSnapshotId?: string;

  @ApiPropertyOptional({ example: '2026-06-23T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare issuedAt?: string;

  @ApiPropertyOptional({ example: '2026-07-07T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare dueAt?: string;
}

export class PayInvoiceDto {
  @ApiProperty({ example: 'd3f1c2a4-0000-0000-0000-000000000000' })
  @IsString()
  @Length(8, 64)
  declare invoiceId: string;

  @ApiProperty({ enum: paymentMethods, example: 'CARD' })
  @IsIn(paymentMethods)
  declare method: PaymentMethod;

  @ApiPropertyOptional({ example: 'idem-2026-06-23-001' })
  @IsOptional()
  @IsString()
  @Length(4, 160)
  declare idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'customer-ref-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare customerReference?: string;
}

export class RefundInvoiceDto {
  @ApiProperty({ example: 'd3f1c2a4-0000-0000-0000-000000000000' })
  @IsString()
  @Length(8, 64)
  declare invoiceId: string;

  @ApiPropertyOptional({ example: 10, description: 'Defaults to the full refundable balance.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare amount?: number;

  @ApiPropertyOptional({ example: 'Customer cancelled within trial window.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare reason?: string;
}

export class SettlementLineDto {
  @ApiProperty({ example: 'pay_8f2c1b' })
  @IsString()
  @Length(2, 160)
  declare reference: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  declare amount: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  @Length(3, 3)
  declare currencyCode: string;
}

export class ReconcileSettlementDto {
  @ApiProperty({ example: 'PROVIDER-STATEMENT-2026-06' })
  @IsString()
  @Length(2, 160)
  declare statementReference: string;

  @ApiProperty({ type: [SettlementLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => SettlementLineDto)
  declare settlementLines: SettlementLineDto[];

  @ApiPropertyOptional({ example: 'manual-development' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare provider?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ example: 'KES' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  declare currencyCode?: string;

  @ApiPropertyOptional({ example: 0.01, description: 'Absolute amount tolerance for a match.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare toleranceAmount?: number;
}
