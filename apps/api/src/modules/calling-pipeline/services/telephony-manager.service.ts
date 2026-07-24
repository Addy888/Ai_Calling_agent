import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioProvider } from '../providers/twilio.provider';
import {
  TelephonyProvider,
  MakeCallParams,
  MakeCallResponse,
  CallStatusData,
} from '../interfaces/telephony-provider.interface';

/**
 * Telephony Manager Service
 * Manages telephony providers and routes calls
 */
@Injectable()
export class TelephonyManagerService implements OnModuleInit {
  private readonly logger = new Logger(TelephonyManagerService.name);
  private activeProvider: TelephonyProvider;
  private readonly providers = new Map<string, TelephonyProvider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioProvider: TwilioProvider,
  ) {
    // Register providers
    this.providers.set('twilio', this.twilioProvider);
    
    // Set active provider from config
    const providerName = this.configService.get<string>('TELEPHONY_PROVIDER', 'twilio');
    this.activeProvider = this.providers.get(providerName) || this.twilioProvider;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing telephony manager with provider: ${this.activeProvider.name}`);
    
    try {
      await this.activeProvider.initialize();
      this.logger.log('Telephony manager initialized successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initialize telephony manager: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Make an outbound call
   */
  async makeCall(params: MakeCallParams): Promise<MakeCallResponse> {
    this.logger.log(`Making call via ${this.activeProvider.name} to ${params.to}`);
    return this.activeProvider.makeCall(params);
  }

  /**
   * End a call
   */
  async endCall(callSid: string): Promise<void> {
    this.logger.log(`Ending call: ${callSid}`);
    return this.activeProvider.endCall(callSid);
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<CallStatusData> {
    return this.activeProvider.getCallStatus(callSid);
  }

  /**
   * Check if telephony is available
   */
  async isAvailable(): Promise<boolean> {
    return this.activeProvider.isAvailable();
  }

  /**
   * Get active provider name
   */
  getActiveProviderName(): string {
    return this.activeProvider.name;
  }

  /**
   * Switch provider (for advanced use cases)
   */
  async switchProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    await provider.initialize();
    this.activeProvider = provider;
    
    this.logger.log(`Switched to provider: ${providerName}`);
  }

  /**
   * Get all registered providers
   */
  getProviders(): Array<{ name: string; isActive: boolean }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      isActive: provider === this.activeProvider,
    }));
  }
}
