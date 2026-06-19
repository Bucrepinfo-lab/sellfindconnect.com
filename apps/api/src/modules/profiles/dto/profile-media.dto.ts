import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  mediaPolicy,
  mediaTransformStatuses,
  mediaVisibilityStates,
  type MediaTransformStatus,
  type MediaVisibility,
} from '@telpen/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrepareProfileMediaUploadDto {
  @ApiProperty({ example: 'demo-produce.jpg' })
  @IsString()
  @Length(2, 240)
  declare fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Length(5, 120)
  declare mimeType: string;

  @ApiProperty({ example: 840000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(mediaPolicy.maxVideoBytes)
  declare fileSizeBytes: number;
}

export class MediaCdnVariantDto {
  @ApiProperty({ example: 'thumbnail' })
  @IsString()
  @Length(2, 40)
  declare label: string;

  @ApiProperty({ example: 'https://cdn.sellfindconnect.com/profile/demo-produce-thumb.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare url: string;

  @ApiPropertyOptional({ example: 480 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  declare width?: number;

  @ApiPropertyOptional({ example: 270 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  declare height?: number;
}

export class CreateProfileMediaDto {
  @ApiProperty({ example: 'https://cdn.sellfindconnect.com/profile/demo-produce.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare sourceUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.sellfindconnect.com/profile/demo-produce-thumb.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare thumbnailUrl?: string;

  @ApiProperty({ example: 'demo-produce.jpg' })
  @IsString()
  @Length(2, 240)
  declare fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Length(5, 120)
  declare mimeType: string;

  @ApiProperty({ example: 840000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(mediaPolicy.maxVideoBytes)
  declare fileSizeBytes: number;

  @ApiPropertyOptional({ example: 1600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  declare width?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  declare height?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(mediaPolicy.maxVideoDurationSeconds)
  declare durationSeconds?: number;

  @ApiPropertyOptional({ example: 'Fresh produce ready for hotel delivery.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare caption?: string;

  @ApiPropertyOptional({ example: 'Crates of fresh vegetables at the Nairobi dispatch area.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(mediaPolicy.maxItemsPerOwner - 1)
  declare displayOrder?: number;

  @ApiPropertyOptional({ enum: mediaVisibilityStates, example: 'PUBLIC' })
  @IsOptional()
  @IsIn(mediaVisibilityStates)
  declare visibility?: MediaVisibility;

  @ApiPropertyOptional({ example: 's3-compatible-development' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare storageProvider?: string;

  @ApiPropertyOptional({ example: 'profile-drafts/tenant-id/draft-id/demo-produce.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare objectKey?: string;

  @ApiPropertyOptional({ example: 'https://cdn.sellfindconnect.com/profile/demo-produce.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare cdnUrl?: string;

  @ApiPropertyOptional({ enum: mediaTransformStatuses, example: 'READY' })
  @IsOptional()
  @IsIn(mediaTransformStatuses)
  declare transformStatus?: MediaTransformStatus;

  @ApiPropertyOptional({ type: () => [MediaCdnVariantDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => MediaCdnVariantDto)
  declare variants?: MediaCdnVariantDto[];
}
