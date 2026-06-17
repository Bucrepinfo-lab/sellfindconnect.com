import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  conversationParticipantRoles,
  conversationStatuses,
  inquiryTypes,
  type ConversationParticipantRole,
  type ConversationStatus,
  type InquiryType,
} from '@telpen/domain';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 'r1' })
  @IsString()
  @Length(2, 120)
  declare sourceRecordId: string;

  @ApiPropertyOptional({ example: 'fresh produce' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare query?: string;

  @ApiProperty({ enum: inquiryTypes, example: 'RFQ' })
  @IsIn(inquiryTypes)
  declare inquiryType: InquiryType;

  @ApiProperty({ example: 'Please confirm weekly supply availability for tomatoes and kale.' })
  @IsString()
  @Length(5, 1200)
  declare message: string;

  @ApiPropertyOptional({ example: '100 crates per week' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare quantity?: string;

  @ApiPropertyOptional({ example: 'This week' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare urgency?: string;

  @ApiPropertyOptional({ example: 'sales-agent-1' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare assigneeUserId?: string;

  @ApiPropertyOptional({ example: 'Mary, Sales Desk' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare assigneeDisplayName?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class SendConversationMessageDto {
  @ApiProperty({ enum: conversationParticipantRoles, example: 'TENANT_AGENT' })
  @IsIn(conversationParticipantRoles)
  declare senderRole: ConversationParticipantRole;

  @ApiProperty({ example: 'Thank you. Please share delivery coverage and latest price terms.' })
  @IsString()
  @Length(2, 1200)
  declare body: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class AssignConversationDto {
  @ApiProperty({ example: 'sales-agent-1' })
  @IsString()
  @Length(2, 120)
  declare assigneeUserId: string;

  @ApiPropertyOptional({ example: 'Mary, Sales Desk' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare assigneeDisplayName?: string;
}

export class UpdateConversationStatusDto {
  @ApiProperty({ enum: conversationStatuses, example: 'RESOLVED' })
  @IsIn(conversationStatuses)
  declare status: ConversationStatus;
}

export class RunConversationSlaDto {
  @ApiPropertyOptional({ example: '2026-06-17T13:01:00.000Z' })
  @IsOptional()
  @IsISO8601()
  declare now?: string;
}
