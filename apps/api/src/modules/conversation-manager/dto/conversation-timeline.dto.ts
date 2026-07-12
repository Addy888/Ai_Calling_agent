import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsObject, IsArray } from 'class-validator';
import { ConversationState } from './conversation-session.dto';

export enum TimelineEventType {
  GREETING = 'GREETING',
  QUESTION_ASKED = 'QUESTION_ASKED',
  ANSWER_RECEIVED = 'ANSWER_RECEIVED',
  INTENT_CHANGED = 'INTENT_CHANGED',
  STATE_CHANGED = 'STATE_CHANGED',
  KNOWLEDGE_SEARCHED = 'KNOWLEDGE_SEARCHED',
  OBJECTION_RAISED = 'OBJECTION_RAISED',
  OBJECTION_HANDLED = 'OBJECTION_HANDLED',
  ENTITY_EXTRACTED = 'ENTITY_EXTRACTED',
  DECISION_MADE = 'DECISION_MADE',
  FOLLOW_UP_SCHEDULED = 'FOLLOW_UP_SCHEDULED',
  LEAD_QUALIFIED = 'LEAD_QUALIFIED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
}

export class CreateTimelineEventDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty({ enum: TimelineEventType })
  @IsEnum(TimelineEventType)
  eventType: TimelineEventType;

  @ApiProperty()
  @IsString()
  eventTitle: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventDescription?: string;

  @ApiProperty({ enum: ConversationState })
  @IsEnum(ConversationState)
  conversationState: ConversationState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intentDetected?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerInput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemResponse?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  knowledgeUsed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  knowledgeIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  entitiesExtracted?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class TimelineEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ enum: TimelineEventType })
  eventType: TimelineEventType;

  @ApiProperty()
  eventTitle: string;

  @ApiPropertyOptional()
  eventDescription?: string;

  @ApiProperty({ enum: ConversationState })
  conversationState: ConversationState;

  @ApiPropertyOptional()
  nodeId?: string;

  @ApiPropertyOptional()
  intentDetected?: string;

  @ApiPropertyOptional()
  customerInput?: string;

  @ApiPropertyOptional()
  systemResponse?: string;

  @ApiProperty()
  knowledgeUsed: boolean;

  @ApiPropertyOptional()
  knowledgeIds?: any;

  @ApiPropertyOptional()
  entitiesExtracted?: any;

  @ApiPropertyOptional()
  confidenceScore?: number;

  @ApiPropertyOptional()
  duration?: number;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  timestamp: Date;
}

export class TimelineQueryDto {
  @ApiPropertyOptional({ enum: TimelineEventType })
  @IsOptional()
  @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;

  @ApiPropertyOptional({ enum: ConversationState })
  @IsOptional()
  @IsEnum(ConversationState)
  state?: ConversationState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intentDetected?: string;
}
