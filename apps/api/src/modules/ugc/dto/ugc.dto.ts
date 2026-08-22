import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ugcReportReasons,
  ugcReportResolutions,
  ugcReportTargetTypes,
  type UgcReportReason,
  type UgcReportResolution,
  type UgcReportTargetType,
} from '@telpen/domain';
import { Equals, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUgcReportDto {
  @ApiProperty({ enum: ugcReportTargetTypes, example: 'USER' })
  @IsIn(ugcReportTargetTypes)
  declare targetType: UgcReportTargetType;

  @ApiProperty({ example: 'r1' })
  @IsString()
  @MaxLength(120)
  declare targetId: string;

  @ApiPropertyOptional({ example: '22222222-2222-4222-8222-222222222222' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare targetTenantId?: string;

  @ApiProperty({ enum: ugcReportReasons, example: 'HARASSMENT' })
  @IsIn(ugcReportReasons)
  declare reason: UgcReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare details?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class CreateUgcBlockDto {
  @ApiProperty({ example: 'r1' })
  @IsString()
  @MaxLength(120)
  declare blockedTargetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare blockedTenantId?: string;

  @ApiProperty({ enum: ugcReportReasons, example: 'SPAM_SCAMS' })
  @IsIn(ugcReportReasons)
  declare reason: UgcReportReason;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class ResolveUgcReportDto {
  @ApiProperty({ enum: ugcReportResolutions, example: 'RESOLVED' })
  @IsIn(ugcReportResolutions)
  declare resolution: UgcReportResolution;
}
