import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsObject } from 'class-validator';

export enum MonitorStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  TRAINING = 'TRAINING',
  VALIDATING = 'VALIDATING',
  CHECKPOINTING = 'CHECKPOINTING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  trainingProgressPercent: number;
  validationProgressPercent: number;
  checkpointProgressPercent: number;
  estimatedCompletionTime?: string;
  estimatedRemainingSeconds?: number;
}

export interface TrainingMetrics {
  trainingLoss?: number;
  validationLoss?: number;
  learningRate?: number;
  accuracy?: number;
  perplexity?: number;
  gradientNorm?: number;
  evaluationScore?: number;
  bestMetric?: number;
  lastUpdated: string;
}

export interface PerformanceMetrics {
  tokensPerSecond?: number;
  samplesPerSecond?: number;
  iterationsPerSecond?: number;
  processedTokens?: number;
  processedSamples?: number;
  estimatedRemainingTime?: string;
}

export interface ResourceUsage {
  gpuUsagePercent?: number;
  gpuMemoryUsedGB?: number;
  gpuMemoryTotalGB?: number;
  ramUsageGB?: number;
  ramTotalGB?: number;
  cpuUsagePercent?: number;
  diskUsageGB?: number;
  networkUsageMbps?: number;
  isEstimated: boolean;
}

export interface CheckpointInfo {
  latestCheckpoint?: string;
  checkpointProgress: number;
  checkpointCount: number;
  bestCheckpoint?: string;
  nextCheckpointETA?: string;
  lastCheckpointTime?: string;
}

export interface TrainingAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
  details?: string;
  timestamp: string;
}

export interface TrainingLog {
  id: string;
  level: LogLevel;
  message: string;
  details?: any;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  message: string;
  timestamp: string;
  details?: any;
}

export class GetTrainingStatusDto {
  @ApiProperty({ description: 'Training session ID' })
  @IsString()
  sessionId: string;
}

export class GetLogsDto {
  @ApiPropertyOptional({ description: 'Log level filter', enum: LogLevel })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Limit per page' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class TrainingStatusResponse {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  sessionName: string;

  @ApiProperty({ enum: MonitorStatus })
  status: MonitorStatus;

  @ApiPropertyOptional()
  pipelineStatus?: string;

  @ApiPropertyOptional()
  currentStage?: string;

  @ApiPropertyOptional()
  trainingMethod?: string;

  @ApiPropertyOptional()
  baseModel?: string;

  @ApiPropertyOptional()
  dataset?: string;

  @ApiPropertyOptional()
  startedTime?: string;

  @ApiPropertyOptional()
  estimatedCompletion?: string;

  @ApiProperty()
  progress: TrainingProgress;

  @ApiProperty()
  metrics: TrainingMetrics;

  @ApiProperty()
  performance: PerformanceMetrics;

  @ApiProperty()
  resources: ResourceUsage;

  @ApiProperty()
  checkpoint: CheckpointInfo;

  @ApiProperty({ type: 'array' })
  alerts: TrainingAlert[];
}

// Notification Configuration
export interface NotificationConfig {
  desktop: boolean;
  email: boolean;
  slack: boolean;
  webhook: boolean;
}

export class ExportLogsDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ enum: LogLevel })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string; // 'json' | 'csv' | 'txt'
}

// Interfaces are already exported above
// No need to re-export them
