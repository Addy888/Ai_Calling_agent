import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
} from 'class-validator';

// ============================================
// ENUMS
// ============================================

export enum ExportFormat {
  GGUF = 'GGUF',
  SAFETENSORS = 'SAFETENSORS',
  PYTORCH = 'PYTORCH',
  ONNX = 'ONNX',
  TENSORRT = 'TENSORRT',
  TORCHSCRIPT = 'TORCHSCRIPT',
  HUGGINGFACE = 'HUGGINGFACE',
  CUSTOM_ARCHIVE = 'CUSTOM_ARCHIVE',
}

export enum DeploymentTarget {
  LOCAL_SERVER = 'LOCAL_SERVER',
  OLLAMA = 'OLLAMA',
  VLLM = 'VLLM',
  HUGGINGFACE_HUB = 'HUGGINGFACE_HUB',
  AWS_SAGEMAKER = 'AWS_SAGEMAKER',
  AZURE_ML = 'AZURE_ML',
  GOOGLE_VERTEX_AI = 'GOOGLE_VERTEX_AI',
  RUNPOD = 'RUNPOD',
  DOCKER = 'DOCKER',
  KUBERNETES = 'KUBERNETES',
  CUSTOM_API = 'CUSTOM_API',
}

export enum PackageStatus {
  DRAFT = 'DRAFT',
  PREPARING = 'PREPARING',
  READY = 'READY',
  EXPORTED = 'EXPORTED',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum CompressionType {
  NONE = 'NONE',
  GZIP = 'GZIP',
  BZIP2 = 'BZIP2',
  XZ = 'XZ',
  ZSTD = 'ZSTD',
}

export enum EncryptionType {
  NONE = 'NONE',
  AES_256 = 'AES_256',
  RSA_2048 = 'RSA_2048',
  GPG = 'GPG',
}

// ============================================
// DTOs
// ============================================

export class CreateModelPackageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @ApiProperty()
  @IsString()
  modelRegistryId: string;

  @ApiProperty()
  @IsString()
  trainingSessionId: string;

  @ApiProperty()
  @IsString()
  packageName: string;

  @ApiProperty()
  @IsString()
  packageVersion: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  packageDescription?: string;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  exportFormat: ExportFormat;

  @ApiProperty({ enum: DeploymentTarget })
  @IsEnum(DeploymentTarget)
  deploymentTarget: DeploymentTarget;

  @ApiPropertyOptional({ enum: CompressionType })
  @IsEnum(CompressionType)
  @IsOptional()
  compression?: CompressionType;

  @ApiPropertyOptional({ enum: EncryptionType })
  @IsEnum(EncryptionType)
  @IsOptional()
  encryption?: EncryptionType;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateModelPackageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  packageName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  packageVersion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  packageDescription?: string;

  @ApiPropertyOptional({ enum: PackageStatus })
  @IsEnum(PackageStatus)
  @IsOptional()
  status?: PackageStatus;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  configuration?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  manifest?: Record<string, any>;
}

export class PrepareExportDto {
  @ApiProperty()
  @IsBoolean()
  includeMetadata: boolean;

  @ApiProperty()
  @IsBoolean()
  includeConfiguration: boolean;

  @ApiProperty()
  @IsBoolean()
  includeEvaluation: boolean;

  @ApiProperty()
  @IsBoolean()
  generateChecksum: boolean;

  @ApiProperty()
  @IsBoolean()
  signPackage: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  additionalFiles?: string[];
}

export class PackageListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ExportFormat })
  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;

  @ApiPropertyOptional({ enum: DeploymentTarget })
  @IsOptional()
  @IsEnum(DeploymentTarget)
  deploymentTarget?: DeploymentTarget;

  @ApiPropertyOptional({ enum: PackageStatus })
  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelRegistryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}

// ============================================
// RESPONSE INTERFACES
// ============================================

export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  baseModel: string;
  trainingVersion: string;
  datasetVersion: string;
  fineTuningMethod: string;
  hyperparameterVersion: string;
  checkpointVersion: string;
  evaluationVersion: string;
  packageVersion: string;
  trainingDate: string;
  evaluationScore?: number;
  license?: string;
  author?: string;
  description?: string;
}

export interface PackageManifest {
  packageName: string;
  packageVersion: string;
  exportFormat: ExportFormat;
  deploymentTarget: DeploymentTarget;
  createdAt: string;
  modelMetadata: ModelMetadata;
  files: {
    name: string;
    path: string;
    size: number;
    checksum: string;
    type: string;
  }[];
  dependencies?: Record<string, string>;
  requirements?: string[];
  configuration?: Record<string, any>;
  signature?: string;
}

export interface ValidationResult {
  isValid: boolean;
  checks: {
    trainingCompleted: boolean;
    evaluationApproved: boolean;
    checkpointExists: boolean;
    configurationExists: boolean;
    modelRegistryExists: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface ExportPreparedResponse {
  packageId: string;
  status: PackageStatus;
  manifest: PackageManifest;
  downloadUrl?: string;
  expiresAt?: string;
  estimatedSize: string;
}
