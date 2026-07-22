import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum AIModelStatusDto {
  AVAILABLE = 'AVAILABLE',
  COMING_SOON = 'COMING_SOON',
  DISABLED = 'DISABLED',
  EXPERIMENTAL = 'EXPERIMENTAL',
  DEPRECATED = 'DEPRECATED',
}

export class AIModelQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by provider' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: 'Filter by family' })
  @IsString()
  @IsOptional()
  family?: string;

  @ApiPropertyOptional({ enum: AIModelStatusDto, description: 'Filter by status' })
  @IsEnum(AIModelStatusDto)
  @IsOptional()
  status?: AIModelStatusDto;

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
