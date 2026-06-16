import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { supplyChainRoles } from '@telpen/domain';
import { IsEmail, IsIn, IsISO8601, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

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
  @IsUrl({ require_tld: false })
  declare website?: string;
}

export class RunAdvertLifecycleDto {
  @ApiPropertyOptional({ example: '2026-07-25T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;
}
