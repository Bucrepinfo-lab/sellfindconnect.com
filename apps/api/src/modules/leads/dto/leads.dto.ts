import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  inquiryTypes,
  leadStatuses,
  matchFeedbackActions,
  type InquiryType,
  type LeadStatus,
  type MatchFeedbackAction,
} from '@telpen/domain';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateMatchFeedbackDto {
  @ApiProperty({ example: 'r1' })
  @IsString()
  @Length(2, 120)
  declare sourceRecordId: string;

  @ApiProperty({ enum: matchFeedbackActions, example: 'ACCEPT' })
  @IsIn(matchFeedbackActions)
  declare action: MatchFeedbackAction;

  @ApiPropertyOptional({ example: 'Strong fit for Nairobi hotel supply.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare note?: string;
}

export class CreateInquiryDto {
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

  @ApiProperty({ example: 'Please quote weekly supply for tomatoes and kale in Nairobi.' })
  @IsString()
  @Length(5, 1000)
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

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  declare acceptedTerms: true;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: leadStatuses, example: 'QUALIFIED' })
  @IsIn(leadStatuses)
  declare status: LeadStatus;
}
