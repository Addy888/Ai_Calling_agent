import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsJSON,
  IsUUID,
  Min,
  Max,
  IsObject,
} from 'class-validator';

enum TrainingStrategyType {
  SUPERVISED_FINE_TUNING = 'SUPERVISED_FINE_TUNING',
  INSTRUCTION_TUNING = 'INSTRUCTION_TUNING',
  CONVERSATION_FINE_TUNING = 'CONVERSATION_FINE_TUNING',
  DOMAIN_ADAPTATION = 'DOMAIN_ADAPTATION',
  MULTI_TASK_LEARNING = 'MULTI_TASK_LEARNING',
  CONTINUAL_LEARNING = 'CONTINUAL_LEARNING',
  CURRICULUM_LEARNING = 'CURRICULUM_LEARNING',
  MULTI_STAGE_FINE_TUNING = 'MULTI_STAGE_FINE_TUNING',
  ADAPTER_BASED_TRAINING = 'ADAPTER_BASED_TRAINING',
  CUSTOM_STRATEGY = 'CUSTOM_STRATEGY',
}

enum PipelineType {
  SINGLE_STAGE = 'SINGLE_STAGE',
  MULTI_STAGE = 'MULTI_STAGE',
  SEQUENTIAL_TRAINING = 'SEQUENTIAL_TRAINING',
  PARALLEL_DATASET_PREPARATION = 'PARALLEL_DATASET_PREPARATION',
  HYBRID_STRATEGY = 'HYBRID_STRATEGY',
}

enum SamplingStrategy {
  RANDOM = 'RANDOM',
  SEQUENTIAL = 'SEQUENTIAL',
  WEIGHTED = 'WEIGHTED',
  BALANCED = 'BALANCED',
  CURRICULUM = 'CURRICULUM',
  ADAPTIVE = 'ADAPTIVE',
}

enum LossFunction {
  CROSS_ENTROPY = 'CROSS_ENTROPY',
  LABEL_SMOOTHING = 'LABEL_SMOOTHING',
  WEIGHTED_LOSS = 'WEIGHTED_LOSS',
  CUSTOM_LOSS = 'CUSTOM_LOSS',
}

enum RollbackStrategy {
  LAST_CHECKPOINT = 'LAST_CHECKPOINT',
  BEST_CHECKPOINT = 'BEST_CHECKPOINT',
  SPECIFIC_CHECKPOINT = 'SPECIFIC_CHECKPOINT',
  NO_ROLLBACK = 'NO_ROLLBACK',
}

enum AbortPolicy {
  MANUAL = 'MANUAL',
  AUTOMATIC_ON_ERROR = 'AUTOMATIC_ON_ERROR',
  AUTOMATIC_ON_METRIC_THRESHOLD = 'AUTOMATIC_ON_METRIC_THRESHOLD',
  NEVER = 'NEVER',
}

enum TrainingStrategyStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  VALIDATED = 'VALIDATED',
  ARCHIVED = 'ARCHIVED',
  DEPRECATED = 'DEPRECATED',
}

export class CreateTrainingStrategyDto {
  @ApiProperty({ description: 'Strategy name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Strategy description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Fine-tuning configuration ID' })
  @IsOptional()
  @IsUUID()
  fineTuningConfigId?: string;

  @ApiPropertyOptional({ description: 'Hyperparameter configuration ID' })
  @IsOptional()
  @IsUUID()
  hyperparameterConfigId?: string;

  @ApiProperty({
    description: 'Training strategy type',
    enum: TrainingStrategyType,
    default: TrainingStrategyType.SUPERVISED_FINE_TUNING,
  })
  @IsEnum(TrainingStrategyType)
  strategyType: TrainingStrategyType;

  @ApiProperty({
    description: 'Pipeline type',
    enum: PipelineType,
    default: PipelineType.SINGLE_STAGE,
  })
  @IsEnum(PipelineType)
  pipelineType: PipelineType;

  // Objectives
  @ApiProperty({ description: 'Primary objective for training' })
  @IsString()
  primaryObjective: string;

  @ApiPropertyOptional({ description: 'Secondary objective for training' })
  @IsOptional()
  @IsString()
  secondaryObjective?: string;

  @ApiPropertyOptional({ description: 'Conversation objective' })
  @IsOptional()
  @IsString()
  conversationObjective?: string;

  @ApiPropertyOptional({ description: 'Instruction objective' })
  @IsOptional()
  @IsString()
  instructionObjective?: string;

  @ApiPropertyOptional({ description: 'Response quality objective' })
  @IsOptional()
  @IsString()
  responseQualityObjective?: string;

  @ApiPropertyOptional({ description: 'Knowledge retention objective' })
  @IsOptional()
  @IsString()
  knowledgeRetentionObjective?: string;

  // Dataset Strategy
  @ApiPropertyOptional({ description: 'Primary dataset ID' })
  @IsOptional()
  @IsUUID()
  primaryDatasetId?: string;

  @ApiPropertyOptional({ description: 'Secondary dataset ID' })
  @IsOptional()
  @IsUUID()
  secondaryDatasetId?: string;

  @ApiPropertyOptional({ description: 'Validation dataset ID' })
  @IsOptional()
  @IsUUID()
  validationDatasetId?: string;

  @ApiPropertyOptional({ description: 'Dataset priority configuration' })
  @IsOptional()
  @IsObject()
  datasetPriority?: any;

  @ApiPropertyOptional({ description: 'Dataset weight configuration' })
  @IsOptional()
  @IsObject()
  datasetWeight?: any;

  @ApiPropertyOptional({
    description: 'Dataset mixing ratio',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  datasetMixingRatio?: number;

  @ApiProperty({
    description: 'Sampling strategy',
    enum: SamplingStrategy,
    default: SamplingStrategy.RANDOM,
  })
  @IsEnum(SamplingStrategy)
  samplingStrategy: SamplingStrategy;

  @ApiPropertyOptional({
    description: 'Shuffle dataset during training',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  shuffleDataset?: boolean;

  @ApiPropertyOptional({ description: 'Curriculum order configuration' })
  @IsOptional()
  @IsObject()
  curriculumOrder?: any;

  // Loss Function
  @ApiProperty({
    description: 'Loss function',
    enum: LossFunction,
    default: LossFunction.CROSS_ENTROPY,
  })
  @IsEnum(LossFunction)
  lossFunction: LossFunction;

  @ApiPropertyOptional({ description: 'Loss function configuration' })
  @IsOptional()
  @IsObject()
  lossFunctionConfig?: any;

  @ApiPropertyOptional({
    description: 'Label smoothing factor',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  labelSmoothing?: number;

  @ApiPropertyOptional({
    description: 'Use weighted loss',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  weightedLoss?: boolean;

  @ApiPropertyOptional({ description: 'Custom loss configuration' })
  @IsOptional()
  @IsObject()
  customLossConfig?: any;

  // Training Flow
  @ApiPropertyOptional({ description: 'Stage order configuration' })
  @IsOptional()
  @IsObject()
  stageOrder?: any;

  @ApiPropertyOptional({ description: 'Dataset assignment configuration' })
  @IsOptional()
  @IsObject()
  datasetAssignment?: any;

  @ApiPropertyOptional({ description: 'Model assignment configuration' })
  @IsOptional()
  @IsObject()
  modelAssignment?: any;

  @ApiPropertyOptional({
    description: 'Enable evaluation between stages',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  evaluationBetweenStages?: boolean;

  @ApiPropertyOptional({
    description: 'Enable checkpoint between stages',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  checkpointBetweenStages?: boolean;

  @ApiPropertyOptional({
    description: 'Enable resume support',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  resumeSupport?: boolean;

  // Evaluation Strategy
  @ApiPropertyOptional({
    description: 'Evaluation interval (in steps)',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  evaluationInterval?: number;

  @ApiPropertyOptional({
    description: 'Evaluation frequency (in steps)',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  evaluationFrequency?: number;

  @ApiPropertyOptional({
    description: 'Automatic best model selection',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  automaticBestModelSelection?: boolean;

  @ApiPropertyOptional({
    description: 'Enable early evaluation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  earlyEvaluation?: boolean;

  @ApiPropertyOptional({ description: 'Evaluation metrics configuration' })
  @IsOptional()
  @IsObject()
  evaluationMetrics?: any;

  // Failure Strategy
  @ApiPropertyOptional({
    description: 'Retry count on failure',
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryCount?: number;

  @ApiPropertyOptional({
    description: 'Resume from checkpoint on failure',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  resumeFromCheckpoint?: boolean;

  @ApiProperty({
    description: 'Rollback strategy',
    enum: RollbackStrategy,
    default: RollbackStrategy.LAST_CHECKPOINT,
  })
  @IsEnum(RollbackStrategy)
  rollbackStrategy: RollbackStrategy;

  @ApiProperty({
    description: 'Abort policy',
    enum: AbortPolicy,
    default: AbortPolicy.MANUAL,
  })
  @IsEnum(AbortPolicy)
  abortPolicy: AbortPolicy;

  @ApiPropertyOptional({
    description: 'Enable failure notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  failureNotificationEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Failure notification configuration' })
  @IsOptional()
  @IsObject()
  failureNotificationConfig?: any;

  // Metadata
  @ApiPropertyOptional({ description: 'Strategy tags' })
  @IsOptional()
  @IsObject()
  tags?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateTrainingStrategyDto {
  @ApiPropertyOptional({ description: 'Strategy name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Strategy description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Fine-tuning configuration ID' })
  @IsOptional()
  @IsUUID()
  fineTuningConfigId?: string;

  @ApiPropertyOptional({ description: 'Hyperparameter configuration ID' })
  @IsOptional()
  @IsUUID()
  hyperparameterConfigId?: string;

  @ApiPropertyOptional({
    description: 'Training strategy type',
    enum: TrainingStrategyType,
  })
  @IsOptional()
  @IsEnum(TrainingStrategyType)
  strategyType?: TrainingStrategyType;

  @ApiPropertyOptional({
    description: 'Pipeline type',
    enum: PipelineType,
  })
  @IsOptional()
  @IsEnum(PipelineType)
  pipelineType?: PipelineType;

  @ApiPropertyOptional({ description: 'Primary objective for training' })
  @IsOptional()
  @IsString()
  primaryObjective?: string;

  @ApiPropertyOptional({ description: 'Secondary objective for training' })
  @IsOptional()
  @IsString()
  secondaryObjective?: string;

  @ApiPropertyOptional({ description: 'Conversation objective' })
  @IsOptional()
  @IsString()
  conversationObjective?: string;

  @ApiPropertyOptional({ description: 'Instruction objective' })
  @IsOptional()
  @IsString()
  instructionObjective?: string;

  @ApiPropertyOptional({ description: 'Response quality objective' })
  @IsOptional()
  @IsString()
  responseQualityObjective?: string;

  @ApiPropertyOptional({ description: 'Knowledge retention objective' })
  @IsOptional()
  @IsString()
  knowledgeRetentionObjective?: string;

  @ApiPropertyOptional({ description: 'Primary dataset ID' })
  @IsOptional()
  @IsUUID()
  primaryDatasetId?: string;

  @ApiPropertyOptional({ description: 'Secondary dataset ID' })
  @IsOptional()
  @IsUUID()
  secondaryDatasetId?: string;

  @ApiPropertyOptional({ description: 'Validation dataset ID' })
  @IsOptional()
  @IsUUID()
  validationDatasetId?: string;

  @ApiPropertyOptional({ description: 'Dataset priority configuration' })
  @IsOptional()
  @IsObject()
  datasetPriority?: any;

  @ApiPropertyOptional({ description: 'Dataset weight configuration' })
  @IsOptional()
  @IsObject()
  datasetWeight?: any;

  @ApiPropertyOptional({ description: 'Dataset mixing ratio' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  datasetMixingRatio?: number;

  @ApiPropertyOptional({
    description: 'Sampling strategy',
    enum: SamplingStrategy,
  })
  @IsOptional()
  @IsEnum(SamplingStrategy)
  samplingStrategy?: SamplingStrategy;

  @ApiPropertyOptional({ description: 'Shuffle dataset during training' })
  @IsOptional()
  @IsBoolean()
  shuffleDataset?: boolean;

  @ApiPropertyOptional({ description: 'Curriculum order configuration' })
  @IsOptional()
  @IsObject()
  curriculumOrder?: any;

  @ApiPropertyOptional({
    description: 'Loss function',
    enum: LossFunction,
  })
  @IsOptional()
  @IsEnum(LossFunction)
  lossFunction?: LossFunction;

  @ApiPropertyOptional({ description: 'Loss function configuration' })
  @IsOptional()
  @IsObject()
  lossFunctionConfig?: any;

  @ApiPropertyOptional({ description: 'Label smoothing factor' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  labelSmoothing?: number;

  @ApiPropertyOptional({ description: 'Use weighted loss' })
  @IsOptional()
  @IsBoolean()
  weightedLoss?: boolean;

  @ApiPropertyOptional({ description: 'Custom loss configuration' })
  @IsOptional()
  @IsObject()
  customLossConfig?: any;

  @ApiPropertyOptional({ description: 'Stage order configuration' })
  @IsOptional()
  @IsObject()
  stageOrder?: any;

  @ApiPropertyOptional({ description: 'Dataset assignment configuration' })
  @IsOptional()
  @IsObject()
  datasetAssignment?: any;

  @ApiPropertyOptional({ description: 'Model assignment configuration' })
  @IsOptional()
  @IsObject()
  modelAssignment?: any;

  @ApiPropertyOptional({ description: 'Enable evaluation between stages' })
  @IsOptional()
  @IsBoolean()
  evaluationBetweenStages?: boolean;

  @ApiPropertyOptional({ description: 'Enable checkpoint between stages' })
  @IsOptional()
  @IsBoolean()
  checkpointBetweenStages?: boolean;

  @ApiPropertyOptional({ description: 'Enable resume support' })
  @IsOptional()
  @IsBoolean()
  resumeSupport?: boolean;

  @ApiPropertyOptional({ description: 'Evaluation interval (in steps)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  evaluationInterval?: number;

  @ApiPropertyOptional({ description: 'Evaluation frequency (in steps)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  evaluationFrequency?: number;

  @ApiPropertyOptional({ description: 'Automatic best model selection' })
  @IsOptional()
  @IsBoolean()
  automaticBestModelSelection?: boolean;

  @ApiPropertyOptional({ description: 'Enable early evaluation' })
  @IsOptional()
  @IsBoolean()
  earlyEvaluation?: boolean;

  @ApiPropertyOptional({ description: 'Evaluation metrics configuration' })
  @IsOptional()
  @IsObject()
  evaluationMetrics?: any;

  @ApiPropertyOptional({ description: 'Retry count on failure' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryCount?: number;

  @ApiPropertyOptional({ description: 'Resume from checkpoint on failure' })
  @IsOptional()
  @IsBoolean()
  resumeFromCheckpoint?: boolean;

  @ApiPropertyOptional({
    description: 'Rollback strategy',
    enum: RollbackStrategy,
  })
  @IsOptional()
  @IsEnum(RollbackStrategy)
  rollbackStrategy?: RollbackStrategy;

  @ApiPropertyOptional({
    description: 'Abort policy',
    enum: AbortPolicy,
  })
  @IsOptional()
  @IsEnum(AbortPolicy)
  abortPolicy?: AbortPolicy;

  @ApiPropertyOptional({ description: 'Enable failure notification' })
  @IsOptional()
  @IsBoolean()
  failureNotificationEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Failure notification configuration' })
  @IsOptional()
  @IsObject()
  failureNotificationConfig?: any;

  @ApiPropertyOptional({
    description: 'Strategy status',
    enum: TrainingStrategyStatus,
  })
  @IsOptional()
  @IsEnum(TrainingStrategyStatus)
  status?: TrainingStrategyStatus;

  @ApiPropertyOptional({ description: 'Strategy tags' })
  @IsOptional()
  @IsObject()
  tags?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ValidateStrategyDto {
  @ApiProperty({ description: 'Strategy ID to validate' })
  @IsUUID()
  strategyId: string;
}

export {
  TrainingStrategyType,
  PipelineType,
  SamplingStrategy,
  LossFunction,
  RollbackStrategy,
  AbortPolicy,
  TrainingStrategyStatus,
};
