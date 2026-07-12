import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AIProviderType {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  CUSTOM = 'CUSTOM',
}

export class CreateAIProviderDto {
  @ApiProperty({ description: 'Provider name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Provider type', enum: AIProviderType })
  @IsEnum(AIProviderType)
  type: AIProviderType;

  @ApiPropertyOptional({ description: 'API endpoint' })
  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateAIProviderDto {
  @ApiPropertyOptional({ description: 'Provider name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Provider type', enum: AIProviderType })
  @IsOptional()
  @IsEnum(AIProviderType)
  type?: AIProviderType;

  @ApiPropertyOptional({ description: 'API endpoint' })
  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateAIProviderConfigDto {
  @ApiProperty({ description: 'Provider ID' })
  @IsString()
  providerId: string;

  @ApiProperty({ description: 'API Key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Model name' })
  @IsString()
  modelName: string;

  @ApiPropertyOptional({ description: 'Temperature', minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Max tokens' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Top P', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ description: 'Frequency penalty', minimum: -2, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({ description: 'Presence penalty', minimum: -2, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @ApiPropertyOptional({ description: 'Is default' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Settings' })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateAIProviderConfigDto {
  @ApiPropertyOptional({ description: 'API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Model name' })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({ description: 'Temperature', minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Max tokens' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Top P', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ description: 'Frequency penalty', minimum: -2, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({ description: 'Presence penalty', minimum: -2, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @ApiPropertyOptional({ description: 'Is default' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Settings' })
  @IsOptional()
  @IsObject()
  settings?: any;
}
