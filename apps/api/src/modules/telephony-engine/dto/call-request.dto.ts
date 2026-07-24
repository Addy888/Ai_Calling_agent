/**
 * Call Request DTOs
 * Data Transfer Objects for call-related requests and responses
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallDirection } from '../enums/call-state.enum';

/**
 * Make Call Request DTO
 */
export class MakeCallDto {
  @ApiProperty({
    description: 'Destination phone number (E.164 format)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  to: string;

  @ApiProperty({
    description: 'Source phone number (E.164 format)',
    example: '+0987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  from: string;

  @ApiProperty({
    description: 'Callback URL for call events',
    example: 'https://api.example.com/webhooks/call',
  })
  @IsString()
  @IsNotEmpty()
  callbackUrl: string;

  @ApiPropertyOptional({
    description: 'Status callback URL for call status updates',
    example: 'https://api.example.com/webhooks/status',
  })
  @IsString()
  @IsOptional()
  statusCallbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Recording callback URL',
    example: 'https://api.example.com/webhooks/recording',
  })
  @IsString()
  @IsOptional()
  recordingCallbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Call timeout in seconds',
    example: 60,
    minimum: 10,
    maximum: 300,
  })
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(300)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Enable call recording',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  record?: boolean;

  @ApiPropertyOptional({
    description: 'Enable machine detection (answering machines/voicemail)',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  machineDetection?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the call',
    example: { campaignId: 'camp_123', contactId: 'cont_456' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Retry Call DTO
 */
export class RetryCallDto extends MakeCallDto {
  @ApiProperty({
    description: 'Original call SID to retry',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  originalCallSid: string;
}

/**
 * Cancel Call DTO
 */
export class CancelCallDto {
  @ApiProperty({
    description: 'Call SID to cancel',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  callSid: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'User requested cancellation',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Hangup Call DTO
 */
export class HangupCallDto {
  @ApiProperty({
    description: 'Call SID to hang up',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  callSid: string;
}

/**
 * Transfer Call DTO
 */
export class TransferCallDto {
  @ApiProperty({
    description: 'Call SID to transfer',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  callSid: string;

  @ApiProperty({
    description: 'Destination phone number for transfer (E.164 format)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  to: string;
}

/**
 * Send DTMF DTO
 */
export class SendDTMFDto {
  @ApiProperty({
    description: 'Call SID',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  callSid: string;

  @ApiProperty({
    description: 'DTMF digits to send (0-9, *, #)',
    example: '1234#',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9*#]+$/, {
    message: 'DTMF digits must contain only 0-9, *, and #',
  })
  digits: string;
}

/**
 * Forward Call DTO
 */
export class ForwardCallDto {
  @ApiProperty({
    description: 'Call SID to forward',
    example: 'CA1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  callSid: string;

  @ApiProperty({
    description: 'Forward destination phone number (E.164 format)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  forwardTo: string;
}

/**
 * Estimate Cost DTO
 */
export class EstimateCostDto {
  @ApiProperty({
    description: 'Source phone number (E.164 format)',
    example: '+0987654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/)
  from: string;

  @ApiProperty({
    description: 'Destination phone number (E.164 format)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/)
  to: string;

  @ApiProperty({
    description: 'Expected call duration in seconds',
    example: 300,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  duration: number;
}

/**
 * Switch Provider DTO
 */
export class SwitchProviderDto {
  @ApiProperty({
    description: 'Provider type to switch to',
    example: 'twilio',
    enum: ['twilio', 'exotel', 'plivo', 'sip', 'asterisk'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['twilio', 'exotel', 'plivo', 'sip', 'asterisk'])
  providerType: string;
}
