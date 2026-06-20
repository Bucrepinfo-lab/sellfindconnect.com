import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import {
  mediaReviewCaseStatuses,
  mediaReviewResolutions,
  type MediaReviewCaseStatus,
  type MediaReviewResolution,
} from '../media-review-case.repository';

export class ListMediaReviewCasesDto {
  @ApiPropertyOptional({ enum: mediaReviewCaseStatuses, example: 'OPEN' })
  @IsOptional()
  @IsIn(mediaReviewCaseStatuses)
  declare status?: MediaReviewCaseStatus;

  @ApiPropertyOptional({ example: 'tenant_123' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare tenantId?: string;

  @ApiPropertyOptional({ example: 'CRITICAL' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare severity?: string;

  @ApiPropertyOptional({ example: 'country-mod-1' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare assignedTo?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  declare unassignedOnly?: boolean;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  declare limit?: number;
}

export class AssignMediaReviewCaseDto {
  @ApiPropertyOptional({ example: 'country-mod-1' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare assignedTo?: string;

  @ApiPropertyOptional({ example: 'Prioritize this because the provider reported malware.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare note?: string;
}

export class ResolveMediaReviewCaseDto {
  @ApiProperty({ enum: mediaReviewResolutions, example: 'CONFIRMED_BLOCK' })
  @IsIn(mediaReviewResolutions)
  declare resolution: MediaReviewResolution;

  @ApiPropertyOptional({ example: 'Confirmed malicious upload and left the media blocked.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare notes?: string;
}
