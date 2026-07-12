import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { LeadQualificationLevel } from '@prisma/client';

export class QualifyLeadDto {
  @ApiProperty({ description: 'Contact ID' })
  @IsString()
  contactId: string;

  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Decision log ID' })
  @IsString()
  @IsOptional()
  decisionLogId?: string;

  @ApiProperty({ description: 'Qualification factors' })
  @IsObject()
  qualificationFactors: {
    intent?: string;
    budget?: string;
    timeline?: string;
    interest?: number;
    engagement?: number;
    responseQuality?: number;
    informationProvided?: string[];
    conversationLength?: number;
    previousInteractions?: number;
  };

  @ApiPropertyOptional({ description: 'Previous qualification level' })
  @IsEnum(LeadQualificationLevel)
  @IsOptional()
  previousQualification?: LeadQualificationLevel;

  @ApiPropertyOptional({ description: 'Custom scoring weights' })
  @IsObject()
  @IsOptional()
  customWeights?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class LeadQualificationResultDto {
  @ApiProperty({ description: 'Lead qualification level', enum: LeadQualificationLevel })
  qualification: LeadQualificationLevel;

  @ApiProperty({ description: 'Lead score (0-100)' })
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ description: 'Qualification factors used' })
  qualificationFactors: Record<string, any>;

  @ApiPropertyOptional({ description: 'Qualification rules applied' })
  qualificationRules?: Array<{
    ruleId: string;
    ruleName: string;
    passed: boolean;
    impact: number;
  }>;

  @ApiPropertyOptional({ description: 'Previous qualification level' })
  previousQualification?: LeadQualificationLevel;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ description: 'Recommended action' })
  recommendedAction: string;

  @ApiPropertyOptional({ description: 'Suggested follow-up date' })
  followUpDate?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class LeadStatusQueryDto {
  @ApiPropertyOptional({ description: 'Contact ID filter' })
  @IsString()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Qualification level filter', enum: LeadQualificationLevel })
  @IsEnum(LeadQualificationLevel)
  @IsOptional()
  qualification?: LeadQualificationLevel;

  @ApiPropertyOptional({ description: 'Minimum score filter' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minScore?: number;

  @ApiPropertyOptional({ description: 'Maximum score filter' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Follow-up date from' })
  @IsDateString()
  @IsOptional()
  followUpFrom?: string;

  @ApiPropertyOptional({ description: 'Follow-up date to' })
  @IsDateString()
  @IsOptional()
  followUpTo?: string;

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

export class LeadQualificationStatisticsDto {
  @ApiProperty({ description: 'Total leads' })
  totalLeads: number;

  @ApiProperty({ description: 'Qualification distribution' })
  qualificationDistribution: Record<string, number>;

  @ApiProperty({ description: 'Average lead score' })
  averageScore: number;

  @ApiProperty({ description: 'Hot leads count' })
  hotLeadsCount: number;

  @ApiProperty({ description: 'Warm leads count' })
  warmLeadsCount: number;

  @ApiProperty({ description: 'Cold leads count' })
  coldLeadsCount: number;

  @ApiProperty({ description: 'Conversion rate' })
  conversionRate: number;

  @ApiProperty({ description: 'Average qualification confidence' })
  averageConfidence: number;
}
