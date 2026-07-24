import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsProvider } from '../providers/elevenlabs.provider';
import {
  TTSProvider,
  SynthesizeParams,
  SynthesizeResponse,
  Voice,
} from '../interfaces/tts-provider.interface';

/**
 * TTS Manager Service
 * Manages Text-to-Speech providers and voice synthesis
 */
@Injectable()
export class TTSManagerService implements OnModuleInit {
  private readonly logger = new Logger(TTSManagerService.name);
  private activeProvider: TTSProvider;
  private readonly providers = new Map<string, TTSProvider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly elevenLabsProvider: ElevenLabsProvider,
  ) {
    // Register providers
    this.providers.set('elevenlabs', this.elevenLabsProvider);
    
    // Set active provider from config
    const providerName = this.configService.get<string>('TTS_PROVIDER', 'elevenlabs');
    this.activeProvider = this.providers.get(providerName) || this.elevenLabsProvider;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing TTS manager with provider: ${this.activeProvider.name}`);
    
    const available = await this.activeProvider.isAvailable();
    if (!available) {
      this.logger.warn(`TTS provider ${this.activeProvider.name} is not available - running in mock mode`);
    } else {
      this.logger.log('TTS manager initialized successfully');
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResponse> {
    this.logger.debug(`Synthesizing text: "${params.text.substring(0, 50)}..."`);
    
    try {
      const result = await this.activeProvider.synthesize(params);
      
      this.logger.log(
        `Synthesis complete: ${result.characterCount} chars, ${result.duration.toFixed(1)}s audio, ${result.format}`
      );
      
      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`TTS synthesis failed: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Stream speech synthesis
   */
  async streamSynthesis(
    params: SynthesizeParams
  ): Promise<ReadableStream | NodeJS.ReadableStream> {
    this.logger.debug(`Streaming synthesis: "${params.text.substring(0, 50)}..."`);
    return this.activeProvider.streamSynthesis(params);
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Voice[]> {
    return this.activeProvider.getVoices();
  }

  /**
   * Get voice by ID
   */
  async getVoice(voiceId: string): Promise<Voice | undefined> {
    const voices = await this.getVoices();
    return voices.find(v => v.id === voiceId);
  }

  /**
   * Check if TTS is available
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
   * Switch provider
   */
  async switchProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`TTS provider not found: ${providerName}`);
    }

    const available = await provider.isAvailable();
    if (!available) {
      throw new Error(`TTS provider not available: ${providerName}`);
    }

    this.activeProvider = provider;
    this.logger.log(`Switched to TTS provider: ${providerName}`);
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

  /**
   * Estimate audio duration
   */
  estimateDuration(text: string, wordsPerMinute: number = 150): number {
    const words = text.split(/\s+/).length;
    return (words / wordsPerMinute) * 60; // in seconds
  }
}
