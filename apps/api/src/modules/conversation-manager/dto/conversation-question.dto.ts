import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsNumber, IsObject } from 'class-validator';
import { ConversationState } from './conversation-session.dto';

export enum QuestionType {
  GREETING = 'GREETING',
  NAME = 'NAME',
  CITY = 'CITY',
  BUDGET = 'BUDGET',
  PROPERTY_TYPE = 'PROPERTY_TYPE',
  TIMELINE = 'TIMELINE',
  CONTACT_INFO = 'CONTACT_INFO',
  CLARIFICATION = 'CLARIFICATION',
  QUALIFICATION = 'QUALIFICATION',
  FOLLOWUP = 'FOLLOWUP',
  CLOSING = 'CLOSING',
  CUSTOM = 'CUSTOM',
}

export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  @IsString()
  questionText: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: ConversationState })
  @IsEnum(ConversationState)
  conversationState: ConversationState;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class AnswerQuestionDto {
  @ApiProperty()
  @IsString()
  customerAnswer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extractedValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class QuestionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  questionId: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty({ enum: QuestionType })
  questionType: QuestionType;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty({ enum: ConversationState })
  conversationState: ConversationState;

  @ApiProperty()
  order: number;

  @ApiProperty()
  isRequired: boolean;

  @ApiProperty()
  wasAsked: boolean;

  @ApiProperty()
  wasAnswered: boolean;

  @ApiProperty()
  wasSkipped: boolean;

  @ApiPropertyOptional()
  customerAnswer?: string;

  @ApiPropertyOptional()
  extractedValue?: string;

  @ApiPropertyOptional()
  confidenceScore?: number;

  @ApiProperty()
  attemptCount: number;

  @ApiProperty()
  askedAt: Date;

  @ApiPropertyOptional()
  answeredAt?: Date;

  @ApiPropertyOptional()
  metadata?: any;
}

export class NextQuestionDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentQuestionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: any;
}
