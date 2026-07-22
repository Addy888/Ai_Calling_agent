import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SelectBaseModelDto {
  @ApiProperty({ description: 'Model Registry ID' })
  @IsString()
  modelRegistryId: string;

  @ApiPropertyOptional({ description: 'Training Configuration ID' })
  @IsOptional()
  @IsString()
  trainingConfigId?: string;

  @ApiPropertyOptional({ description: 'Dataset ID' })
  @IsOptional()
  @IsString()
  datasetId?: string;

  @ApiPropertyOptional({ description: 'Selection reason' })
  @IsOptional()
  @IsString()
  selectionReason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateModelSelectionDto {
  @ApiPropertyOptional({ description: 'New Model Registry ID' })
  @IsOptional()
  @IsString()
  modelRegistryId?: string;

  @ApiPropertyOptional({ description: 'Selection reason' })
  @IsOptional()
  @IsString()
  selectionReason?: string;

  @ApiPropertyOptional({ description: 'Confidence score' })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Advantages' })
  @IsOptional()
  @IsArray()
  advantages?: string[];

  @ApiPropertyOptional({ description: 'Limitations' })
  @IsOptional()
  @IsArray()
  limitations?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CompareModelsDto {
  @ApiProperty({ description: 'Array of Model Registry IDs to compare', type: [String] })
  @IsArray()
  @IsString({ each: true })
  modelIds: string[];
}

export class ModelRecommendationRequestDto {
  @ApiPropertyOptional({ description: 'Dataset ID for recommendation' })
  @IsOptional()
  @IsString()
  datasetId?: string;

  @ApiPropertyOptional({ description: 'Training Configuration ID' })
  @IsOptional()
  @IsString()
  trainingConfigId?: string;

  @ApiPropertyOptional({ description: 'Additional parameters for recommendation' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export class ModelComparisonResponseDto {
  @ApiProperty({ description: 'Array of compared models' })
  models: ModelComparisonItem[];

  @ApiProperty({ description: 'Recommended model ID' })
  recommendedModelId: string;

  @ApiProperty({ description: 'Comparison summary' })
  summary: {
    bestForDataSize: string;
    bestForLanguages: string;
    bestForVRAM: string;
    mostBalanced: string;
  };
}

export class ModelComparisonItem {
  @ApiProperty({ description: 'Model ID' })
  id: string;

  @ApiProperty({ description: 'Model name' })
  name: string;

  @ApiProperty({ description: 'Provider' })
  provider: string;

  @ApiProperty({ description: 'Family' })
  family: string;

  @ApiProperty({ description: 'Version' })
  version: string;

  @ApiProperty({ description: 'Parameters' })
  parameters: string;

  @ApiProperty({ description: 'Context length' })
  contextLength: number;

  @ApiProperty({ description: 'Supported languages' })
  languages: string[];

  @ApiProperty({ description: 'Minimum VRAM' })
  minimumVram: number;

  @ApiProperty({ description: 'Recommended VRAM' })
  recommendedVram: number;

  @ApiProperty({ description: 'License' })
  license: string;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Quantization support' })
  quantizationSupport: string[];

  @ApiProperty({ description: 'Advantages for this use case' })
  advantages: string[];

  @ApiProperty({ description: 'Limitations for this use case' })
  limitations: string[];
}

export class ModelRecommendationResponseDto {
  @ApiProperty({ description: 'Recommended Model Registry ID' })
  recommendedModelId: string;

  @ApiProperty({ description: 'Model details' })
  model: {
    id: string;
    name: string;
    provider: string;
    family: string;
    version: string;
    parameters: string;
    contextLength: number;
    languages: string[];
    license: string;
  };

  @ApiProperty({ description: 'Recommendation reason' })
  reason: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidenceScore: number;

  @ApiProperty({ description: 'Advantages' })
  advantages: string[];

  @ApiProperty({ description: 'Limitations' })
  limitations: string[];

  @ApiProperty({ description: 'Dataset analysis' })
  datasetAnalysis?: {
    datasetId: string;
    datasetName: string;
    recordCount: number;
    language: string;
    category: string;
  };
}

export class SelectedModelResponseDto {
  @ApiProperty({ description: 'Selection ID' })
  id: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Training Config ID' })
  trainingConfigId: string | null;

  @ApiProperty({ description: 'Dataset ID' })
  datasetId: string | null;

  @ApiProperty({ description: 'Model Registry ID' })
  modelRegistryId: string;

  @ApiProperty({ description: 'Selection reason' })
  selectionReason: string | null;

  @ApiProperty({ description: 'Is selected' })
  isSelected: boolean;

  @ApiProperty({ description: 'Confidence' })
  confidence: number | null;

  @ApiProperty({ description: 'Advantages' })
  advantages: any;

  @ApiProperty({ description: 'Limitations' })
  limitations: any;

  @ApiProperty({ description: 'Recommendation score' })
  recommendationScore: number | null;

  @ApiProperty({ description: 'Selected by' })
  selectedBy: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Model details' })
  modelRegistry: {
    id: string;
    registryName: string;
    provider: string;
    family: string;
    versionString: string;
    status: string;
    isActive: boolean;
    description: string | null;
    baseModel: {
      id: string;
      name: string;
      provider: string;
      family: string;
      version: string;
      parameters: string | null;
      contextLength: number | null;
      languages: any;
      quantizationSupport: any;
      minimumVram: number | null;
      recommendedVram: number | null;
      license: string | null;
      description: string | null;
      status: string;
      isActive: boolean;
    } | null;
  };

  @ApiProperty({ description: 'Dataset details' })
  dataset?: {
    id: string;
    name: string;
    datasetType: string;
    recordCount: number;
    language: string;
    category: string | null;
  };
}

export class AvailableModelsResponseDto {
  @ApiProperty({ description: 'Total models' })
  total: number;

  @ApiProperty({ description: 'Active models' })
  activeCount: number;

  @ApiProperty({ description: 'List of available models' })
  models: Array<{
    id: string;
    registryName: string;
    provider: string;
    family: string;
    versionString: string;
    status: string;
    isActive: boolean;
    description: string | null;
    baseModel: {
      id: string;
      name: string;
      provider: string;
      family: string;
      version: string;
      parameters: string | null;
      contextLength: number | null;
      languages: any;
      quantizationSupport: any;
      minimumVram: number | null;
      recommendedVram: number | null;
      license: string | null;
      description: string | null;
      status: string;
    } | null;
  }>;
}
