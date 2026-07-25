/**
 * Telephony Controller
 * REST API and Webhook endpoints for telephony operations
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Inject,
} from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { CallOptions } from './interfaces/telephony-provider.interface';
import { TwilioTelephonyProvider } from './providers/twilio-telephony.provider';

@Controller('telephony')
export class TelephonyController {
  private readonly logger = new Logger(TelephonyController.name);

  constructor(
    private readonly telephonyService: TelephonyService,
    @Inject('TELEPHONY_PROVIDER') private readonly provider: any,
  ) {}

  /**
   * Make a call
   */
  @Post('call')
  @HttpCode(HttpStatus.OK)
  async makeCall(@Body() options: CallOptions) {
    return await this.telephonyService.makeCall(options);
  }

  /**
   * Get call status
   */
  @Get('call/:callSid/status')
  async getCallStatus(@Param('callSid') callSid: string) {
    return await this.telephonyService.getCallStatus(callSid);
  }

  /**
   * Hangup call
   */
  @Post('call/:callSid/hangup')
  @HttpCode(HttpStatus.OK)
  async hangupCall(@Param('callSid') callSid: string) {
    const success = await this.telephonyService.hangupCall(callSid);
    return { success, callSid };
  }

  /**
   * Get recording
   */
  @Get('call/:callSid/recording')
  async getRecording(@Param('callSid') callSid: string) {
    return await this.telephonyService.getRecording(callSid);
  }

  /**
   * Get transcript
   */
  @Get('call/:callSid/transcript')
  async getTranscript(@Param('callSid') callSid: string) {
    const transcript = await this.telephonyService.getTranscript(callSid);
    return {
      callSid,
      transcript,
      totalEntries: transcript.length,
    };
  }

  /**
   * Send message during call
   */
  @Post('call/:callSid/message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Param('callSid') callSid: string,
    @Body('message') message: string,
  ) {
    const success = await this.telephonyService.sendMessage(callSid, message);
    return { success, callSid };
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck() {
    return await this.telephonyService.healthCheck();
  }

  /**
   * Get provider info
   */
  @Get('provider')
  getProvider() {
    return {
      name: this.telephonyService.getProviderName(),
      timestamp: new Date(),
    };
  }

  /**
   * Twilio Webhooks
   */

  @Post('webhooks/twilio/voice')
  @HttpCode(HttpStatus.OK)
  async twilioVoiceWebhook(@Body() body: any) {
    this.logger.log('Twilio voice webhook received');

    if (this.provider instanceof TwilioTelephonyProvider) {
      // Generate TwiML response
      return this.provider.generateVoiceTwiML(
        'Hello! You are connected to our AI agent.',
      );
    }

    return 'OK';
  }

  @Post('webhooks/twilio/status')
  @HttpCode(HttpStatus.OK)
  async twilioStatusWebhook(@Body() body: any) {
    this.logger.log(`Twilio status webhook: ${body.CallStatus}`);

    if (this.provider instanceof TwilioTelephonyProvider) {
      await this.provider.handleStatusCallback(body);
    }

    return 'OK';
  }

  @Post('webhooks/twilio/recording')
  @HttpCode(HttpStatus.OK)
  async twilioRecordingWebhook(@Body() body: any) {
    this.logger.log('Twilio recording webhook received');

    if (this.provider instanceof TwilioTelephonyProvider) {
      await this.provider.handleRecordingCallback(body);
    }

    return 'OK';
  }

  @Post('webhooks/twilio/transcription')
  @HttpCode(HttpStatus.OK)
  async twilioTranscriptionWebhook(@Body() body: any) {
    this.logger.log('Twilio transcription webhook received');

    if (this.provider instanceof TwilioTelephonyProvider) {
      await this.provider.handleTranscriptionCallback(body);
    }

    return 'OK';
  }
}
