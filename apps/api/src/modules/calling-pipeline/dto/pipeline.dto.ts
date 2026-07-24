import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber, IsEnum, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallState, CampaignState } from '../enums/call-state.enum';

/**
 * Start Campaign DTO
 */
export class StartCampaignDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsUUID()
  campaignId: string;

  @ApiPropertyOptional({ description: 'Company ID' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Number of concurrent calls', default: 1 })
  @IsNumber()
  @IsOptional()
  concurrentCalls?: number;

  @ApiPropertyOptional({ description: 'Auto-start flag', default: true })
  @IsBoolean()
  @IsOptional()
  autoStart?: boolean;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

/**
 * Pause Campaign DTO
 */
export class PauseCampaignDto {
  @ApiProperty({ description: 'Campaign execution ID' })
  @IsUUID()
  executionId: string;

  @ApiPropertyOptional({ description: 'Reason for pausing' })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Resume Campaign DTO
 */
export class ResumeCampaignDto {
  @ApiProperty({ description: 'Campaign execution ID' })
  @IsUUID()
  executionId: string;
}

/**
 * Stop Campaign DTO
 */
export class StopCampaignDto {
  @ApiProperty({ description: 'Campaign execution ID' })
  @IsUUID()
  executionId: string;

  @ApiPropertyOptional({ description: 'Force stop flag', default: false })
  @IsBoolean()
  @IsOptional()
  force?: boolean;

  @ApiPropertyOptional({ description: 'Reason for stopping' })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Start Call DTO
 */
export class StartCallDto {
  @ApiProperty({ description: 'Contact ID' })
  @IsUUID()
  contactId: string;

  @ApiProperty({ description: 'Campaign ID' })
  @IsUUID()
  campaignId: string;

  @ApiPropertyOptional({ description: 'AI Agent ID' })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Override phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

/**
 * End Call DTO
 */
export class EndCallDto {
  @ApiProperty({ description: 'Call session ID' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Reason for ending call' })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Process Speech DTO
 */
export class ProcessSpeechDto {
  @ApiProperty({ description: 'Call session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Transcribed text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Confidence score', default: 1.0 })
  @IsNumber()
  @IsOptional()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Is final transcript', default: true })
  @IsBoolean()
  @IsOptional()
  isFinal?: boolean;
}

/**
 * Campaign Status Response
 */
export class CampaignStatusResponse {
  @ApiProperty({ description: 'Execution ID' })
  executionId: string;

  @ApiProperty({ description: 'Campaign ID' })
  campaignId: string;

  @ApiProperty({ description: 'Campaign state', enum: CampaignState })
  state: CampaignState;

  @ApiProperty({ description: 'Total contacts' })
  totalContacts: number;

  @ApiProperty({ description: 'Processed contacts' })
  processedContacts: number;

  @ApiProperty({ description: 'Successful calls' })
  successfulCalls: number;

  @ApiProperty({ description: 'Failed calls' })
  failedCalls: number;

  @ApiProperty({ description: 'Active calls' })
  activeCalls: number;

  @ApiProperty({ description: 'Started at' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Progress percentage' })
  progressPercentage: number;
}

/**
 * Call Status Response
 */
export class CallStatusResponse {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Call state', enum: CallState })
  state: CallState;

  @ApiProperty({ description: 'Contact ID' })
  contactId: string;

  @ApiProperty({ description: 'Campaign ID' })
  campaignId: string;

  @ApiProperty({ description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Started at' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Connected at' })
  connectedAt?: Date;

  @ApiPropertyOptional({ description: 'Ended at' })
  endedAt?: Date;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  duration?: number;

  @ApiProperty({ description: 'Conversation turns' })
  conversationTurns: number;

  @ApiPropertyOptional({ description: 'Current context' })
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Recording URL' })
  recordingUrl?: string;

  @ApiPropertyOptional({ description: 'Call SID' })
  callSid?: string;

  @ApiPropertyOptional({ description: 'Error message' })
  error?: string;
}


/**
 * Active Calls Response
 */
export class ActiveCallsResponse {
  @ApiProperty({ description: 'Total active calls' })
  total: number;

  @ApiProperty({ description: 'Active call sessions', type: [CallStatusResponse] })
  calls: CallStatusResponse[];
}

/**
 * Pipeline Status Response
 */
export class PipelineStatusResponse {
  @ApiProperty({ description: 'Pipeline status' })
  status: string;

  @ApiProperty({ description: 'Active campaigns' })
  activeCampaigns: number;

  @ApiProperty({ description: 'Total active calls' })
  activeCalls: number;

  @ApiProperty({ description: 'Queued calls' })
  queuedCalls: number;

  @ApiProperty({ description: 'Total calls today' })
  totalCallsToday: number;

  @ApiProperty({ description: 'Successful calls today' })
  successfulCallsToday: number;

  @ApiProperty({ description: 'System health' })
  health: {
    stt: string;
    tts: string;
    telephony: string;
    llm: string;
  };
}
