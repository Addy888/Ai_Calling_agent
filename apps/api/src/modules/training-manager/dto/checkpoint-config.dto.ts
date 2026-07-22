import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
  Max,
  IsObject,
} from 'class-validator';

enum SaveStrategy {
  SAVE_EVERY_N_STEPS = 'SAVE_EVERY_N_STEPS',
  SAVE_EVERY_EPOCH = 'SAVE_EVERY_EPOCH',
  SAVE_BEST_MODEL = 'SAVE_BEST_MODEL',
  SAVE_LAST_MODEL = 'SAVE_LAST_MODEL',
  MANUAL_ONLY = 'MANUAL_ONLY',
  DISABLED = 'DISABLED',
}

enum OverwritePolicy {
  KEEP_ALL = 'KEEP_ALL',
  OVERWRITE_OLDEST = 'OVERWRITE_OLDEST',
  OVERWRITE_WORST = 'OVERWRITE_WORST',
  MANUAL_SELECTION = 'MANUAL_SELECTION',
}

enum RecoveryStrategy {
  RESUME_LATEST = 'RESUME_LATEST',
  RESUME_BEST = 'RESUME_BEST',
  RESUME_MANUAL = 'RESUME_MANUAL',
  ROLLBACK_PREVIOUS = 'ROLLBACK_PREVIOUS',
  RESTART_TRAINING = 'RESTART_TRAINING',
}

enum StorageType {
  LOCAL_STORAGE = 'LOCAL_STORAGE',
  NETWORK_STORAGE = 'NETWORK_STORAGE',
  CLOUD_STORAGE = 'CLOUD_STORAGE',
  OBJECT_STORAGE = 'OBJECT_STORAGE',
}

enum CheckpointConfigStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  VALIDATED = 'VALIDATED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateCheckpointConfigDto {
  @ApiProperty({ description: 'Configuration name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Training pipeline ID' })
  @IsOptional()
  @IsUUID()
  trainingPipelineId?: string;

  @ApiPropertyOptional({ description: 'Training strategy ID' })
  @IsOptional()
  @IsUUID()
  trainingStrategyId?: string;

  // Save Strategy
  @ApiProperty({
    description: 'Save strategy',
    enum: SaveStrategy,
    default: SaveStrategy.SAVE_EVERY_N_STEPS,
  })
  @IsEnum(SaveStrategy)
  saveStrategy: SaveStrategy;

  @ApiPropertyOptional({
    description: 'Save interval in steps (for SAVE_EVERY_N_STEPS)',
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  saveIntervalSteps?: number;

  @ApiPropertyOptional({
    description: 'Save interval in epochs (for SAVE_EVERY_EPOCH)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  saveIntervalEpochs?: number;

  // Checkpoint Policy
  @ApiPropertyOptional({
    description: 'Maximum number of checkpoints to keep',
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCheckpoints?: number;

  @ApiPropertyOptional({
    description: 'Enable automatic cleanup of old checkpoints',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCleanup?: boolean;

  @ApiProperty({
    description: 'Overwrite policy',
    enum: OverwritePolicy,
    default: OverwritePolicy.OVERWRITE_OLDEST,
  })
  @IsEnum(OverwritePolicy)
  overwritePolicy: OverwritePolicy;

  @ApiPropertyOptional({
    description: 'Retention days for checkpoints',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  retentionDays?: number;

  @ApiPropertyOptional({
    description: 'Storage limit in GB',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storageLimitGB?: number;

  @ApiPropertyOptional({
    description: 'Enable archiving of old checkpoints',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableArchiving?: boolean;

  @ApiPropertyOptional({ description: 'Archive policy configuration' })
  @IsOptional()
  @IsObject()
  archivePolicy?: any;

  // Recovery Strategy
  @ApiProperty({
    description: 'Recovery strategy',
    enum: RecoveryStrategy,
    default: RecoveryStrategy.RESUME_LATEST,
  })
  @IsEnum(RecoveryStrategy)
  recoveryStrategy: RecoveryStrategy;

  // Failure Recovery
  @ApiPropertyOptional({
    description: 'Maximum retry count on failure',
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetryCount?: number;

  @ApiPropertyOptional({
    description: 'Retry delay in seconds',
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryDelaySeconds?: number;

  @ApiPropertyOptional({
    description: 'Failure threshold before stopping',
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  failureThreshold?: number;

  @ApiPropertyOptional({
    description: 'Resume automatically after crash',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  resumeAfterCrash?: boolean;

  @ApiPropertyOptional({
    description: 'Enable automatic recovery',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRecovery?: boolean;

  @ApiPropertyOptional({
    description: 'Enable manual recovery',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  manualRecovery?: boolean;

  // Version Management
  @ApiPropertyOptional({
    description: 'Enable checkpoint versioning',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableVersioning?: boolean;

  @ApiPropertyOptional({
    description: 'Track parent checkpoint relationships',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  trackParentCheckpoint?: boolean;

  @ApiPropertyOptional({
    description: 'Enable version history',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableVersionHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Enable rollback support',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableRollback?: boolean;

  // Storage Configuration
  @ApiProperty({
    description: 'Storage type',
    enum: StorageType,
    default: StorageType.LOCAL_STORAGE,
  })
  @IsEnum(StorageType)
  storageType: StorageType;

  @ApiPropertyOptional({ description: 'Storage path configuration' })
  @IsOptional()
  @IsString()
  storagePath?: string;

  @ApiPropertyOptional({ description: 'Storage configuration details' })
  @IsOptional()
  @IsObject()
  storageConfig?: any;

  @ApiPropertyOptional({
    description: 'Enable compression for checkpoints',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableCompression?: boolean;

  @ApiPropertyOptional({
    description: 'Enable encryption for checkpoints',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableEncryption?: boolean;

  // Metadata
  @ApiPropertyOptional({ description: 'Version string' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Configuration tags' })
  @IsOptional()
  @IsObject()
  tags?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateCheckpointConfigDto {
  @ApiPropertyOptional({ description: 'Configuration name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Training pipeline ID' })
  @IsOptional()
  @IsUUID()
  trainingPipelineId?: string;

  @ApiPropertyOptional({ description: 'Training strategy ID' })
  @IsOptional()
  @IsUUID()
  trainingStrategyId?: string;

  @ApiPropertyOptional({ description: 'Save strategy', enum: SaveStrategy })
  @IsOptional()
  @IsEnum(SaveStrategy)
  saveStrategy?: SaveStrategy;

  @ApiPropertyOptional({ description: 'Save interval in steps' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  saveIntervalSteps?: number;

  @ApiPropertyOptional({ description: 'Save interval in epochs' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  saveIntervalEpochs?: number;

  @ApiPropertyOptional({ description: 'Maximum checkpoints to keep' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCheckpoints?: number;

  @ApiPropertyOptional({ description: 'Enable automatic cleanup' })
  @IsOptional()
  @IsBoolean()
  autoCleanup?: boolean;

  @ApiPropertyOptional({ description: 'Overwrite policy', enum: OverwritePolicy })
  @IsOptional()
  @IsEnum(OverwritePolicy)
  overwritePolicy?: OverwritePolicy;

  @ApiPropertyOptional({ description: 'Retention days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  retentionDays?: number;

  @ApiPropertyOptional({ description: 'Storage limit in GB' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storageLimitGB?: number;

  @ApiPropertyOptional({ description: 'Enable archiving' })
  @IsOptional()
  @IsBoolean()
  enableArchiving?: boolean;

  @ApiPropertyOptional({ description: 'Archive policy configuration' })
  @IsOptional()
  @IsObject()
  archivePolicy?: any;

  @ApiPropertyOptional({ description: 'Recovery strategy', enum: RecoveryStrategy })
  @IsOptional()
  @IsEnum(RecoveryStrategy)
  recoveryStrategy?: RecoveryStrategy;

  @ApiPropertyOptional({ description: 'Maximum retry count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetryCount?: number;

  @ApiPropertyOptional({ description: 'Retry delay in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryDelaySeconds?: number;

  @ApiPropertyOptional({ description: 'Failure threshold' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  failureThreshold?: number;

  @ApiPropertyOptional({ description: 'Resume after crash' })
  @IsOptional()
  @IsBoolean()
  resumeAfterCrash?: boolean;

  @ApiPropertyOptional({ description: 'Enable automatic recovery' })
  @IsOptional()
  @IsBoolean()
  autoRecovery?: boolean;

  @ApiPropertyOptional({ description: 'Enable manual recovery' })
  @IsOptional()
  @IsBoolean()
  manualRecovery?: boolean;

  @ApiPropertyOptional({ description: 'Enable versioning' })
  @IsOptional()
  @IsBoolean()
  enableVersioning?: boolean;

  @ApiPropertyOptional({ description: 'Track parent checkpoint' })
  @IsOptional()
  @IsBoolean()
  trackParentCheckpoint?: boolean;

  @ApiPropertyOptional({ description: 'Enable version history' })
  @IsOptional()
  @IsBoolean()
  enableVersionHistory?: boolean;

  @ApiPropertyOptional({ description: 'Enable rollback' })
  @IsOptional()
  @IsBoolean()
  enableRollback?: boolean;

  @ApiPropertyOptional({ description: 'Storage type', enum: StorageType })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @ApiPropertyOptional({ description: 'Storage path' })
  @IsOptional()
  @IsString()
  storagePath?: string;

  @ApiPropertyOptional({ description: 'Storage configuration' })
  @IsOptional()
  @IsObject()
  storageConfig?: any;

  @ApiPropertyOptional({ description: 'Enable compression' })
  @IsOptional()
  @IsBoolean()
  enableCompression?: boolean;

  @ApiPropertyOptional({ description: 'Enable encryption' })
  @IsOptional()
  @IsBoolean()
  enableEncryption?: boolean;

  @ApiPropertyOptional({ description: 'Configuration status', enum: CheckpointConfigStatus })
  @IsOptional()
  @IsEnum(CheckpointConfigStatus)
  status?: CheckpointConfigStatus;

  @ApiPropertyOptional({ description: 'Version string' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Configuration tags' })
  @IsOptional()
  @IsObject()
  tags?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export {
  SaveStrategy,
  OverwritePolicy,
  RecoveryStrategy,
  StorageType,
  CheckpointConfigStatus,
};
