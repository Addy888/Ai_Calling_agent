import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';

export enum ReportType {
  CAMPAIGN_PERFORMANCE = 'CAMPAIGN_PERFORMANCE',
  CONTACT_ANALYSIS = 'CONTACT_ANALYSIS',
  USER_ACTIVITY = 'USER_ACTIVITY',
  KNOWLEDGE_BASE_USAGE = 'KNOWLEDGE_BASE_USAGE',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

export enum ReportStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ description: 'Report parameters' })
  @IsOptional()
  @IsObject()
  parameters?: any;

  @ApiPropertyOptional({ description: 'Schedule configuration' })
  @IsOptional()
  @IsObject()
  schedule?: any;

  @ApiPropertyOptional({ description: 'Report format', enum: ReportFormat, default: ReportFormat.JSON })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.JSON;

  @ApiPropertyOptional({ description: 'Report status', enum: ReportStatus, default: ReportStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus = ReportStatus.ACTIVE;

  @ApiPropertyOptional({ description: 'Is report active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateReportDto {
  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Report type', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: 'Report parameters' })
  @IsOptional()
  @IsObject()
  parameters?: any;

  @ApiPropertyOptional({ description: 'Schedule configuration' })
  @IsOptional()
  @IsObject()
  schedule?: any;

  @ApiPropertyOptional({ description: 'Report format', enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Report status', enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Is report active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReportFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Report type filter', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: 'Report status filter', enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Is active filter' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Created after date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

export class ExecuteReportDto {
  @ApiPropertyOptional({ description: 'Execution parameters' })
  @IsOptional()
  @IsObject()
  parameters?: any;

  @ApiPropertyOptional({ description: 'Output format', enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}