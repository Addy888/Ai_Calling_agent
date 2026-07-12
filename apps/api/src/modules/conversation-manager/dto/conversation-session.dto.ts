import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsUUID, IsInt, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ConversationState {
  GREETING = 'GREETING',
  INTRODUCTION = 'INTRODUCTION',
  QUALIFICATION = 'QUALIFICATION',
  INFORMATION_COLLECTION = 'INFORMATION_COLLECTION',
  KNOWLEDGE_LOOKUP = 'KNOWLEDGE_LOOKUP',
  OBJECTION_HANDLING = 'OBJECTION_HANDLING',
  LEAD_QUALIFICATION = 'LEAD_QUALIFICATION',
  APPOINTMENT_OFFER = 'APPOINTMENT_OFFER',
  FOLLOW_UP = 'FOLLOW_UP',
  CLOSING = 'CLOSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ConversationResult {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALLBACK_SCHEDULED = 'CALLBACK_SCHEDULED',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  INFORMATION_PROVIDED = 'INFORMATION_PROVIDED',
  TRANSFERRED = 'TRANSFERRED',
  HUNG_UP = 'HUNG_UP',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CreateConversationSessionDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  callId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scriptId?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateConversationStateDto {
  @ApiProperty({ enum: ConversationState })
  @IsEnum(ConversationState)
  newState: ConversationState;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class NextConversationStepDto {
  @ApiProperty()
  @IsString()
  customerInput: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: any;
}

export class ConversationSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  campaignId?: string;

  @ApiPropertyOptional()
  contactId?: string;

  @ApiPropertyOptional()
  callId?: string;

  @ApiPropertyOptional()
  scriptId?: string;

  @ApiProperty({ enum: ConversationState })
  currentState: ConversationState;

  @ApiPropertyOptional({ enum: ConversationState })
  previousState?: ConversationState;

  @ApiPropertyOptional()
  currentNodeId?: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  endedAt?: Date;

  @ApiProperty()
  lastActivityAt: Date;

  @ApiPropertyOptional()
  totalDuration?: number;

  @ApiPropertyOptional({ enum: ConversationResult })
  conversationResult?: ConversationResult;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CompleteConversationDto {
  @ApiProperty({ enum: ConversationResult })
  @IsEnum(ConversationResult)
  result: ConversationResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ConversationSessionListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ enum: ConversationState })
  @IsOptional()
  @IsEnum(ConversationState)
  state?: ConversationState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20;
}
