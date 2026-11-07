import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  onboardingUserTypes,
  supplyChainRoles,
  type OnboardingUserType,
  type SupplyChainRole,
} from '@telpen/domain';
import { Equals, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RequestPhoneCodeDto {
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;
}

export class VerifyPhoneCodeDto {
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/)
  declare code: string;

  @ApiPropertyOptional({ example: 'Android phone' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare deviceLabel?: string;
}

export class RegisterPhoneOwnerDto {
  @ApiProperty({ description: 'registrationToken returned by /auth/phone/code/verify for a new number.' })
  @IsString()
  @Length(20, 200)
  declare registrationToken: string;

  @ApiProperty({ example: 'Amina Wanjiru' })
  @IsString()
  @Length(2, 160)
  declare displayName: string;

  @ApiProperty({ example: 'Nairobi Fresh Produce' })
  @IsString()
  @Length(2, 160)
  declare tenantDisplayName: string;

  @ApiProperty({ example: 'KE' })
  @IsString()
  @Length(2, 2)
  declare countryCode: string;

  @ApiProperty({ example: 'AGRICULTURE' })
  @IsString()
  @MaxLength(80)
  declare industryCode: string;

  @ApiProperty({ enum: supplyChainRoles, example: 'SUPPLIER' })
  @IsIn(supplyChainRoles)
  declare primaryRole: SupplyChainRole;

  @ApiProperty({ enum: onboardingUserTypes, example: 'ADVERTISER' })
  @IsIn(onboardingUserTypes)
  declare userType: OnboardingUserType;

  @ApiPropertyOptional({ description: 'Optional. Few users have email; it is never required.' })
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class SetPinDto {
  @ApiProperty()
  @IsString()
  @Length(10, 200)
  declare sessionToken: string;

  @ApiProperty({ example: '4829' })
  @Matches(/^\d{4}$/)
  declare pin: string;
}

export class PinSignInDto {
  @ApiProperty({ example: '4829' })
  @Matches(/^\d{4}$/)
  declare pin: string;
}

export class RevokeDevicesDto {
  @ApiProperty()
  @IsString()
  @Length(10, 200)
  declare sessionToken: string;
}
