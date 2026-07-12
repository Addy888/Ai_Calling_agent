import { IsString, IsNumber, IsOptional, IsDateString, IsArray, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsMetric {
  TOTAL_COMPANIES = 'total_companies',
  TOTAL_USERS = 'total_users',
  TOTAL_CAMPAIGNS = 'total_campaigns',
  TOTAL_CONTACTS = 'total_contacts',
  TOTAL_SCRIPTS = 'total_scripts',
  TOTAL_PROMPTS = 'total_prompts',
  TOTAL_KNOWLEDGE_BASE = 'total_knowledge_base',
  TOTAL_VOICE_PROFILES = 'total_voice_profiles',
  CAMPAIGN_PERFORMANCE = 'campaign_performance',
  CONTACT_GROWTH = 'contact_growth',
  USER_ACTIVITY = 'user_activity',
}

export enum AnalyticsCategory {
  DASHBOARD = 'dashboard',
  CAMPAIGNS = 'campaigns',
  CONTACTS = 'contacts',
  USERS = 'users',
  SYSTEM = 'system',
}

export enum DateRangeType {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

export class CreateAnalyticsDto {
  @ApiProperty({ description: 'Analytics metric name', enum: AnalyticsMetric })
  @IsEnum(AnalyticsMetric)
  metric: AnalyticsMetric;

  @ApiProperty({ description: 'Analytics category', enum: AnalyticsCategory })
  @IsEnum(AnalyticsCategory)
  category: AnalyticsCategory;

  @ApiProperty({ description: 'Metric value' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Date for the metric' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'First dimension' })
  @IsOptional()
  @IsString()
  dimension1?: string;

  @ApiPropertyOptional({ description: 'Second dimension' })
  @IsOptional()
  @IsString()
  dimension2?: string;

  @ApiPropertyOptional({ description: 'Third dimension' })
  @IsOptional()
  @IsString()
  dimension3?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class AnalyticsFilterDto {
  @ApiPropertyOptional({ description: 'Metrics to filter', isArray: true, enum: AnalyticsMetric })
  @IsOptional()
  @IsArray()
  @IsEnum(AnalyticsMetric, { each: true })
  metrics?: AnalyticsMetric[];

  @ApiPropertyOptional({ description: 'Categories to filter', isArray: true, enum: AnalyticsCategory })
  @IsOptional()
  @IsArray()
  @IsEnum(AnalyticsCategory, { each: true })
  categories?: AnalyticsCategory[];

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Predefined date range', enum: DateRangeType })
  @IsOptional()
  @IsEnum(DateRangeType)
  dateRange?: DateRangeType;

  @ApiPropertyOptional({ description: 'First dimension filter' })
  @IsOptional()
  @IsString()
  dimension1?: string;

  @ApiPropertyOptional({ description: 'Second dimension filter' })
  @IsOptional()
  @IsString()
  dimension2?: string;

  @ApiPropertyOptional({ description: 'Third dimension filter' })
  @IsOptional()
  @IsString()
  dimension3?: string;
}

export class DashboardStatsDto {
  @ApiPropertyOptional({ description: 'Date range for stats', enum: DateRangeType, default: DateRangeType.LAST_30_DAYS })
  @IsOptional()
  @IsEnum(DateRangeType)
  dateRange?: DateRangeType = DateRangeType.LAST_30_DAYS;

  @ApiPropertyOptional({ description: 'Include growth percentages', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeGrowth?: boolean = true;
}

export class ChartDataDto {
  @ApiProperty({ description: 'Chart metric', enum: AnalyticsMetric })
  @IsEnum(AnalyticsMetric)
  metric: AnalyticsMetric;

  @ApiProperty({ description: 'Date range', enum: DateRangeType })
  @IsEnum(DateRangeType)
  dateRange: DateRangeType;

  @ApiPropertyOptional({ description: 'Custom start date for CUSTOM range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Custom end date for CUSTOM range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Group by dimension' })
  @IsOptional()
  @IsString()
  groupBy?: string;
}