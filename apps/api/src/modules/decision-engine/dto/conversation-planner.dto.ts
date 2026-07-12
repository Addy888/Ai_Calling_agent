import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ConversationActionType, IntentType } from '@prisma/client';

export class PlanConversationDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Detected intent', enum: IntentType })
  @IsEnum(IntentType)
  intent: IntentType;

  @ApiProperty({ description: 'Extracted entities' })
  @IsObject()
  entities: Record<string, any>;

  @ApiPropertyOptional({ description: 'Current script node ID' })
  @IsString()
  @IsOptional()
  currentNodeId?: string;

  @ApiPropertyOptional({ description: 'Conversation memory' })
  @IsObject()
  @IsOptional()
  conversationMemory?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Business rules results' })
  @IsObject()
  @IsOptional()
  businessRulesResults?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Knowledge search results' })
  @IsObject()
  @IsOptional()
  knowledgeResults?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class ConversationPlanDto {
  @ApiProperty({ description: 'Next conversation action', enum: ConversationActionType })
  action: ConversationActionType;

  @ApiPropertyOptional({ description: 'Action parameters' })
  actionParameters?: {
    question?: string;
    searchQuery?: string;
    clarification?: string;
    nodeId?: string;
    followUpDate?: Date;
  };

  @ApiProperty({ description: 'Should continue conversation' })
  shouldContinue: boolean;

  @ApiProperty({ description: 'Should end conversation' })
  shouldEndConversation: boolean;

  @ApiProperty({ description: 'Escalation required' })
  escalationRequired: boolean;

  @ApiPropertyOptional({ description: 'Current script node ID' })
  currentNodeId?: string;

  @ApiPropertyOptional({ description: 'Next script node ID' })
  nextNodeId?: string;

  @ApiProperty({ description: 'Reasoning steps' })
  reasoningSteps: Array<{
    step: number;
    description: string;
    outcome: string;
  }>;

  @ApiPropertyOptional({ description: 'Alternative actions' })
  alternativeActions?: Array<{
    action: ConversationActionType;
    priority: number;
    reason: string;
  }>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class ResponsePlanDto {
  @ApiProperty({ description: 'Decision reason' })
  reason: string;

  @ApiProperty({ description: 'Decision summary' })
  decision: string;

  @ApiPropertyOptional({ description: 'Associated script node' })
  scriptNode?: string;

  @ApiPropertyOptional({ description: 'Knowledge context from RAG' })
  knowledgeContext?: {
    sources: string[];
    relevance: number;
    content: string;
  };

  @ApiPropertyOptional({ description: 'Required variables for response' })
  requiredVariables?: Record<string, any>;

  @ApiProperty({ description: 'Next action to take' })
  nextAction: string;

  @ApiPropertyOptional({ description: 'Action priority' })
  actionPriority?: number;

  @ApiPropertyOptional({ description: 'Additional instructions' })
  instructions?: string[];

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, any>;
}
