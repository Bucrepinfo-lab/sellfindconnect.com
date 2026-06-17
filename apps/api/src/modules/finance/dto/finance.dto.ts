import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  filingFrequencies,
  type FilingFrequency,
} from '@telpen/domain';
import {
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
