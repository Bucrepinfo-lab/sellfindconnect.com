import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { mediaProcessingJobTypes, type MediaProcessingJobType } from '../media.adapters';

export class RunMediaProcessingJobsDto {
  @ApiPropertyOptional({ example: 'media-worker-cape-town-1' })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  declare workerId?: string;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare limit?: number;

  @ApiPropertyOptional({ example: '2026-06-19T18:05:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;

  @ApiPropertyOptional({ example: 300, minimum: 30, maximum: 86400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(86_400)
  declare retryAfterSeconds?: number;

  @ApiPropertyOptional({
    enum: mediaProcessingJobTypes,
    isArray: true,
    example: ['MALWARE_SCAN', 'CONTENT_MODERATION'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(mediaProcessingJobTypes.length)
  @IsIn(mediaProcessingJobTypes, { each: true })
  declare jobTypes?: MediaProcessingJobType[];
}
