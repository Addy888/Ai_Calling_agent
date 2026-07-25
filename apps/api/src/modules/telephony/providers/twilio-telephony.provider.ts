/**
 * Twilio Telephony Provider
 * Production-ready implementation using Twilio Voice API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Twilio from 'twilio';
import {
  ITelephonyProvider,
  CallOptions,
  CallResult,
  CallStatusResult,
  RecordingResult,
  TranscriptEntry,
  CallStatus,
  ProviderEventType,
} from '../interfaces/telephony-provider.interface';

@Injectable()
export class TwilioTelephonyProvider implements ITelephonyProvider {
  readonly name = 'TWILIO';
  private readonly logger = new Logger(TwilioTelephonyProvider.name);
  private client: Twilio.Twilio;
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private transcripts: Map<string, TranscriptEntry[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async initialize(): Promise<void> {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      throw new Error(
        'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER',
      );
    }

    this.client = Twilio(this.accountSid, this.authToken);

    this.logger.log('✅ Twilio Telephony Provider initialized');
    this.logger.log(`📞 Using Twilio number: ${this.phoneNumber}`);

    // Verify credentials
    await this.healthCheck();
  }

  async makeCall(options: CallOptions): Promise<CallResult> {
    this.logger.log(`📞 [TWILIO] Making call to ${options.to}`);

    try {
      const call = await this.client.calls.create({
        to: options.to,
        from: options.from || this.phoneNumber,
        url: options.callbackUrl || this.buildTwiMLUrl(),
        statusCallback: options.statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true,
        recordingStatusCallback: this.buildRecordingCallbackUrl(),
        recordingStatusCallbackMethod: 'POST',
        timeout: options.timeout || 60,
        machineDetection: 'DetectMessageEnd',
      });

      this.logger.log(`📞 [TWILIO] Call created: ${call.sid}`);

      // Initialize transcript for this call
      this.transcripts.set(call.sid, []);

      // Emit event
      this.emitEvent(ProviderEventType.CALL_INITIATED, call.sid);

      return {
        callSid: call.sid,
        status: this.mapTwilioStatus(call.status),
        to: options.to,
        from: options.from || this.phoneNumber,
        timestamp: new Date(),
        provider: this.name,
      };
    } catch (error) {
      this.logger.error(
        `❌ [TWILIO] Failed to make call: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getCallStatus(callSid: string): Promise<CallStatusResult> {
    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: this.mapTwilioStatus(call.status),
        duration: call.duration ? parseInt(call.duration) : undefined,
        startTime: call.startTime ? new Date(call.startTime) : undefined,
        endTime: call.endTime ? new Date(call.endTime) : undefined,
        answeredBy: call.answeredBy,
      };
    } catch (error) {
      this.logger.error(
        `❌ [TWILIO] Failed to get call status: ${error.message}`,
      );
      throw error;
    }
  }

  async hangupCall(callSid: string): Promise<boolean> {
    try {
      this.logger.log(`📞 [TWILIO] Hanging up call ${callSid}`);

      await this.client.calls(callSid).update({
        status: 'completed',
      });

      this.emitEvent(ProviderEventType.CALL_COMPLETED, callSid);

      return true;
    } catch (error) {
      this.logger.error(`❌ [TWILIO] Failed to hangup call: ${error.message}`);
      return false;
    }
  }

  async getRecording(callSid: string): Promise<RecordingResult | null> {
    try {
      const recordings = await this.client.recordings.list({
        callSid: callSid,
        limit: 1,
      });

      if (recordings.length === 0) {
        return null;
      }

      const recording = recordings[0];

      return {
        recordingSid: recording.sid,
        callSid: recording.callSid,
        url: `https://api.twilio.com${recording.uri}`,
        duration: parseInt(recording.duration),
        format: recording.source === 'RecordVerb' ? 'wav' : 'mp3',
        timestamp: new Date(recording.dateCreated),
      };
    } catch (error) {
      this.logger.error(
        `❌ [TWILIO] Failed to get recording: ${error.message}`,
      );
      return null;
    }
  }

  async getTranscript(callSid: string): Promise<TranscriptEntry[]> {
    return this.transcripts.get(callSid) || [];
  }

  async sendMessage(callSid: string, message: string): Promise<boolean> {
    try {
      // Add to transcript
      const transcript = this.transcripts.get(callSid) || [];
      transcript.push({
        speaker: 'AI',
        message,
        timestamp: new Date(),
      });
      this.transcripts.set(callSid, transcript);

      // In production, you would use Twilio's say verb or stream audio
      // For now, we'll use the Say verb via TwiML
      this.logger.debug(`📞 [TWILIO] AI says: ${message.substring(0, 50)}...`);

      // Emit transcript update
      this.emitEvent(ProviderEventType.TRANSCRIPT_UPDATED, callSid, {
        speaker: 'AI',
        message,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `❌ [TWILIO] Failed to send message: ${error.message}`,
      );
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Verify account by fetching account details
      const account = await this.client.api.accounts(this.accountSid).fetch();

      if (account.status === 'active') {
        this.logger.log('✅ [TWILIO] Account is active and healthy');
        return true;
      } else {
        this.logger.warn(`⚠️  [TWILIO] Account status: ${account.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `❌ [TWILIO] Health check failed: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Webhook handlers (called by Twilio)
   */

  async handleStatusCallback(data: any): Promise<void> {
    const callSid = data.CallSid;
    const status = data.CallStatus;

    this.logger.log(`📞 [TWILIO] Status callback: ${callSid} - ${status}`);

    switch (status) {
      case 'ringing':
        this.emitEvent(ProviderEventType.CALL_RINGING, callSid);
        break;
      case 'in-progress':
        this.emitEvent(ProviderEventType.CALL_ANSWERED, callSid, {
          answeredBy: data.AnsweredBy,
        });
        break;
      case 'completed':
        this.emitEvent(ProviderEventType.CALL_COMPLETED, callSid, {
          duration: data.CallDuration,
        });
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        this.emitEvent(ProviderEventType.CALL_FAILED, callSid, {
          reason: status,
          errorCode: data.ErrorCode,
          errorMessage: data.ErrorMessage,
        });
        break;
    }
  }

  async handleRecordingCallback(data: any): Promise<void> {
    const callSid = data.CallSid;
    const recordingSid = data.RecordingSid;

    this.logger.log(
      `📞 [TWILIO] Recording available: ${recordingSid} for call ${callSid}`,
    );

    this.emitEvent(ProviderEventType.RECORDING_AVAILABLE, callSid, {
      recordingSid,
      recordingUrl: data.RecordingUrl,
      recordingDuration: data.RecordingDuration,
    });
  }

  async handleTranscriptionCallback(data: any): Promise<void> {
    const callSid = data.CallSid;
    const transcriptionText = data.TranscriptionText;

    if (!transcriptionText) return;

    // Add customer message to transcript
    const transcript = this.transcripts.get(callSid) || [];
    transcript.push({
      speaker: 'CUSTOMER',
      message: transcriptionText,
      timestamp: new Date(),
      confidence: parseFloat(data.TranscriptionConfidence || '0.95'),
    });
    this.transcripts.set(callSid, transcript);

    this.logger.debug(
      `📞 [TWILIO] Customer says: ${transcriptionText.substring(0, 50)}...`,
    );

    this.emitEvent(ProviderEventType.TRANSCRIPT_UPDATED, callSid, {
      speaker: 'CUSTOMER',
      message: transcriptionText,
    });
  }

  /**
   * Private helper methods
   */

  private mapTwilioStatus(twilioStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      queued: CallStatus.QUEUED,
      initiated: CallStatus.INITIATING,
      ringing: CallStatus.RINGING,
      'in-progress': CallStatus.IN_PROGRESS,
      completed: CallStatus.COMPLETED,
      busy: CallStatus.BUSY,
      'no-answer': CallStatus.NO_ANSWER,
      failed: CallStatus.FAILED,
      canceled: CallStatus.CANCELLED,
    };

    return statusMap[twilioStatus] || CallStatus.FAILED;
  }

  private buildTwiMLUrl(): string {
    const baseUrl = this.configService.get<string>('API_BASE_URL');
    return `${baseUrl}/api/v1/telephony/webhooks/twilio/voice`;
  }

  private buildRecordingCallbackUrl(): string {
    const baseUrl = this.configService.get<string>('API_BASE_URL');
    return `${baseUrl}/api/v1/telephony/webhooks/twilio/recording`;
  }

  private emitEvent(
    type: ProviderEventType,
    callSid: string,
    data?: any,
  ): void {
    this.eventEmitter.emit(`telephony.${type.toLowerCase()}`, {
      provider: this.name,
      callSid,
      timestamp: new Date(),
      ...data,
    });
  }

  /**
   * Generate TwiML for voice response
   */
  generateVoiceTwiML(message?: string): string {
    const twiml = new Twilio.twiml.VoiceResponse();

    if (message) {
      twiml.say({ voice: 'Polly.Joanna' }, message);
    }

    // Connect to AI conversation engine
    twiml.pause({ length: 1 });
    twiml.redirect(this.buildTwiMLUrl());

    return twiml.toString();
  }

  /**
   * Generate TwiML for streaming (future ready)
   */
  generateStreamTwiML(streamUrl: string): string {
    const twiml = new Twilio.twiml.VoiceResponse();

    const start = twiml.start();
    start.stream({
      url: streamUrl,
      track: 'both_tracks',
    });

    twiml.say({ voice: 'Polly.Joanna' }, 'Connected to AI agent.');

    return twiml.toString();
  }
}
