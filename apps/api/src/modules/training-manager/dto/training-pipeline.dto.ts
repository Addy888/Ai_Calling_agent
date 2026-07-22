import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUUID,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum TrainingPipelineStage {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  QUEUED = 'QUEUED',
  WAITING = 'WAITING',
  PREPARED = 'PREPARED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TrainingPipelineStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  PREPARING = 'PREPARING',
  PREPARED = 'PREPARED',
  QUEUED = 'QUEUED',
  WAITING = 'WAITING',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum TrainingQueueStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  WAITING = 'WAITING',
  PREPARING = 'PREPARING',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ExecutionProvider {
  LOCAL_GPU = 'LOCAL_GPU',
  GOOGLE_COLAB = 'GOOGLE_COLAB',
  RUNPOD = 'RUNPOD',
  VAST_AI = 'VAST_AI',
  AWS_SAGEMAKER = 'AWS_SAGEMAKER',
  AZURE_ML = 'AZURE_ML',
  LAMBDA_LABS = 'LAMBDA_LABS',
  PAPERSPACE = 'PAPERSPACE',
}

// DTOs
export class ResourceEstimationDto {
  @ApiProperty({ description: 'Estimated GPU memory in GB' })
  @IsNumber()
  gpuMemoryGB: number;

  @ApiProperty({ description: 'Estimated system RAM in GB' })
  @IsNumber()
  ramGB: number;

  @ApiProperty({ description: 'Estimated disk space in GB' })
  @IsNumber()
  diskSpaceGB: number;

  @ApiProperty({ description: 'Estimated CPU cores required' })
  @IsNumber()
  cpuCores: number;

  @ApiProperty({ description: 'Estimated checkpoint storage in GB' })
  @IsNumber()
  checkpointStorageGB: number;

  @ApiProperty({ description: 'Estimated training duration in hours' })
  @IsNumber()
  durationHours: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CheckpointPlanDto {
  @ApiProperty({ description: 'Checkpoint interval (steps)' })
  @IsNumber()
  @Min(1)
  checkpointInterval: number;

  @ApiProperty({ description: 'Maximum number of checkpoints to keep' })
  @IsNumber()
  @Min(1)
  maxCheckpoints: number;

  @ApiProperty({ description: 'Checkpoint naming convention' })
  @IsString()
  checkpointNaming: string;

  @ApiProperty({ description: 'Retention policy' })
  @IsString()
  retentionPolicy: string;

  @ApiProperty({ description: 'Enable auto cleanup' })
  @IsBoolean()
  autoCleanup: boolean;

  @ApiPropertyOptional({ description: 'Checkpoint path pattern' })
  @IsOptional()
  @IsString()
  pathPattern?: string;
}

export class RetryPolicyDto {
  @ApiProperty({ description: 'Maximum retry attempts' })
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries: number;

  @ApiProperty({ description: 'Retry backoff strategy' })
  @IsString()
  backoffStrategy: string;

  @ApiProperty({ description: 'Initial retry delay in seconds' })
  @IsNumber()
  initialDelaySeconds: number;

  @ApiProperty({ description: 'Maximum retry delay in seconds' })
  @IsNumber()
  maxDelaySeconds: number;

  @ApiPropertyOptional({ description: 'Retry on specific errors' })
  @IsOptional()
  @IsArray()
  retryOnErrors?: string[];
}

export class CreateTrainingPipelineDto {
  @ApiProperty({ description: 'Training session ID' })
  @IsUUID()
  trainingSessionId: string;

  @ApiProperty({ description: 'Pipeline name' })
  @IsString()
  pipelineName: string;

  @ApiProperty({ description: 'Dataset ID' })
  @IsUUID()
  datasetId: string;

  @ApiProperty({ description: 'Model registry ID' })
  @IsUUID()
  modelRegistryId: string;

  @ApiPropertyOptional({ description: 'Training configuration ID' })
  @IsOptional()
  @IsUUID()
  trainingConfigurationId?: string;

  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Execution provider' })
  @IsOptional()
  @IsEnum(ExecutionProvider)
  executionProvider?: ExecutionProvider;

  @ApiPropertyOptional({ description: 'Storage provider' })
  @IsOptional()
  @IsString()
  storageProvider?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTrainingPipelineDto {
  @ApiPropertyOptional({ description: 'Pipeline name' })
  @IsOptional()
  @IsString()
  pipelineName?: string;

  @ApiPropertyOptional({ description: 'Pipeline status' })
  @IsOptional()
  @IsEnum(TrainingPipelineStatus)
  pipelineStatus?: TrainingPipelineStatus;

  @ApiPropertyOptional({ description: 'Queue status' })
  @IsOptional()
  @IsEnum(TrainingQueueStatus)
  queueStatus?: TrainingQueueStatus;

  @ApiPropertyOptional({ description: 'Resource estimation' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceEstimationDto)
  resourceEstimation?: ResourceEstimationDto;

  @ApiPropertyOptional({ description: 'Checkpoint plan' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckpointPlanDto)
  checkpointPlan?: CheckpointPlanDto;

  @ApiPropertyOptional({ description: 'Retry policy' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;

  @ApiPropertyOptional({ description: 'Execution provider' })
  @IsOptional()
  @IsEnum(ExecutionProvider)
  executionProvider?: ExecutionProvider;

  @ApiPropertyOptional({ description: 'Storage provider' })
  @IsOptional()
  @IsString()
  storageProvider?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PrepareTrainingSessionDto {
  @ApiProperty({ description: 'Training session ID' })
  @IsUUID()
  trainingSessionId: string;

  @ApiPropertyOptional({ description: 'Skip validation' })
  @IsOptional()
  @IsBoolean()
  skipValidation?: boolean;

  @ApiPropertyOptional({ description: 'Auto-estimate resources' })
  @IsOptional()
  @IsBoolean()
  autoEstimateResources?: boolean;

  @ApiPropertyOptional({ description: 'Auto-generate checkpoint plan' })
  @IsOptional()
  @IsBoolean()
  autoGenerateCheckpointPlan?: boolean;
}

export class EstimateResourcesDto {
  @ApiProperty({ description: 'Dataset ID' })
  @IsUUID()
  datasetId: string;

  @ApiProperty({ description: 'Model registry ID' })
  @IsUUID()
  modelRegistryId: string;

  @ApiPropertyOptional({ description: 'Training configuration ID' })
  @IsOptional()
  @IsUUID()
  trainingConfigurationId?: string;

  @ApiPropertyOptional({ description: 'Batch size' })
  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Number of epochs' })
  @IsOptional()
  @IsNumber()
  epochs?: number;
}

export class GenerateCheckpointPlanDto {
  @ApiProperty({ description: 'Training duration estimate in hours' })
  @IsNumber()
  durationHours: number;

  @ApiProperty({ description: 'Total training steps' })
  @IsNumber()
  totalSteps: number;

  @ApiPropertyOptional({ description: 'Checkpoint interval preference' })
  @IsOptional()
  @IsString()
  intervalPreference?: string;

  @ApiPropertyOptional({ description: 'Storage constraints GB' })
  @IsOptional()
  @IsNumber()
  storageConstraintGB?: number;
}

export class QueuePipelineDto {
  @ApiProperty({ description: 'Pipeline ID' })
  @IsUUID()
  pipelineId: string;

  @ApiPropertyOptional({ description: 'Priority (0-10)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Dependencies (pipeline IDs)' })
  @IsOptional()
  @IsArray()
  dependencies?: string[];
}

export class PipelineValidationResponseDto {
  @ApiProperty()
  datasetValid: boolean;

  @ApiProperty()
  modelValid: boolean;

  @ApiProperty()
  configurationValid: boolean;

  @ApiProperty()
  compatibilityValid: boolean;

  @ApiProperty()
  readinessValid: boolean;

  @ApiProperty()
  workspaceValid: boolean;

  @ApiProperty()
  overallValid: boolean;

  @ApiPropertyOptional()
  errors?: string[];

  @ApiPropertyOptional()
  warnings?: string[];

  @ApiPropertyOptional()
  blockers?: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

export class PipelineTimelineItemDto {
  @ApiProperty()
  stage: TrainingPipelineStage;

  @ApiProperty()
  status: string;

  @ApiProperty()
  timestamp: Date;

  @ApiPropertyOptional()
  duration?: number;

  @ApiPropertyOptional()
  message?: string;
}

export class PipelineSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pipelineName: string;

  @ApiProperty()
  pipelineIdentifier: string;

  @ApiProperty()
  pipelineStage: TrainingPipelineStage;

  @ApiProperty()
  pipelineStatus: TrainingPipelineStatus;

  @ApiProperty()
  queueStatus: TrainingQueueStatus;

  @ApiPropertyOptional()
  queuePosition?: number;

  @ApiProperty()
  validationPassed: boolean;

  @ApiPropertyOptional()
  resourceEstimation?: ResourceEstimationDto;

  @ApiPropertyOptional()
  checkpointPlan?: CheckpointPlanDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  timeline?: PipelineTimelineItemDto[];
}

export class TrainingSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionName: string;

  @ApiProperty()
  sessionIdentifier: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  queueStatus: TrainingQueueStatus;

  @ApiProperty()
  datasetId: string;

  @ApiPropertyOptional()
  datasetVersion?: string;

  @ApiProperty()
  modelRegistryId: string;

  @ApiPropertyOptional()
  modelVersion?: string;

  @ApiPropertyOptional()
  trainingConfigurationId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  pipelines?: PipelineSummaryResponseDto[];
}
