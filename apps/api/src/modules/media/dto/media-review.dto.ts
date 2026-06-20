import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  declare limit?: number;
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
