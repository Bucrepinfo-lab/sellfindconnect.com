import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunAccountDeletionsDto {
  @ApiPropertyOptional({ example: '2026-09-21T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  declare limit?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  declare dryRun?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare tenantId?: string;
}
