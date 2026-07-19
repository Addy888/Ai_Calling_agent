import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================
// UPLOAD DTOs
// ============================================

export class UploadDatasetDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'File hash (MD5 or SHA256)' })
  @IsString()
  fileHash: string;

  @ApiPropertyOptional({ description: 'File MIME type' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkUploadDto {
  @ApiProperty({ description: 'Array of files to upload', type: [UploadDatasetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadDatasetDto)
  files: UploadDatasetDto[];

  @ApiPropertyOptional({ description: 'Auto-start processing after upload' })
  @IsBoolean()
  @IsOptional()
  autoProcess?: boolean;
}

// ============================================
// VALIDATION DTOs
// ============================================

export class ValidationReportDto {
  @ApiProperty({ description: 'Validation status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Duration in seconds' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({ description: 'Sample rate in Hz' })
  @IsNumber()
  @IsOptional()
  sampleRate?: number;

  @ApiProperty({ description: 'Number of channels' })
  @IsNumber()
  @IsOptional()
  channels?: number;

  @ApiProperty({ description: 'Bitrate in kbps' })
  @IsNumber()
  @IsOptional()
  bitrate?: number;

  @ApiProperty({ description: 'Noise level (0-1)' })
  @IsNumber()
  @IsOptional()
  noiseLevel?: number;

  @ApiProperty({ description: 'Silence percentage (0-100)' })
  @IsNumber()
  @IsOptional()
  silencePercent?: number;

  @ApiProperty({ description: 'Is file corrupted' })
  @IsBoolean()
  @IsOptional()
  isCorrupted?: boolean;

  @ApiProperty({ description: 'Validation issues' })
  @IsArray()
  @IsOptional()
  issues?: string[];
}

// ============================================
// TRANSCRIPTION DTOs
// ============================================

export class TranscriptSegmentDto {
  @ApiProperty({ description: 'Start time in seconds' })
  @IsNumber()
  start: number;

  @ApiProperty({ description: 'End time in seconds' })
  @IsNumber()
  end: number;

  @ApiProperty({ description: 'Segment text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Confidence score' })
  @IsNumber()
  @IsOptional()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Speaker label' })
  @IsString()
  @IsOptional()
  speaker?: string;
}

export class TranscriptionOptionsDto {
  @ApiPropertyOptional({ description: 'Transcription engine', default: 'faster-whisper' })
  @IsString()
  @IsOptional()
  engine?: string;

  @ApiPropertyOptional({ description: 'Model size', default: 'base' })
  @IsString()
  @IsOptional()
  modelSize?: string;

  @ApiPropertyOptional({ description: 'Language hint' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Enable diarization' })
  @IsBoolean()
  @IsOptional()
  enableDiarization?: boolean;
}

// ============================================
// DIARIZATION DTOs
// ============================================

export class SpeakerSegmentDto {
  @ApiProperty({ description: 'Speaker label' })
  @IsString()
  speaker: string;

  @ApiProperty({ description: 'Start time in seconds' })
  @IsNumber()
  start: number;

  @ApiProperty({ description: 'End time in seconds' })
  @IsNumber()
  end: number;

  @ApiProperty({ description: 'Segment text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Confidence score' })
  @IsNumber()
  @IsOptional()
  confidence?: number;
}

export class DiarizationResultDto {
  @ApiProperty({ description: 'Number of speakers detected' })
  @IsNumber()
  speakerCount: number;

  @ApiProperty({ description: 'Speaker segments', type: [SpeakerSegmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakerSegmentDto)
  segments: SpeakerSegmentDto[];

  @ApiPropertyOptional({ description: 'Agent segments count' })
  @IsNumber()
  @IsOptional()
  agentSegments?: number;

  @ApiPropertyOptional({ description: 'Customer segments count' })
  @IsNumber()
  @IsOptional()
  customerSegments?: number;
}

// ============================================
// CONVERSATION DTOs
// ============================================

export class ConversationMessageDto {
  @ApiProperty({ description: 'Speaker role', enum: ['AGENT', 'CUSTOMER', 'UNKNOWN'] })
  @IsString()
  role: string;

  @ApiProperty({ description: 'Message text' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Start time in seconds' })
  @IsNumber()
  timestamp: number;

  @ApiPropertyOptional({ description: 'Message duration' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Confidence score' })
  @IsNumber()
  @IsOptional()
  confidence?: number;
}

export class ConversationStructureDto {
  @ApiProperty({ description: 'Conversation messages', type: [ConversationMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  messages: ConversationMessageDto[];

  @ApiProperty({ description: 'Total message count' })
  @IsNumber()
  messageCount: number;

  @ApiPropertyOptional({ description: 'Agent messages count' })
  @IsNumber()
  @IsOptional()
  agentMessages?: number;

  @ApiPropertyOptional({ description: 'Customer messages count' })
  @IsNumber()
  @IsOptional()
  customerMessages?: number;

  @ApiPropertyOptional({ description: 'Turn count' })
  @IsNumber()
  @IsOptional()
  turnCount?: number;
}

// ============================================
// ENTITY EXTRACTION DTOs
// ============================================

export enum EntityType {
  BUDGET = 'BUDGET',
  LOCATION = 'LOCATION',
  PROPERTY = 'PROPERTY',
  PHONE = 'PHONE',
  NAME = 'NAME',
  EMAIL = 'EMAIL',
  ADDRESS = 'ADDRESS',
  VISIT_DATE = 'VISIT_DATE',
  CALLBACK_TIME = 'CALLBACK_TIME',
  LOAN = 'LOAN',
  DATE = 'DATE',
  TIME = 'TIME',
  CURRENCY = 'CURRENCY',
  ORGANIZATION = 'ORGANIZATION',
}

export class ExtractedEntityDto {
  @ApiProperty({ description: 'Entity type', enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'Entity value' })
  @IsString()
  entityValue: string;

  @ApiPropertyOptional({ description: 'Confidence score' })
  @IsNumber()
  @IsOptional()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Context where entity was found' })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({ description: 'Is entity masked' })
  @IsBoolean()
  @IsOptional()
  isMasked?: boolean;

  @ApiPropertyOptional({ description: 'Masked value' })
  @IsString()
  @IsOptional()
  maskedValue?: string;
}

// ============================================
// INTENT DETECTION DTOs
// ============================================

export enum IntentType {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALLBACK = 'CALLBACK',
  PRICING = 'PRICING',
  LOAN = 'LOAN',
  LOCATION = 'LOCATION',
  SITE_VISIT = 'SITE_VISIT',
  BOOKING = 'BOOKING',
  COMPLAINT = 'COMPLAINT',
  GENERAL_QUERY = 'GENERAL_QUERY',
}

export class DetectedIntentDto {
  @ApiProperty({ description: 'Intent type', enum: IntentType })
  @IsEnum(IntentType)
  intentType: IntentType;

  @ApiProperty({ description: 'Confidence score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Context where intent was detected' })
  @IsString()
  @IsOptional()
  context?: string;
}

// ============================================
// LEAD CLASSIFICATION DTOs
// ============================================

export enum LeadClassificationType {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  QUALIFIED = 'QUALIFIED',
  REJECTED = 'REJECTED',
}

export class LeadClassificationDto {
  @ApiProperty({ description: 'Lead classification', enum: LeadClassificationType })
  @IsEnum(LeadClassificationType)
  classification: LeadClassificationType;

  @ApiProperty({ description: 'Classification score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Confidence level' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Classification factors' })
  @IsObject()
  @IsOptional()
  factors?: Record<string, any>;
}

// ============================================
// PROCESSING JOB DTOs
// ============================================

export enum DatasetJobType {
  VALIDATION = 'VALIDATION',
  TRANSCRIPTION = 'TRANSCRIPTION',
  DIARIZATION = 'DIARIZATION',
  CONVERSATION_PARSING = 'CONVERSATION_PARSING',
  ENTITY_EXTRACTION = 'ENTITY_EXTRACTION',
  INTENT_DETECTION = 'INTENT_DETECTION',
  LEAD_CLASSIFICATION = 'LEAD_CLASSIFICATION',
  PII_MASKING = 'PII_MASKING',
  EXPORT = 'EXPORT',
}

export class CreateDatasetJobDto {
  @ApiProperty({ description: 'Dataset record ID' })
  @IsString()
  datasetRecordId: string;

  @ApiProperty({ description: 'Job type', enum: DatasetJobType })
  @IsEnum(DatasetJobType)
  jobType: DatasetJobType;

  @ApiPropertyOptional({ description: 'Job priority', default: 0 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Job metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class DatasetJobQueryDto {
  @ApiPropertyOptional({ description: 'Dataset record ID' })
  @IsString()
  @IsOptional()
  datasetRecordId?: string;

  @ApiPropertyOptional({ description: 'Job type', enum: DatasetJobType })
  @IsEnum(DatasetJobType)
  @IsOptional()
  jobType?: DatasetJobType;

  @ApiPropertyOptional({ description: 'Job status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// EXPORT DTOs
// ============================================

export enum ExportFormat {
  JSON = 'JSON',
  JSONL = 'JSONL',
  CSV = 'CSV',
  SQLITE = 'SQLITE',
}

export class CreateExportDto {
  @ApiProperty({ description: 'Export name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Export description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Export format', enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ description: 'Filter criteria' })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Include PII data' })
  @IsBoolean()
  @IsOptional()
  includePII?: boolean;

  @ApiPropertyOptional({ description: 'Include raw transcripts' })
  @IsBoolean()
  @IsOptional()
  includeTranscripts?: boolean;

  @ApiPropertyOptional({ description: 'Include conversations' })
  @IsBoolean()
  @IsOptional()
  includeConversations?: boolean;

  @ApiPropertyOptional({ description: 'Include entities' })
  @IsBoolean()
  @IsOptional()
  includeEntities?: boolean;

  @ApiPropertyOptional({ description: 'Include intents' })
  @IsBoolean()
  @IsOptional()
  includeIntents?: boolean;
}

// ============================================
// QUERY DTOs
// ============================================

export class DatasetQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by processing stage' })
  @IsString()
  @IsOptional()
  processingStage?: string;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// DASHBOARD DTOs
// ============================================

export class DatasetDashboardDto {
  @ApiProperty({ description: 'Total files' })
  totalFiles: number;

  @ApiProperty({ description: 'Processed files' })
  processed: number;

  @ApiProperty({ description: 'Pending files' })
  pending: number;

  @ApiProperty({ description: 'Failed files' })
  failed: number;

  @ApiProperty({ description: 'Languages detected' })
  languages: { language: string; count: number }[];

  @ApiProperty({ description: 'Total duration in seconds' })
  totalDuration: number;

  @ApiProperty({ description: 'Storage used in bytes' })
  storageUsed: number;

  @ApiProperty({ description: 'Average noise level' })
  averageNoiseLevel: number;

  @ApiProperty({ description: 'Processing statistics' })
  processingStats: {
    validation: number;
    transcription: number;
    diarization: number;
    conversation: number;
    entityExtraction: number;
    intentDetection: number;
  };
}

// ============================================
// STATISTICS DTOs
// ============================================

export class ProcessingStatisticsDto {
  @ApiProperty({ description: 'Total processing time in seconds' })
  totalProcessingTime: number;

  @ApiProperty({ description: 'Average processing time per file' })
  averageProcessingTime: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Failure rate percentage' })
  failureRate: number;

  @ApiProperty({ description: 'Processing by stage' })
  byStage: Record<string, number>;

  @ApiProperty({ description: 'Processing by status' })
  byStatus: Record<string, number>;
}
