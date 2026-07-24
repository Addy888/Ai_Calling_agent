/**
 * Twilio Telephony Provider Implementation
 * Complete production-ready implementation for Twilio
 */

import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TwilioClient = require('twilio');
import {
  ITelephonyProvider,
  CallInitiationParams,
  CallResult,
  RecordingInfo,
  CallControlResponse,
  CallControlInstructions,
  WebhookPayload,
  ProviderCapabilities,
  ProviderConfig,
} from '../interfaces/telephony-provider.interface';
import { CallDirection, CallState, ProviderType } from '../enums/call-state.enum';

@Injectable()
export class TwilioProvider implements ITelephonyProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: Twilio;
  private config: ProviderConfig;
  private ready = false;

  getName(): string {
    return 'Twilio';
  }

  getType(): string {
    return ProviderType.TWILIO;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRecording: true,
      supportsDTMF: true,
      supportsConferencing: true,
      supportsTransfer: true,
      supportsMachineDetection: true,
      supportsWebhooks: true,
      supportsStreaming: true,
      maxConcurrentCalls: 10000, // Twilio enterprise limit
    };
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.logger.log('Initializing Twilio provider...');

    if (!config.accountSid || !config.authToken) {
      throw new Error('Twilio credentials (accountSid, authToken) are required');
    }

    this.config = config;

    try {
      this.client = TwilioClient(config.accountSid, config.authToken);
      
      // Test connection
      await this.healthCheck();
      
      this.ready = true;
      this.logger.log('Twilio provider initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Twilio: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready && !!this.client;
  }

  async makeCall(params: CallInitiationParams): Promise<CallResult> {
    this.ensureReady();

    this.logger.log(`Making call from ${params.from} to ${params.to}`);

    try {
      const call = await this.client.calls.create({
        to: params.to,
        from: params.from || this.config.phoneNumber,
        url: params.callbackUrl,
        statusCallback: params.statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: params.timeout || 60,
        record: params.record !== false,
        recordingStatusCallback: params.recordingCallbackUrl,
        recordingStatusCallbackMethod: 'POST',
        machineDetection: params.machineDetection ? 'Enable' : undefined,
        machineDetectionTimeout: params.machineDetection ? 5 : undefined,
      });

      this.logger.log(`Call initiated: ${call.sid}`);

      return this.mapTwilioCallToResult(call);
    } catch (error) {
      this.logger.error(`Failed to make call: ${error.message}`);
      throw new Error(`Twilio call failed: ${error.message}`);
    }
  }

  async hangupCall(callSid: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`Hanging up call: ${callSid}`);

    try {
      await this.client.calls(callSid).update({ status: 'completed' });
      this.logger.log(`Call hung up: ${callSid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to hangup call: ${error.message}`);
      return false;
    }
  }

  async getCallStatus(callSid: string): Promise<CallResult> {
    this.ensureReady();

    try {
      const call = await this.client.calls(callSid).fetch();
      return this.mapTwilioCallToResult(call);
    } catch (error) {
      this.logger.error(`Failed to get call status: ${error.message}`);
      throw new Error(`Failed to fetch call status: ${error.message}`);
    }
  }

  async updateCall(
    callSid: string,
    updates: Partial<CallInitiationParams>,
  ): Promise<CallResult> {
    this.ensureReady();

    this.logger.log(`Updating call: ${callSid}`);

    try {
      const call = await this.client.calls(callSid).update({
        url: updates.callbackUrl,
        statusCallback: updates.statusCallbackUrl,
      });

      return this.mapTwilioCallToResult(call);
    } catch (error) {
      this.logger.error(`Failed to update call: ${error.message}`);
      throw error;
    }
  }

  async sendDTMF(callSid: string, digits: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`Sending DTMF to call ${callSid}: ${digits}`);

    try {
      // Twilio doesn't have a direct API for sending DTMF during a call
      // This would typically be done through TwiML <Play> with DTMF tones
      // For now, we'll update the call with a TwiML instruction
      
      const twiml = new TwilioClient.twiml.VoiceResponse();
      twiml.play({ digits });
      
      await this.client.calls(callSid).update({
        twiml: twiml.toString(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send DTMF: ${error.message}`);
      return false;
    }
  }

  async transferCall(callSid: string, to: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`Transferring call ${callSid} to ${to}`);

    try {
      const twiml = new TwilioClient.twiml.VoiceResponse();
      twiml.dial(to);

      await this.client.calls(callSid).update({
        twiml: twiml.toString(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to transfer call: ${error.message}`);
      return false;
    }
  }

  async getRecording(recordingSid: string): Promise<RecordingInfo> {
    this.ensureReady();

    try {
      const recording = await this.client.recordings(recordingSid).fetch();

      return {
        recordingSid: recording.sid,
        callSid: recording.callSid,
        url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
        duration: parseInt(recording.duration),
        format: 'mp3',
        channels: parseInt(String(recording.channels)),
        price: recording.price,
        priceUnit: recording.priceUnit,
      };
    } catch (error) {
      this.logger.error(`Failed to get recording: ${error.message}`);
      throw error;
    }
  }

  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    this.ensureReady();

    this.logger.log(`Downloading recording: ${recordingUrl}`);

    try {
      const response = await fetch(recordingUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.accountSid}:${this.config.authToken}`,
          ).toString('base64')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`);
      throw error;
    }
  }

  generateCallControl(instructions: CallControlInstructions): CallControlResponse {
    const twiml = new TwilioClient.twiml.VoiceResponse();

    if (instructions.say) {
      twiml.say({
        voice: instructions.say.voice as any,
        language: instructions.say.language as any,
      }, instructions.say.text);
    }

    if (instructions.play) {
      twiml.play({ loop: instructions.play.loop }, instructions.play.url);
    }

    if (instructions.gather) {
      const gather = twiml.gather({
        input: instructions.gather.input.split(' ') as any,
        timeout: instructions.gather.timeout,
        finishOnKey: instructions.gather.finishOnKey,
        numDigits: instructions.gather.numDigits,
        action: instructions.gather.action,
      });

      if (instructions.say) {
        gather.say(instructions.say.text);
      }
    }

    if (instructions.record) {
      twiml.record({
        action: instructions.record.action,
        timeout: instructions.record.timeout,
        maxLength: instructions.record.maxLength,
        playBeep: instructions.record.playBeep,
      });
    }

    if (instructions.dial) {
      twiml.dial({
        timeout: instructions.dial.timeout,
        action: instructions.dial.action,
      }, instructions.dial.number);
    }

    if (instructions.pause) {
      twiml.pause({ length: instructions.pause.length });
    }

    if (instructions.redirect) {
      twiml.redirect(instructions.redirect.url);
    }

    if (instructions.hangup) {
      twiml.hangup();
    }

    return {
      content: twiml.toString(),
      contentType: 'text/xml',
    };
  }

  parseWebhook(payload: any): WebhookPayload {
    const callSid = payload.CallSid || payload.ParentCallSid;
    const status = this.mapTwilioStatusToCallState(payload.CallStatus);

    const webhookPayload: WebhookPayload = {
      type: this.determineWebhookType(payload),
      callSid,
      status,
      direction: payload.Direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
      from: payload.From || payload.Caller,
      to: payload.To || payload.Called,
      duration: payload.CallDuration ? parseInt(payload.CallDuration) : undefined,
      recordingUrl: payload.RecordingUrl,
      recordingSid: payload.RecordingSid,
      dtmfDigits: payload.Digits,
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage,
      timestamp: new Date(),
      rawPayload: payload,
    };

    return webhookPayload;
  }

  validateWebhookSignature(signature: string, url: string, params: any): boolean {
    try {
      return TwilioClient.validateRequest(
        this.config.authToken,
        signature,
        url,
        params,
      );
    } catch (error) {
      this.logger.error(`Webhook validation failed: ${error.message}`);
      return false;
    }
  }

  async estimateCallCost(from: string, to: string, duration: number): Promise<number> {
    // Twilio pricing varies by country
    // This is a simplified estimate - in production, use Twilio Pricing API
    const pricePerMinute = 0.013; // Average US price
    const minutes = Math.ceil(duration / 60);
    return minutes * pricePerMinute;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Try to fetch account info as health check
      await this.client.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  // Private helper methods

  private ensureReady(): void {
    if (!this.isReady()) {
      throw new Error('Twilio provider is not initialized');
    }
  }

  private mapTwilioCallToResult(call: any): CallResult {
    return {
      callSid: call.sid,
      providerCallId: call.sid,
      status: this.mapTwilioStatusToCallState(call.status),
      direction: call.direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
      to: call.to,
      from: call.from,
      price: call.price,
      priceUnit: call.priceUnit,
      duration: call.duration ? parseInt(call.duration) : undefined,
      startTime: call.startTime ? new Date(call.startTime) : undefined,
      endTime: call.endTime ? new Date(call.endTime) : undefined,
      answeredBy: call.answeredBy as any,
    };
  }

  private mapTwilioStatusToCallState(status: string): CallState {
    const statusMap: Record<string, CallState> = {
      'queued': CallState.QUEUED,
      'initiated': CallState.DIALING,
      'ringing': CallState.RINGING,
      'in-progress': CallState.ANSWERED,
      'answered': CallState.ANSWERED,
      'completed': CallState.COMPLETED,
      'busy': CallState.BUSY,
      'no-answer': CallState.NO_ANSWER,
      'failed': CallState.FAILED,
      'canceled': CallState.CANCELLED,
    };

    return statusMap[status?.toLowerCase()] || CallState.FAILED;
  }

  private determineWebhookType(payload: any): WebhookPayload['type'] {
    if (payload.RecordingSid || payload.RecordingUrl) {
      return 'recording_ready';
    }
    if (payload.Digits) {
      return 'dtmf_received';
    }
    if (payload.ErrorCode) {
      return 'error';
    }
    return 'call_status';
  }
}
