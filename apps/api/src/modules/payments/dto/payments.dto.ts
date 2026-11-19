import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional({
    example: 1500,
    description: 'Whole KES units. Ignored for a subscription checkout (plan set): the server prices it.',
  })
  @ValidateIf((dto: CheckoutDto) => !dto.plan)
  @IsInt()
  @Min(1)
  @Max(999_999)
  declare amount?: number;

  @ApiPropertyOptional({
    enum: ['BASIC', 'PRO'],
    description: 'Pay for a subscription plan. The price comes from the price list, never the client.',
  })
  @IsOptional()
  @IsIn(['BASIC', 'PRO'])
  declare plan?: 'BASIC' | 'PRO';

  @ApiPropertyOptional({ enum: ['MONTH', 'YEAR'], description: 'Subscription period; default MONTH.' })
  @IsOptional()
  @IsIn(['MONTH', 'YEAR'])
  declare period?: 'MONTH' | 'YEAR';

  @ApiPropertyOptional({
    example: 'Ad campaign top-up',
    description:
      'Optional ledger note. Do not send a phone number — STK Push always uses the verified login phone on the session.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  declare reason?: string;
}

export class PayoutDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsString()
  @Length(8, 120)
  declare toUserId: string;

  @ApiProperty({ example: 1500 })
  @IsInt()
  @Min(1)
  @Max(999_999)
  declare amount: number;

  @ApiPropertyOptional({ example: 'Refund' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  declare reason?: string;
}
