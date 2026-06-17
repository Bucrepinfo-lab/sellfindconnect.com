import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  sourceFinderSortOptions,
  supplyChainRoles,
  type SourceFinderSortOption,
  type SupplyChainRole,
} from '@telpen/domain';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const roleOptions = ['ALL', ...supplyChainRoles] as const;

export class SearchSourceFinderDto {
  @ApiProperty({ example: 'fresh produce' })
  @IsString()
  @MaxLength(200)
  declare query: string;

  @ApiPropertyOptional({ enum: roleOptions, example: 'SUPPLIER' })
  @IsOptional()
  @IsIn(roleOptions)
  declare role?: SupplyChainRole | 'ALL';

  @ApiPropertyOptional({ example: 'AGRICULTURE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare industryCode?: string;

  @ApiPropertyOptional({ example: 'KE' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  declare countryCode?: string;

  @ApiPropertyOptional({ enum: sourceFinderSortOptions, example: 'RELEVANCE' })
  @IsOptional()
  @IsIn(sourceFinderSortOptions)
  declare sortBy?: SourceFinderSortOption;
}
