import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// ENUMS
// ============================================

export enum TrainingSessionStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  QUEUED = 'QUEUED',
  WAITING = 'WAITING',
  PREPARED = 'PREPARED',
  READY = 'READY',
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

// ============================================
// REQUEST DTOs
// ============================================

export class CreateTrainingSessionDto {
  @ApiProperty({ description: 'Session name' })
  @IsString()
  sessionName: string;

  @ApiProperty({ description: 'Dataset ID' })
  @IsString()
  datasetId: string;

  @ApiPropertyOptional({ description: 'Dataset version' })
  @IsString()
  @IsOptional()
  datasetVersion?: string;

  @ApiProperty({ description: 'Model registry ID' })
  @IsString()
  modelRegistryId: string;

  @ApiPropertyOptional({ description: 'Model version' })
  @IsString()
  @IsOptional()
  modelVersion?: string;

  @ApiPropertyOptional({ description: 'Training configuration ID' })
  @IsString()
  @IsOptional()
  trainingConfigurationId?: string;

  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Training framework', default: 'PyTorch' })
  @IsString()
  @IsOptional()
  trainingFramework?: string;

  @ApiPropertyOptional({ description: 'Checkpoint interval', default: 500 })
  @IsInt()
  @Min(100)
  @IsOptional()
  checkpointInterval?: number;

  @ApiPropertyOptional({ description: 'Maximum checkpoints', default: 3 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxCheckpoints?: number;

  @ApiPropertyOptional({ description: 'Priority', default: 0 })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreatePipelineDto {
  @ApiProperty({ description: 'Training session ID' })
  @IsString()
  trainingSessionId: string;

  @ApiProperty({ description: 'Pipeline name' })
  @IsString()
  pipelineName: string;

  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsString()
  @IsOptional()
  workspaceId?: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Session name' })
  @IsString()
  @IsOptional()
  sessionName?: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: any;
}

export class UpdatePipelineDto {
  @ApiPropertyOptional({ description: 'Pipeline name' })
  @IsString()
  @IsOptional()
  pipelineName?: string;

  @ApiPropertyOptional({ description: 'Pipeline stage', enum: TrainingPipelineStage })
  @IsEnum(TrainingPipelineStage)
  @IsOptional()
  pipelineStage?: TrainingPipelineStage;

  @ApiPropertyOptional({ description: 'Pipeline status', enum: TrainingPipelineStatus })
  @IsEnum(TrainingPipelineStatus)
  @IsOptional()
  pipelineStatus?: TrainingPipelineStatus;
}

export class QueuePipelineDto {
  @ApiProperty({ description: 'Pipeline ID' })
  @IsString()
  pipelineId: string;

  @ApiPropertyOptional({ description: 'Queue position' })
  @IsInt()
  @IsOptional()
  queuePosition?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class ResourceEstimationDto {
  @ApiProperty()
  estimatedGpuMemoryGB: number;

  @ApiProperty()
  estimatedRamGB: number;

  @ApiProperty()
  estimatedDiskGB: number;

  @ApiProperty()
  estimatedCpuCores: number;

  @ApiProperty()
  estimatedDurationHours: number;

  @ApiProperty()
  estimatedCheckpointSizeGB: number;
}

export class CheckpointPlanDto {
  @ApiProperty()
  interval: number;

  @ApiProperty()
  maxCheckpoints: number;

  @ApiProperty()
  naming: string;

  @ApiProperty()
  retentionPolicy: string;

  @ApiProperty()
  autoCleanup: boolean;

  @ApiProperty()
  estimatedCheckpointSizeGB: number;

  @ApiProperty()
  totalStorageGB: number;
}

export class PipelineValidationDto {
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
  validationPassed: boolean;

  @ApiPropertyOptional()
  errorMessage?: string;
}

export class TrainingSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  workspaceId?: string;

  @ApiProperty()
  sessionName: string;

  @ApiProperty()
  sessionIdentifier: string;

  @ApiProperty()
  datasetId: string;

  @ApiPropertyOptional()
  datasetVersion?: string;

  @ApiProperty()
  modelRegistryId: string;

  @ApiPropertyOptional()
  modelVersion?: string;

  @ApiProperty({ enum: TrainingSessionStatus })
  status: TrainingSessionStatus;

  @ApiProperty({ enum: TrainingQueueStatus })
  queueStatus: TrainingQueueStatus;

  @ApiProperty()
  trainingFramework: string;

  @ApiProperty()
  checkpointInterval: number;

  @ApiProperty()
  maxCheckpoints: number;

  @ApiProperty()
  priority: number;

  @ApiPropertyOptional({ type: ResourceEstimationDto })
  resourceEstimation?: ResourceEstimationDto;

  @ApiPropertyOptional({ type: CheckpointPlanDto })
  checkpointPlan?: CheckpointPlanDto;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  pipelines?: TrainingPipelineResponseDto[];
}

export class TrainingPipelineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  trainingSessionId: string;

  @ApiProperty()
  pipelineName: string;

  @ApiProperty()
  pipelineIdentifier: string;

  @ApiProperty({ enum: TrainingPipelineStage })
  pipelineStage: TrainingPipelineStage;

  @ApiProperty({ enum: TrainingPipelineStatus })
  pipelineStatus: TrainingPipelineStatus;

  @ApiProperty({ enum: TrainingQueueStatus })
  queueStatus: TrainingQueueStatus;

  @ApiPropertyOptional()
  queuePosition?: number;

  @ApiProperty()
  datasetId: string;

  @ApiProperty()
  modelRegistryId: string;

  @ApiProperty({ type: PipelineValidationDto })
  validation: PipelineValidationDto;

  @ApiPropertyOptional({ type: ResourceEstimationDto })
  resourceEstimation?: ResourceEstimationDto;

  @ApiPropertyOptional({ type: CheckpointPlanDto })
  checkpointPlan?: CheckpointPlanDto;

  @ApiProperty()
  retryCount: number;

  @ApiProperty()
  maxRetries: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PipelineSummaryDto {
  @ApiProperty()
  totalPipelines: number;

  @ApiProperty()
  pendingPipelines: number;

  @ApiProperty()
  queuedPipelines: number;

  @ApiProperty()
  preparedPipelines: number;

  @ApiProperty()
  completedPipelines: number;

  @ApiProperty()
  failedPipelines: number;

  @ApiProperty({ type: [TrainingPipelineResponseDto] })
  recentPipelines: TrainingPipelineResponseDto[];
}
