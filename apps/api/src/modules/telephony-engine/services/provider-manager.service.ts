/**
 * Provider Manager Service
 * Manages provider configuration, initialization, and switching
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistryService } from './provider-registry.service';
import { TwilioProvider } from '../providers/twilio.provider';
import { ExotelProvider } from '../providers/exotel.provider';
import { PlivoProvider } from '../providers/plivo.provider';
import { AsteriskProvider } from '../providers/asterisk.provider';
import { ProviderType } from '../enums/call-state.enum';
import { ProviderConfig } from '../interfaces/telephony-provider.interface';

@Injectable()
export class ProviderManagerService implements OnModuleInit {
  private readonly logger = new Logger(ProviderManagerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly twilioProvider: TwilioProvider,
    private readonly exotelProvider: ExotelProvider,
    private readonly plivoProvider: PlivoProvider,
    private readonly asteriskProvider: AsteriskProvider,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Provider Manager...');

    // Register all providers
    this.registerAllProviders();

    // Initialize default provider
    await this.initializeDefaultProvider();

    this.logger.log('Provider Manager initialized');
  }

  /**
   * Register all available providers
   */
  private registerAllProviders(): void {
    this.providerRegistry.registerProvider(this.twilioProvider);
    this.providerRegistry.registerProvider(this.exotelProvider);
    this.providerRegistry.registerProvider(this.plivoProvider);
    this.providerRegistry.registerProvider(this.asteriskProvider);

    this.logger.log(`Registered ${this.providerRegistry.getProviderCount()} providers`);
  }

  /**
   * Initialize default provider from configuration
   */
  private async initializeDefaultProvider(): Promise<void> {
    const defaultProvider = this.configService.get<string>(
      'TELEPHONY_PROVIDER',
      ProviderType.TWILIO,
    );

    this.logger.log(`Initializing default provider: ${defaultProvider}`);

    try {
      await this.initializeProvider(defaultProvider);
      this.providerRegistry.setActiveProvider(defaultProvider);
    } catch (error) {
      this.logger.warn(
        `Default telephony provider "${defaultProvider}" could not be initialized: ${error.message}. ` +
        `Configure the required credentials in .env to enable telephony.`,
      );
      // Do not rethrow — app should boot without credentials configured
    }
  }

  /**
   * Initialize a specific provider
   */
  async initializeProvider(providerType: string): Promise<void> {
    const provider = this.providerRegistry.getProvider(providerType);

    if (!provider) {
      throw new Error(`Provider ${providerType} not found`);
    }

    if (provider.isReady()) {
      this.logger.log(`Provider ${providerType} is already initialized`);
      return;
    }

    const config = this.getProviderConfig(providerType);
    await provider.initialize(config);

    this.logger.log(`Provider ${providerType} initialized successfully`);
  }

  /**
   * Get configuration for a provider
   */
  private getProviderConfig(providerType: string): ProviderConfig {
    switch (providerType) {
      case ProviderType.TWILIO:
        return {
          accountSid: this.configService.get<string>('TWILIO_ACCOUNT_SID'),
          authToken: this.configService.get<string>('TWILIO_AUTH_TOKEN'),
          phoneNumber: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
          webhookSecret: this.configService.get<string>('TWILIO_WEBHOOK_SECRET'),
        };

      case ProviderType.EXOTEL:
        return {
          apiKey: this.configService.get<string>('EXOTEL_API_KEY'),
          apiSecret: this.configService.get<string>('EXOTEL_API_SECRET'),
          accountSid: this.configService.get<string>('EXOTEL_SID'),
          phoneNumber: this.configService.get<string>('EXOTEL_PHONE_NUMBER'),
        };

      case ProviderType.PLIVO:
        return {
          apiKey: this.configService.get<string>('PLIVO_AUTH_ID'),
          authToken: this.configService.get<string>('PLIVO_AUTH_TOKEN'),
          phoneNumber: this.configService.get<string>('PLIVO_PHONE_NUMBER'),
        };

      case ProviderType.ASTERISK:
        return {
          apiEndpoint: this.configService.get<string>('ASTERISK_HOST', 'localhost'),
          additionalConfig: {
            port: this.configService.get<number>('ASTERISK_AMI_PORT', 5038),
            username: this.configService.get<string>('ASTERISK_AMI_USERNAME', 'admin'),
            secret: this.configService.get<string>('ASTERISK_AMI_SECRET'),
            context: this.configService.get<string>('ASTERISK_CONTEXT', 'ai-calling'),
            extension: this.configService.get<string>('ASTERISK_EXTENSION', 's'),
          },
        };

      default:
        throw new Error(`Configuration for provider ${providerType} not found`);
    }
  }

  /**
   * Switch active provider
   */
  async switchProvider(providerType: string): Promise<void> {
    this.logger.log(`Switching to provider: ${providerType}`);

    if (!this.providerRegistry.hasProvider(providerType)) {
      throw new Error(`Provider ${providerType} is not registered`);
    }

    const provider = this.providerRegistry.getProvider(providerType);

    if (!provider.isReady()) {
      this.logger.log(`Provider ${providerType} not ready, initializing...`);
      await this.initializeProvider(providerType);
    }

    this.providerRegistry.setActiveProvider(providerType);
    this.logger.log(`Switched to provider: ${provider.getName()}`);
  }

  /**
   * Get active provider
   */
  getActiveProvider() {
    return this.providerRegistry.getActiveProvider();
  }

  /**
   * Get all providers info
   */
  getAllProviders() {
    return this.providerRegistry.getAllProviders();
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const providerInfo of this.providerRegistry.getAllProviders()) {
      const provider = this.providerRegistry.getProvider(providerInfo.type);
      if (provider) {
        try {
          results[providerInfo.type] = await provider.healthCheck();
        } catch (error) {
          results[providerInfo.type] = false;
        }
      }
    }

    return results;
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(providerType?: string) {
    const provider = providerType
      ? this.providerRegistry.getProvider(providerType)
      : this.providerRegistry.getActiveProvider();

    if (!provider) {
      throw new Error('No provider available');
    }

    return provider.getCapabilities();
  }
}
