/**
 * Call Response DTOs
 * Data Transfer Objects for call-related responses
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallDirection, CallState, ProviderType } from '../enums/call-state.enum';

/**
 * Call Response DTO
 */
export class CallResponseDto {
  @ApiProperty({
    description: 'Call SID (unique identifier)',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  callSid: string;

  @ApiProperty({
    description: 'Provider-specific call ID',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  providerCallId: string;

  @ApiProperty({
    description: 'Call status',
    enum: CallState,
    example: CallState.RINGING,
  })
  status: CallState;

  @ApiProperty({
    description: 'Call direction',
    enum: CallDirection,
    example: CallDirection.OUTBOUND,
  })
  direction: CallDirection;

  @ApiProperty({
    description: 'Destination phone number',
    example: '+1234567890',
  })
  to: string;

  @ApiProperty({
    description: 'Source phone number',
    example: '+0987654321',
  })
  from: string;

  @ApiPropertyOptional({
    description: 'Call price',
    example: '0.013',
  })
  price?: string;

  @ApiPropertyOptional({
    description: 'Price currency unit',
    example: 'USD',
  })
  priceUnit?: string;

  @ApiPropertyOptional({
    description: 'Call duration in seconds',
    example: 120,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Call start time',
    example: '2025-01-15T10:30:00Z',
  })
  startTime?: Date;

  @ApiPropertyOptional({
    description: 'Call end time',
    example: '2025-01-15T10:32:00Z',
  })
  endTime?: Date;

  @ApiPropertyOptional({
    description: 'Answered by (for machine detection)',
    enum: ['human', 'machine', 'unknown'],
    example: 'human',
  })
  answeredBy?: 'human' | 'machine' | 'unknown';

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { campaignId: 'camp_123' },
  })
  metadata?: Record<string, any>;
}

/**
 * Call Session Response DTO
 */
export class CallSessionResponseDto {
  @ApiProperty({
    description: 'Call SID',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  callSid: string;

  @ApiProperty({
    description: 'Provider type',
    enum: ProviderType,
    example: ProviderType.TWILIO,
  })
  providerType: string;

  @ApiProperty({
    description: 'Call status',
    enum: CallState,
    example: CallState.ANSWERED,
  })
  status: CallState;

  @ApiProperty({
    description: 'Call direction',
    enum: CallDirection,
    example: CallDirection.OUTBOUND,
  })
  direction: CallDirection;

  @ApiProperty({
    description: 'Destination phone number',
    example: '+1234567890',
  })
  to: string;

  @ApiProperty({
    description: 'Source phone number',
    example: '+0987654321',
  })
  from: string;

  @ApiProperty({
    description: 'Session start time',
    example: '2025-01-15T10:30:00Z',
  })
  startTime: Date;

  @ApiPropertyOptional({
    description: 'Session end time',
    example: '2025-01-15T10:32:00Z',
  })
  endTime?: Date;

  @ApiPropertyOptional({
    description: 'Call duration in seconds',
    example: 120,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Session metadata',
    example: { campaignId: 'camp_123', contactId: 'cont_456' },
  })
  metadata?: Record<string, any>;
}

/**
 * Recording Response DTO
 */
export class RecordingResponseDto {
  @ApiProperty({
    description: 'Recording SID',
    example: 'RE1234567890abcdef1234567890abcdef',
  })
  recordingSid: string;

  @ApiProperty({
    description: 'Call SID',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  callSid: string;

  @ApiProperty({
    description: 'Recording URL',
    example: 'https://api.twilio.com/2010-04-01/Accounts/.../Recordings/.../RE123.mp3',
  })
  url: string;

  @ApiProperty({
    description: 'Recording duration in seconds',
    example: 120,
  })
  duration: number;

  @ApiProperty({
    description: 'Audio format',
    example: 'mp3',
  })
  format: string;

  @ApiProperty({
    description: 'Number of audio channels',
    example: 1,
  })
  channels: number;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Recording price',
    example: '0.0025',
  })
  price?: string;

  @ApiPropertyOptional({
    description: 'Price currency unit',
    example: 'USD',
  })
  priceUnit?: string;
}

/**
 * Provider Info Response DTO
 */
export class ProviderInfoResponseDto {
  @ApiProperty({
    description: 'Provider name',
    example: 'Twilio',
  })
  name: string;

  @ApiProperty({
    description: 'Provider type',
    enum: ProviderType,
    example: ProviderType.TWILIO,
  })
  type: string;

  @ApiProperty({
    description: 'Provider capabilities',
    example: {
      supportsRecording: true,
      supportsDTMF: true,
      supportsConferencing: true,
      supportsTransfer: true,
      supportsMachineDetection: true,
      supportsWebhooks: true,
      supportsStreaming: true,
      maxConcurrentCalls: 10000,
    },
  })
  capabilities: {
    supportsRecording: boolean;
    supportsDTMF: boolean;
    supportsConferencing: boolean;
    supportsTransfer: boolean;
    supportsMachineDetection: boolean;
    supportsWebhooks: boolean;
    supportsStreaming: boolean;
    maxConcurrentCalls: number;
  };

  @ApiProperty({
    description: 'Provider is ready',
    example: true,
  })
  ready: boolean;
}

/**
 * Active Calls Response DTO
 */
export class ActiveCallsResponseDto {
  @ApiProperty({
    description: 'Total number of active calls',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'List of active call sessions',
    type: [CallSessionResponseDto],
  })
  calls: CallSessionResponseDto[];
}

/**
 * Statistics Response DTO
 */
export class StatisticsResponseDto {
  @ApiProperty({
    description: 'Session statistics',
    example: {
      total: 100,
      active: 5,
      completed: 90,
      failed: 5,
      averageDuration: 120,
    },
  })
  sessions: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    averageDuration: number;
  };

  @ApiProperty({
    description: 'Recording statistics',
    example: {
      total: 85,
      totalSize: 1024000000,
      averageSize: 12047059,
    },
  })
  recordings: {
    total: number;
    totalSize: number;
    averageSize: number;
  };

  @ApiProperty({
    description: 'Outbound call statistics',
    example: {
      total: 80,
      successful: 70,
      failed: 10,
      cancelled: 5,
      retried: 3,
    },
  })
  outbound: {
    total: number;
    successful: number;
    failed: number;
    cancelled: number;
    retried: number;
  };

  @ApiProperty({
    description: 'Inbound call statistics',
    example: {
      total: 20,
      answered: 18,
      forwarded: 2,
      voicemail: 0,
    },
  })
  inbound: {
    total: number;
    answered: number;
    forwarded: number;
    voicemail: number;
  };

  @ApiProperty({
    description: 'Active provider information',
    type: ProviderInfoResponseDto,
  })
  provider: ProviderInfoResponseDto;
}

/**
 * Health Check Response DTO
 */
export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'System is healthy',
    example: true,
  })
  healthy: boolean;

  @ApiProperty({
    description: 'Active provider information',
    type: ProviderInfoResponseDto,
  })
  provider: ProviderInfoResponseDto;

  @ApiProperty({
    description: 'Number of active calls',
    example: 5,
  })
  activeCalls: number;

  @ApiProperty({
    description: 'Check timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  timestamp: Date;
}

/**
 * Cost Estimate Response DTO
 */
export class CostEstimateResponseDto {
  @ApiProperty({
    description: 'Estimated cost',
    example: 0.065,
  })
  cost: number;

  @ApiProperty({
    description: 'Currency',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Duration in seconds',
    example: 300,
  })
  duration: number;

  @ApiProperty({
    description: 'Cost per minute',
    example: 0.013,
  })
  costPerMinute: number;
}

/**
 * Success Response DTO
 */
export class SuccessResponseDto {
  @ApiProperty({
    description: 'Operation was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Message',
    example: 'Operation completed successfully',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Additional data',
  })
  data?: any;
}
