import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({ description: 'Entity type that was modified' })
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'Entity ID that was modified' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Old values before change' })
  @IsOptional()
  @IsObject()
  oldValues?: any;

  @ApiPropertyOptional({ description: 'New values after change' })
  @IsOptional()
  @IsObject()
  newValues?: any;

  @ApiPropertyOptional({ description: 'Summary of changes made' })
  @IsOptional()
  @IsObject()
  changes?: any;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class AuditLogFilterDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Entity type filter' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID filter' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Action filter' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'IP address filter' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Created after date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}