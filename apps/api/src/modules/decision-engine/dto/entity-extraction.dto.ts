import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsInt, Min, Max } from 'class-validator';
import { EntityType } from '@prisma/client';

export class ExtractEntitiesDto {
  @ApiProperty({ description: 'Raw input text from conversation' })
  @IsString()
  rawInput: string;

  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Decision log ID' })
  @IsString()
  decisionLogId: string;

  @ApiPropertyOptional({ description: 'Previous extracted entities' })
  @IsObject()
  @IsOptional()
  previousEntities?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class EntityExtractionResultDto {
  @ApiProperty({ description: 'Entity type', enum: EntityType })
  entityType: EntityType;

  @ApiProperty({ description: 'Extracted entity value' })
  entityValue: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Start position in text' })
  startPosition?: number;

  @ApiPropertyOptional({ description: 'End position in text' })
  endPosition?: number;

  @ApiPropertyOptional({ description: 'Normalized value' })
  normalizedValue?: string;

  @ApiProperty({ description: 'Extraction method used' })
  extractionMethod: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class ExtractedEntitiesDto {
  @ApiProperty({ description: 'List of extracted entities', type: [EntityExtractionResultDto] })
  entities: EntityExtractionResultDto[];

  @ApiProperty({ description: 'Total entities extracted' })
  totalEntities: number;

  @ApiProperty({ description: 'Average confidence score' })
  averageConfidence: number;

  @ApiPropertyOptional({ description: 'Extraction metadata' })
  metadata?: Record<string, any>;
}

export class EntityStatisticsDto {
  @ApiProperty({ description: 'Entity type', enum: EntityType })
  entityType: EntityType;

  @ApiProperty({ description: 'Total count of this entity' })
  count: number;

  @ApiProperty({ description: 'Average confidence score' })
  averageConfidence: number;

  @ApiProperty({ description: 'Percentage of total entities' })
  percentage: number;
}
