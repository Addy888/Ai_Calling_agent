import { IsString, IsOptional, IsUUID, IsEnum, MaxLength, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum PromptStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreatePromptDto {
  @ApiProperty({ example: 'Sales Assistant Prompt v1' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'You are a professional sales assistant. Your goal is to...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'System prompt for sales conversations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '1.0.0', default: '1.0.0' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional({ enum: PromptStatus, default: PromptStatus.DRAFT })
  @IsEnum(PromptStatus)
  @IsOptional()
  status?: PromptStatus;

  @ApiPropertyOptional({ example: 0.7, description: 'Temperature for AI model (0.0 to 2.0)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  temperature?: number;

  @ApiPropertyOptional({ example: 4000, description: 'Maximum tokens for AI response' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxTokens?: number;
}

export class UpdatePromptDto extends PartialType(CreatePromptDto) {}

export class PromptFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PromptStatus, isArray: true })
  @IsOptional()
  @IsEnum(PromptStatus, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  status?: PromptStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBefore?: string;
}
