import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITeflehonyProvider,
  CallOptions,
  CallResult,
  TelephonyWebhookData,
} from './interfaces/telephony-provider.interface';
import { TwilioProvider } from './providers/twilio.provider';

/**
 * Telephony Service
 * Manages telephony providers and call operations
 */
@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);
  private provider: ITeflehonyProvider;
  private readonly providers: Map<string, ITeflehonyProvider> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioProvider: TwilioProvider,
  ) {
    // Register providers
    this.registerProvider(this.twilioProvider);

    // Set active provider based on config
    const activeProvider = this.configService.get<string>('TELEPHONY_PROVIDER', 'twilio');
    this.setProvider(activeProvider);
  }

  /**
   * Register a telephony provider
   */
  registerProvider(provider: ITeflehonyProvider): void {
    this.providers.set(provider.getName(), provider);
    this.logger.log(`Registered provider: ${provider.getName()}`);
  }

  /**
   * Set active telephony provider
   */
  setProvider(providerName: string): void {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new BadRequestException(`Provider not found: ${providerName}`);
    }

    this.provider = provider;
    this.logger.log(`Active provider set to: ${providerName}`);
  }

  /**
   * Get active provider
   */
  getProvider(): ITeflehonyProvider {
    if (!this.provider) {
      throw new Error('No telephony provider configured');
    }
    return this.provider;
  }

  /**
   * Make an outbound call
   */
  async makeCall(options: CallOptions): Promise<CallResult> {
    this.logger.log(`Making call via ${this.provider.getName()}`);
    return this.provider.makeCall(options);
  }

  /**
   * End a call
   */
  async endCall(callSid: string): Promise<boolean> {
    this.logger.log(`Ending call: ${callSid}`);
    return this.provider.endCall(callSid);
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<CallResult> {
    return this.provider.getCallStatus(callSid);
  }

  /**
   * Generate call flow (TwiML/equivalent)
   */
  generateCallFlow(websocketUrl: string, metadata?: Record<string, any>): string {
    return this.provider.generateCallFlow(websocketUrl, metadata);
  }

  /**
   * Parse webhook data
   */
  parseWebhook(body: any): TelephonyWebhookData {
    return this.provider.parseWebhook(body);
  }

  /**
   * Get recording URL
   */
  async getRecordingUrl(callSid: string, recordingSid: string): Promise<string> {
    return this.provider.getRecordingUrl(callSid, recordingSid);
  }

  /**
   * Download recording
   */
  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    return this.provider.downloadRecording(recordingUrl);
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(signature: string, url: string, params: any): boolean {
    return this.provider.validateWebhookSignature(signature, url, params);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(providerName: string): boolean {
    return this.providers.has(providerName);
  }
}
