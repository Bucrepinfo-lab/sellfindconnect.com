import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CheckSafetyDto {
  @ApiProperty({ example: 'Fresh produce supplier in Nairobi' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  declare text: string;
}
