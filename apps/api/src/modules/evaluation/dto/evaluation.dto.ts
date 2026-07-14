import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EvaluationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum LeadCategory {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALLBACK = 'CALLBACK',
  WRONG_NUMBER = 'WRONG_NUMBER',
  DO_NOT_CALL = 'DO_NOT_CALL',
}

export class EvaluateConversationDto {
  @ApiProperty({ description: 'Conversation ID to evaluate' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;
}

export class ConversationScoringDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  greetingScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  conversationFlowScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  questionQualityScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  answerRelevanceScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  closingQualityScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  customerExperienceScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  strengths?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  weaknesses?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ScriptEvaluationDto {
  @ApiProperty()
  @IsBoolean()
  correctScriptUsed: boolean;

  @ApiProperty()
  @IsBoolean()
  correctBranchFollowed: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  missingSteps?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  invalidSteps?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  ruleViolations?: any[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class KnowledgeEvaluationDto {
  @ApiProperty()
  @IsNumber()
  knowledgeRetrieved: number;

  @ApiProperty()
  @IsNumber()
  relevantKnowledge: number;

  @ApiProperty()
  @IsNumber()
  irrelevantKnowledge: number;

  @ApiProperty()
  @IsNumber()
  missingKnowledge: number;

  @ApiProperty()
  @IsNumber()
  invalidKnowledgeUsage: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  averageConfidence?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracyScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  relevanceScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  knowledgeGaps?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class DecisionEvaluationDto {
  @ApiProperty()
  @IsNumber()
  totalDecisions: number;

  @ApiProperty()
  @IsNumber()
  correctIntents: number;

  @ApiProperty()
  @IsNumber()
  incorrectIntents: number;

  @ApiProperty()
  @IsNumber()
  correctEntities: number;

  @ApiProperty()
  @IsNumber()
  incorrectEntities: number;

  @ApiProperty()
  @IsNumber()
  correctActions: number;

  @ApiProperty()
  @IsNumber()
  incorrectActions: number;

  @ApiProperty()
  @IsNumber()
  fallbacksUsed: number;

  @ApiProperty()
  @IsNumber()
  escalationsTriggered: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  intentAccuracy: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  entityAccuracy: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  actionAccuracy: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallAccuracy: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class LeadEvaluationDto {
  @ApiProperty({ enum: LeadCategory })
  @IsEnum(LeadCategory)
  leadCategory: LeadCategory;

  @ApiPropertyOptional({ enum: LeadCategory })
  @IsOptional()
  @IsEnum(LeadCategory)
  expectedCategory?: LeadCategory;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualificationAccuracy: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  categoryConfidence: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  qualificationFactors?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  missingInformation?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  contradictions?: any[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class MemoryEvaluationDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  contextRetentionScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  previousAnswersScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  sessionMemoryScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  continuityScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  missingContext?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  contextErrors?: any[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class BusinessRuleEvaluationDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  companyPolicyScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  campaignRuleScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  promptRuleScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  scriptRuleScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  knowledgeRuleScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  permissionRuleScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  violations?: any[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SafetyEvaluationDto {
  @ApiProperty()
  @IsNumber()
  unsafeResponses: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  hallucinationRisk: number;

  @ApiProperty()
  @IsNumber()
  policyViolations: number;

  @ApiProperty()
  @IsNumber()
  missingInformation: number;

  @ApiProperty()
  @IsNumber()
  invalidDecisions: number;

  @ApiProperty()
  @IsNumber()
  lowConfidenceCount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  safetyScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  risks?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ConfidenceMetricsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  intentConfidence: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  knowledgeConfidence: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  decisionConfidence: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  conversationConfidence: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  overallConfidence: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  lowConfidencePoints?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  confidenceDistribution?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class EvaluationReportDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  conversationId: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  conversationScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  scriptComplianceScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  knowledgeAccuracyScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  decisionAccuracyScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  leadQualityScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  memoryUsageScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  businessRuleScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  safetyScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ enum: EvaluationStatus })
  @IsEnum(EvaluationStatus)
  evaluationStatus: EvaluationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  issues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  recommendations?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiProperty()
  evaluatedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => ConversationScoringDto)
  conversationScoring?: ConversationScoringDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => ScriptEvaluationDto)
  scriptEvaluation?: ScriptEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => KnowledgeEvaluationDto)
  knowledgeEvaluation?: KnowledgeEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => DecisionEvaluationDto)
  decisionEvaluation?: DecisionEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => LeadEvaluationDto)
  leadEvaluation?: LeadEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => MemoryEvaluationDto)
  memoryEvaluation?: MemoryEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => BusinessRuleEvaluationDto)
  businessRuleEvaluation?: BusinessRuleEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => SafetyEvaluationDto)
  safetyEvaluation?: SafetyEvaluationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => ConfidenceMetricsDto)
  confidenceMetrics?: ConfidenceMetricsDto;
}

export class EvaluationConfigurationDto {
  @ApiProperty()
  @IsBoolean()
  enableAutoEvaluation: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumScoreThreshold: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  hallucinationThreshold: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  scriptComplianceWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  knowledgeAccuracyWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  decisionAccuracyWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  conversationQualityWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  leadQualityWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  safetyWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  businessRuleWeight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  memoryWeight: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateEvaluationConfigurationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableAutoEvaluation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumScoreThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  hallucinationThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  scriptComplianceWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  knowledgeAccuracyWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  decisionAccuracyWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  conversationQualityWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  leadQualityWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  safetyWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  businessRuleWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  memoryWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class EvaluationAnalyticsDto {
  @ApiProperty()
  date: Date;

  @ApiProperty()
  @IsNumber()
  totalEvaluations: number;

  @ApiProperty()
  @IsNumber()
  averageScore: number;

  @ApiProperty()
  @IsNumber()
  averageConversationScore: number;

  @ApiProperty()
  @IsNumber()
  averageScriptScore: number;

  @ApiProperty()
  @IsNumber()
  averageKnowledgeScore: number;

  @ApiProperty()
  @IsNumber()
  averageDecisionScore: number;

  @ApiProperty()
  @IsNumber()
  averageLeadScore: number;

  @ApiProperty()
  @IsNumber()
  averageSafetyScore: number;

  @ApiProperty()
  @IsNumber()
  averageConfidence: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  topIssues?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  commonFailures?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}
