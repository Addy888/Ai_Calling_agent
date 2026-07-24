import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';

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

/** Nested filters object sent as filters[key]=value */
export class PromptFilterDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PromptStatus, isArray: true })
  @IsOptional()
  @IsEnum(PromptStatus, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value as PromptStatus];
    return value;
  })
  status?: PromptStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

/**
 * Combined query DTO for GET /prompts.
 * Extends PaginationDto so that page, limit, search, sortBy, sortOrder
 * are all declared on this single DTO — used with a single @Query() decorator.
 */
export class PromptQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PromptStatus, isArray: true })
  @IsOptional()
  @IsEnum(PromptStatus, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value as PromptStatus];
    return value;
  })
  status?: PromptStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ type: PromptFilterDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PromptFilterDetailsDto)
  filters?: PromptFilterDetailsDto;
}

/** @deprecated — use PromptQueryDto. Kept for backward compatibility with service layer. */
export class PromptFilterDto extends PromptQueryDto {}
