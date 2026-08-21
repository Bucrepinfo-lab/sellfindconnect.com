import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  opportunityAlertFrequencies,
  sourceFinderOutcomeActions,
  sourceFinderSortOptions,
  supplyChainRoles,
  type OpportunityAlertFrequency,
  type SourceFinderOutcomeAction,
  type SourceFinderSortOption,
  type SupplyChainRole,
} from '@telpen/domain';
import { Type } from 'class-transformer';
import {
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
