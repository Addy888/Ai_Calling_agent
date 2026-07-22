import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FineTuningMethod {
  SUPERVISED_FINE_TUNING = 'SUPERVISED_FINE_TUNING',
  INSTRUCTION_FINE_TUNING = 'INSTRUCTION_FINE_TUNING',
  CONVERSATION_FINE_TUNING = 'CONVERSATION_FINE_TUNING',
  DOMAIN_ADAPTATION = 'DOMAIN_ADAPTATION',
  LORA = 'LORA',
  QLORA = 'QLORA',
  ADAPTER_BASED = 'ADAPTER_BASED',
  FULL_FINE_TUNING = 'FULL_FINE_TUNING',
}

export enum PrecisionType {
  FP32 = 'FP32',
  FP16 = 'FP16',
  BF16 = 'BF16',
  INT8 = 'INT8',
  INT4 = 'INT4',
}

export enum FineTuningConfigStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  VALIDATED = 'VALIDATED',
  ARCHIVED = 'ARCHIVED',
  DEPRECATED = 'DEPRECATED',
}

export enum PEFTMethod {
  PROMPT_TUNING = 'PROMPT_TUNING',
  PREFIX_TUNING = 'PREFIX_TUNING',
  P_TUNING = 'P_TUNING',
  ADAPTER_TUNING = 'ADAPTER_TUNING',
  IA3 = 'IA3',
  LORA = 'LORA',
  QLORA = 'QLORA',
}

export enum LoRATaskType {
  CAUSAL_LM = 'CAUSAL_LM',
  SEQ_2_SEQ_LM = 'SEQ_2_SEQ_LM',
  TOKEN_CLS = 'TOKEN_CLS',
  SEQ_CLS = 'SEQ_CLS',
  QUESTION_ANS = 'QUESTION_ANS',
}

export enum QuantizationType {
  FP4 = 'FP4',
  NF4 = 'NF4',
}

export enum ComputeDataType {
  FP32 = 'FP32',
  FP16 = 'FP16',
  BF16 = 'BF16',
}

export class LoRAConfigDto {
  @ApiProperty({ description: 'LoRA rank', minimum: 1, maximum: 512 })
  @IsNumber()
  @Min(1)
  @Max(512)
  r: number;

  @ApiProperty({ description: 'LoRA alpha parameter', minimum: 1, maximum: 512 })
  @IsNumber()
  @Min(1)
  @Max(512)
  alpha: number;

  @ApiProperty({ description: 'Dropout probability', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  dropout: number;

  @ApiProperty({
    description: 'Target modules for LoRA',
    type: [String],
    example: ['q_proj', 'v_proj', 'k_proj', 'o_proj'],
  })
  @IsArray()
  @IsString({ each: true })
  targetModules: string[];

  @ApiPropertyOptional({ description: 'Bias configuration', example: 'none' })
  @IsString()
  @IsOptional()
  bias?: string;

  @ApiPropertyOptional({ description: 'Fan in fan out', default: false })
  @IsBoolean()
  @IsOptional()
  fanInFanOut?: boolean;

  @ApiPropertyOptional({ enum: LoRATaskType })
  @IsEnum(LoRATaskType)
  @IsOptional()
  taskType?: LoRATaskType;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class QLoRAConfigDto {
  @ApiProperty({ description: 'Enable 4-bit quantization', default: true })
  @IsBoolean()
  load_in_4bit: boolean;

  @ApiProperty({ enum: QuantizationType, default: QuantizationType.NF4 })
  @IsEnum(QuantizationType)
  bnb_4bit_quant_type: QuantizationType;

  @ApiProperty({ description: 'Enable double quantization', default: true })
  @IsBoolean()
  bnb_4bit_use_double_quant: boolean;

  @ApiProperty({ enum: ComputeDataType, default: ComputeDataType.BF16 })
  @IsEnum(ComputeDataType)
  bnb_4bit_compute_dtype: ComputeDataType;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PEFTConfigDto {
  @ApiProperty({ enum: PEFTMethod })
  @IsEnum(PEFTMethod)
  method: PEFTMethod;

  @ApiPropertyOptional({ description: 'Number of virtual tokens' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  num_virtual_tokens?: number;

  @ApiPropertyOptional({ description: 'Prompt encoder hidden size' })
  @IsNumber()
  @IsOptional()
  encoder_hidden_size?: number;

  @ApiPropertyOptional({ description: 'Prefix projection', default: false })
  @IsBoolean()
  @IsOptional()
  prefix_projection?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateFineTuningConfigDto {
  @ApiProperty({ description: 'Configuration name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: FineTuningMethod })
  @IsEnum(FineTuningMethod)
  trainingMethod: FineTuningMethod;

  @ApiPropertyOptional({ description: 'Base model registry ID' })
  @IsString()
  @IsOptional()
  baseModelId?: string;

  @ApiPropertyOptional({ description: 'Training dataset ID' })
  @IsString()
  @IsOptional()
  datasetId?: string;

  @ApiPropertyOptional({ description: 'Configuration version', default: '1.0.0' })
  @IsString()
  @IsOptional()
  configurationVersion?: string;

  @ApiPropertyOptional({ enum: PrecisionType, default: PrecisionType.FP32 })
  @IsEnum(PrecisionType)
  @IsOptional()
  precision?: PrecisionType;

  @ApiPropertyOptional({ type: LoRAConfigDto })
  @ValidateNested()
  @Type(() => LoRAConfigDto)
  @IsOptional()
  loraConfig?: LoRAConfigDto;

  @ApiPropertyOptional({ type: QLoRAConfigDto })
  @ValidateNested()
  @Type(() => QLoRAConfigDto)
  @IsOptional()
  qloraConfig?: QLoRAConfigDto;

  @ApiPropertyOptional({ type: PEFTConfigDto })
  @ValidateNested()
  @Type(() => PEFTConfigDto)
  @IsOptional()
  peftConfig?: PEFTConfigDto;

  @ApiPropertyOptional({ description: 'Configuration tags', type: 'object' })
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateFineTuningConfigDto {
  @ApiPropertyOptional({ description: 'Configuration name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: FineTuningMethod })
  @IsEnum(FineTuningMethod)
  @IsOptional()
  trainingMethod?: FineTuningMethod;

  @ApiPropertyOptional({ description: 'Base model registry ID' })
  @IsString()
  @IsOptional()
  baseModelId?: string;

  @ApiPropertyOptional({ description: 'Training dataset ID' })
  @IsString()
  @IsOptional()
  datasetId?: string;

  @ApiPropertyOptional({ description: 'Configuration version' })
  @IsString()
  @IsOptional()
  configurationVersion?: string;

  @ApiPropertyOptional({ enum: PrecisionType })
  @IsEnum(PrecisionType)
  @IsOptional()
  precision?: PrecisionType;

  @ApiPropertyOptional({ type: LoRAConfigDto })
  @ValidateNested()
  @Type(() => LoRAConfigDto)
  @IsOptional()
  loraConfig?: LoRAConfigDto;

  @ApiPropertyOptional({ type: QLoRAConfigDto })
  @ValidateNested()
  @Type(() => QLoRAConfigDto)
  @IsOptional()
  qloraConfig?: QLoRAConfigDto;

  @ApiPropertyOptional({ type: PEFTConfigDto })
  @ValidateNested()
  @Type(() => PEFTConfigDto)
  @IsOptional()
  peftConfig?: PEFTConfigDto;

  @ApiPropertyOptional({ enum: FineTuningConfigStatus })
  @IsEnum(FineTuningConfigStatus)
  @IsOptional()
  status?: FineTuningConfigStatus;

  @ApiPropertyOptional({ description: 'Configuration tags', type: 'object' })
  @IsObject()
  @IsOptional()
  tags?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ValidateFineTuningConfigDto {
  @ApiProperty({ description: 'Configuration ID to validate' })
  @IsString()
  configurationId: string;
}

export class FineTuningConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: FineTuningMethod })
  trainingMethod: FineTuningMethod;

  @ApiPropertyOptional()
  baseModelId?: string;

  @ApiPropertyOptional()
  datasetId?: string;

  @ApiProperty()
  configurationVersion: string;

  @ApiProperty({ enum: PrecisionType })
  precision: PrecisionType;

  @ApiPropertyOptional()
  loraConfig?: LoRAConfigDto;

  @ApiPropertyOptional()
  qloraConfig?: QLoRAConfigDto;

  @ApiPropertyOptional()
  peftConfig?: PEFTConfigDto;

  @ApiProperty({ enum: FineTuningConfigStatus })
  status: FineTuningConfigStatus;

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

export class FineTuningConfigListResponseDto {
  @ApiProperty({ type: [FineTuningConfigResponseDto] })
  configurations: FineTuningConfigResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}

export class FineTuningConfigValidationResultDto {
  @ApiProperty()
  configurationId: string;

  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ description: 'Base model selected and compatible' })
  baseModelReady: boolean;

  @ApiProperty({ description: 'Dataset is ready for training' })
  datasetReady: boolean;

  @ApiProperty({ description: 'Configuration compatibility check passed' })
  compatibilityPassed: boolean;

  @ApiProperty({ description: 'Training readiness check passed' })
  trainingReadinessPassed: boolean;

  @ApiProperty({ description: 'All required fields completed' })
  requiredFieldsCompleted: boolean;

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
