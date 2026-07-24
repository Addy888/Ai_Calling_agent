import { IsString, IsOptional, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';

export enum SettingType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  ARRAY = 'ARRAY',
}

export enum SettingCategory {
  COMPANY = 'COMPANY',
  USER = 'USER',
  SECURITY = 'SECURITY',
  NOTIFICATION = 'NOTIFICATION',
  APPLICATION = 'APPLICATION',
  INTEGRATION = 'INTEGRATION',
  THEME = 'THEME',
  LANGUAGE = 'LANGUAGE',
}

export class CreateSettingDto {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Setting type', enum: SettingType })
  @IsEnum(SettingType)
  type: SettingType;

  @ApiPropertyOptional({ description: 'Setting category', enum: SettingCategory })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is setting public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ description: 'Setting metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateSettingDto {
  @ApiPropertyOptional({ description: 'Setting value' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Setting type', enum: SettingType })
  @IsOptional()
  @IsEnum(SettingType)
  type?: SettingType;

  @ApiPropertyOptional({ description: 'Setting category', enum: SettingCategory })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is setting public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Setting metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SettingFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Setting type filter', enum: SettingType })
  @IsOptional()
  @IsEnum(SettingType)
  type?: SettingType;

  @ApiPropertyOptional({ description: 'Setting category filter', enum: SettingCategory })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiPropertyOptional({ description: 'Show only public settings' })
  @IsOptional()
  @IsBoolean()
  publicOnly?: boolean;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({ description: 'Settings to update', isArray: true })
  settings: Array<{
    key: string;
    value: string;
    type?: SettingType;
    category?: SettingCategory;
  }>;
}

export class CompanySettingsDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company email' })
  @IsOptional()
  @IsString()
  companyEmail?: string;

  @ApiPropertyOptional({ description: 'Company phone' })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiPropertyOptional({ description: 'Company website' })
  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @ApiPropertyOptional({ description: 'Company timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Company currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Date format' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ description: 'Time format' })
  @IsOptional()
  @IsString()
  timeFormat?: string;
}

export class NotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Campaign notifications' })
  @IsOptional()
  @IsBoolean()
  campaignNotifications?: boolean;

  @ApiPropertyOptional({ description: 'System notifications' })
  @IsOptional()
  @IsBoolean()
  systemNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Security notifications' })
  @IsOptional()
  @IsBoolean()
  securityNotifications?: boolean;
}

export class SecuritySettingsDto {
  @ApiPropertyOptional({ description: 'Session timeout in minutes' })
  @IsOptional()
  sessionTimeout?: number;

  @ApiPropertyOptional({ description: 'Password expiry days' })
  @IsOptional()
  passwordExpiry?: number;

  @ApiPropertyOptional({ description: 'Enable two-factor authentication' })
  @IsOptional()
  @IsBoolean()
  twoFactorAuth?: boolean;

  @ApiPropertyOptional({ description: 'Login attempt limit' })
  @IsOptional()
  loginAttemptLimit?: number;

  @ApiPropertyOptional({ description: 'Account lockout duration in minutes' })
  @IsOptional()
  lockoutDuration?: number;

  @ApiPropertyOptional({ description: 'Require strong passwords' })
  @IsOptional()
  @IsBoolean()
  strongPasswords?: boolean;
}