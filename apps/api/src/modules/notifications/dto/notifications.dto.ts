import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  notificationChannels,
  notificationEventTypes,
  type NotificationChannel,
  type NotificationConsentState,
  type NotificationEventType,
  type NotificationPreference,
  type NotificationSeverity,
} from '@telpen/domain';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const notificationConsentStates = ['GRANTED', 'DENIED', 'REQUIRED', 'NOT_REQUIRED'] as const;
const notificationSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class NotificationPreferenceDto implements NotificationPreference {
  @ApiProperty({ enum: notificationChannels, example: 'EMAIL' })
  @IsIn(notificationChannels)
  declare channel: NotificationChannel;

  @ApiProperty({ example: true })
  @IsBoolean()
  declare enabled: boolean;

  @ApiProperty({ enum: notificationConsentStates, example: 'GRANTED' })
  @IsIn(notificationConsentStates)
  declare consentState: NotificationConsentState;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  declare preferences: NotificationPreferenceDto[];
}

export class CreateNotificationPlanDto {
  @ApiProperty({ enum: notificationEventTypes, example: 'CONVERSATION_SLA_BREACHED' })
  @IsIn(notificationEventTypes)
  declare eventType: NotificationEventType;

  @ApiProperty({ enum: notificationSeverities, example: 'HIGH' })
  @IsIn(notificationSeverities)
  declare severity: NotificationSeverity;

  @ApiProperty({ example: 'SLA breached: Nairobi Fresh Produce Cooperative' })
  @IsString()
  @Length(3, 160)
  declare title: string;

  @ApiProperty({ example: 'A high-priority conversation has missed its response SLA.' })
  @IsString()
  @Length(5, 1000)
  declare message: string;

  @ApiPropertyOptional({ enum: notificationChannels, isArray: true, example: ['IN_APP'] })
  @IsOptional()
  @IsArray()
  @IsIn(notificationChannels, { each: true })
  declare requiredChannels?: NotificationChannel[];

  @ApiPropertyOptional({ enum: notificationChannels, isArray: true, example: ['EMAIL', 'PUSH'] })
  @IsOptional()
  @IsArray()
  @IsIn(notificationChannels, { each: true })
  declare fallbackChannels?: NotificationChannel[];

  @ApiPropertyOptional({ example: 'conversation' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare entityType?: string;

  @ApiPropertyOptional({ example: 'conversation-123' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare entityId?: string;

  @ApiPropertyOptional({ example: 'owner-user-1' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare recipientUserId?: string;

  @ApiPropertyOptional({ example: 'owner@sellfindconnect.com' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  declare email?: string;

  @ApiPropertyOptional({ example: '+254700000001' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  declare phone?: string;

  @ApiPropertyOptional({ example: 'fcm-device-token' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  declare pushToken?: string;
}

export class RunNotificationDispatchDto {
  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare tenantId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  declare limit?: number;
}
