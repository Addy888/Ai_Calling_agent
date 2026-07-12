import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentFileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  CSV = 'CSV',
  MARKDOWN = 'MARKDOWN',
  JSON = 'JSON',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ChunkType {
  PARAGRAPH = 'PARAGRAPH',
  HEADING = 'HEADING',
  SENTENCE = 'SENTENCE',
  TOKEN = 'TOKEN',
  CUSTOM = 'CUSTOM',
}

export enum EmbeddingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum SearchType {
  KEYWORD = 'KEYWORD',
  SEMANTIC = 'SEMANTIC',
  HYBRID = 'HYBRID',
  METADATA = 'METADATA',
}

export class UploadDocumentDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Document name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DocumentFileType, description: 'File type' })
  @IsEnum(DocumentFileType)
  fileType: DocumentFileType;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Language', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Author' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Priority', default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;
}

export class ProcessDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ enum: ChunkType, description: 'Chunk type', default: 'PARAGRAPH' })
  @IsOptional()
  @IsEnum(ChunkType)
  chunkType?: ChunkType;

  @ApiPropertyOptional({ description: 'Chunk size', default: 512 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  chunkSize?: number;

  @ApiPropertyOptional({ description: 'Chunk overlap', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  chunkOverlap?: number;
}

export class CreateChunksDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Content to chunk' })
  @IsString()
  content: string;

  @ApiProperty({ enum: ChunkType, description: 'Chunk type' })
  @IsEnum(ChunkType)
  chunkType: ChunkType;

  @ApiPropertyOptional({ description: 'Chunk size', default: 512 })
  @IsOptional()
  @IsInt()
  chunkSize?: number;

  @ApiPropertyOptional({ description: 'Chunk overlap', default: 50 })
  @IsOptional()
  @IsInt()
  chunkOverlap?: number;
}

export class SearchKnowledgeDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiProperty({ enum: SearchType, description: 'Search type' })
  @IsEnum(SearchType)
  searchType: SearchType;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Language filter' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'File type filter' })
  @IsOptional()
  @IsEnum(DocumentFileType)
  fileType?: DocumentFileType;

  @ApiPropertyOptional({ description: 'Tags filter', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Number of results', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  topK?: number;

  @ApiPropertyOptional({ description: 'Minimum score', default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Author' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Status' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}

export class GetDocumentsDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Language filter' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: DocumentFileType, description: 'File type filter' })
  @IsOptional()
  @IsEnum(DocumentFileType)
  fileType?: DocumentFileType;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Status filter' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: ProcessingStatus, description: 'Processing status filter' })
  @IsOptional()
  @IsEnum(ProcessingStatus)
  processingStatus?: ProcessingStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class GetChunksDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ enum: ChunkType, description: 'Chunk type filter' })
  @IsOptional()
  @IsEnum(ChunkType)
  chunkType?: ChunkType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class CreateEmbeddingJobDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ description: 'Provider', default: 'openai' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Model', default: 'text-embedding-ada-002' })
  @IsOptional()
  @IsString()
  model?: string;
}

export class GetSearchHistoryDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: SearchType, description: 'Search type filter' })
  @IsOptional()
  @IsEnum(SearchType)
  searchType?: SearchType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
