import { Controller, Post, Body, Param, Logger, Res, HttpCode, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CallOrchestratorService } from './services/call-orchestrator.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  MonitorCallStateEvent,
  MonitorTranscriptEvent,
  MonitorRecordingEvent,
} from './interfaces/telephony-provider.interface';

/**
 * Telephony Webhook Controller
 *
 * Receives webhook callbacks from Twilio (and other real providers).
 * Emits the SAME EventEmitter2 events that MockTelephonyProvider emits
 * during simulation — so the RuntimeMonitorGateway and CallOrchestrator
 * behave identically regardless of provider.
 *
 * All endpoints are @Public — no JWT required for provider callbacks.
 */
@ApiTags('Telephony Webhooks')
@Controller('webhooks/telephony')
@Public()
export class TelephonyWebhookController {
  private readonly logger = new Logger(TelephonyWebhookController.name);

  constructor(
    private readonly callOrchestrator: CallOrchestratorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Twilio: call status updates
   * Maps Twilio status → internal EventEmitter2 events → Runtime Monitor
   */
  @Post('twilio/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive call status updates from Twilio' })
  async handleTwilioStatus(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const { CallSid, CallStatus, From, To, Duration } = body;
    const sessionId: string = body.sessionId || CallSid;

    this.logger.log(`[Twilio] Status webhook: ${CallStatus} → ${CallSid}`);

    try {
      switch (CallStatus) {
        case 'queued':
        case 'initiated': {
          this.emitCallState(sessionId, CallSid, 'DIALING', From, To);
          break;
        }

        case 'ringing': {
          this.emitCallState(sessionId, CallSid, 'RINGING', From, To);
          break;
        }

        case 'in-progress':
        case 'answered': {
          this.emitCallState(sessionId, CallSid, 'CONNECTED', From, To);

          // Inform CallOrchestrator
          await this.callOrchestrator.handleCallConnected(sessionId, CallSid);

          // Notify Runtime Monitor
          this.eventEmitter.emit('telephony.call.answered', {
            callSid: CallSid,
            sessionId,
          });
          break;
        }

        case 'completed': {
          this.emitCallState(sessionId, CallSid, 'ENDED', From, To);

          this.eventEmitter.emit('telephony.call.completed', {
            callSid: CallSid,
            sessionId,
            outcome: 'completed',
            duration: Duration ? parseInt(Duration, 10) : 0,
          });

          await this.callOrchestrator.handleCallDisconnected(sessionId, 'completed');
          break;
        }

        case 'busy': {
          this.emitCallState(sessionId, CallSid, 'FAILED', From, To);
          this.eventEmitter.emit('telephony.call.completed', {
            callSid: CallSid,
            sessionId,
            outcome: 'busy',
            duration: 0,
          });
          await this.callOrchestrator.handleCallDisconnected(sessionId, 'busy');
          break;
        }

        case 'no-answer': {
          this.emitCallState(sessionId, CallSid, 'FAILED', From, To);
          this.eventEmitter.emit('telephony.call.completed', {
            callSid: CallSid,
            sessionId,
            outcome: 'no-answer',
            duration: 0,
          });
          await this.callOrchestrator.handleCallDisconnected(sessionId, 'no-answer');
          break;
        }

        case 'failed': {
          this.emitCallState(sessionId, CallSid, 'FAILED', From, To);
          this.eventEmitter.emit('telephony.call.completed', {
            callSid: CallSid,
            sessionId,
            outcome: 'failed',
            duration: 0,
          });
          await this.callOrchestrator.handleCallDisconnected(sessionId, 'failed');
          break;
        }

        default:
          this.logger.warn(`[Twilio] Unknown CallStatus: ${CallStatus}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `[Twilio] Error handling status webhook: ${error.message}`,
          error.stack,
        );
      }
      res.status(200).send('OK'); // Always 200 to Twilio
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Twilio: recording available webhook
   */
  @Post('twilio/recording')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive recording URL from Twilio' })
  async handleTwilioRecording(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const { CallSid, RecordingUrl, RecordingDuration, RecordingSid } = body;
    const sessionId: string = body.sessionId || CallSid;

    this.logger.log(`[Twilio] Recording ready for ${CallSid}: ${RecordingUrl}`);

    try {
      if (RecordingUrl) {
        const recordingEvent: MonitorRecordingEvent = {
          sessionId,
          callSid: CallSid,
          recording: {
            recordingSid: RecordingSid || `RE${CallSid}`,
            url: RecordingUrl,
            durationSeconds: RecordingDuration ? parseInt(RecordingDuration, 10) : 0,
            format: 'mp3',
            channels: 1,
            createdAt: new Date(),
          },
        };

        this.eventEmitter.emit('monitor.recording', recordingEvent);
      }

      res.status(200).send('OK');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `[Twilio] Error handling recording webhook: ${error.message}`,
          error.stack,
        );
      }
      res.status(200).send('OK');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Twilio: TwiML voice instructions
   */
  @Post('twilio/voice/:sessionId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate TwiML for call flow' })
  async handleTwilioVoice(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`[Twilio] Generating TwiML for session: ${sessionId}`);

    try {
      const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3001');
      const apiPrefix = this.configService.get<string>('API_PREFIX', 'api/v1');

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello! This is an AI assistant. I'm here to help you today.</Say>
  <Pause length="1"/>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${baseUrl}/${apiPrefix}/webhooks/telephony/twilio/speech/${sessionId}" method="POST">
    <Say voice="Polly.Joanna">How may I help you today?</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't hear anything. Goodbye!</Say>
  <Hangup/>
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `[Twilio] Error generating TwiML: ${error.message}`,
          error.stack,
        );
      }

      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>A system error occurred. Please try again later. Goodbye.</Say>
  <Hangup/>
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.status(200).send(errorTwiml);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Twilio: speech input from Gather verb
   */
  @Post('twilio/speech/:sessionId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle speech input from Twilio Gather' })
  async handleTwilioSpeech(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const { SpeechResult, Confidence, CallSid } = body;
    this.logger.log(`[Twilio] Speech received for session: ${sessionId}`);

    try {
      if (SpeechResult) {
        // Emit monitor event for customer speech
        const transcriptEvent: MonitorTranscriptEvent = {
          sessionId,
          callSid: CallSid || sessionId,
          role: 'customer',
          text: SpeechResult,
          timestamp: new Date(),
        };
        this.eventEmitter.emit('monitor.transcript', transcriptEvent);

        // Mark customer speaking state
        this.emitCallState(sessionId, CallSid || sessionId, 'CUSTOMER_SPEAKING', '', '');

        // Process through call orchestrator
        await this.callOrchestrator.handleCustomerSpeech(
          sessionId,
          SpeechResult,
          parseFloat(Confidence || '1.0'),
        );

        const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3001');
        const apiPrefix = this.configService.get<string>('API_PREFIX', 'api/v1');

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for your response. Let me process that for you.</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${baseUrl}/${apiPrefix}/webhooks/telephony/twilio/speech/${sessionId}" method="POST">
    <Say voice="Polly.Joanna">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="Polly.Joanna">Thank you for calling. Have a great day!</Say>
  <Hangup/>
</Response>`;

        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml);
      } else {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I'm sorry, I didn't catch that. Goodbye!</Say>
  <Hangup/>
</Response>`;

        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `[Twilio] Error handling speech: ${error.message}`,
          error.stack,
        );
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

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Health check
   */
  @Post('health')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook health check' })
  async health(@Res() res: Response): Promise<void> {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: emit monitor.call_state event
  // ───────────────────────────────────────────────────────────────────────────
  private emitCallState(
    sessionId: string,
    callSid: string,
    state: MonitorCallStateEvent['state'],
    from: string,
    to: string,
  ): void {
    const event: MonitorCallStateEvent = {
      sessionId,
      callSid,
      state,
      phoneNumber: to,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('monitor.call_state', event);
  }
}
