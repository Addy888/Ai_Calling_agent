import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunCompatibilityCheckDto {
  @ApiProperty({ description: 'Dataset ID' })
  @IsString()
  datasetId: string;

  @ApiProperty({ description: 'Model Registry ID' })
  @IsString()
  modelRegistryId: string;

  @ApiPropertyOptional({ description: 'Training Configuration ID' })
  @IsOptional()
  @IsString()
  trainingConfigId?: string;

  @ApiPropertyOptional({ description: 'Additional parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export enum CompatibilityStatus {
  COMPATIBLE = 'COMPATIBLE',
  PARTIALLY_COMPATIBLE = 'PARTIALLY_COMPATIBLE',
  WARNING = 'WARNING',
  NOT_COMPATIBLE = 'NOT_COMPATIBLE',
  UNKNOWN = 'UNKNOWN',
}

export enum CompatibilityRecommendation {
  RECOMMENDED = 'RECOMMENDED',
  ACCEPTABLE = 'ACCEPTABLE',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  NOT_RECOMMENDED = 'NOT_RECOMMENDED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export class LanguageCompatibilityDetail {
  @ApiProperty()
  datasetLanguages: string[];

  @ApiProperty()
  modelSupportedLanguages: string[];

  @ApiProperty()
  supportedLanguages: string[];

  @ApiProperty()
  partiallySupportedLanguages: string[];

  @ApiProperty()
  unsupportedLanguages: string[];

  @ApiProperty()
  coveragePercentage: number;
}

export class ContextCompatibilityDetail {
  @ApiProperty()
  averageConversationLength: number;

  @ApiProperty()
  maxConversationLength: number;

  @ApiProperty()
  modelContextWindow: number;

  @ApiProperty()
  utilizationPercentage: number;

  @ApiProperty()
  hasWarning: boolean;

  @ApiProperty()
  recommendation: string;
}

export class DatasetCompatibilityDetail {
  @ApiProperty()
  totalSamples: number;

  @ApiProperty()
  trainingSamples: number;

  @ApiProperty()
  validationSamples: number;

  @ApiProperty()
  testSamples: number;

  @ApiProperty()
  estimatedTokens: number;

  @ApiProperty()
  datasetSizeMB: number;

  @ApiProperty()
  isAdequate: boolean;

  @ApiProperty()
  recommendation: string;
}

export class HardwareCompatibilityDetail {
  @ApiProperty()
  minimumVRAM: number;

  @ApiProperty()
  recommendedVRAM: number;

  @ApiProperty()
  estimatedTrainingVRAM: number;

  @ApiProperty()
  estimatedDiskUsageGB: number;

  @ApiProperty()
  estimatedRAMUsageGB: number;

  @ApiProperty()
  meetsMinimum: boolean;

  @ApiProperty()
  meetsRecommended: boolean;
}

export class LicenseCompatibilityDetail {
  @ApiProperty()
  licenseType: string;

  @ApiProperty()
  commercialUse: boolean;

  @ApiProperty()
  researchOnly: boolean;

  @ApiProperty()
  openSource: boolean;

  @ApiProperty()
  restrictions: string[];
}

export class QuantizationDetail {
  @ApiProperty()
  supportedMethods: string[];

  @ApiProperty()
  fp16Supported: boolean;

  @ApiProperty()
  bf16Supported: boolean;

  @ApiProperty()
  int8Supported: boolean;

  @ApiProperty()
  int4Supported: boolean;

  @ApiProperty()
  qloraSupported: boolean;

  @ApiProperty()
  loraSupported: boolean;
}

export class CompatibilityWarning {
  @ApiProperty()
  type: string;

  @ApiProperty()
  severity: 'critical' | 'warning' | 'info';

  @ApiProperty()
  message: string;

  @ApiProperty()
  suggestion?: string;
}

export class CompatibilityReportResponseDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Dataset ID' })
  datasetId: string;

  @ApiProperty({ description: 'Model Registry ID' })
  modelRegistryId: string;

  @ApiProperty({ description: 'Training Config ID' })
  trainingConfigId: string | null;

  @ApiProperty({ description: 'Language compatibility score' })
  languageScore: number;

  @ApiProperty({ description: 'Context compatibility score' })
  contextScore: number;

  @ApiProperty({ description: 'Dataset compatibility score' })
  datasetScore: number;

  @ApiProperty({ description: 'Hardware compatibility score' })
  hardwareScore: number;

  @ApiProperty({ description: 'License compatibility score' })
  licenseScore: number;

  @ApiProperty({ description: 'Overall compatibility score' })
  overallScore: number;

  @ApiProperty({ description: 'Language compatibility status' })
  languageCompatibility: CompatibilityStatus;

  @ApiProperty({ description: 'Context compatibility status' })
  contextCompatibility: CompatibilityStatus;

  @ApiProperty({ description: 'Dataset compatibility status' })
  datasetCompatibility: CompatibilityStatus;

  @ApiProperty({ description: 'Hardware compatibility status' })
  hardwareCompatibility: CompatibilityStatus;

  @ApiProperty({ description: 'License compatibility status' })
  licenseCompatibility: CompatibilityStatus;

  @ApiProperty({ description: 'Overall recommendation' })
  recommendation: CompatibilityRecommendation;

  @ApiProperty({ description: 'Recommendation reason' })
  recommendationReason: string | null;

  @ApiProperty({ description: 'Language details' })
  languageDetails: LanguageCompatibilityDetail;

  @ApiProperty({ description: 'Context details' })
  contextDetails: ContextCompatibilityDetail;

  @ApiProperty({ description: 'Dataset details' })
  datasetDetails: DatasetCompatibilityDetail;

  @ApiProperty({ description: 'Hardware details' })
  hardwareDetails: HardwareCompatibilityDetail;

  @ApiProperty({ description: 'License details' })
  licenseDetails: LicenseCompatibilityDetail;

  @ApiProperty({ description: 'Quantization details' })
  quantizationDetails: QuantizationDetail;

  @ApiProperty({ description: 'Warnings' })
  warnings: CompatibilityWarning[];

  @ApiProperty({ description: 'Blockers' })
  blockers: CompatibilityWarning[];

  @ApiProperty({ description: 'Suggestions' })
  suggestions: string[];

  @ApiProperty({ description: 'Report status' })
  status: string;

  @ApiProperty({ description: 'Check started at' })
  checkStartedAt: Date | null;

  @ApiProperty({ description: 'Check completed at' })
  checkCompletedAt: Date | null;

  @ApiProperty({ description: 'Execution time in ms' })
  executionTime: number | null;

  @ApiProperty({ description: 'Checked by' })
  checkedBy: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Dataset info' })
  dataset: {
    id: string;
    name: string;
    datasetType: string;
    recordCount: number;
    language: string;
  };

  @ApiProperty({ description: 'Model info' })
  model: {
    id: string;
    registryName: string;
    provider: string;
    family: string;
    versionString: string;
    status: string;
  };
}

export class CompatibilitySummaryDto {
  @ApiProperty()
  totalReports: number;

  @ApiProperty()
  recommendedCount: number;

  @ApiProperty()
  acceptableCount: number;

  @ApiProperty()
  needsImprovementCount: number;

  @ApiProperty()
  notRecommendedCount: number;

  @ApiProperty()
  averageScore: number;

  @ApiProperty()
  recentReports: CompatibilityReportResponseDto[];
}
