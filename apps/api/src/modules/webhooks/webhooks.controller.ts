import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelephonyService } from '../telephony/telephony.service';
import { CallOrchestratorService } from '../call-orchestrator/call-orchestrator.service';

/**
 * Webhooks Controller
 * Handles webhooks from telephony providers
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly telephony: TelephonyService,
    private readonly callOrchestrator: CallOrchestratorService,
  ) {}

  /**
   * Twilio Call Status Webhook
   */
  @Post('twilio/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Twilio call status webhook' })
  async handleTwilioStatus(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Twilio status webhook received: ${body.CallStatus}`);

    try {
      // Parse webhook data
      const webhookData = this.telephony.parseWebhook(body);
      const callId = body.CallId || webhookData.metadata?.callId;

      // Handle different call statuses
      switch (webhookData.status) {
        case 'initiated':
          this.logger.log(`Call initiated: ${callId}`);
          break;

        case 'ringing':
          this.logger.log(`Call ringing: ${callId}`);
          break;

        case 'answered':
        case 'in-progress':
          this.logger.log(`Call answered: ${callId}`);
          await this.callOrchestrator.handleCallConnected(callId);
          break;

        case 'completed':
          this.logger.log(`Call completed: ${callId}`);
          await this.callOrchestrator.handleCallEnded(
            callId,
            webhookData.duration || 0,
            webhookData.recordingUrl,
          );
          break;

        case 'busy':
        case 'no-answer':
        case 'failed':
        case 'canceled':
          this.logger.log(`Call failed: ${callId}, status: ${webhookData.status}`);
          await this.callOrchestrator.handleCallFailed(
            callId,
            webhookData.errorMessage || webhookData.status,
          );
          break;

        default:
          this.logger.warn(`Unknown call status: ${webhookData.status}`);
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling Twilio status webhook: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Twilio Call Webhook (TwiML response)
   */
  @Post('twilio/call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Twilio call webhook and return TwiML' })
  async handleTwilioCall(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Twilio call webhook received');

    try {
      const callId = body.CallId;

      // Generate WebSocket URL for bidirectional streaming
      const websocketUrl = `wss://${process.env.API_HOST || 'localhost'}/ws/call/${callId}`;

      // Generate TwiML response
      const twiml = this.telephony.generateCallFlow(websocketUrl, {
        callId,
        campaignId: body.CampaignId,
        contactId: body.ContactId,
      });

      // Return TwiML response
      res.type('text/xml');
      res.send(twiml);
    } catch (error: any) {
      this.logger.error(`Error handling Twilio call webhook: ${error.message}`);
      
      // Return error TwiML
      res.type('text/xml');
      res.send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>We are experiencing technical difficulties. Please try again later.</Say>
          <Hangup/>
        </Response>
      `);
    }
  }

  /**
   * Twilio Recording Webhook
   */
  @Post('twilio/recording')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Twilio recording webhook' })
  async handleTwilioRecording(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<{ success: boolean }> {
    this.logger.log('Twilio recording webhook received');

    try {
      const callSid = body.CallSid;
      const recordingSid = body.RecordingSid;
      const recordingUrl = body.RecordingUrl;
      const duration = parseInt(body.RecordingDuration || '0');

      this.logger.log(
        `Recording available: ${recordingSid} for call: ${callSid}, duration: ${duration}s`,
      );

      // The recording will be downloaded when the call ends
      // We just log it here for now

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error handling Twilio recording webhook: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Twilio Speech Result Webhook
   */
  @Post('twilio/speech')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Twilio speech recognition webhook' })
  async handleTwilioSpeech(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Twilio speech webhook received');

    try {
      const callId = body.CallSid;
      const speechResult = body.SpeechResult;
      const confidence = parseFloat(body.Confidence || '0');

      this.logger.log(`Speech recognized: "${speechResult}" (confidence: ${confidence})`);

      // Process speech through conversation engine
      // Note: This is for standard Twilio speech recognition
      // For streaming, we'll use WebSocket in production

      // Generate TwiML response
      res.type('text/xml');
      res.send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Processing your request</Say>
          <Pause length="1"/>
          <Gather input="speech" timeout="3" action="/api/v1/webhooks/twilio/speech">
            <Say>Please continue</Say>
          </Gather>
        </Response>
      `);
    } catch (error: any) {
      this.logger.error(`Error handling Twilio speech webhook: ${error.message}`);
      
      res.type('text/xml');
      res.send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, I didn't catch that. Please try again.</Say>
          <Hangup/>
        </Response>
      `);
    }
  }

  /**
   * Generic webhook endpoint for other providers
   */
  @Post(':provider/:event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle generic provider webhook' })
  async handleGenericWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Generic webhook received: ${JSON.stringify(body)}`);
    
    // Log for debugging
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    this.logger.debug(`Body: ${JSON.stringify(body)}`);

    return { success: true };
  }
}
