/**
 * Telephony Service
 * Unified service that works with any telephony provider
 * Provider-agnostic - uses dependency injection
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ITelephonyProvider,
  CallOptions,
  CallResult,
  CallStatusResult,
  RecordingResult,
  TranscriptEntry,
} from './interfaces/telephony-provider.interface';

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);

  constructor(
    @Inject('TELEPHONY_PROVIDER')
    private readonly provider: ITelephonyProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log(`Telephony Service using provider: ${this.provider.name}`);
  }

  /**
   * Initialize the telephony service
   */
  async initialize(): Promise<void> {
    await this.provider.initialize();
    this.logger.log('Telephony Service initialized');
  }

  /**
   * Make an outbound call
   */
  async makeCall(options: CallOptions): Promise<CallResult> {
    this.logger.log(`Making call to ${options.to}`);
    return await this.provider.makeCall(options);
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<CallStatusResult> {
    return await this.provider.getCallStatus(callSid);
  }

  /**
   * Hangup/end a call
   */
  async hangupCall(callSid: string): Promise<boolean> {
    this.logger.log(`Hanging up call ${callSid}`);
    return await this.provider.hangupCall(callSid);
  }

  /**
   * Get recording for a call
   */
  async getRecording(callSid: string): Promise<RecordingResult | null> {
    return await this.provider.getRecording(callSid);
  }

  /**
   * Get transcript for a call
   */
  async getTranscript(callSid: string): Promise<TranscriptEntry[]> {
    return await this.provider.getTranscript(callSid);
  }

  /**
   * Send message during call (for AI responses)
   */
  async sendMessage(callSid: string, message: string): Promise<boolean> {
    if (!this.provider.sendMessage) {
      this.logger.warn('Provider does not support sendMessage');
      return false;
    }

    return await this.provider.sendMessage(callSid, message);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    provider: string;
    timestamp: Date;
  }> {
    const healthy = await this.provider.healthCheck();

    return {
      healthy,
      provider: this.provider.name,
      timestamp: new Date(),
    };
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Get provider instance (for provider-specific operations)
   */
  getProvider(): ITelephonyProvider {
    return this.provider;
  }

  /**
   * Parse webhook data (for Twilio webhooks)
   */
  parseWebhook(body: any): {
    callSid: string;
    status: string;
    duration?: number;
    recordingUrl?: string;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  } {
    return {
      callSid: body.CallSid,
      status: body.CallStatus,
      duration: body.CallDuration ? parseInt(body.CallDuration) : undefined,
      recordingUrl: body.RecordingUrl,
      errorCode: body.ErrorCode,
      errorMessage: body.ErrorMessage,
      metadata: {
        from: body.From,
        to: body.To,
        direction: body.Direction,
        timestamp: body.Timestamp,
      },
    };
  }

  /**
   * Generate call flow TwiML (for Twilio)
   */
  generateCallFlow(websocketUrl: string, metadata?: Record<string, any>): string {
    const Twilio = require('twilio');
    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Connect to WebSocket for bidirectional streaming
    const connect = response.connect();
    const stream = connect.stream({
      url: websocketUrl,
    });

    // Add custom parameters
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        stream.parameter({ name: key, value: String(value) });
      });
    }

    return response.toString();
  }

  /**
   * End call (alias for hangupCall for backwards compatibility)
   */
  async endCall(callSid: string): Promise<boolean> {
    return await this.hangupCall(callSid);
  }

  /**
   * Download recording (get recording buffer)
   */
  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    this.logger.log(`Downloading recording from: ${recordingUrl}`);

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      const response = await fetch(recordingUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`,
          ).toString('base64')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`);
      throw error;
    }
  }
}
