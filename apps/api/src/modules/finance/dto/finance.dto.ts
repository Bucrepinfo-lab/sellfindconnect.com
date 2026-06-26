import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  filingFrequencies,
  type FilingFrequency,
} from '@telpen/domain';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
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

export class CreateInvoiceDto extends CalculateTaxDto {
  @ApiProperty({ example: 'Acme Supplies Ltd' })
  @IsString()
  @Length(2, 200)
  declare customerName: string;

  @ApiPropertyOptional({ example: 'billing@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  declare customerEmail?: string;

  @ApiPropertyOptional({ example: 'checkout-session-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare billingReference?: string;

  @ApiProperty({ example: 'Sell Find Connect monthly subscription' })
  @IsString()
  @Length(2, 240)
  declare lineItemDescription: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  declare dueAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare issueReceipt?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare amountPaid?: number;

  @ApiPropertyOptional({ example: 'MANUAL' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare paymentProvider?: string;

  @ApiPropertyOptional({ example: 'manual-payment-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare paymentReference?: string;

  @ApiPropertyOptional({ example: '2026-06-23T12:05:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare paidAt?: string;
}

export class IssueReceiptDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID()
  declare invoiceId: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare amountPaid?: number;

  @ApiProperty({ example: 'MANUAL' })
  @IsString()
  @Length(2, 80)
  declare paymentProvider: string;

  @ApiProperty({ example: 'manual-payment-123' })
  @IsString()
  @Length(2, 160)
  declare paymentReference: string;

  @ApiPropertyOptional({ example: '2026-06-23T12:05:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare paidAt?: string;
}

export class RequestRefundDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID()
  declare invoiceId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  declare amount: number;

  @ApiProperty({ example: 'Customer cancelled during support grace period.' })
  @IsString()
  @Length(2, 500)
  declare reason: string;

  @ApiPropertyOptional({ example: 'MANUAL' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare paymentProvider?: string;

  @ApiPropertyOptional({ example: 'refund-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare providerReference?: string;

  @ApiPropertyOptional({ example: 'https://evidence.example.local/refund-123' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  declare evidenceUrl?: string;

  @ApiPropertyOptional({ example: 'billing-manager' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare requestedBy?: string;

  @ApiPropertyOptional({ example: '2026-06-24T08:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare settledAt?: string;
}

export class OpenChargebackDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID()
  declare invoiceId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  declare amount: number;

  @ApiProperty({ example: 'Cardholder dispute received from payment provider.' })
  @IsString()
  @Length(2, 500)
  declare reason: string;

  @ApiProperty({ example: 'STRIPE' })
  @IsString()
  @Length(2, 80)
  declare paymentProvider: string;

  @ApiProperty({ example: 'dp_123' })
  @IsString()
  @Length(2, 160)
  declare providerReference: string;

  @ApiPropertyOptional({ example: 'https://evidence.example.local/dispute-123' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  declare evidenceUrl?: string;

  @ApiPropertyOptional({ example: 'billing-manager' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare openedBy?: string;

  @ApiPropertyOptional({ example: '2026-06-24T08:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare openedAt?: string;
}

export class RunDunningDto {
  @ApiPropertyOptional({ example: '2026-07-05T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111' })
  @IsOptional()
  @IsUUID()
  declare invoiceId?: string;
}

export class RunFinanceAlertsDto {
  @ApiPropertyOptional({ example: '2026-07-24T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;
}
