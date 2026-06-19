import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  mediaPolicy,
  mediaTransformStatuses,
  mediaVisibilityStates,
  supplyChainRoles,
  type MediaTransformStatus,
  type MediaVisibility,
} from '@telpen/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAdvertDto {
  @ApiProperty({ example: 'Fresh vegetables for hotels and shops' })
  @IsString()
  @Length(2, 160)
  declare title: string;

  @ApiProperty({ example: 'Nairobi Fresh Produce Cooperative' })
  @IsString()
  @Length(2, 120)
  declare displayName: string;

  @ApiProperty({ example: 'AGRICULTURE' })
  @IsString()
  @Length(2, 80)
  declare industryCode: string;

  @ApiProperty({ enum: supplyChainRoles, example: 'SUPPLIER' })
  @IsIn(supplyChainRoles)
  declare role: (typeof supplyChainRoles)[number];

  @ApiProperty({ example: 'We supply fresh vegetables to hotels and retailers in Nairobi.' })
  @IsString()
  @Length(20, 2000)
  declare description: string;

  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiPropertyOptional({ example: '2026-06-16T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare publishedAt?: string;

  @ApiPropertyOptional({ example: '+254700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare phone?: string;

  @ApiPropertyOptional({ example: 'sales@example.co.ke' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiPropertyOptional({ example: 'https://example.co.ke' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare website?: string;
}

export class RunAdvertLifecycleDto {
  @ApiPropertyOptional({ example: '2026-07-25T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;
}

export class PrepareAdvertMediaUploadDto {
  @ApiProperty({ example: 'market-stall.jpg' })
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

export class AdvertMediaCdnVariantDto {
  @ApiProperty({ example: 'thumbnail' })
  @IsString()
  @Length(2, 40)
  declare label: string;

  @ApiProperty({ example: 'https://cdn.sellfindconnect.com/adverts/market-stall-thumb.jpg' })
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

export class CreateAdvertMediaDto {
  @ApiProperty({ example: 'https://cdn.sellfindconnect.com/adverts/market-stall.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare sourceUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.sellfindconnect.com/adverts/market-stall-thumb.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare thumbnailUrl?: string;

  @ApiProperty({ example: 'market-stall.jpg' })
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

  @ApiPropertyOptional({ example: 'Fresh vegetables available for hotel delivery.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare caption?: string;

  @ApiPropertyOptional({ example: 'Fresh vegetables arranged at a Nairobi market stall.' })
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

  @ApiPropertyOptional({ example: 'adverts/tenant-id/advert-id/market-stall.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare objectKey?: string;

  @ApiPropertyOptional({ example: 'https://cdn.sellfindconnect.com/adverts/market-stall.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare cdnUrl?: string;

  @ApiPropertyOptional({ enum: mediaTransformStatuses, example: 'READY' })
  @IsOptional()
  @IsIn(mediaTransformStatuses)
  declare transformStatus?: MediaTransformStatus;

  @ApiPropertyOptional({ type: () => [AdvertMediaCdnVariantDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AdvertMediaCdnVariantDto)
  declare variants?: AdvertMediaCdnVariantDto[];
}
