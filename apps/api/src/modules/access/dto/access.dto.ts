import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  accessPermissions,
  accessRoles,
  accessScopeLevels,
  type AccessPermission,
  type AccessRole,
  type AccessScopeLevel,
} from '@telpen/domain';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class EvaluateAccessDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @Length(2, 120)
  declare userId: string;

  @ApiProperty({ enum: accessRoles, example: 'COUNTRY_ADMIN' })
  @IsIn(accessRoles)
  declare role: AccessRole;

  @ApiProperty({ example: true })
  @IsBoolean()
  declare mfaVerified: boolean;

  @ApiProperty({ enum: accessScopeLevels, example: 'COUNTRY' })
  @IsIn(accessScopeLevels)
  declare scopeLevel: AccessScopeLevel;

  @ApiProperty({ enum: accessPermissions, example: 'MANAGE_COUNTRY' })
  @IsIn(accessPermissions)
  declare permission: AccessPermission;

  @ApiPropertyOptional({ example: ['EMEA'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare regionCodes?: string[];

  @ApiPropertyOptional({ example: ['AF'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare continentCodes?: string[];

  @ApiPropertyOptional({ example: ['KE'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare countryCodes?: string[];

  @ApiPropertyOptional({ example: ['11111111-1111-4111-8111-111111111111'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare tenantIds?: string[];

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111' })
  @IsOptional()
  @IsString()
  declare targetTenantId?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  declare targetCountryCode?: string;

  @ApiPropertyOptional({ example: 'AF' })
  @IsOptional()
  @IsString()
  declare targetContinentCode?: string;

  @ApiPropertyOptional({ example: 'EMEA' })
  @IsOptional()
  @IsString()
  declare targetRegionCode?: string;
}
