import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  onboardingUserTypes,
  supplyChainRoles,
  type OnboardingUserType,
  type SupplyChainRole,
} from '@telpen/domain';
import { Equals, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class StartPhoneSignInDto {
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;
}

export class RedeemResetCodeDto {
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;

  @ApiProperty({ example: '482913', description: 'One-time PIN reset code from support staff.' })
  @Matches(/^\d{6}$/)
  declare code: string;

  @ApiPropertyOptional({ example: 'Android phone' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare deviceLabel?: string;
}

export class IssueResetCodeDto {
  @ApiProperty({ description: 'Session token of a support staff member (MFA satisfied).' })
  @IsString()
  @Length(10, 200)
  declare sessionToken: string;

  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;
}

export class RegisterPhoneOwnerDto {
  @ApiProperty({ description: 'registrationToken returned by /auth/phone/start for a new number.' })
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

  @ApiProperty({ example: '4829', description: 'The 4-digit PIN the owner chooses (no SMS, owner 20/11/26).' })
  @Matches(/^\d{4}$/)
  declare pin: string;
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

  @ApiPropertyOptional({ example: '0712345678', description: 'Leave out on a trusted device that remembers the number.' })
  @IsOptional()
  @IsString()
  @Length(6, 80)
  declare phone?: string;

  @ApiPropertyOptional({ example: 'Android phone' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare deviceLabel?: string;
}

export class RevokeDevicesDto {
  @ApiProperty()
  @IsString()
  @Length(10, 200)
  declare sessionToken: string;
}
