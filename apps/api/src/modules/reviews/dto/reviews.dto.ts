import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class WriteBusinessReviewDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222222' })
  @IsUUID()
  declare businessTenantId: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  declare rating: number;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  declare comment?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class HideBusinessReviewDto {
  @ApiProperty({ example: 'Reported as spam; confirmed.' })
  @IsString()
  @MaxLength(200)
  declare reason: string;
}

export class PublicReviewListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  declare limit?: number;
}
