import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import {
  ITeflehonyProvider,
  CallOptions,
  CallResult,
  TelephonyWebhookData,
} from '../interfaces/telephony-provider.interface';

/**
 * Twilio Telephony Provider
 * Implementation for Twilio voice calling
 */
@Injectable()
export class TwilioProvider implements ITeflehonyProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: twilio.Twilio;
  private twilioNumber: string;
  private authToken: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
    this.authToken = authToken;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio provider initialized');
    } else {
      this.logger.warn('Twilio credentials not configured');
    }
  }

  getName(): string {
    return 'twilio';
  }

  async makeCall(options: CallOptions): Promise<CallResult> {
    this.logger.log(`Making call to: ${options.to}`);

    try {
      const call = await this.client.calls.create({
        to: options.to,
        from: options.from || this.twilioNumber,
        url: options.callbackUrl,
        statusCallback: options.statusCallback,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: options.timeout || 60,
        record: options.record !== false,
        recordingStatusCallback: options.recordingStatusCallback,
        recordingStatusCallbackMethod: 'POST',
      });

      this.logger.log(`Call initiated: ${call.sid}`);

      return {
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        to: call.to,
        from: call.from,
        metadata: options.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to make call: ${error.message}`);
      throw error;
    }
  }

  async endCall(callSid: string): Promise<boolean> {
    this.logger.log(`Ending call: ${callSid}`);

    try {
      await this.client.calls(callSid).update({ status: 'completed' });
      this.logger.log(`Call ended: ${callSid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to end call: ${error.message}`);
      return false;
    }
  }

  async getCallStatus(callSid: string): Promise<CallResult> {
    this.logger.log(`Getting call status: ${callSid}`);

    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        to: call.to,
        from: call.from,
        duration: call.duration ? parseInt(call.duration) : undefined,
        startTime: call.startTime ? new Date(call.startTime) : undefined,
        endTime: call.endTime ? new Date(call.endTime) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get call status: ${error.message}`);
      throw error;
    }
  }

  generateCallFlow(websocketUrl: string, metadata?: Record<string, any>): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
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

  parseWebhook(body: any): TelephonyWebhookData {
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

  async getRecordingUrl(callSid: string, recordingSid: string): Promise<string> {
    this.logger.log(`Getting recording URL: ${recordingSid}`);

    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      
      return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    } catch (error) {
      this.logger.error(`Failed to get recording URL: ${error.message}`);
      throw error;
    }
  }

  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    this.logger.log(`Downloading recording: ${recordingUrl}`);

    try {
      const response = await fetch(recordingUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.configService.get('TWILIO_ACCOUNT_SID')}:${this.authToken}`,
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

  validateWebhookSignature(signature: string, url: string, params: any): boolean {
    try {
      return twilio.validateRequest(
        this.authToken,
        signature,
        url,
        params,
      );
    } catch (error) {
      this.logger.error(`Webhook validation failed: ${error.message}`);
      return false;
    }
  }
}
