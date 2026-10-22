import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { profileReviewDecisions, supplyChainRoles } from '@telpen/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProfileSocialLinkDto {
  @ApiProperty({ example: 'LinkedIn' })
  @IsString()
  @Length(2, 40)
  declare label: string;

  @ApiProperty({ example: 'https://www.linkedin.com/company/example' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare url: string;
}

export class ProfileServiceAreaDto {
  @ApiPropertyOptional({ example: 'Nairobi' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  declare primaryCity?: string;

  @ApiPropertyOptional({ example: ['Nairobi County', 'Kiambu County'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(2, 80, { each: true })
  declare regions?: string[];

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  declare radiusKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  declare remoteAvailable?: boolean;

  @ApiPropertyOptional({ example: ['KE', 'TZ', 'UG'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  declare operatingCountries?: string[];
}

export class CreateProfileDraftDto {
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

  @ApiPropertyOptional({ example: '+254700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare phone?: string;

  @ApiPropertyOptional({ example: '+254711000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare whatsapp?: string;

  @ApiPropertyOptional({ example: 'sales@example.co.ke' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiPropertyOptional({ example: 'https://example.co.ke' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare website?: string;

  @ApiPropertyOptional({ example: 'Industrial Area, Nairobi, Kenya' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare physicalAddress?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?q=Nairobi' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare mapsUrl?: string;

  @ApiPropertyOptional({ type: () => [ProfileSocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ProfileSocialLinkDto)
  declare socialLinks?: ProfileSocialLinkDto[];

  @ApiPropertyOptional({ type: () => ProfileServiceAreaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileServiceAreaDto)
  declare serviceArea?: ProfileServiceAreaDto;
}

export class UpdateProfileDraftDto {
  @ApiPropertyOptional({ example: 'Nairobi Fresh Produce Cooperative' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  declare displayName?: string;

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  declare industryCode?: string;

  @ApiPropertyOptional({ enum: supplyChainRoles, example: 'SUPPLIER' })
  @IsOptional()
  @IsIn(supplyChainRoles)
  declare role?: (typeof supplyChainRoles)[number];

  @ApiPropertyOptional({ example: 'We supply fresh vegetables to hotels and retailers in Nairobi.' })
  @IsOptional()
  @IsString()
  @Length(20, 2000)
  declare description?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ example: '+254700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare phone?: string;

  @ApiPropertyOptional({ example: '+254711000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  declare whatsapp?: string;

  @ApiPropertyOptional({ example: 'sales@example.co.ke' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiPropertyOptional({ example: 'https://example.co.ke' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare website?: string;

  @ApiPropertyOptional({ example: 'Industrial Area, Nairobi, Kenya' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare physicalAddress?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?q=Nairobi' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare mapsUrl?: string;

  @ApiPropertyOptional({ type: () => [ProfileSocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ProfileSocialLinkDto)
  declare socialLinks?: ProfileSocialLinkDto[];

  @ApiPropertyOptional({ type: () => ProfileServiceAreaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileServiceAreaDto)
  declare serviceArea?: ProfileServiceAreaDto;
}

export class PublishProfileDraftDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class ReviewProfileDraftDto {
  @ApiProperty({ enum: profileReviewDecisions, example: 'APPROVED' })
  @IsIn(profileReviewDecisions)
  declare decision: (typeof profileReviewDecisions)[number];

  @ApiPropertyOptional({ example: 'Approved after checking licensed category language.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare note?: string;
}
