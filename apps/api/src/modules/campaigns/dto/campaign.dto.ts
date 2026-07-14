import { 
  IsString, 
  IsOptional, 
  IsUUID, 
  IsEnum, 
  IsDateString, 
  MaxLength, 
  IsObject, 
  IsArray,
  IsBoolean
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.DRAFT })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: '2024-07-15T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-07-30T17:00:00Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  timezone?: string;

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

export class CampaignFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CampaignStatus, isArray: true })
  @IsOptional()
  @IsEnum(CampaignStatus, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
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
  @Transform(({ value }) => value === 'true')
  includeArchived?: boolean;
}

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
