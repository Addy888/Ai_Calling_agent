import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';

// ============================================
// ENUMS
// ============================================

export enum EvaluationType {
  PRE_TRAINING = 'PRE_TRAINING',
  TRAINING = 'TRAINING',
  POST_TRAINING = 'POST_TRAINING',
  FINAL_MODEL = 'FINAL_MODEL',
  REGRESSION = 'REGRESSION',
  BENCHMARK = 'BENCHMARK',
  HUMAN = 'HUMAN',
}

export enum ApprovalStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_RETRAINING = 'NEEDS_RETRAINING',
  PRODUCTION_READY = 'PRODUCTION_READY',
}

export enum EvaluationDatasetType {
  VALIDATION = 'VALIDATION',
  TEST = 'TEST',
  BENCHMARK = 'BENCHMARK',
  CONVERSATION = 'CONVERSATION',
  INSTRUCTION = 'INSTRUCTION',
  CUSTOM = 'CUSTOM',
}

// ============================================
// DTOs
// ============================================

export class CreateTrainingEvaluationDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @ApiProperty({ description: 'Training Session ID' })
  @IsString()
  trainingSessionId: string;

  @ApiProperty({ description: 'Model Registry ID' })
  @IsString()
  modelRegistryId: string;

  @ApiProperty({ enum: EvaluationType })
  @IsEnum(EvaluationType)
  evaluationType: EvaluationType;

  @ApiPropertyOptional({ description: 'Evaluation dataset ID' })
  @IsString()
  @IsOptional()
  datasetId?: string;

  @ApiPropertyOptional({ description: 'Evaluation name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Evaluation configuration' })
  @IsObject()
  @IsOptional()
  configuration?: any;
}

export class UpdateTrainingEvaluationDto {
  @ApiPropertyOptional({ description: 'Overall score' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  overallScore?: number;

  @ApiPropertyOptional({ description: 'Metric summary' })
  @IsObject()
  @IsOptional()
  metricSummary?: any;

  @ApiPropertyOptional({ description: 'Benchmark summary' })
  @IsObject()
  @IsOptional()
  benchmarkSummary?: any;

  @ApiPropertyOptional({ description: 'Recommendations' })
  @IsArray()
  @IsOptional()
  recommendations?: string[];

  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Validation summary' })
  @IsObject()
  @IsOptional()
  validationSummary?: any;

  @ApiPropertyOptional({ description: 'Strengths' })
  @IsArray()
  @IsOptional()
  strengths?: string[];

  @ApiPropertyOptional({ description: 'Weaknesses' })
  @IsArray()
  @IsOptional()
  weaknesses?: string[];

  @ApiPropertyOptional({ description: 'Failed metrics' })
  @IsArray()
  @IsOptional()
  failedMetrics?: string[];

  @ApiPropertyOptional({ description: 'Warnings' })
  @IsArray()
  @IsOptional()
  warnings?: string[];
}

export class ApproveEvaluationDto {
  @ApiProperty({ description: 'Approval comments' })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiProperty({ description: 'Approved by' })
  @IsString()
  approvedBy: string;
}

export class RejectEvaluationDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Rejected by' })
  @IsString()
  rejectedBy: string;

  @ApiProperty({ description: 'Requires retraining' })
  @IsBoolean()
  @IsOptional()
  requiresRetraining?: boolean;
}

export class CompareModelsDto {
  @ApiProperty({ description: 'Model A ID' })
  @IsString()
  modelAId: string;

  @ApiProperty({ description: 'Model B ID' })
  @IsString()
  modelBId: string;

  @ApiPropertyOptional({ description: 'Comparison metrics' })
  @IsArray()
  @IsOptional()
  metrics?: string[];
}

export class ValidationRulesDto {
  @ApiProperty({ description: 'Minimum accuracy' })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumAccuracy: number;

  @ApiProperty({ description: 'Minimum F1 score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumF1: number;

  @ApiProperty({ description: 'Maximum loss' })
  @IsNumber()
  @Min(0)
  maximumLoss: number;

  @ApiProperty({ description: 'Maximum hallucination rate' })
  @IsNumber()
  @Min(0)
  @Max(1)
  maximumHallucinationRate: number;

  @ApiProperty({ description: 'Minimum conversation score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumConversationScore: number;

  @ApiProperty({ description: 'Minimum response score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumResponseScore: number;

  @ApiProperty({ description: 'Minimum knowledge score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumKnowledgeScore: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface ModelMetrics {
  // Training Metrics
  trainingLoss?: number;
  validationLoss?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  
  // LLM Metrics
  bleu?: number;
  rouge?: number;
  perplexity?: number;
  tokenAccuracy?: number;
  
  // Quality Metrics
  responseQuality?: number;
  conversationQuality?: number;
  instructionFollowing?: number;
  contextRetention?: number;
  reasoningQuality?: number;
  
  // Safety Metrics
  hallucinationRate?: number;
  factConsistency?: number;
  responseRelevance?: number;
  responseCompleteness?: number;
  languageQuality?: number;
  toneConsistency?: number;
  
  // AI Calling Agent Specific
  greetingAccuracy?: number;
  conversationFlow?: number;
  interruptionHandling?: number;
  questionAnswering?: number;
  knowledgeAccuracy?: number;
  objectionHandling?: number;
  salesConversationScore?: number;
  empathyScore?: number;
  closingScore?: number;
  callSuccessPrediction?: number;
  
  // Performance
  latency?: number;
  memoryUsage?: number;
}

export interface BenchmarkComparison {
  currentModel: ModelMetrics;
  previousModel?: ModelMetrics;
  baseModel?: ModelMetrics;
  productionModel?: ModelMetrics;
  bestModel?: ModelMetrics;
}

export interface ValidationSummary {
  passed: boolean;
  passedRules: string[];
  failedRules: string[];
  warnings: string[];
  validationDate: string;
}

export interface EvaluationReport {
  id: string;
  evaluationType: EvaluationType;
  overallScore: number;
  validationSummary: ValidationSummary;
  metrics: ModelMetrics;
  benchmarks: BenchmarkComparison;
  strengths: string[];
  weaknesses: string[];
  failedMetrics: string[];
  warnings: string[];
  recommendations: string[];
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ModelComparisonResult {
  modelA: {
    id: string;
    name: string;
    version: string;
    metrics: ModelMetrics;
  };
  modelB: {
    id: string;
    name: string;
    version: string;
    metrics: ModelMetrics;
  };
  comparison: {
    [key: string]: {
      modelA: number;
      modelB: number;
      difference: number;
      improvementPercent: number;
      regressionPercent: number;
      better: 'A' | 'B' | 'EQUAL';
    };
  };
  summary: {
    totalMetrics: number;
    modelABetter: number;
    modelBBetter: number;
    equal: number;
    overallWinner: 'A' | 'B' | 'EQUAL';
  };
}

export class EvaluationListQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ enum: EvaluationType })
  @IsOptional()
  @IsEnum(EvaluationType)
  evaluationType?: EvaluationType;

  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Training session ID' })
  @IsOptional()
  @IsString()
  trainingSessionId?: string;

  @ApiPropertyOptional({ description: 'Model registry ID' })
  @IsOptional()
  @IsString()
  modelRegistryId?: string;
}

export {
  EvaluationType as TrainingEvaluationType,
  ApprovalStatus as EvaluationApprovalStatus,
  EvaluationDatasetType as EvalDatasetType,
};
