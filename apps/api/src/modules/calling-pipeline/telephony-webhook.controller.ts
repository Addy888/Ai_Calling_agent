import { Controller, Post, Body, Param, Logger, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { CallOrchestratorService } from './services/call-orchestrator.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Telephony Webhook Controller
 * Handles webhooks from telephony providers (Twilio, Exotel, etc.)
 * All endpoints are @Public — no JWT required for provider callbacks
 */
@ApiTags('Telephony Webhooks')
@Controller('webhooks/telephony')
@Public()
export class TelephonyWebhookController {
  private readonly logger = new Logger(TelephonyWebhookController.name);

  constructor(private readonly callOrchestrator: CallOrchestratorService) {}

  /**
   * Handle call status updates from Twilio
   */
  @Post('twilio/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive call status updates from Twilio' })
  async handleTwilioStatus(@Body() body: any, @Res() res: Response): Promise<void> {
    this.logger.log(`Twilio status webhook: ${body.CallStatus} for ${body.CallSid}`);

    try {
      const { CallSid, CallStatus, From, To, Duration } = body;

      // Map Twilio status to our internal handling
      switch (CallStatus) {
        case 'ringing':
          this.logger.log(`Call ringing: ${CallSid}`);
          break;

        case 'in-progress':
        case 'answered':
          this.logger.log(`Call answered: ${CallSid}`);
          // Find session by CallSid and mark as connected
          await this.callOrchestrator.handleCallConnected(
            body.sessionId || CallSid,
            CallSid
          );
          break;

        case 'completed':
          this.logger.log(`Call completed: ${CallSid}, duration: ${Duration}s`);
          await this.callOrchestrator.handleCallDisconnected(
            body.sessionId || CallSid,
            'completed'
          );
          break;

        case 'busy':
          this.logger.log(`Call busy: ${CallSid}`);
          await this.callOrchestrator.handleCallDisconnected(
            body.sessionId || CallSid,
            'busy'
          );
          break;

        case 'no-answer':
          this.logger.log(`Call no answer: ${CallSid}`);
          await this.callOrchestrator.handleCallDisconnected(
            body.sessionId || CallSid,
            'no-answer'
          );
          break;

        case 'failed':
          this.logger.log(`Call failed: ${CallSid}`);
          await this.callOrchestrator.handleCallDisconnected(
            body.sessionId || CallSid,
            'failed'
          );
          break;

        default:
          this.logger.warn(`Unknown call status: ${CallStatus}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling Twilio status: ${error.message}`, error.stack);
      }
      res.status(200).send('OK'); // Always return 200 to Twilio
    }
  }

  /**
   * Handle recording available webhook from Twilio
   */
  @Post('twilio/recording')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive recording URL from Twilio' })
  async handleTwilioRecording(@Body() body: any, @Res() res: Response): Promise<void> {
    this.logger.log(`Recording available for ${body.CallSid}: ${body.RecordingUrl}`);

    try {
      // TODO: Store recording URL in call session
      // await this.callOrchestrator.updateRecordingUrl(body.CallSid, body.RecordingUrl);

      res.status(200).send('OK');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling recording: ${error.message}`, error.stack);
      }
      res.status(200).send('OK');
    }
  }

  /**
   * Generate TwiML for call flow
   */
  @Post('twilio/voice/:sessionId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate TwiML for call flow' })
  async handleTwilioVoice(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log(`Generating TwiML for session: ${sessionId}`);

    try {
      // Generate TwiML to start the conversation
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is an AI assistant calling from our company.</Say>
  <Pause length="1"/>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${process.env.API_BASE_URL}/webhooks/telephony/twilio/speech/${sessionId}" method="POST">
    <Say>How may I help you today?</Say>
  </Gather>
  <Say>I didn't hear anything. Goodbye!</Say>
  <Hangup/>
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error generating TwiML: ${error.message}`, error.stack);
      }
      
      // Fallback TwiML
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again later.</Say>
  <Hangup/>
</Response>`;
      
      res.set('Content-Type', 'text/xml');
      res.status(200).send(errorTwiml);
    }
  }

  /**
   * Handle speech input from Twilio
   */
  @Post('twilio/speech/:sessionId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle speech input from Twilio Gather' })
  async handleTwilioSpeech(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log(`Speech received for session: ${sessionId}`);

    try {
      const { SpeechResult, Confidence } = body;

      if (SpeechResult) {
        // Process customer speech
        await this.callOrchestrator.handleCustomerSpeech(
          sessionId,
          SpeechResult,
          parseFloat(Confidence || '1.0')
        );

        // TODO: Get AI response and generate TwiML to speak it
        // For now, simple acknowledgment
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for your response.</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${process.env.API_BASE_URL}/webhooks/telephony/twilio/speech/${sessionId}" method="POST">
    <Say>Is there anything else I can help you with?</Say>
  </Gather>
  <Say>Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;

        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml);
      } else {
        // No speech detected
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I'm sorry, I didn't catch that.</Say>
  <Hangup/>
</Response>`;

        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling speech: ${error.message}`, error.stack);
      }
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`;
      
      res.set('Content-Type', 'text/xml');
      res.status(200).send(errorTwiml);
    }
  }

  /**
   * Handle Exotel webhooks (future)
   */
  @Post('exotel/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive status updates from Exotel' })
  async handleExotelStatus(@Body() body: any, @Res() res: Response): Promise<void> {
    this.logger.log('Exotel webhook received');
    // TODO: Implement Exotel webhook handling
    res.status(200).send('OK');
  }

  /**
   * Health check for webhooks
   */
  @Post('health')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check for webhook endpoint' })
  async health(@Res() res: Response): Promise<void> {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
  }
}
