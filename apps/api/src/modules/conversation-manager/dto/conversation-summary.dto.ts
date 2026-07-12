import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsNumber, IsObject, IsDateString } from 'class-validator';
import { ConversationResult } from './conversation-session.dto';

export enum LeadStatus {
  NEW = 'NEW',
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALL_BACK_LATER = 'CALL_BACK_LATER',
  WRONG_NUMBER = 'WRONG_NUMBER',
  BUSY = 'BUSY',
  DO_NOT_CALL = 'DO_NOT_CALL',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export class CreateSummaryDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ enum: ConversationResult })
  @IsEnum(ConversationResult)
  conversationResult: ConversationResult;

  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  leadStatus: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerBudget?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPropertyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  keyInterests?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  extractedEntities?: any;

  @ApiProperty()
  @IsInt()
  questionsAsked: number;

  @ApiProperty()
  @IsInt()
  questionsAnswered: number;

  @ApiProperty()
  @IsInt()
  objectionsRaised: number;

  @ApiProperty()
  @IsInt()
  objectionsResolved: number;

  @ApiProperty()
  @IsInt()
  knowledgeQueriesCount: number;

  @ApiProperty()
  @IsInt()
  stateTransitionsCount: number;

  @ApiProperty()
  @IsInt()
  totalDuration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  averageResponseTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerSentiment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  conversationQuality?: number;

  @ApiProperty()
  @IsString()
  nextAction: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;

  @ApiProperty()
  @IsBoolean()
  followUpRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  appointmentScheduled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailedNotes?: string;

  @ApiProperty()
  @IsString()
  summaryText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateSummaryDto {
  @ApiPropertyOptional({ enum: ConversationResult })
  @IsOptional()
  @IsEnum(ConversationResult)
  conversationResult?: ConversationResult;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailedNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summaryText?: string;
}

export class SummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  contactId?: string;

  @ApiPropertyOptional()
  campaignId?: string;

  @ApiProperty({ enum: ConversationResult })
  conversationResult: ConversationResult;

  @ApiProperty({ enum: LeadStatus })
  leadStatus: LeadStatus;

  @ApiPropertyOptional()
  customerName?: string;

  @ApiPropertyOptional()
  customerCity?: string;

  @ApiPropertyOptional()
  customerBudget?: string;

  @ApiPropertyOptional()
  customerPropertyType?: string;

  @ApiPropertyOptional()
  keyInterests?: any;

  @ApiPropertyOptional()
  extractedEntities?: any;

  @ApiProperty()
  questionsAsked: number;

  @ApiProperty()
  questionsAnswered: number;

  @ApiProperty()
  objectionsRaised: number;

  @ApiProperty()
  objectionsResolved: number;

  @ApiProperty()
  knowledgeQueriesCount: number;

  @ApiProperty()
  stateTransitionsCount: number;

  @ApiProperty()
  totalDuration: number;

  @ApiPropertyOptional()
  averageResponseTime?: number;

  @ApiPropertyOptional()
  customerSentiment?: string;

  @ApiPropertyOptional()
  conversationQuality?: number;

  @ApiProperty()
  nextAction: string;

  @ApiPropertyOptional()
  nextActionDate?: Date;

  @ApiProperty()
  followUpRequired: boolean;

  @ApiProperty()
  appointmentScheduled: boolean;

  @ApiPropertyOptional()
  detailedNotes?: string;

  @ApiProperty()
  summaryText: string;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
