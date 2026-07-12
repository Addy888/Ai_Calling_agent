import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsEnum, Min, Max } from 'class-validator';
import { ConfidenceScoreType } from '@prisma/client';

export class CalculateConfidenceDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Decision log ID' })
  @IsString()
  @IsOptional()
  decisionLogId?: string;

  @ApiProperty({ description: 'Score type', enum: ConfidenceScoreType })
  @IsEnum(ConfidenceScoreType)
  scoreType: ConfidenceScoreType;

  @ApiProperty({ description: 'Factors for calculation' })
  @IsObject()
  factors: Record<string, any>;

  @ApiPropertyOptional({ description: 'Custom threshold' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ConfidenceScoreResultDto {
  @ApiProperty({ description: 'Score type', enum: ConfidenceScoreType })
  scoreType: ConfidenceScoreType;

  @ApiProperty({ description: 'Calculated score (0-1)' })
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Threshold used' })
  threshold: number;

  @ApiProperty({ description: 'Whether score is above threshold' })
  isAboveThreshold: boolean;

  @ApiPropertyOptional({ description: 'Factors used in calculation' })
  factors?: Record<string, any>;

  @ApiProperty({ description: 'Calculation method' })
  calculationMethod: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class AllConfidenceScoresDto {
  @ApiProperty({ description: 'Intent confidence' })
  intent: ConfidenceScoreResultDto;

  @ApiProperty({ description: 'Knowledge confidence' })
  knowledge: ConfidenceScoreResultDto;

  @ApiProperty({ description: 'Decision confidence' })
  decision: ConfidenceScoreResultDto;

  @ApiProperty({ description: 'Conversation confidence' })
  conversation: ConfidenceScoreResultDto;

  @ApiProperty({ description: 'Overall confidence' })
  overall: ConfidenceScoreResultDto;

  @ApiProperty({ description: 'Should trigger fallback' })
  shouldTriggerFallback: boolean;

  @ApiPropertyOptional({ description: 'Lowest score type' })
  lowestScoreType?: ConfidenceScoreType;

  @ApiProperty({ description: 'Lowest score value' })
  lowestScore: number;
}

export class ConfidenceThresholdsDto {
  @ApiProperty({ description: 'Intent confidence threshold' })
  @Min(0)
  @Max(1)
  intentConfidenceThreshold: number;

  @ApiProperty({ description: 'Knowledge confidence threshold' })
  @Min(0)
  @Max(1)
  knowledgeConfidenceThreshold: number;

  @ApiProperty({ description: 'Decision confidence threshold' })
  @Min(0)
  @Max(1)
  decisionConfidenceThreshold: number;

  @ApiProperty({ description: 'Conversation confidence threshold' })
  @Min(0)
  @Max(1)
  conversationConfidenceThreshold: number;

  @ApiProperty({ description: 'Overall confidence threshold' })
  @Min(0)
  @Max(1)
  overallConfidenceThreshold: number;
}
