import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsInt, IsDateString, IsEnum, Min } from 'class-validator';
import { RuleType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateBusinessRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Rule type', enum: RuleType })
  @IsEnum(RuleType)
  ruleType: RuleType;

  @ApiProperty({ description: 'Rule category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Rule conditions as JSON object' })
  @IsObject()
  conditions: Record<string, any>;

  @ApiProperty({ description: 'Rule actions as JSON object' })
  @IsObject()
  actions: Record<string, any>;

  @ApiPropertyOptional({ description: 'Priority (higher = executed first)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is rule active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateBusinessRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Rule type', enum: RuleType })
  @IsEnum(RuleType)
  @IsOptional()
  ruleType?: RuleType;

  @ApiPropertyOptional({ description: 'Rule category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Rule conditions' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Rule actions' })
  @IsObject()
  @IsOptional()
  actions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is rule active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class EvaluateBusinessRulesDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Decision log ID' })
  @IsString()
  @IsOptional()
  decisionLogId?: string;

  @ApiProperty({ description: 'Conversation context' })
  @IsObject()
  context: Record<string, any>;

  @ApiPropertyOptional({ description: 'Detected intent' })
  @IsString()
  @IsOptional()
  intent?: string;

  @ApiPropertyOptional({ description: 'Extracted entities' })
  @IsObject()
  @IsOptional()
  entities?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BusinessRuleEvaluationResultDto {
  @ApiProperty({ description: 'Rule ID' })
  ruleId: string;

  @ApiProperty({ description: 'Rule name' })
  ruleName: string;

  @ApiProperty({ description: 'Evaluation result' })
  evaluationResult: boolean;

  @ApiPropertyOptional({ description: 'Conditions that were met' })
  conditionsMet?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Actions executed' })
  actionsExecuted?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Execution time in ms' })
  executionTime?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class BusinessRuleEvaluationSummaryDto {
  @ApiProperty({ description: 'Total rules evaluated' })
  totalRules: number;

  @ApiProperty({ description: 'Rules that passed' })
  rulesPassed: number;

  @ApiProperty({ description: 'Rules that failed' })
  rulesFailed: number;

  @ApiProperty({ description: 'Detailed results', type: [BusinessRuleEvaluationResultDto] })
  results: BusinessRuleEvaluationResultDto[];

  @ApiPropertyOptional({ description: 'Total execution time in ms' })
  totalExecutionTime?: number;
}
