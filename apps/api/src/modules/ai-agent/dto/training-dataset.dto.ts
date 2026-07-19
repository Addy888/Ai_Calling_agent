import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum DatasetTypeDto {
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

export enum DatasetFormatDto {
  JSON = 'JSON',
  JSONL = 'JSONL',
  CSV = 'CSV',
  MARKDOWN = 'MARKDOWN',
}

export class CreateTrainingDatasetDto {
  @ApiProperty({ description: 'Dataset name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Dataset description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DatasetTypeDto, description: 'Dataset type' })
  @IsEnum(DatasetTypeDto)
  datasetType: DatasetTypeDto;

  @ApiPropertyOptional({ description: 'Dataset category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Language code', default: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Source filters' })
  @IsObject()
  @IsOptional()
  sourceFilters?: Record<string, any>;
}

export class UpdateTrainingDatasetDto {
  @ApiPropertyOptional({ description: 'Dataset name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Dataset description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Dataset category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class GenerateDatasetDto {
  @ApiProperty({ enum: DatasetTypeDto, description: 'Dataset type' })
  @IsEnum(DatasetTypeDto)
  datasetType: DatasetTypeDto;

  @ApiPropertyOptional({ description: 'Source filters' })
  @IsObject()
  @IsOptional()
  sourceFilters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Include PII protection', default: true })
  @IsBoolean()
  @IsOptional()
  piiProtection?: boolean;

  @ApiPropertyOptional({ description: 'Remove duplicates', default: true })
  @IsBoolean()
  @IsOptional()
  removeDuplicates?: boolean;

  @ApiPropertyOptional({ description: 'Normalize text', default: true })
  @IsBoolean()
  @IsOptional()
  normalizeText?: boolean;

  @ApiPropertyOptional({ description: 'Language filter' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Min quality score', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minQualityScore?: number;
}

export class ValidateDatasetDto {
  @ApiPropertyOptional({ description: 'Validation types', type: [String] })
  @IsArray()
  @IsOptional()
  validationTypes?: string[];

  @ApiPropertyOptional({ description: 'Fix issues automatically', default: false })
  @IsBoolean()
  @IsOptional()
  autoFix?: boolean;
}

export class ExportDatasetDto {
  @ApiProperty({ enum: DatasetFormatDto, description: 'Export format' })
  @IsEnum(DatasetFormatDto)
  format: DatasetFormatDto;

  @ApiPropertyOptional({ description: 'Include metadata', default: true })
  @IsBoolean()
  @IsOptional()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: 'Include statistics', default: true })
  @IsBoolean()
  @IsOptional()
  includeStatistics?: boolean;

  @ApiPropertyOptional({ description: 'Sample size (0 for all)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sampleSize?: number;
}

export class DatasetQueryDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: DatasetTypeDto, description: 'Filter by dataset type' })
  @IsEnum(DatasetTypeDto)
  @IsOptional()
  datasetType?: DatasetTypeDto;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class PreviewDatasetDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by record type' })
  @IsString()
  @IsOptional()
  recordType?: string;

  @ApiPropertyOptional({ description: 'Filter valid only', default: true })
  @IsBoolean()
  @IsOptional()
  validOnly?: boolean;
}
