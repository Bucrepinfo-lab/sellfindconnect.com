import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { supplyChainRoles } from '@telpen/domain';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

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

  @ApiPropertyOptional({ example: 'sales@example.co.ke' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiPropertyOptional({ example: 'https://example.co.ke' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare website?: string;
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

  @ApiPropertyOptional({ example: 'sales@example.co.ke' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiPropertyOptional({ example: 'https://example.co.ke' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare website?: string;
}

export class PublishProfileDraftDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}
