import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsEnum, Min, Max } from 'class-validator';
import { IntentType } from '@prisma/client';

export class DetectIntentDto {
  @ApiProperty({ description: 'Raw input text from conversation' })
  @IsString()
  rawInput: string;

  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Current script node ID' })
  @IsString()
  @IsOptional()
  scriptNodeId?: string;

  @ApiPropertyOptional({ description: 'Previous conversation context' })
  @IsObject()
  @IsOptional()
  conversationContext?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class IntentDetectionResultDto {
  @ApiProperty({ description: 'Detected intent type', enum: IntentType })
  intent: IntentType;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Alternative intents with confidence scores' })
  alternativeIntents?: Array<{ intent: IntentType; confidence: number }>;

  @ApiPropertyOptional({ description: 'Context factors used in detection' })
  contextFactors?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Linguistic features extracted' })
  linguisticFeatures?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Sentiment score (-1 to 1)' })
  sentimentScore?: number;

  @ApiProperty({ description: 'Detection method used' })
  detectionMethod: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class IntentStatisticsDto {
  @ApiProperty({ description: 'Intent type', enum: IntentType })
  intent: IntentType;

  @ApiProperty({ description: 'Total count of this intent' })
  count: number;

  @ApiProperty({ description: 'Average confidence score' })
  averageConfidence: number;

  @ApiProperty({ description: 'Percentage of total intents' })
  percentage: number;
}
