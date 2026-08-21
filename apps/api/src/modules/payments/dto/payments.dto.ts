import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 1500, description: 'Whole KES units.' })
  @IsInt()
  @Min(1)
  @Max(999_999)
  declare amount: number;

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
