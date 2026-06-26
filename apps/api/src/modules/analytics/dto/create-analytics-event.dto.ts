import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  accessScopeLevels,
  analyticsEntityTypes,
  analyticsEventTypes,
  consentStates,
  type AccessScopeLevel,
  type AnalyticsEntityType,
  type AnalyticsEventType,
  type ConsentState,
} from '@telpen/domain';
import {
  IsBoolean,
  IsISO8601,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const analyticsExportFormats = ['CSV', 'JSON', 'PDF'] as const;
export type AnalyticsExportFormat = (typeof analyticsExportFormats)[number];
export const analyticsReportDataSources = ['AUTO', 'RAW', 'ROLLUP'] as const;
export type AnalyticsReportDataSource = (typeof analyticsReportDataSources)[number];
export const analyticsPrivacyRequestTypes = ['ACCESS', 'ERASURE'] as const;
export type AnalyticsPrivacyRequestType = (typeof analyticsPrivacyRequestTypes)[number];

export class CreateAnalyticsEventDto {
  @ApiProperty({ enum: analyticsEventTypes, example: 'VIEW' })
  @IsIn(analyticsEventTypes)
  declare eventType: AnalyticsEventType;

  @ApiProperty({ enum: analyticsEntityTypes, example: 'PROFILE' })
  @IsIn(analyticsEntityTypes)
  declare entityType: AnalyticsEntityType;

  @ApiProperty({ example: 'profile_123' })
  @IsString()
  @Length(2, 120)
  declare entityId: string;

  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  declare industryCode?: string;

  @ApiProperty({ enum: consentStates, example: 'GRANTED' })
  @IsIn(consentStates)
  declare consentState: ConsentState;

  @ApiPropertyOptional({ example: '2026-06-16T18:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare occurredAt?: string;

  @ApiPropertyOptional({
    example: {
      source: 'source_finder',
      query: 'fresh produce',
      position: 1,
    },
  })
  @IsOptional()
  @IsObject()
  declare metadata?: Record<string, unknown>;
}

export class AnalyticsSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare from?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  declare to?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare industryCode?: string;

  @ApiPropertyOptional({ enum: analyticsReportDataSources, example: 'AUTO' })
  @IsOptional()
  @IsIn(analyticsReportDataSources)
  declare dataSource?: AnalyticsReportDataSource;
}

export class AnalyticsExportQueryDto extends AnalyticsSummaryQueryDto {
  @ApiPropertyOptional({ enum: analyticsExportFormats, example: 'CSV' })
  @IsOptional()
  @IsIn(analyticsExportFormats)
  declare format?: AnalyticsExportFormat;
}

export class PlatformAnalyticsQueryDto extends AnalyticsExportQueryDto {
  @ApiPropertyOptional({ enum: accessScopeLevels, example: 'COUNTRY' })
  @IsOptional()
  @IsIn(accessScopeLevels)
  declare scopeLevel?: AccessScopeLevel;

  @ApiPropertyOptional({ example: 'EMEA' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare regionCode?: string;

  @ApiPropertyOptional({ example: 'AF' })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  declare continentCode?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  declare tenantId?: string;
}

export class RunAnalyticsRetentionDto {
  @ApiPropertyOptional({ example: '2025-06-20T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare before?: string;

  @ApiPropertyOptional({ example: 395, minimum: 30, maximum: 3650 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3650)
  declare retentionDays?: number;

  @ApiPropertyOptional({ example: 'LEGAL-APPROVAL-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare approvalReference?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  declare tenantId?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare dryRun?: boolean;
}

export class RunAnalyticsRollupDto {
  @ApiPropertyOptional({ example: '2026-06-16T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare from?: string;

  @ApiPropertyOptional({ example: '2026-06-17T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare to?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  declare tenantId?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare dryRun?: boolean;
}

export class RunAnalyticsPrivacyRequestDto {
  @ApiPropertyOptional({ example: 'dsr_2026_0001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare requestId?: string;

  @ApiPropertyOptional({ enum: analyticsPrivacyRequestTypes, example: 'ACCESS' })
  @IsOptional()
  @IsIn(analyticsPrivacyRequestTypes)
  declare requestType?: AnalyticsPrivacyRequestType;

  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsString()
  @Length(2, 120)
  declare tenantId: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare from?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  declare to?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare dryRun?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare rebuildRollups?: boolean;
}
