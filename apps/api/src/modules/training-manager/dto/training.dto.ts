import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export enum DatasetType {
  CONVERSATION = 'CONVERSATION',
  KNOWLEDGE = 'KNOWLEDGE',
  PROMPT = 'PROMPT',
  SCRIPT = 'SCRIPT',
  FAQ = 'FAQ',
  BUSINESS_RULE = 'BUSINESS_RULE',
  EVALUATION = 'EVALUATION',
  INTENT = 'INTENT',
  ENTITY = 'ENTITY',
  RESPONSE = 'RESPONSE',
}

export enum DatasetStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ValidationType {
  STRUCTURE = 'STRUCTURE',
  CONTENT = 'CONTENT',
  DUPLICATE = 'DUPLICATE',
  REFERENCE = 'REFERENCE',
  QUALITY = 'QUALITY',
  COVERAGE = 'COVERAGE',
  CONSISTENCY = 'CONSISTENCY',
  COMPREHENSIVE = 'COMPREHENSIVE',
}

export enum TrainingJobType {
  DATASET_VALIDATION = 'DATASET_VALIDATION',
  DATASET_PREPARATION = 'DATASET_PREPARATION',
  KNOWLEDGE_INDEXING = 'KNOWLEDGE_INDEXING',
  PROMPT_OPTIMIZATION = 'PROMPT_OPTIMIZATION',
  SCRIPT_VALIDATION = 'SCRIPT_VALIDATION',
  INTENT_TRAINING = 'INTENT_TRAINING',
  ENTITY_EXTRACTION = 'ENTITY_EXTRACTION',
  EVALUATION_RUN = 'EVALUATION_RUN',
  COMPREHENSIVE = 'COMPREHENSIVE',
}

export enum TrainingJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class CreateDatasetDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DatasetType })
  @IsEnum(DatasetType)
  datasetType: DatasetType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDatasetDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: DatasetStatus })
  @IsEnum(DatasetStatus)
  @IsOptional()
  status?: DatasetStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateDatasetRecordDto {
  @ApiProperty()
  @IsString()
  recordType: string;

  @ApiProperty()
  @IsObject()
  recordData: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceReference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ValidateDatasetDto {
  @ApiProperty({ enum: ValidationType })
  @IsEnum(ValidationType)
  validationType: ValidationType;
}

export class CreateTrainingJobDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  datasetId?: string;

  @ApiProperty()
  @IsString()
  jobName: string;

  @ApiProperty({ enum: TrainingJobType })
  @IsEnum(TrainingJobType)
  jobType: TrainingJobType;

  @ApiProperty()
  @IsObject()
  configuration: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  datasets?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class DatasetStatsResponseDto {
  @ApiProperty()
  totalDatasets: number;

  @ApiProperty()
  datasetsByType: Record<string, number>;

  @ApiProperty()
  datasetsByStatus: Record<string, number>;

  @ApiProperty()
  totalRecords: number;

  @ApiProperty()
  validRecords: number;

  @ApiProperty()
  invalidRecords: number;

  @ApiProperty()
  duplicateRecords: number;

  @ApiProperty()
  averageQuality: number;

  @ApiProperty()
  averageCoverage: number;
}

export class ReadinessScoreResponseDto {
  @ApiProperty()
  overallReadiness: number;

  @ApiProperty()
  knowledgeReadiness: number;

  @ApiProperty()
  conversationReadiness: number;

  @ApiProperty()
  promptReadiness: number;

  @ApiProperty()
  scriptReadiness: number;

  @ApiProperty()
  decisionReadiness: number;

  @ApiProperty()
  evaluationReadiness: number;

  @ApiProperty()
  isReady: boolean;

  @ApiProperty()
  blockers: Array<Record<string, any>>;

  @ApiProperty()
  warnings: Array<Record<string, any>>;

  @ApiProperty()
  recommendations: Array<Record<string, any>>;
}
