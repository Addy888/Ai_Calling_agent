import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// ANALYSIS DTOs
// ============================================

export class AnalyzeConversationDto {
  @ApiProperty({ description: 'Dataset record ID to analyze' })
  @IsString()
  datasetRecordId: string;
}

export class ConversationScoresDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  conversationScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  professionalScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  naturalnessScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  salesScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  closingScore?: number;
}

export class SentimentAnalysisDto {
  @ApiProperty()
  @IsString()
  sentimentLabel: string; // POSITIVE, NEUTRAL, NEGATIVE

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  sentimentScore: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  details?: any;
}

// ============================================
// QUERY DTOs
// ============================================

export class ConversationQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sentimentLabel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  overallQuality?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class IntentQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  intentType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minConfidence?: number;
}

export class ObjectionQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objectionType?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  wasResolved?: boolean;
}

// ============================================
// KNOWLEDGE DTOs
// ============================================

export class CreateKnowledgeItemDto {
  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty()
  @IsString()
  answer: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  intent?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateKnowledgeItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  question?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  answer?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  intent?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class KnowledgeQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  intent?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minConfidence?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class QuestionLibraryQueryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  questionType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  askedBy?: string; // CUSTOMER, AGENT

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string = 'frequency';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ============================================
// ANALYTICS DTOs
// ============================================

export class AnalyticsPeriodDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  period?: 'day' | 'week' | 'month' | 'year' = 'week';
}

export class DashboardStatsDto {
  totalConversations: number;
  successfulConversations: number;
  qualifiedLeads: number;
  averageConversationScore: number;
  averageCallDuration: number;
  mostCommonIntent: string;
  mostCommonObjection: string;
  topPerformingResponse: string;
  conversationQualityScore: number;
}

export class IntentDistributionDto {
  intentType: string;
  count: number;
  percentage: number;
  averageConfidence: number;
}

export class ObjectionDistributionDto {
  objectionType: string;
  count: number;
  resolvedCount: number;
  resolutionRate: number;
  averageResolutionScore: number;
}

export class LeadDistributionDto {
  leadCategory: string;
  count: number;
  percentage: number;
  averageScore: number;
}

export class ConversationTrendDto {
  date: string;
  totalConversations: number;
  averageScore: number;
  successRate: number;
  qualifiedLeadsCount: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class ConversationAnalysisResponseDto {
  id: string;
  datasetRecordId: string;
  conversationScore: number;
  professionalScore: number;
  naturalnessScore: number;
  confidenceScore: number;
  salesScore: number;
  closingScore: number;
  sentimentScore: number;
  sentimentLabel: string;
  dominantEmotion: string;
  overallQuality: string;
  analysisDetails: any;
  analyzedAt: Date;
  createdAt: Date;
}

export class ConversationTimelineResponseDto {
  id: string;
  sequence: number;
  phase: string;
  startTime: number;
  endTime: number;
  duration: number;
  speaker: string;
  text: string;
  metadata: any;
}

export class LeadScoreResponseDto {
  id: string;
  leadCategory: string;
  score: number;
  confidence: number;
  factors: any;
  scoringDetails: any;
  recommendedAction: string;
}
