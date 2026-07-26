import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsObject, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ContactCallStatus } from '@prisma/client';

export class CreateCampaignContactDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MaxLength(50)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export class BulkCreateCampaignContactsDto {
  @IsArray()
  @Type(() => CreateCampaignContactDto)
  contacts: CreateCampaignContactDto[];

  @IsOptional()
  @IsString()
  uploadId?: string;
}

export class ContactUploadResultDto {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  errors: Array<{
    row: number;
    phone?: string;
    errors: string[];
  }>;
}

export class CampaignContactFilterDto {
  @IsOptional()
  @IsEnum(ContactCallStatus)
  status?: ContactCallStatus;

  @IsOptional()
  @IsString()
  uploadId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}
