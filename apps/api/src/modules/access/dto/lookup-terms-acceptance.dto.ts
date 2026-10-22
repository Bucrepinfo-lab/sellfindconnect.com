import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class LookupTermsAcceptanceDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsString()
  @Length(2, 120)
  declare tenantId: string;

  @ApiPropertyOptional({ example: 'owner-1' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  declare userId?: string;
}
