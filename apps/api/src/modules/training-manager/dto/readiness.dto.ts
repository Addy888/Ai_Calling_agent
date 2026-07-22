import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================
// ENUMS
// ============================================

export enum ReadinessStatus {
  READY = 'READY',
  ALMOST_READY = 'ALMOST_READY',
  CONFIGURATION_REQUIRED = 'CONFIGURATION_REQUIRED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  BLOCKED = 'BLOCKED',
  NOT_READY = 'NOT_READY',
}

export enum BlockerSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum RecommendationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ============================================
// REQUEST DTOs
// ============================================

export class RunReadinessCheckDto {
  @ApiProperty({ description: 'Dataset ID to check' })
  @IsString()
  datasetId: string;

  @ApiProperty({ description: 'Model Registry ID to check' })
  @IsString()
  modelRegistryId: string;

  @ApiPropertyOptional({ description: 'Training Configuration ID' })
  @IsString()
  @IsOptional()
  trainingConfigurationId?: string;

  @ApiPropertyOptional({ description: 'Workspace ID for access control' })
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Force new check even if recent report exists' })
  @IsBoolean()
  @IsOptional()
  forceNew?: boolean;
}

export class GetLatestReadinessDto {
  @ApiPropertyOptional({ description: 'Dataset ID' })
  @IsString()
  @IsOptional()
  datasetId?: string;

  @ApiPropertyOptional({ description: 'Model Registry ID' })
  @IsString()
  @IsOptional()
  modelRegistryId?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class ReadinessBlockerDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: BlockerSeverity })
  severity: BlockerSeverity;

  @ApiPropertyOptional()
  component?: string;

  @ApiPropertyOptional()
  suggestion?: string;
}

export class ReadinessWarningDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: BlockerSeverity })
  severity: BlockerSeverity;

  @ApiPropertyOptional()
  component?: string;

  @ApiPropertyOptional()
  suggestion?: string;
}

export class ReadinessRecommendationDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: RecommendationPriority })
  priority: RecommendationPriority;

  @ApiPropertyOptional()
  component?: string;

  @ApiPropertyOptional()
  action?: string;
}

export class DatasetCheckDto {
  @ApiProperty()
  exists: boolean;

  @ApiProperty()
  validated: boolean;

  @ApiProperty()
  ready: boolean;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  version?: string;

  @ApiPropertyOptional()
  validationScore?: number;

  @ApiPropertyOptional()
  recordCount?: number;

  @ApiPropertyOptional()
  missingSamples?: number;

  @ApiPropertyOptional()
  duplicateSamples?: number;

  @ApiPropertyOptional()
  invalidSamples?: number;
}

export class ModelCheckDto {
  @ApiProperty()
  selected: boolean;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  version?: string;

  @ApiPropertyOptional()
  license?: string;

  @ApiPropertyOptional()
  compatibilityScore?: number;
}

export class ConfigurationCheckDto {
  @ApiProperty()
  exists: boolean;

  @ApiProperty()
  parametersConfigured: boolean;

  @ApiProperty()
  epochsConfigured: boolean;

  @ApiProperty()
  batchSizeConfigured: boolean;

  @ApiProperty()
  learningRateConfigured: boolean;

  @ApiProperty()
  trainingMethodConfigured: boolean;
}

export class CompatibilityCheckDto {
  @ApiProperty()
  reportExists: boolean;

  @ApiProperty()
  passed: boolean;

  @ApiProperty()
  languageCompatible: boolean;

  @ApiProperty()
  contextCompatible: boolean;

  @ApiProperty()
  datasetSizeCompatible: boolean;

  @ApiProperty()
  hardwareCompatible: boolean;

  @ApiProperty()
  licenseCompatible: boolean;
}

export class SystemRequirementsDto {
  @ApiPropertyOptional()
  estimatedMinGpuMemoryGB?: number;

  @ApiPropertyOptional()
  estimatedRecGpuMemoryGB?: number;

  @ApiPropertyOptional()
  estimatedRamGB?: number;

  @ApiPropertyOptional()
  estimatedDiskGB?: number;

  @ApiPropertyOptional()
  estimatedTrainingTimeHours?: number;

  @ApiPropertyOptional()
  estimatedCheckpointSizeGB?: number;
}

export class SecurityCheckDto {
  @ApiProperty()
  jwtAuthEnabled: boolean;

  @ApiProperty()
  rbacEnabled: boolean;

  @ApiProperty()
  workspaceAccessVerified: boolean;

  @ApiProperty()
  datasetOwnershipVerified: boolean;

  @ApiProperty()
  modelOwnershipVerified: boolean;
}

export class ReadinessReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  workspaceId?: string;

  @ApiPropertyOptional()
  datasetId?: string;

  @ApiPropertyOptional()
  modelRegistryId?: string;

  @ApiPropertyOptional()
  trainingConfigurationId?: string;

  @ApiPropertyOptional()
  compatibilityReportId?: string;

  @ApiProperty()
  overallScore: number;

  @ApiProperty({ enum: ReadinessStatus })
  status: ReadinessStatus;

  @ApiProperty()
  datasetScore: number;

  @ApiProperty()
  modelScore: number;

  @ApiProperty()
  configurationScore: number;

  @ApiProperty()
  compatibilityScore: number;

  @ApiProperty()
  securityScore: number;

  @ApiProperty({ type: DatasetCheckDto })
  datasetCheck: DatasetCheckDto;

  @ApiProperty({ type: ModelCheckDto })
  modelCheck: ModelCheckDto;

  @ApiProperty({ type: ConfigurationCheckDto })
  configurationCheck: ConfigurationCheckDto;

  @ApiProperty({ type: CompatibilityCheckDto })
  compatibilityCheck: CompatibilityCheckDto;

  @ApiProperty({ type: SystemRequirementsDto })
  systemRequirements: SystemRequirementsDto;

  @ApiProperty({ type: SecurityCheckDto })
  securityCheck: SecurityCheckDto;

  @ApiProperty({ type: [ReadinessBlockerDto] })
  blockers: ReadinessBlockerDto[];

  @ApiProperty({ type: [ReadinessWarningDto] })
  warnings: ReadinessWarningDto[];

  @ApiProperty({ type: [ReadinessRecommendationDto] })
  recommendations: ReadinessRecommendationDto[];

  @ApiPropertyOptional()
  checkStartedAt?: Date;

  @ApiPropertyOptional()
  checkCompletedAt?: Date;

  @ApiPropertyOptional()
  executionTimeMs?: number;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Optional enriched data
  @ApiPropertyOptional()
  dataset?: {
    id: string;
    name: string;
    datasetType: string;
    status: string;
    recordCount: number;
  };

  @ApiPropertyOptional()
  model?: {
    id: string;
    registryName: string;
    provider: string;
    family: string;
    versionString: string;
    status: string;
  };
}

export class ReadinessSummaryDto {
  @ApiProperty()
  totalReports: number;

  @ApiProperty()
  readyCount: number;

  @ApiProperty()
  almostReadyCount: number;

  @ApiProperty()
  configurationRequiredCount: number;

  @ApiProperty()
  blockedCount: number;

  @ApiProperty()
  averageScore: number;

  @ApiProperty({ type: [ReadinessReportResponseDto] })
  recentReports: ReadinessReportResponseDto[];
}

export class QuickReadinessDto {
  @ApiProperty()
  isReady: boolean;

  @ApiProperty()
  overallScore: number;

  @ApiProperty({ enum: ReadinessStatus })
  status: ReadinessStatus;

  @ApiProperty()
  message: string;

  @ApiProperty()
  criticalBlockersCount: number;

  @ApiProperty()
  warningsCount: number;

  @ApiProperty({ type: [ReadinessBlockerDto] })
  criticalBlockers: ReadinessBlockerDto[];
}
