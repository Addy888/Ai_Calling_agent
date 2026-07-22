import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum ModelRegistryStatusEnum {
  REGISTERED = 'REGISTERED',
  READY = 'READY',
  TRAINING = 'TRAINING',
  EVALUATING = 'EVALUATING',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
  DEPRECATED = 'DEPRECATED',
}

export enum ModelHistoryEventEnum {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
  VERSION_CREATED = 'VERSION_CREATED',
  VERSION_UPDATED = 'VERSION_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  TAGS_UPDATED = 'TAGS_UPDATED',
}

export class CreateModelRegistryDto {
  @ApiProperty({ description: 'Model registry name' })
  @IsString()
  @IsNotEmpty()
  registryName: string;

  @ApiPropertyOptional({ description: 'Base AI model ID' })
  @IsString()
  @IsOptional()
  baseModelId?: string;

  @ApiProperty({ description: 'Model provider' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: 'Model family' })
  @IsString()
  @IsNotEmpty()
  family: string;

  @ApiPropertyOptional({ description: 'Major version', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  majorVersion?: number;

  @ApiPropertyOptional({ description: 'Minor version', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minorVersion?: number;

  @ApiPropertyOptional({ description: 'Patch version', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  patchVersion?: number;

  @ApiPropertyOptional({ description: 'Model description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Model tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Parent model ID for versioning' })
  @IsString()
  @IsOptional()
  parentModelId?: string;

  @ApiPropertyOptional({ description: 'Fine-tuned from model ID' })
  @IsString()
  @IsOptional()
  fineTunedFrom?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateModelRegistryDto {
  @ApiPropertyOptional({ description: 'Model registry name' })
  @IsString()
  @IsOptional()
  registryName?: string;

  @ApiPropertyOptional({ description: 'Model description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Model status' })
  @IsEnum(ModelRegistryStatusEnum)
  @IsOptional()
  status?: ModelRegistryStatusEnum;

  @ApiPropertyOptional({ description: 'Model tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ModelRegistryQueryDto {
  @ApiPropertyOptional({ description: 'Search by name, provider, family' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by provider' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: 'Filter by family' })
  @IsString()
  @IsOptional()
  family?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ModelRegistryStatusEnum })
  @IsEnum(ModelRegistryStatusEnum)
  @IsOptional()
  status?: ModelRegistryStatusEnum;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by latest version only' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isLatest?: boolean;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CreateModelVersionDto {
  @ApiProperty({ description: 'Version type', enum: ['major', 'minor', 'patch'] })
  @IsEnum(['major', 'minor', 'patch'])
  @IsNotEmpty()
  versionType: 'major' | 'minor' | 'patch';

  @ApiPropertyOptional({ description: 'Version description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Model tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ActivateModelDto {
  @ApiPropertyOptional({ description: 'Reason for activation' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ArchiveModelDto {
  @ApiPropertyOptional({ description: 'Reason for archival' })
  @IsString()
  @IsOptional()
  reason?: string;
}
