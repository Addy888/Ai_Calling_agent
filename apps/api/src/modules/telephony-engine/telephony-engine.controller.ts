/**
 * Telephony Engine Controller
 * REST API endpoints for telephony operations
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TelephonyManagerService } from './services/telephony-manager.service';
import { OutboundCallRequest } from './services/outgoing-call.service';
import {
  MakeCallDto,
  RetryCallDto,
  HangupCallDto,
  TransferCallDto,
  SendDTMFDto,
  CancelCallDto,
  EstimateCostDto,
  SwitchProviderDto,
} from './dto/call-request.dto';
import {
  CallResponseDto,
  ActiveCallsResponseDto,
  HealthCheckResponseDto,
  CostEstimateResponseDto,
  SuccessResponseDto,
} from './dto/call-response.dto';

/**
 * Main Telephony Engine Controller
 */
@ApiTags('Telephony Engine')
@Controller('telephony')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class TelephonyEngineController {
  constructor(private readonly telephonyManager: TelephonyManagerService) {}

  /**
   * Make an outbound call
   */
  @Post('call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make an outbound call' })
  @ApiResponse({ status: 200, description: 'Call initiated successfully', type: CallResponseDto })
  async makeCall(@Body() request: MakeCallDto) {
    return this.telephonyManager.makeCall(request);
  }

  /**
   * Hang up a call
   */
  @Post('hangup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hang up an active call' })
  @ApiResponse({ status: 200, description: 'Call hung up successfully', type: SuccessResponseDto })
  async hangupCall(@Body() body: HangupCallDto) {
    const success = await this.telephonyManager.hangupCall(body.callSid);
    return { success, callSid: body.callSid };
  }

  /**
   * Retry a failed call
   */
  @Post('retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed call' })
  @ApiResponse({ status: 200, description: 'Call retry initiated', type: CallResponseDto })
  async retryCall(@Body() body: RetryCallDto) {
    return this.telephonyManager.retryCall(body.originalCallSid, body);
  }

  /**
   * Get call status
   */
  @Get('status/:callSid')
  @ApiOperation({ summary: 'Get call status' })
  @ApiResponse({ status: 200, description: 'Call status retrieved' })
  async getCallStatus(@Param('callSid') callSid: string) {
    return this.telephonyManager.getCallStatus(callSid);
  }

  /**
   * Get all active calls
   */
  @Get('active-calls')
  @ApiOperation({ summary: 'Get all active calls' })
  @ApiResponse({ status: 200, description: 'Active calls retrieved', type: ActiveCallsResponseDto })
  async getActiveCalls() {
    const calls = await this.telephonyManager.getActiveCalls();
    const count = await this.telephonyManager.getActiveCallCount();

    return {
      total: count,
      calls,
    };
  }

  /**
   * Get call session details
   */
  @Get('session/:callSid')
  @ApiOperation({ summary: 'Get call session details' })
  @ApiResponse({ status: 200, description: 'Session details retrieved' })
  async getCallSession(@Param('callSid') callSid: string) {
    return this.telephonyManager.getCallSession(callSid);
  }

  /**
   * Transfer call
   */
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer a call' })
  @ApiResponse({ status: 200, description: 'Call transferred', type: SuccessResponseDto })
  async transferCall(@Body() body: TransferCallDto) {
    const success = await this.telephonyManager.transferCall(body.callSid, body.to);
    return { success, callSid: body.callSid, to: body.to };
  }

  /**
   * Send DTMF tones
   */
  @Post('dtmf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send DTMF tones' })
  @ApiResponse({ status: 200, description: 'DTMF sent', type: SuccessResponseDto })
  async sendDTMF(@Body() body: SendDTMFDto) {
    const success = await this.telephonyManager.sendDTMF(body.callSid, body.digits);
    return { success, callSid: body.callSid, digits: body.digits };
  }

  /**
   * Get providers
   */
  @Get('providers')
  @ApiOperation({ summary: 'Get all telephony providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved' })
  async getProviders() {
    return {
      active: this.telephonyManager.getActiveProvider(),
      all: this.telephonyManager.getAllProviders(),
    };
  }

  /**
   * Switch provider
   */
  @Post('provider/switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active telephony provider' })
  @ApiResponse({ status: 200, description: 'Provider switched', type: SuccessResponseDto })
  async switchProvider(@Body() body: SwitchProviderDto) {
    await this.telephonyManager.switchProvider(body.providerType);
    return {
      success: true,
      activeProvider: this.telephonyManager.getActiveProvider(),
    };
  }

  /**
   * Get provider capabilities
   */
  @Get('provider/capabilities')
  @ApiOperation({ summary: 'Get provider capabilities' })
  @ApiResponse({ status: 200, description: 'Capabilities retrieved' })
  async getCapabilities(@Query('provider') providerType?: string) {
    return this.telephonyManager.getProviderCapabilities(providerType);
  }

  /**
   * Get recording
   */
  @Get('recording/:recordingSid')
  @ApiOperation({ summary: 'Get recording metadata' })
  @ApiResponse({ status: 200, description: 'Recording metadata retrieved' })
  async getRecording(@Param('recordingSid') recordingSid: string) {
    return this.telephonyManager.getRecording(recordingSid);
  }

  /**
   * Download recording
   */
  @Get('recording/:recordingSid/download')
  @ApiOperation({ summary: 'Download recording file' })
  @ApiResponse({ status: 200, description: 'Recording file' })
  async downloadRecording(
    @Param('recordingSid') recordingSid: string,
    @Res() res: Response,
  ) {
    const buffer = await this.telephonyManager.getRecordingBuffer(recordingSid);
    const metadata = await this.telephonyManager.getRecording(recordingSid);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="recording_${recordingSid}.mp3"`,
    });

    res.send(buffer);
  }

  /**
   * Get recordings for call
   */
  @Get('call/:callSid/recordings')
  @ApiOperation({ summary: 'Get recordings for a call' })
  @ApiResponse({ status: 200, description: 'Recordings retrieved' })
  async getCallRecordings(@Param('callSid') callSid: string) {
    return this.telephonyManager.getRecordingsForCall(callSid);
  }

  /**
   * Get statistics
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get telephony statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStatistics() {
    return this.telephonyManager.getStatistics();
  }

  /**
   * Health check
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'System health status', type: HealthCheckResponseDto })
  async healthCheck() {
    return this.telephonyManager.healthCheck();
  }

  /**
   * Estimate call cost
   */
  @Post('estimate-cost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estimate call cost' })
  @ApiResponse({ status: 200, description: 'Cost estimated', type: CostEstimateResponseDto })
  async estimateCost(@Body() body: EstimateCostDto) {
    const cost = await this.telephonyManager.estimateCallCost(
      body.from,
      body.to,
      body.duration,
    );

    return {
      cost,
      currency: 'USD',
      duration: body.duration,
      costPerMinute: cost / (body.duration / 60),
    };
  }

  /**
   * Cleanup old data
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cleanup old sessions and recordings' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanup(
    @Body()
    body?: {
      sessionsOlderThan?: number;
      recordingsOlderThan?: number;
    },
  ) {
    return this.telephonyManager.cleanup(body);
  }

  /**
   * Cancel call
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a call' })
  @ApiResponse({ status: 200, description: 'Call cancelled', type: SuccessResponseDto })
  async cancelCall(@Body() body: CancelCallDto) {
    const success = await this.telephonyManager.cancelCall(
      body.callSid,
      body.reason,
    );
    return { success, callSid: body.callSid };
  }
}

/**
 * Webhook Controller (separate for security)
 */
@Controller('webhooks/telephony')
export class TelephonyWebhookController {
  constructor(private readonly telephonyManager: TelephonyManagerService) {}

  /**
   * Handle Twilio webhooks
   */
  @Post('twilio/:type')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(
    @Param('type') type: string,
    @Headers('x-twilio-signature') signature: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    const url = `${process.env.API_BASE_URL}/webhooks/telephony/twilio/${type}`;

    const result = await this.telephonyManager.processWebhook(
      'twilio',
      signature,
      url,
      payload,
    );

    if (type === 'voice' && result.processed) {
      // Return TwiML for voice webhooks
      const instructions = {
        say: {
          text: 'Please hold while we connect your call.',
        },
      };

      const response = this.telephonyManager.generateCallControl(instructions);
      res.set('Content-Type', response.contentType);
      res.send(response.content);
    } else {
      res.json(result);
    }
  }

  /**
   * Handle Exotel webhooks (architecture ready)
   */
  @Post('exotel/:type')
  @HttpCode(HttpStatus.OK)
  async handleExotelWebhook(
    @Param('type') type: string,
    @Headers('authorization') signature: string,
    @Body() payload: any,
  ) {
    const url = `${process.env.API_BASE_URL}/webhooks/telephony/exotel/${type}`;

    return this.telephonyManager.processWebhook('exotel', signature, url, payload);
  }

  /**
   * Handle Plivo webhooks (architecture ready)
   */
  @Post('plivo/:type')
  @HttpCode(HttpStatus.OK)
  async handlePlivoWebhook(
    @Param('type') type: string,
    @Headers('x-plivo-signature') signature: string,
    @Body() payload: any,
  ) {
    const url = `${process.env.API_BASE_URL}/webhooks/telephony/plivo/${type}`;

    return this.telephonyManager.processWebhook('plivo', signature, url, payload);
  }
}
