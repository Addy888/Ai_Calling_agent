import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export enum TrainingProfile {
  FAST_TRAINING = 'FAST_TRAINING',
  BALANCED = 'BALANCED',
  HIGH_ACCURACY = 'HIGH_ACCURACY',
  LOW_MEMORY = 'LOW_MEMORY',
  PRODUCTION = 'PRODUCTION',
  CUSTOM = 'CUSTOM',
}

export enum OptimizerType {
  ADAMW = 'ADAMW',
  ADAM = 'ADAM',
  SGD = 'SGD',
  ADAFACTOR = 'ADAFACTOR',
  LION = 'LION',
  RMSPROP = 'RMSPROP',
}

export enum LRSchedulerType {
  LINEAR = 'LINEAR',
  COSINE = 'COSINE',
  COSINE_WITH_RESTARTS = 'COSINE_WITH_RESTARTS',
  POLYNOMIAL = 'POLYNOMIAL',
  CONSTANT = 'CONSTANT',
  CONSTANT_WITH_WARMUP = 'CONSTANT_WITH_WARMUP',
  REDUCE_ON_PLATEAU = 'REDUCE_ON_PLATEAU',
}

export enum HyperparameterConfigStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  VALIDATED = 'VALIDATED',
  ARCHIVED = 'ARCHIVED',
  DEPRECATED = 'DEPRECATED',
}

export class CreateHyperparameterConfigDto {
  @ApiProperty({ description: 'Configuration name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Associated fine-tuning configuration ID' })
  @IsString()
  @IsOptional()
  fineTuningConfigId?: string;

  @ApiPropertyOptional({ enum: TrainingProfile, default: TrainingProfile.BALANCED })
  @IsEnum(TrainingProfile)
  @IsOptional()
  trainingProfile?: TrainingProfile;

  // Training Parameters
  @ApiPropertyOptional({ description: 'Number of training epochs', default: 3, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  epochs?: number;

  @ApiPropertyOptional({ description: 'Batch size', default: 8, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Micro batch size' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  microBatchSize?: number;

  @ApiPropertyOptional({ description: 'Gradient accumulation steps', default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  gradientAccumulationSteps?: number;

  @ApiPropertyOptional({ description: 'Learning rate', default: 0.0002 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  learningRate?: number;

  @ApiPropertyOptional({ description: 'Weight decay', default: 0.01 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightDecay?: number;

  @ApiPropertyOptional({ description: 'Warmup ratio (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  warmupRatio?: number;

  @ApiPropertyOptional({ description: 'Warmup steps' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  warmupSteps?: number;

  @ApiPropertyOptional({ description: 'Maximum training steps' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSteps?: number;

  @ApiPropertyOptional({ description: 'Maximum sequence length', default: 512 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSequenceLength?: number;

  @ApiPropertyOptional({ description: 'Random seed', default: 42 })
  @IsNumber()
  @IsOptional()
  randomSeed?: number;

  @ApiPropertyOptional({ description: 'Gradient clipping value' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  gradientClipping?: number;

  // Optimizer & Scheduler
  @ApiPropertyOptional({ enum: OptimizerType, default: OptimizerType.ADAMW })
  @IsEnum(OptimizerType)
  @IsOptional()
  optimizer?: OptimizerType;

  @ApiPropertyOptional({ description: 'Optimizer configuration', type: 'object' })
  @IsObject()
  @IsOptional()
  optimizerConfig?: Record<string, any>;

  @ApiPropertyOptional({ enum: LRSchedulerType, default: LRSchedulerType.LINEAR })
  @IsEnum(LRSchedulerType)
  @IsOptional()
  scheduler?: LRSchedulerType;

  @ApiPropertyOptional({ description: 'Scheduler configuration', type: 'object' })
  @IsObject()
  @IsOptional()
  schedulerConfig?: Record<string, any>;

  // Precision & Memory
  @ApiPropertyOptional({ description: 'Precision type', default: 'FP32' })
  @IsString()
  @IsOptional()
  precision?: string;

  @ApiPropertyOptional({ description: 'Enable gradient checkpointing', default: false })
  @IsBoolean()
  @IsOptional()
  gradientCheckpointing?: boolean;

  @ApiPropertyOptional({ description: 'Enable flash attention', default: false })
  @IsBoolean()
  @IsOptional()
  flashAttention?: boolean;

  @ApiPropertyOptional({ description: 'Enable CPU offloading', default: false })
  @IsBoolean()
  @IsOptional()
  cpuOffloading?: boolean;

  @ApiPropertyOptional({ description: 'Enable mixed precision', default: false })
  @IsBoolean()
  @IsOptional()
  mixedPrecision?: boolean;

  @ApiPropertyOptional({ description: 'Enable activation checkpointing', default: false })
  @IsBoolean()
  @IsOptional()
  activationCheckpointing?: boolean;

  // Early Stopping
  @ApiPropertyOptional({ description: 'Enable early stopping', default: false })
  @IsBoolean()
  @IsOptional()
  earlyStoppingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Early stopping patience', default: 3 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  earlyStoppingPatience?: number;

  @ApiPropertyOptional({ description: 'Early stopping minimum delta', default: 0.001 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  earlyStoppingMinDelta?: number;

  @ApiPropertyOptional({ description: 'Restore best model on early stop', default: true })
  @IsBoolean()
  @IsOptional()
  restoreBestModel?: boolean;

  // Checkpoint Strategy
  @ApiPropertyOptional({ description: 'Save checkpoint every N steps', default: 500 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  saveEveryNSteps?: number;

  @ApiPropertyOptional({ description: 'Maximum checkpoints to keep', default: 3 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maximumCheckpoints?: number;

  @ApiPropertyOptional({ description: 'Save only best model', default: false })
  @IsBoolean()
  @IsOptional()
  saveBestModelOnly?: boolean;

  @ApiPropertyOptional({ description: 'Always save last checkpoint', default: true })
  @IsBoolean()
  @IsOptional()
  saveLastCheckpoint?: boolean;

  @ApiPropertyOptional({ description: 'Auto cleanup old checkpoints', default: true })
  @IsBoolean()
  @IsOptional()
  autoCleanup?: boolean;

  // Logging Configuration
  @ApiPropertyOptional({ description: 'Logging frequency (steps)', default: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  loggingFrequency?: number;

  @ApiPropertyOptional({ description: 'Evaluation frequency (steps)', default: 100 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  evaluationFrequency?: number;

  @ApiPropertyOptional({ description: 'Checkpoint frequency (steps)', default: 500 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  checkpointFrequency?: number;

  @ApiPropertyOptional({ description: 'Enable TensorBoard logging', default: false })
  @IsBoolean()
  @IsOptional()
  tensorboardEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable CSV logging', default: true })
  @IsBoolean()
  @IsOptional()
  csvLogging?: boolean;

  @ApiPropertyOptional({ description: 'Enable JSON logging', default: true })
  @IsBoolean()
  @IsOptional()
  jsonLogging?: boolean;

  @ApiPropertyOptional({ description: 'Additional logging configuration', type: 'object' })
  @IsObject()
  @IsOptional()
  loggingConfig?: Record<string, any>;

  // Metadata
  @ApiPropertyOptional({ description: 'Preset name if applied' })
  @IsString()
  @IsOptional()
  preset?: string;

  @ApiPropertyOptional({ description: 'Configuration version', default: '1.0.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Configuration tags', type: 'object' })
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateHyperparameterConfigDto {
  @ApiPropertyOptional({ description: 'Configuration name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Associated fine-tuning configuration ID' })
  @IsString()
  @IsOptional()
  fineTuningConfigId?: string;

  @ApiPropertyOptional({ enum: TrainingProfile })
  @IsEnum(TrainingProfile)
  @IsOptional()
  trainingProfile?: TrainingProfile;

  // Training Parameters
  @ApiPropertyOptional({ description: 'Number of training epochs' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  epochs?: number;

  @ApiPropertyOptional({ description: 'Batch size' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Micro batch size' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  microBatchSize?: number;

  @ApiPropertyOptional({ description: 'Gradient accumulation steps' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  gradientAccumulationSteps?: number;

  @ApiPropertyOptional({ description: 'Learning rate' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  learningRate?: number;

  @ApiPropertyOptional({ description: 'Weight decay' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightDecay?: number;

  @ApiPropertyOptional({ description: 'Warmup ratio (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  warmupRatio?: number;

  @ApiPropertyOptional({ description: 'Warmup steps' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  warmupSteps?: number;

  @ApiPropertyOptional({ description: 'Maximum training steps' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSteps?: number;

  @ApiPropertyOptional({ description: 'Maximum sequence length' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSequenceLength?: number;

  @ApiPropertyOptional({ description: 'Random seed' })
  @IsNumber()
  @IsOptional()
  randomSeed?: number;

  @ApiPropertyOptional({ description: 'Gradient clipping value' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  gradientClipping?: number;

  // Optimizer & Scheduler
  @ApiPropertyOptional({ enum: OptimizerType })
  @IsEnum(OptimizerType)
  @IsOptional()
  optimizer?: OptimizerType;

  @ApiPropertyOptional({ description: 'Optimizer configuration', type: 'object' })
  @IsObject()
  @IsOptional()
  optimizerConfig?: Record<string, any>;

  @ApiPropertyOptional({ enum: LRSchedulerType })
  @IsEnum(LRSchedulerType)
  @IsOptional()
  scheduler?: LRSchedulerType;

  @ApiPropertyOptional({ description: 'Scheduler configuration', type: 'object' })
  @IsObject()
  @IsOptional()
  schedulerConfig?: Record<string, any>;

  // Precision & Memory
  @ApiPropertyOptional({ description: 'Precision type' })
  @IsString()
  @IsOptional()
  precision?: string;

  @ApiPropertyOptional({ description: 'Enable gradient checkpointing' })
  @IsBoolean()
  @IsOptional()
  gradientCheckpointing?: boolean;

  @ApiPropertyOptional({ description: 'Enable flash attention' })
  @IsBoolean()
  @IsOptional()
  flashAttention?: boolean;

  @ApiPropertyOptional({ description: 'Enable CPU offloading' })
  @IsBoolean()
  @IsOptional()
  cpuOffloading?: boolean;

  @ApiPropertyOptional({ description: 'Enable mixed precision' })
  @IsBoolean()
  @IsOptional()
  mixedPrecision?: boolean;

  @ApiPropertyOptional({ description: 'Enable activation checkpointing' })
  @IsBoolean()
  @IsOptional()
  activationCheckpointing?: boolean;

  // Early Stopping
  @ApiPropertyOptional({ description: 'Enable early stopping' })
  @IsBoolean()
  @IsOptional()
  earlyStoppingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Early stopping patience' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  earlyStoppingPatience?: number;

  @ApiPropertyOptional({ description: 'Early stopping minimum delta' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  earlyStoppingMinDelta?: number;

  @ApiPropertyOptional({ description: 'Restore best model on early stop' })
  @IsBoolean()
  @IsOptional()
  restoreBestModel?: boolean;

  // Checkpoint Strategy
  @ApiPropertyOptional({ description: 'Save checkpoint every N steps' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  saveEveryNSteps?: number;

  @ApiPropertyOptional({ description: 'Maximum checkpoints to keep' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maximumCheckpoints?: number;

  @ApiPropertyOptional({ description: 'Save only best model' })
  @IsBoolean()
  @IsOptional()
  saveBestModelOnly?: boolean;

  @ApiPropertyOptional({ description: 'Always save last checkpoint' })
  @IsBoolean()
  @IsOptional()
  saveLastCheckpoint?: boolean;

  @ApiPropertyOptional({ description: 'Auto cleanup old checkpoints' })
  @IsBoolean()
  @IsOptional()
  autoCleanup?: boolean;

  // Logging Configuration
  @ApiPropertyOptional({ description: 'Logging frequency (steps)' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  loggingFrequency?: number;

  @ApiPropertyOptional({ description: 'Evaluation frequency (steps)' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  evaluationFrequency?: number;

  @ApiPropertyOptional({ description: 'Checkpoint frequency (steps)' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  checkpointFrequency?: number;

  @ApiPropertyOptional({ description: 'Enable TensorBoard logging' })
  @IsBoolean()
  @IsOptional()
  tensorboardEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable CSV logging' })
  @IsBoolean()
  @IsOptional()
  csvLogging?: boolean;

  @ApiPropertyOptional({ description: 'Enable JSON logging' })
  @IsBoolean()
  @IsOptional()
  jsonLogging?: boolean;

  @ApiPropertyOptional({ description: 'Additional logging configuration', type: 'object' })
  @IsObject()
  @IsOptional()
  loggingConfig?: Record<string, any>;

  // Status
  @ApiPropertyOptional({ enum: HyperparameterConfigStatus })
  @IsEnum(HyperparameterConfigStatus)
  @IsOptional()
  status?: HyperparameterConfigStatus;

  // Metadata
  @ApiPropertyOptional({ description: 'Preset name if applied' })
  @IsString()
  @IsOptional()
  preset?: string;

  @ApiPropertyOptional({ description: 'Configuration version' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Configuration tags', type: 'object' })
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ApplyPresetDto {
  @ApiProperty({ enum: TrainingProfile })
  @IsEnum(TrainingProfile)
  preset: TrainingProfile;
}

export class HyperparameterConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  fineTuningConfigId?: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TrainingProfile })
  trainingProfile: TrainingProfile;

  @ApiProperty()
  epochs: number;

  @ApiProperty()
  batchSize: number;

  @ApiPropertyOptional()
  microBatchSize?: number;

  @ApiProperty()
  gradientAccumulationSteps: number;

  @ApiProperty()
  learningRate: number;

  @ApiProperty()
  weightDecay: number;

  @ApiPropertyOptional()
  warmupRatio?: number;

  @ApiPropertyOptional()
  warmupSteps?: number;

  @ApiPropertyOptional()
  maxSteps?: number;

  @ApiProperty()
  maxSequenceLength: number;

  @ApiProperty()
  randomSeed: number;

  @ApiPropertyOptional()
  gradientClipping?: number;

  @ApiProperty({ enum: OptimizerType })
  optimizer: OptimizerType;

  @ApiPropertyOptional()
  optimizerConfig?: Record<string, any>;

  @ApiProperty({ enum: LRSchedulerType })
  scheduler: LRSchedulerType;

  @ApiPropertyOptional()
  schedulerConfig?: Record<string, any>;

  @ApiProperty()
  precision: string;

  @ApiProperty()
  gradientCheckpointing: boolean;

  @ApiProperty()
  flashAttention: boolean;

  @ApiProperty()
  cpuOffloading: boolean;

  @ApiProperty()
  mixedPrecision: boolean;

  @ApiProperty()
  activationCheckpointing: boolean;

  @ApiProperty()
  earlyStoppingEnabled: boolean;

  @ApiPropertyOptional()
  earlyStoppingPatience?: number;

  @ApiPropertyOptional()
  earlyStoppingMinDelta?: number;

  @ApiProperty()
  restoreBestModel: boolean;

  @ApiPropertyOptional()
  saveEveryNSteps?: number;

  @ApiProperty()
  maximumCheckpoints: number;

  @ApiProperty()
  saveBestModelOnly: boolean;

  @ApiProperty()
  saveLastCheckpoint: boolean;

  @ApiProperty()
  autoCleanup: boolean;

  @ApiProperty()
  loggingFrequency: number;

  @ApiProperty()
  evaluationFrequency: number;

  @ApiProperty()
  checkpointFrequency: number;

  @ApiProperty()
  tensorboardEnabled: boolean;

  @ApiProperty()
  csvLogging: boolean;

  @ApiProperty()
  jsonLogging: boolean;

  @ApiPropertyOptional()
  loggingConfig?: Record<string, any>;

  @ApiPropertyOptional()
  estimatedTrainingTime?: number;

  @ApiPropertyOptional()
  estimatedGpuMemory?: number;

  @ApiPropertyOptional()
  estimatedRamUsage?: number;

  @ApiPropertyOptional()
  estimatedCheckpointSize?: number;

  @ApiPropertyOptional()
  estimatedStorageRequired?: number;

  @ApiPropertyOptional()
  preset?: string;

  @ApiProperty({ enum: HyperparameterConfigStatus })
  status: HyperparameterConfigStatus;

  @ApiProperty()
  version: string;

  @ApiPropertyOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional()
  validationResult?: Record<string, any>;

  @ApiProperty()
  isValidated: boolean;

  @ApiPropertyOptional()
  validatedAt?: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  updatedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class HyperparameterConfigListResponseDto {
  @ApiProperty({ type: [HyperparameterConfigResponseDto] })
  configurations: HyperparameterConfigResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}

export class ResourceEstimationDto {
  @ApiProperty({ description: 'Estimated training time in seconds' })
  estimatedTrainingTime: number;

  @ApiProperty({ description: 'Estimated GPU memory in GB' })
  estimatedGpuMemory: number;

  @ApiProperty({ description: 'Estimated RAM usage in GB' })
  estimatedRamUsage: number;

  @ApiProperty({ description: 'Estimated checkpoint size in GB' })
  estimatedCheckpointSize: number;

  @ApiProperty({ description: 'Estimated storage required in GB' })
  estimatedStorageRequired: number;

  @ApiProperty({ description: 'Estimation method used' })
  method: string;

  @ApiPropertyOptional({ description: 'Additional estimation details' })
  details?: Record<string, any>;
}

export class ValidationResultDto {
  @ApiProperty()
  configurationId: string;

  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ description: 'Learning rate within valid range' })
  learningRateValid: boolean;

  @ApiProperty({ description: 'Epoch count within valid range' })
  epochRangeValid: boolean;

  @ApiProperty({ description: 'Batch size within valid range' })
  batchSizeValid: boolean;

  @ApiProperty({ description: 'Sequence length appropriate' })
  sequenceLengthValid: boolean;

  @ApiProperty({ description: 'Optimizer compatible with configuration' })
  optimizerCompatible: boolean;

  @ApiProperty({ description: 'Scheduler compatible with configuration' })
  schedulerCompatible: boolean;

  @ApiProperty({ description: 'Precision compatible with hardware' })
  precisionCompatible: boolean;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty({ type: [String] })
  warnings: string[];

  @ApiProperty({ type: [String] })
  recommendations: string[];

  @ApiPropertyOptional()
  validatedAt?: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}
