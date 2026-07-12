import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsDate,
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LeadStatus {
  NEW = 'NEW',
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALL_BACK_LATER = 'CALL_BACK_LATER',
  WRONG_NUMBER = 'WRONG_NUMBER',
  BUSY = 'BUSY',
  DO_NOT_CALL = 'DO_NOT_CALL',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export class CreateConversationMemoryDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentIntent?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  currentLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conversationState?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateConversationMemoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentIntent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conversationState?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateCustomerMemoryDto {
  @ApiProperty()
  @IsString()
  conversationId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  interests?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  previousInterests?: any;

  @ApiPropertyOptional({ enum: LeadStatus, default: LeadStatus.NEW })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  qualification?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customerPreferences?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastConversationDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastFollowupDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextFollowupDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateCustomerMemoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  interests?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  previousInterests?: any;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  qualification?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customerPreferences?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastConversationDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastFollowupDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextFollowupDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateSessionMemoryDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  greetingCompleted?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  qualificationCompleted?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  budgetCollected?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  locationCollected?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  projectSuggested?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  closingCompleted?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  conversationFinished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentStep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  collectedData?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conversationFlow?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateSessionMemoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  greetingCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  qualificationCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  budgetCollected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  locationCollected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  projectSuggested?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  closingCompleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  conversationFinished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentStep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  collectedData?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conversationFlow?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateMemorySnapshotDto {
  @ApiProperty()
  @IsString()
  conversationId: string;

  @ApiProperty()
  @IsString()
  snapshotType: string;

  @ApiProperty()
  @IsObject()
  snapshotData: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateMemoryConfigurationDto {
  @ApiPropertyOptional({ default: 1800 })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  sessionTimeout?: number;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  maxHistoryLength?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enableAutoSave?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  autoSaveInterval?: number;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enableCompression?: boolean;

  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10000)
  compressionThreshold?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enableEncryption?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class GetCustomerContextDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class RestoreConversationDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
