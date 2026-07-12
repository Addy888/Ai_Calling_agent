import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsEnum, IsInt, Min, Max } from 'class-validator';
import { FallbackReason, FallbackActionType, IntentType } from '@prisma/client';

export class TriggerFallbackDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Decision log ID' })
  @IsString()
  @IsOptional()
  decisionLogId?: string;

  @ApiProperty({ description: 'Trigger reason', enum: FallbackReason })
  @IsEnum(FallbackReason)
  triggerReason: FallbackReason;

  @ApiProperty({ description: 'Current confidence score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ description: 'Threshold that was not met' })
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold: number;

  @ApiPropertyOptional({ description: 'Original intent detected', enum: IntentType })
  @IsEnum(IntentType)
  @IsOptional()
  originalIntent?: IntentType;

  @ApiPropertyOptional({ description: 'Current recovery attempt number' })
  @IsInt()
  @Min(1)
  @IsOptional()
  recoveryAttempts?: number;

  @ApiPropertyOptional({ description: 'Conversation context' })
  @IsObject()
  @IsOptional()
  conversationContext?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class FallbackExecutionResultDto {
  @ApiProperty({ description: 'Fallback execution ID' })
  id: string;

  @ApiProperty({ description: 'Trigger reason', enum: FallbackReason })
  triggerReason: FallbackReason;

  @ApiProperty({ description: 'Fallback action taken', enum: FallbackActionType })
  fallbackAction: FallbackActionType;

  @ApiPropertyOptional({ description: 'Action parameters' })
  actionParameters?: Record<string, any>;

  @ApiProperty({ description: 'Was fallback successful' })
  wasSuccessful: boolean;

  @ApiProperty({ description: 'Recovery attempt number' })
  recoveryAttempts: number;

  @ApiProperty({ description: 'Confidence score that triggered fallback' })
  confidenceScore: number;

  @ApiProperty({ description: 'Threshold' })
  threshold: number;

  @ApiPropertyOptional({ description: 'Original intent', enum: IntentType })
  originalIntent?: IntentType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;
}

export class FallbackStrategyDto {
  @ApiProperty({ description: 'Fallback reason', enum: FallbackReason })
  reason: FallbackReason;

  @ApiProperty({ description: 'Recommended actions in order', type: [String], enum: FallbackActionType })
  recommendedActions: FallbackActionType[];

  @ApiPropertyOptional({ description: 'Max attempts before escalation' })
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Strategy parameters' })
  parameters?: Record<string, any>;
}

export class FallbackStatisticsDto {
  @ApiProperty({ description: 'Total fallback executions' })
  totalFallbacks: number;

  @ApiProperty({ description: 'Successful fallbacks' })
  successfulFallbacks: number;

  @ApiProperty({ description: 'Failed fallbacks' })
  failedFallbacks: number;

  @ApiProperty({ description: 'Success rate' })
  successRate: number;

  @ApiProperty({ description: 'Reason distribution' })
  reasonDistribution: Record<string, number>;

  @ApiProperty({ description: 'Action distribution' })
  actionDistribution: Record<string, number>;

  @ApiProperty({ description: 'Average recovery attempts' })
  averageRecoveryAttempts: number;

  @ApiProperty({ description: 'Average confidence at fallback' })
  averageConfidence: number;
}
