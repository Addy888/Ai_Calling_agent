/**
 * Provider Registry Service
 * Manages registration and retrieval of telephony providers
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ITelephonyProvider } from '../interfaces/telephony-provider.interface';
import { ProviderType } from '../enums/call-state.enum';

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private providers: Map<string, ITelephonyProvider> = new Map();
  private activeProvider: string;

  onModuleInit() {
    this.logger.log('Provider Registry initialized');
  }

  /**
   * Register a telephony provider
   */
  registerProvider(provider: ITelephonyProvider): void {
    const providerType = provider.getType();
    
    if (this.providers.has(providerType)) {
      this.logger.warn(`Provider ${providerType} is already registered. Overwriting...`);
    }

    this.providers.set(providerType, provider);
    this.logger.log(`Registered provider: ${provider.getName()} (${providerType})`);
  }

  /**
   * Get a provider by type
   */
  getProvider(providerType: string): ITelephonyProvider | undefined {
    return this.providers.get(providerType);
  }

  /**
   * Get active provider
   */
  getActiveProvider(): ITelephonyProvider | undefined {
    if (!this.activeProvider) {
      return undefined;
    }
    return this.providers.get(this.activeProvider);
  }

  /**
   * Set active provider
   */
  setActiveProvider(providerType: string): void {
    if (!this.providers.has(providerType)) {
      throw new Error(`Provider ${providerType} is not registered`);
    }

    const provider = this.providers.get(providerType);
    if (!provider.isReady()) {
      throw new Error(`Provider ${providerType} is not ready`);
    }

    this.activeProvider = providerType;
    this.logger.log(`Active provider set to: ${provider.getName()}`);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Array<{
    name: string;
    type: string;
    ready: boolean;
    capabilities: any;
  }> {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.getName(),
      type: provider.getType(),
      ready: provider.isReady(),
      capabilities: provider.getCapabilities(),
    }));
  }

  /**
   * Check if provider is registered
   */
  hasProvider(providerType: string): boolean {
    return this.providers.has(providerType);
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Get ready providers count
   */
  getReadyProvidersCount(): number {
    return Array.from(this.providers.values()).filter(p => p.isReady()).length;
  }
}
