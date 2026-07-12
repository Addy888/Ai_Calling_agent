import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsEnum, Min, Max } from 'class-validator';
import { IntentType, ConversationActionType, LeadQualificationLevel } from '@prisma/client';

export class EvaluateDecisionDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Raw input text' })
  @IsString()
  rawInput: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Call ID' })
  @IsString()
  @IsOptional()
  callId?: string;

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsString()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Current script node ID' })
  @IsString()
  @IsOptional()
  scriptNodeId?: string;

  @ApiPropertyOptional({ description: 'Conversation memory' })
  @IsObject()
  @IsOptional()
  conversationMemory?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Customer context' })
  @IsObject()
  @IsOptional()
  customerContext?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Campaign context' })
  @IsObject()
  @IsOptional()
  campaignContext?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class DecisionResultDto {
  @ApiProperty({ description: 'Decision log ID' })
  id: string;

  @ApiProperty({ description: 'Detected intent', enum: IntentType })
  detectedIntent: IntentType;

  @ApiProperty({ description: 'Intent confidence score' })
  @Min(0)
  @Max(1)
  intentConfidence: number;

  @ApiProperty({ description: 'Extracted entities' })
  extractedEntities: Array<{
    entityType: string;
    entityValue: string;
    confidence: number;
  }>;

  @ApiProperty({ description: 'Business rules applied' })
  businessRules: Array<{
    ruleId: string;
    ruleName: string;
    passed: boolean;
  }>;

  @ApiProperty({ description: 'Conversation action to take', enum: ConversationActionType })
  conversationAction: ConversationActionType;

  @ApiProperty({ description: 'Response plan' })
  responsePlan: {
    reason: string;
    decision: string;
    scriptNode?: string;
    knowledgeContext?: any;
    requiredVariables?: any;
    nextAction: string;
  };

  @ApiProperty({ description: 'Lead qualification', enum: LeadQualificationLevel })
  leadQualification: LeadQualificationLevel;

  @ApiProperty({ description: 'Confidence scores' })
  confidenceScores: {
    intent: number;
    knowledge: number;
    decision: number;
    conversation: number;
    overall: number;
  };

  @ApiProperty({ description: 'Overall confidence score' })
  @Min(0)
  @Max(1)
  overallConfidence: number;

  @ApiProperty({ description: 'Fallback triggered' })
  fallbackTriggered: boolean;

  @ApiPropertyOptional({ description: 'Fallback reason' })
  fallbackReason?: string;

  @ApiProperty({ description: 'Decision reason' })
  decisionReason: string;

  @ApiPropertyOptional({ description: 'Execution time in ms' })
  executionTime?: number;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;
}

export class DecisionHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Conversation ID filter' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Contact ID filter' })
  @IsString()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Campaign ID filter' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Intent filter', enum: IntentType })
  @IsEnum(IntentType)
  @IsOptional()
  intent?: IntentType;

  @ApiPropertyOptional({ description: 'Action filter', enum: ConversationActionType })
  @IsEnum(ConversationActionType)
  @IsOptional()
  action?: ConversationActionType;

  @ApiPropertyOptional({ description: 'Lead qualification filter', enum: LeadQualificationLevel })
  @IsEnum(LeadQualificationLevel)
  @IsOptional()
  leadQualification?: LeadQualificationLevel;

  @ApiPropertyOptional({ description: 'Minimum confidence filter' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Fallback triggered filter' })
  @IsBoolean()
  @IsOptional()
  fallbackTriggered?: boolean;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size' })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class DecisionMetricsDto {
  @ApiProperty({ description: 'Total decisions made' })
  totalDecisions: number;

  @ApiProperty({ description: 'Intent distribution' })
  intentDistribution: Record<string, number>;

  @ApiProperty({ description: 'Action distribution' })
  actionDistribution: Record<string, number>;

  @ApiProperty({ description: 'Lead qualification distribution' })
  leadQualificationDistribution: Record<string, number>;

  @ApiProperty({ description: 'Average confidence score' })
  averageConfidence: number;

  @ApiProperty({ description: 'Fallback rate' })
  fallbackRate: number;

  @ApiProperty({ description: 'Average execution time in ms' })
  averageExecutionTime: number;

  @ApiProperty({ description: 'Success rate' })
  successRate: number;
}
