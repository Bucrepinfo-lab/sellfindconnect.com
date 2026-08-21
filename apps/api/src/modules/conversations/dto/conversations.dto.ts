import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  conversationAttachmentLimit,
  conversationParticipantRoles,
  conversationStatuses,
  inquiryTypes,
  mediaPolicy,
  type ConversationParticipantRole,
  type ConversationStatus,
  type InquiryType,
} from '@telpen/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
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

  @ApiPropertyOptional({ example: ['11111111-1111-4111-8111-111111111111'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(conversationAttachmentLimit)
  @IsString({ each: true })
  declare mediaAssetIds?: string[];
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

export class ConversationReceiptDto {
  @ApiProperty({ enum: conversationParticipantRoles, example: 'TENANT_AGENT' })
  @IsIn(conversationParticipantRoles)
  declare readerRole: ConversationParticipantRole;
}

export class ConversationTypingDto {
  @ApiProperty({ enum: conversationParticipantRoles, example: 'TENANT_AGENT' })
  @IsIn(conversationParticipantRoles)
  declare typingRole: ConversationParticipantRole;
}

export class PrepareConversationMediaUploadDto {
  @ApiProperty({ example: 'quote-sheet.jpg' })
  @IsString()
  @Length(2, 240)
  declare fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Length(5, 120)
  declare mimeType: string;

  @ApiProperty({ example: 840000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(mediaPolicy.maxVideoBytes)
  declare fileSizeBytes: number;
}

export class CreateConversationMediaDto {
  @ApiProperty({ example: 'https://cdn.sellfindconnect.com/chat/quote-sheet.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare sourceUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.sellfindconnect.com/chat/quote-sheet-thumb.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  declare thumbnailUrl?: string;

  @ApiProperty({ example: 'quote-sheet.jpg' })
  @IsString()
  @Length(2, 240)
  declare fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Length(5, 120)
  declare mimeType: string;

  @ApiProperty({ example: 840000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(mediaPolicy.maxVideoBytes)
  declare fileSizeBytes: number;

  @ApiPropertyOptional({ example: 'Weekly tomato quote sheet' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare caption?: string;

  @ApiPropertyOptional({ example: 's3-compatible-development' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  declare storageProvider?: string;

  @ApiPropertyOptional({ example: 'conversations/tenant-id/conversation-id/quote-sheet.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare objectKey?: string;
}
