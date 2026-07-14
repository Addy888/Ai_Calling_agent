import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class BuildConversationDatasetDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  campaignIds?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class BuildKnowledgeDatasetDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  documentIds?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class BuildPromptDatasetDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  promptIds?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class BuildScriptDatasetDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  scriptIds?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  versions?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class BuildFAQDatasetDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class BuildBusinessRuleDatasetDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  ruleTypes?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}

export class BuildEvaluationDatasetDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}
