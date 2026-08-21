import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  onboardingUserTypes,
  supplyChainRoles,
  tenantAccessRoles,
  type OnboardingUserType,
  type SupplyChainRole,
  type TenantAccessRole,
} from '@telpen/domain';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export const tenantInviteRoles = tenantAccessRoles.filter(
  (role): role is Exclude<TenantAccessRole, 'OWNER'> => role !== 'OWNER',
);

export class RegisterTenantOwnerDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'Strong-owner#2026' })
  @IsString()
  @Length(8, 256)
  declare password: string;

  @ApiProperty({ example: 'Mary Owner' })
  @IsString()
  @Length(2, 160)
  declare displayName: string;

  @ApiProperty({ example: 'Nairobi Fresh Produce Cooperative' })
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

  @ApiPropertyOptional({ example: '+254700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare phone?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class LoginDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'Strong-owner#2026' })
  @IsString()
  @Length(8, 256)
  declare password: string;
}

export class RequestPhoneOtpDto {
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;
}

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '0712345678' })
  @IsString()
  @Length(6, 80)
  declare phone: string;

  @ApiProperty({ example: '492817' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  declare code: string;
}

export class RequestEmailVerificationDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  declare email: string;
}

export class ConfirmEmailVerificationDto {
  @ApiProperty({ example: 'email-verification-token' })
  @IsString()
  @Length(32, 256)
  declare token: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  declare email: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'password-reset-token' })
  @IsString()
  @Length(32, 256)
  declare token: string;

  @ApiProperty({ example: 'New-owner#2026' })
  @IsString()
  @Length(8, 256)
  declare newPassword: string;
}

export class CreateTenantInviteDto {
  @ApiProperty({ example: 'session-token' })
  @IsString()
  @Length(16, 256)
  declare sessionToken: string;

  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsString()
  @Length(8, 120)
  declare tenantId: string;

  @ApiProperty({ example: 'agent@example.com' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ enum: tenantInviteRoles, example: 'SALES_CHAT_AGENT' })
  @IsIn(tenantInviteRoles)
  declare role: Exclude<TenantAccessRole, 'OWNER'>;
}

export class AcceptTenantInviteDto {
  @ApiProperty({ example: 'tenant-invite-token' })
  @IsString()
  @Length(32, 256)
  declare token: string;

  @ApiPropertyOptional({ example: 'existing-session-token' })
  @IsOptional()
  @IsString()
  @Length(16, 256)
  declare sessionToken?: string;

  @ApiPropertyOptional({ example: 'Grace Agent' })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  declare displayName?: string;

  @ApiPropertyOptional({ example: 'Invited-agent#2026' })
  @IsOptional()
  @IsString()
  @Length(8, 256)
  declare password?: string;

  @ApiPropertyOptional({ example: '+254700000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare phone?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class VerifyMfaDto {
  @ApiProperty({ example: 'session-token' })
  @IsString()
  @Length(16, 256)
  declare sessionToken: string;

  @ApiProperty({ example: '492817' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  declare code: string;
}

export class EnrollTotpDto {
  @ApiProperty({ example: 'session-token' })
  @IsString()
  @Length(16, 256)
  declare sessionToken: string;
}

export class ConfirmTotpDto {
  @ApiProperty({ example: 'session-token' })
  @IsString()
  @Length(16, 256)
  declare sessionToken: string;

  @ApiProperty({ example: '492817' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  declare code: string;
}

export class CheckTenantSessionDto {
  @ApiProperty({ example: 'session-token' })
  @IsString()
  @Length(16, 256)
  declare sessionToken: string;

  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsString()
  @Length(8, 120)
  declare tenantId: string;
}
