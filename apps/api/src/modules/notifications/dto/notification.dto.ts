import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  INFO = 'INFO',
  SYSTEM = 'SYSTEM',
}

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Target user ID (if null, notification is for all users)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Notification type', enum: NotificationType, default: NotificationType.INFO })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.INFO;

  @ApiPropertyOptional({ description: 'Notification category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Action URL' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Notification title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Notification type', enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Notification category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Action URL' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class NotificationFilterDto {
  @ApiPropertyOptional({ description: 'Notification types', isArray: true, enum: NotificationType })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Is read filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Include expired notifications' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeExpired?: boolean = false;

  @ApiPropertyOptional({ description: 'Created after date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Notification IDs to mark as read', isArray: true })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class BulkDeleteDto {
  @ApiProperty({ description: 'Notification IDs to delete', isArray: true })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}