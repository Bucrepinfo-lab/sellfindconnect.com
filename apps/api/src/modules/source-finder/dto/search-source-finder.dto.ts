import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  opportunityAlertFrequencies,
  sourceFinderOutcomeActions,
  sourceFinderReasonCodes,
  sourceFinderSortOptions,
  supplyChainRoles,
  type OpportunityAlertFrequency,
  type SourceFinderOutcomeAction,
  type SourceFinderSortOption,
  type SupplyChainRole,
} from '@telpen/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const roleOptions = ['ALL', ...supplyChainRoles] as const;

export class SearchSourceFinderDto {
  @ApiProperty({ example: 'fresh produce' })
  @IsString()
  @MaxLength(200)
  declare query: string;

  @ApiPropertyOptional({ enum: roleOptions, example: 'SUPPLIER' })
  @IsOptional()
  @IsIn(roleOptions)
  declare role?: SupplyChainRole | 'ALL';

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare industryCode?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ enum: sourceFinderSortOptions, example: 'RELEVANCE' })
  @IsOptional()
  @IsIn(sourceFinderSortOptions)
  declare sortBy?: SourceFinderSortOption;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  declare behavioralMatchingConsent?: boolean;
}

export class RebuildSourceFinderIndexDto {
  @ApiPropertyOptional({ example: '2026-08-21T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'When false, the index is cleared instead of rebuilt from the pilot catalog.',
  })
  @IsOptional()
  @IsBoolean()
  declare includePilot?: boolean;
}

export class SourceFinderHierarchyQueryDto {
  @ApiPropertyOptional({ enum: roleOptions, example: 'SUPPLIER' })
  @IsOptional()
  @IsIn(roleOptions)
  declare role?: SupplyChainRole | 'ALL';

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare industryCode?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;
}

export class CreateSavedSourceFinderSearchDto {
  @ApiProperty({ example: 'Fresh produce buyers' })
  @IsString()
  @Length(2, 120)
  declare name: string;

  @ApiProperty({ example: 'fresh produce' })
  @IsString()
  @Length(2, 200)
  declare query: string;

  @ApiPropertyOptional({ enum: roleOptions, example: 'BUYER' })
  @IsOptional()
  @IsIn(roleOptions)
  declare role?: SupplyChainRole | 'ALL';

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare industryCode?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ enum: sourceFinderSortOptions, example: 'RELEVANCE' })
  @IsOptional()
  @IsIn(sourceFinderSortOptions)
  declare sortBy?: SourceFinderSortOption;

  @ApiPropertyOptional({ enum: opportunityAlertFrequencies, example: 'DAILY' })
  @IsOptional()
  @IsIn(opportunityAlertFrequencies)
  declare alertFrequency?: OpportunityAlertFrequency;
}

export class RunSourceFinderOpportunityAlertsDto {
  @ApiPropertyOptional({ example: '2026-08-22T08:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;

  @ApiPropertyOptional({ example: 'saved-search-id' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare savedSearchId?: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  declare limit?: number;
}

export class RecordSourceFinderOutcomeDto {
  @ApiProperty({ example: 'r1' })
  @IsString()
  @Length(2, 120)
  declare sourceRecordId: string;

  @ApiProperty({ enum: sourceFinderOutcomeActions, example: 'ACCEPT' })
  @IsIn(sourceFinderOutcomeActions)
  declare action: SourceFinderOutcomeAction;

  @ApiPropertyOptional({ example: 'fresh produce' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare query?: string;

  @ApiPropertyOptional({ example: 'Strong weekly hotel supply fit.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare note?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare behavioralMatchingConsent?: boolean;
}

const roleValues = [...supplyChainRoles] as const;

/**
 * Request a plain-English "why this match" explanation for one match. The client
 * passes the match facts it already received from a search result, so no extra
 * lookup is needed. The server screens the content, then uses the AI overlay
 * (when configured) or the deterministic template.
 */
export class ExplainSourceFinderMatchDto {
  @ApiProperty({ example: 'who packages avocados for export in Kenya' })
  @IsString()
  @MaxLength(200)
  declare query: string;

  @ApiProperty({ example: 'Rift Valley Pack House' })
  @IsString()
  @MaxLength(160)
  declare name: string;

  @ApiProperty({ enum: roleValues, example: 'PROCESSOR' })
  @IsIn(roleValues)
  declare role: SupplyChainRole;

  @ApiProperty({ example: 'Nakuru, Kenya' })
  @IsString()
  @MaxLength(160)
  declare location: string;

  @ApiProperty({ type: [String], example: ['Avocado packing', 'Cold storage'] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  declare offers: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  declare verified: boolean;

  @ApiProperty({ enum: sourceFinderReasonCodes, isArray: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(sourceFinderReasonCodes, { each: true })
  declare reasonCodes: (typeof sourceFinderReasonCodes)[number][];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  declare reasons: string[];
}
