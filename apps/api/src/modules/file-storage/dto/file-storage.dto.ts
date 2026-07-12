import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileCategory {
  VOICE = 'VOICE',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  PROFILE = 'PROFILE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  OTHER = 'OTHER',
}

export class CreateFileStorageDto {
  @ApiProperty({ description: 'Original file name' })
  @IsString()
  originalName: string;

  @ApiProperty({ description: 'File path on server' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'File type/extension' })
  @IsString()
  fileType: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({ description: 'File category', enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is file publicly accessible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateFileStorageDto {
  @ApiPropertyOptional({ description: 'Original file name' })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({ description: 'File category', enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is file publicly accessible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class FileStorageFilterDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'File category filter', enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'File type filter' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ description: 'MIME type filter' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Show only public files' })
  @IsOptional()
  @IsBoolean()
  publicOnly?: boolean;

  @ApiPropertyOptional({ description: 'Minimum file size' })
  @IsOptional()
  @IsNumber()
  minSize?: number;

  @ApiPropertyOptional({ description: 'Maximum file size' })
  @IsOptional()
  @IsNumber()
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Uploaded by user ID' })
  @IsOptional()
  @IsString()
  uploadedBy?: string;
}