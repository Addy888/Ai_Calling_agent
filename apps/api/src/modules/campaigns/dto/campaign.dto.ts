import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  MaxLength,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Sales Campaign 2024' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Outbound sales campaign for Q2' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  scriptId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  promptId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  voiceId?: string;

  @ApiPropertyOptional({ description: 'Telephony profile (GSM Gateway + SIM configuration)' })
  @IsUUID()
  @IsOptional()
  telephonyProfileId?: string;

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.DRAFT })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: { callsPerDay: 100, retryAttempts: 3 } })
  @IsObject()
  @IsOptional()
  settings?: any;

  @ApiPropertyOptional({ example: ['lead', 'enterprise'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Important notes about the campaign' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class UpdateCampaignStatusDto {
  @ApiProperty({ enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  status: CampaignStatus;
}

/** Nested filters object sent as filters[key]=value */
export class CampaignFilterDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CampaignStatus, isArray: true })
  @IsOptional()
  @IsEnum(CampaignStatus, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value as CampaignStatus];
    return value;
  })
  status?: CampaignStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scriptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean;
}

/**
 * Combined query DTO for GET /campaigns.
 * Extends PaginationDto so that page, limit, search, sortBy, sortOrder
 * are all declared on this single DTO — used with a single @Query() decorator.
 */
export class CampaignQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CampaignStatus, isArray: true })
  @IsOptional()
  @IsEnum(CampaignStatus, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value as CampaignStatus];
    return value;
  })
  status?: CampaignStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scriptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean;

  @ApiPropertyOptional({ type: CampaignFilterDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignFilterDetailsDto)
  filters?: CampaignFilterDetailsDto;
}

/** @deprecated — use CampaignQueryDto. Kept for backward compatibility with service layer. */
export class CampaignFilterDto extends CampaignQueryDto {}

export class AssignContactsDto {
  @ApiProperty({ example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID(4, { each: true })
  contactIds: string[];
}

export class AssignScriptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scriptId?: string;
}

export class AssignPromptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promptId?: string;
}

export class CloneCampaignDto {
  @ApiProperty({ example: 'Cloned Campaign Name' })
  @IsString()
  @MaxLength(255)
  name: string;
}
