/**
 * Conversation Runtime DTOs
 * Data Transfer Objects for conversation runtime API
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationEndReason } from '../enums/conversation-state.enum';

/**
 * Start Conversation DTO
 */
export class StartConversationDto {
  @ApiProperty({
    description: 'Call ID',
    example: 'call_123456',
  })
  @IsString()
  @IsNotEmpty()
  callId: string;

  @ApiProperty({
    description: 'Campaign ID',
    example: 'campaign_789',
  })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({
    description: 'Contact ID',
    example: 'contact_456',
  })
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @ApiProperty({
    description: 'Company ID',
    example: 'company_123',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Customer language',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  customerLanguage?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'campaign' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Send Message DTO
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Customer message',
    example: 'Yes, I am interested',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { confidence: 0.95 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * End Conversation DTO
 */
export class EndConversationDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'End reason',
    enum: ConversationEndReason,
    example: ConversationEndReason.COMPLETED,
  })
  @IsEnum(ConversationEndReason)
  @IsNotEmpty()
  reason: ConversationEndReason;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { userInitiated: true },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Handle Silence DTO
 */
export class HandleSilenceDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Get Session DTO
 */
export class GetSessionDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Get Transcript DTO
 */
export class GetTranscriptDto {
  @ApiProperty({
    description: 'Call ID',
    example: 'call_123456',
  })
  @IsString()
  @IsNotEmpty()
  callId: string;
}

/**
 * Pause Conversation DTO
 */
export class PauseConversationDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Resume Conversation DTO
 */
export class ResumeConversationDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Conversation Response DTO
 */
export class ConversationResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'AI response text',
    example: 'Thank you for your interest! I would love to tell you more about our product.',
  })
  response: string;

  @ApiProperty({
    description: 'Response confidence score',
    example: 0.92,
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'Detected intent',
    example: 'interested',
  })
  intent?: string;

  @ApiProperty({
    description: 'Should end conversation',
    example: false,
  })
  shouldEndConversation: boolean;

  @ApiPropertyOptional({
    description: 'Generation duration in ms',
    example: 1250,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  metadata?: Record<string, any>;
}

/**
 * Session Response DTO
 */
export class SessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Call ID',
    example: 'call_123456',
  })
  callId: string;

  @ApiProperty({
    description: 'Campaign ID',
    example: 'campaign_789',
  })
  campaignId: string;

  @ApiProperty({
    description: 'Current state',
    example: 'waiting',
  })
  state: string;

  @ApiProperty({
    description: 'Is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Turn count',
    example: 5,
  })
  turnCount: number;

  @ApiProperty({
    description: 'Start time',
    example: '2025-01-15T10:30:00Z',
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: 'End time',
    example: '2025-01-15T10:35:00Z',
  })
  endedAt?: Date;

  @ApiPropertyOptional({
    description: 'Duration in milliseconds',
    example: 300000,
  })
  duration?: number;
}

/**
 * Transcript Response DTO
 */
export class TranscriptResponseDto {
  @ApiProperty({
    description: 'Call ID',
    example: 'call_123456',
  })
  callId: string;

  @ApiProperty({
    description: 'Full transcript content',
  })
  content: string;

  @ApiProperty({
    description: 'Transcript entries',
    type: [Object],
  })
  entries: Array<{
    speaker: string;
    content: string;
    timestamp: Date;
    intent?: string;
    confidence?: number;
  }>;

  @ApiPropertyOptional({
    description: 'Metadata',
  })
  metadata?: Record<string, any>;
}

/**
 * Statistics Response DTO
 */
export class StatisticsResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'conv_123456',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Duration in milliseconds',
    example: 300000,
  })
  duration: number;

  @ApiProperty({
    description: 'Total turns',
    example: 10,
  })
  turnCount: number;

  @ApiProperty({
    description: 'Customer message count',
    example: 5,
  })
  customerMessageCount: number;

  @ApiProperty({
    description: 'AI message count',
    example: 5,
  })
  aiMessageCount: number;

  @ApiProperty({
    description: 'Average response time in ms',
    example: 1500,
  })
  averageResponseTime: number;

  @ApiProperty({
    description: 'Detected intents',
    type: [Object],
  })
  detectedIntents: Array<{
    intent: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Silence count',
    example: 1,
  })
  silenceCount: number;
}
