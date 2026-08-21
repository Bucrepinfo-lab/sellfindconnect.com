import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ example: 'ANALYTICS_REPORT_EXPORTED' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare action?: string;

  @ApiPropertyOptional({ example: 'INVOICE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare entityType?: string;
}
