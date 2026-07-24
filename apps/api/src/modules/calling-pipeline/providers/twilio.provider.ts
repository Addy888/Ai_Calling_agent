import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import {
  TelephonyProvider,
  MakeCallParams,
  MakeCallResponse,
  CallStatusData,
} from '../interfaces/telephony-provider.interface';

/**
 * Twilio Telephony Provider
 * Production-ready Twilio integration
 */
@Injectable()
export class TwilioProvider implements TelephonyProvider {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioProvider.name);
  private client: twilio.Twilio | null = null;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');
  }

  /**
   * Initialize Twilio client
   */
  async initialize(): Promise<void> {
    if (!this.accountSid || !this.authToken) {
      this.logger.warn('Twilio credentials not configured - running in mock mode');
      return;
    }

    try {
      const twilioFactory = require('twilio');
      this.client = twilioFactory(this.accountSid, this.authToken);
      this.logger.log('Twilio provider initialized successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initialize Twilio: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Make an outbound call
   */
  async makeCall(params: MakeCallParams): Promise<MakeCallResponse> {
    this.logger.log(`Making call to ${params.to} (session: ${params.sessionId})`);

    // Mock mode if client not initialized
    if (!this.client) {
      return this.mockMakeCall(params);
    }

    try {
      const call = await this.client.calls.create({
        to: params.to,
        from: params.from || this.fromNumber,
        url: params.callbackUrl, // TwiML instructions URL
        statusCallback: `${params.callbackUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: params.recordCall ?? true,
        recordingStatusCallback: `${params.callbackUrl}/recording`,
        timeout: params.timeout || 60,
        machineDetection: 'DetectMessageEnd', // Detect voicemail
      });

      this.logger.log(`Call initiated: ${call.sid} to ${params.to}`);

      return {
        callSid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to make call: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    this.logger.log(`Ending call: ${callSid}`);

    if (!this.client) {
      this.logger.warn('Mock mode - call end simulated');
      return;
    }

    try {
      await this.client.calls(callSid).update({ status: 'completed' });
      this.logger.log(`Call ended: ${callSid}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to end call: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<CallStatusData> {
    if (!this.client) {
      return this.mockGetCallStatus(callSid);
    }

    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: this.mapTwilioStatus(call.status),
        from: call.from,
        to: call.to,
        duration: parseInt(call.duration || '0'),
        startTime: call.startTime ? new Date(call.startTime) : undefined,
        endTime: call.endTime ? new Date(call.endTime) : undefined,
        price: call.price || undefined,
        priceUnit: call.priceUnit || undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get call status: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Test API connectivity by fetching account
      await this.client.api.accounts(this.accountSid).fetch();
      return true;
    } catch (error) {
      this.logger.warn('Twilio API not available');
      return false;
    }
  }

  /**
   * Map Twilio status to standard status
   */
  private mapTwilioStatus(twilioStatus: string): CallStatusData['status'] {
    const statusMap: Record<string, CallStatusData['status']> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'no-answer': 'no-answer',
      'failed': 'failed',
      'canceled': 'canceled',
    };

    return statusMap[twilioStatus] || 'failed';
  }

  /**
   * Mock make call for development
   */
  private mockMakeCall(params: MakeCallParams): MakeCallResponse {
    const mockCallSid = `CA${Date.now()}${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[MOCK] Call initiated: ${mockCallSid} to ${params.to}`);

    return {
      callSid: mockCallSid,
      status: 'queued',
      from: params.from || this.fromNumber || '+1234567890',
      to: params.to,
    };
  }

  /**
   * Mock get call status for development
   */
  private mockGetCallStatus(callSid: string): CallStatusData {
    return {
      callSid,
      status: 'in-progress',
      from: '+1234567890',
      to: '+0987654321',
      duration: 120,
      startTime: new Date(),
    };
  }
}
