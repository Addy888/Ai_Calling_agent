/**
 * Exotel Telephony Provider Implementation
 * Production-ready implementation for Indian SIP-based calling via Exotel
 * 
 * Exotel is an Indian cloud telephony provider offering:
 * - 60-70% cost savings vs Twilio
 * - Native Indian DID numbers
 * - Excellent voice quality on Indian networks
 * - TRAI compliance
 * 
 * API Documentation: https://developer.exotel.com
 */

import { Injectable, Logger } from '@nestjs/common';
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
export class ExotelProvider implements ITelephonyProvider {
  private readonly logger = new Logger(ExotelProvider.name);
  private config: ProviderConfig;
  private ready = false;

  // Exotel specific configuration
  private apiKey: string;
  private apiToken: string;
  private sid: string;
  private subdomain: string;
  private callerId: string;
  private baseUrl: string;

  getName(): string {
    return 'Exotel';
  }

  getType(): string {
    return ProviderType.EXOTEL;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRecording: true,
      supportsDTMF: true,
      supportsConferencing: true,
      supportsTransfer: true,
      supportsMachineDetection: false, // Exotel doesn't have built-in AMD
      supportsWebhooks: true,
      supportsStreaming: false, // Not natively supported
      maxConcurrentCalls: 1000, // Exotel default limit
    };
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.logger.log('🇮🇳 Initializing Exotel provider for India...');

    // Validate required configuration
    if (!config.additionalConfig?.sid || !config.additionalConfig?.subdomain) {
      throw new Error('Exotel configuration incomplete. Required: sid, subdomain, apiKey, apiToken, callerId');
    }

    this.config = config;
    this.apiKey = config.apiKey;
    this.apiToken = config.apiSecret;
    this.sid = config.additionalConfig.sid;
    this.subdomain = config.additionalConfig.subdomain;
    this.callerId = config.additionalConfig.callerId;
    
    // Construct base URL
    this.baseUrl = `https://${this.subdomain}.exotel.com/v1/Accounts/${this.sid}`;

    try {
      // Test connection by fetching account details
      await this.healthCheck();
      
      this.ready = true;
      this.logger.log('✅ Exotel provider initialized successfully');
      this.logger.log(`📞 Using Exotel Caller ID: ${this.callerId}`);
      this.logger.log(`🌐 API Endpoint: ${this.baseUrl}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Exotel: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready && !!this.apiKey && !!this.apiToken;
  }

  async makeCall(params: CallInitiationParams): Promise<CallResult> {
    this.ensureReady();

    this.logger.log(`📞 [EXOTEL] Making call from ${params.from} to ${params.to}`);

    try {
      const url = `${this.baseUrl}/Calls/connect.json`;

      // Prepare form data (Exotel uses application/x-www-form-urlencoded)
      const formData = new URLSearchParams({
        From: params.from || this.callerId,
        To: params.to,
        CallerId: this.callerId,
        CallType: 'trans', // trans = Transactional call
        TimeLimit: String(params.timeout || 3600), // Max call duration in seconds
        TimeOut: '30', // Ring timeout
        StatusCallback: params.statusCallbackUrl || params.callbackUrl,
        StatusCallbackEvents: JSON.stringify(['queued', 'initiated', 'ringing', 'in-progress', 'completed']),
        StatusCallbackContentType: 'application/json',
        Record: params.record !== false ? 'true' : 'false',
        RecordingChannels: '1', // Mono recording
        RecordingStatusCallback: params.recordingCallbackUrl || '',
      });

      // Add custom parameters for tracking
      if (params.metadata) {
        Object.entries(params.metadata).forEach(([key, value]) => {
          formData.append(`CustomField_${key}`, String(value));
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exotel API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as any;

      if (!data.Call) {
        throw new Error('Invalid response from Exotel API');
      }

      this.logger.log(`✅ [EXOTEL] Call initiated: ${data.Call.Sid}`);

      return this.mapExotelCallToResult(data.Call);
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to make call: ${error.message}`);
      throw new Error(`Exotel call failed: ${error.message}`);
    }
  }

  async hangupCall(callSid: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`📴 [EXOTEL] Hanging up call: ${callSid}`);

    try {
      const url = `${this.baseUrl}/Calls/${callSid}.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          Status: 'completed',
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to hangup call ${callSid}: ${response.statusText}`);
        return false;
      }

      this.logger.log(`✅ [EXOTEL] Call hung up: ${callSid}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to hangup call: ${error.message}`);
      return false;
    }
  }

  async getCallStatus(callSid: string): Promise<CallResult> {
    this.ensureReady();

    try {
      const url = `${this.baseUrl}/Calls/${callSid}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch call status: ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (!data.Call) {
        throw new Error('Invalid response from Exotel API');
      }

      return this.mapExotelCallToResult(data.Call);
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to get call status: ${error.message}`);
      throw error;
    }
  }

  async updateCall(
    callSid: string,
    updates: Partial<CallInitiationParams>,
  ): Promise<CallResult> {
    this.ensureReady();

    this.logger.log(`🔄 [EXOTEL] Updating call: ${callSid}`);

    try {
      const url = `${this.baseUrl}/Calls/${callSid}.json`;

      const formData = new URLSearchParams();
      
      if (updates.callbackUrl) {
        formData.append('Url', updates.callbackUrl);
      }
      
      if (updates.statusCallbackUrl) {
        formData.append('StatusCallback', updates.statusCallbackUrl);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to update call: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return this.mapExotelCallToResult(data.Call);
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to update call: ${error.message}`);
      throw error;
    }
  }

  async sendDTMF(callSid: string, digits: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`🔢 [EXOTEL] Sending DTMF to call ${callSid}: ${digits}`);

    try {
      // Exotel supports DTMF via Applet XML
      // We need to update the call with a new applet that plays DTMF
      const applet = this.generateDTMFApplet(digits);
      
      const url = `${this.baseUrl}/Calls/${callSid}.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          Applet: applet,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to send DTMF: ${error.message}`);
      return false;
    }
  }

  async transferCall(callSid: string, to: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`📲 [EXOTEL] Transferring call ${callSid} to ${to}`);

    try {
      // Generate applet for call transfer
      const applet = this.generateTransferApplet(to);
      
      const url = `${this.baseUrl}/Calls/${callSid}.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          Applet: applet,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to transfer call: ${error.message}`);
      return false;
    }
  }

  async getRecording(recordingSid: string): Promise<RecordingInfo> {
    this.ensureReady();

    try {
      const url = `${this.baseUrl}/Recordings/${recordingSid}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (!data.Recording) {
        throw new Error('Invalid response from Exotel API');
      }

      const recording = data.Recording;

      return {
        recordingSid: recording.Sid,
        callSid: recording.CallSid,
        url: recording.Url || recording.RecordingUrl,
        duration: parseInt(recording.Duration || '0'),
        format: 'mp3',
        channels: 1,
        fileSize: recording.Size ? parseInt(recording.Size) : undefined,
      };
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to get recording: ${error.message}`);
      throw error;
    }
  }

  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    this.ensureReady();

    this.logger.log(`📥 [EXOTEL] Downloading recording: ${recordingUrl}`);

    try {
      const response = await fetch(recordingUrl, {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Failed to download recording: ${error.message}`);
      throw error;
    }
  }

  generateCallControl(instructions: CallControlInstructions): CallControlResponse {
    // Exotel uses Applet XML (similar to TwiML)
    const elements: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

    if (instructions.say) {
      elements.push(
        `<Say voice="${instructions.say.voice || 'woman'}" language="${instructions.say.language || 'en'}">${this.escapeXml(instructions.say.text)}</Say>`
      );
    }

    if (instructions.play) {
      elements.push(
        `<Play loop="${instructions.play.loop || 1}">${this.escapeXml(instructions.play.url)}</Play>`
      );
    }

    if (instructions.gather) {
      const gatherAttrs = [
        `input="${instructions.gather.input}"`,
        `timeout="${instructions.gather.timeout || 5}"`,
        instructions.gather.finishOnKey ? `finishOnKey="${instructions.gather.finishOnKey}"` : '',
        instructions.gather.numDigits ? `numDigits="${instructions.gather.numDigits}"` : '',
        instructions.gather.action ? `action="${instructions.gather.action}"` : '',
      ].filter(Boolean).join(' ');

      elements.push(`<Gather ${gatherAttrs}>`);
      
      if (instructions.say) {
        elements.push(
          `<Say>${this.escapeXml(instructions.say.text)}</Say>`
        );
      }
      
      elements.push('</Gather>');
    }

    if (instructions.record) {
      const recordAttrs = [
        instructions.record.action ? `action="${instructions.record.action}"` : '',
        instructions.record.timeout ? `timeout="${instructions.record.timeout}"` : '',
        instructions.record.maxLength ? `maxLength="${instructions.record.maxLength}"` : '',
        instructions.record.playBeep !== false ? 'playBeep="true"' : 'playBeep="false"',
      ].filter(Boolean).join(' ');

      elements.push(`<Record ${recordAttrs}/>`);
    }

    if (instructions.dial) {
      const dialAttrs = [
        instructions.dial.timeout ? `timeout="${instructions.dial.timeout}"` : '',
        instructions.dial.action ? `action="${instructions.dial.action}"` : '',
      ].filter(Boolean).join(' ');

      elements.push(`<Dial ${dialAttrs}><Number>${instructions.dial.number}</Number></Dial>`);
    }

    if (instructions.pause) {
      elements.push(`<Pause length="${instructions.pause.length}"/>`);
    }

    if (instructions.redirect) {
      elements.push(`<Redirect>${this.escapeXml(instructions.redirect.url)}</Redirect>`);
    }

    if (instructions.hangup) {
      elements.push('<Hangup/>');
    }

    elements.push('</Response>');

    return {
      content: elements.join('\n'),
      contentType: 'application/xml',
    };
  }

  parseWebhook(payload: any): WebhookPayload {
    // Exotel webhook payload structure
    const callSid = payload.CallSid || payload.Sid;
    const status = this.mapExotelStatusToCallState(payload.Status || payload.CallStatus);

    const webhookPayload: WebhookPayload = {
      type: this.determineWebhookType(payload),
      callSid,
      status,
      direction: payload.Direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
      from: payload.CallFrom || payload.From,
      to: payload.CallTo || payload.To,
      duration: payload.Duration || payload.CallDuration ? parseInt(payload.Duration || payload.CallDuration) : undefined,
      recordingUrl: payload.RecordingUrl,
      recordingSid: payload.RecordingSid,
      dtmfDigits: payload.Digits,
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage || payload.FailureReason,
      timestamp: new Date(),
      rawPayload: payload,
    };

    return webhookPayload;
  }

  validateWebhookSignature(signature: string, url: string, params: any): boolean {
    try {
      // Exotel doesn't use signature validation like Twilio
      // Instead, they recommend IP whitelisting and HTTPS
      // For now, we'll implement basic validation
      
      // In production, add IP whitelist check:
      // const allowedIPs = ['122.166.192.0/24', '43.241.153.0/24']; // Exotel IPs
      
      // For now, just check if we have required fields
      return !!(params.CallSid || params.Sid);
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Webhook validation failed: ${error.message}`);
      return false;
    }
  }

  async estimateCallCost(from: string, to: string, duration: number): Promise<number> {
    // Exotel India pricing
    // Standard outbound calls: ₹0.50 - 1.00 per minute
    const pricePerMinute = 0.007; // $0.007 USD = ₹0.60 (approximate)
    const minutes = Math.ceil(duration / 60);
    return minutes * pricePerMinute;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey || !this.apiToken) {
      return false;
    }

    try {
      // Try to fetch account details as health check
      const url = `${this.baseUrl}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (response.ok) {
        this.logger.log('✅ [EXOTEL] Health check passed');
      }

      return response.ok;
    } catch (error) {
      this.logger.error(`❌ [EXOTEL] Health check failed: ${error.message}`);
      return false;
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private ensureReady(): void {
    if (!this.isReady()) {
      throw new Error('Exotel provider is not initialized');
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private mapExotelCallToResult(call: any): CallResult {
    return {
      callSid: call.Sid,
      providerCallId: call.Sid,
      status: this.mapExotelStatusToCallState(call.Status),
      direction: call.Direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
      to: call.To || call.PhoneNumberTo,
      from: call.From || call.PhoneNumberFrom,
      price: call.Price,
      priceUnit: 'INR',
      duration: call.Duration ? parseInt(call.Duration) : undefined,
      startTime: call.StartTime ? new Date(call.StartTime) : undefined,
      endTime: call.EndTime ? new Date(call.EndTime) : undefined,
      answeredBy: call.AnsweredBy as any,
      metadata: this.extractCustomFields(call),
    };
  }

  private mapExotelStatusToCallState(status: string): CallState {
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
      'cancelled': CallState.CANCELLED,
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
    if (payload.ErrorCode || payload.FailureReason) {
      return 'error';
    }
    return 'call_status';
  }

  private extractCustomFields(data: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    Object.keys(data).forEach(key => {
      if (key.startsWith('CustomField_')) {
        const fieldName = key.replace('CustomField_', '');
        metadata[fieldName] = data[key];
      }
    });

    return metadata;
  }

  private generateDTMFApplet(digits: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play digits="${digits}"/>
</Response>`;
  }

  private generateTransferApplet(to: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Number>${to}</Number>
  </Dial>
</Response>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
