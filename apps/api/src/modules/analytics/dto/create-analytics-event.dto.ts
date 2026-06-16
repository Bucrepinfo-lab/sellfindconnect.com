import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  analyticsEntityTypes,
  analyticsEventTypes,
  consentStates,
  type AnalyticsEntityType,
  type AnalyticsEventType,
  type ConsentState,
} from '@telpen/domain';
import { IsISO8601, IsIn, IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

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
}
