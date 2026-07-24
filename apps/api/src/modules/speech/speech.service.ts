import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISTTProvider, STTOptions, STTResult } from './interfaces/stt-provider.interface';
import { ITTSProvider, TTSOptions, TTSResult, Voice } from './interfaces/tts-provider.interface';
import { OpenAISTTProvider } from './providers/openai-stt.provider';
import { ElevenLabsTTSProvider } from './providers/elevenlabs-tts.provider';

/**
 * Speech Service
 * Manages STT and TTS providers
 */
@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  
  private sttProvider: ISTTProvider;
  private ttsProvider: ITTSProvider;
  
  private readonly sttProviders: Map<string, ISTTProvider> = new Map();
  private readonly ttsProviders: Map<string, ITTSProvider> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly openaiSTT: OpenAISTTProvider,
    private readonly elevenlabsTTS: ElevenLabsTTSProvider,
  ) {
    // Register STT providers
    this.registerSTTProvider(this.openaiSTT);

    // Register TTS providers
    this.registerTTSProvider(this.elevenlabsTTS);

    // Set active providers based on config
    const sttProvider = this.configService.get<string>('STT_PROVIDER', 'openai-whisper');
    const ttsProvider = this.configService.get<string>('TTS_PROVIDER', 'elevenlabs');
    
    this.setSTTProvider(sttProvider);
    this.setTTSProvider(ttsProvider);
  }

  // ========================================
  // STT Methods
  // ========================================

  registerSTTProvider(provider: ISTTProvider): void {
    this.sttProviders.set(provider.getName(), provider);
    this.logger.log(`Registered STT provider: ${provider.getName()}`);
  }

  setSTTProvider(providerName: string): void {
    const provider = this.sttProviders.get(providerName);
    
    if (!provider) {
      throw new BadRequestException(`STT provider not found: ${providerName}`);
    }

    this.sttProvider = provider;
    this.logger.log(`Active STT provider set to: ${providerName}`);
  }

  getSTTProvider(): ISTTProvider {
    if (!this.sttProvider) {
      throw new Error('No STT provider configured');
    }
    return this.sttProvider;
  }

  async transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<STTResult> {
    this.logger.log(`Transcribing audio via ${this.sttProvider.getName()}`);
    return this.sttProvider.transcribe(audioBuffer, options);
  }

  createSTTStream(options?: STTOptions): any {
    return this.sttProvider.createStream(options);
  }

  // ========================================
  // TTS Methods
  // ========================================

  registerTTSProvider(provider: ITTSProvider): void {
    this.ttsProviders.set(provider.getName(), provider);
    this.logger.log(`Registered TTS provider: ${provider.getName()}`);
  }

  setTTSProvider(providerName: string): void {
    const provider = this.ttsProviders.get(providerName);
    
    if (!provider) {
      throw new BadRequestException(`TTS provider not found: ${providerName}`);
    }

    this.ttsProvider = provider;
    this.logger.log(`Active TTS provider set to: ${providerName}`);
  }

  getTTSProvider(): ITTSProvider {
    if (!this.ttsProvider) {
      throw new Error('No TTS provider configured');
    }
    return this.ttsProvider;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    this.logger.log(`Synthesizing speech via ${this.ttsProvider.getName()}`);
    return this.ttsProvider.synthesize(text, options);
  }

  createTTSStream(options?: TTSOptions): any {
    return this.ttsProvider.createStream(options);
  }

  async getVoices(language?: string): Promise<Voice[]> {
    return this.ttsProvider.getVoices(language);
  }

  // ========================================
  // Provider Management
  // ========================================

  getAvailableSTTProviders(): string[] {
    return Array.from(this.sttProviders.keys());
  }

  getAvailableTTSProviders(): string[] {
    return Array.from(this.ttsProviders.keys());
  }

  async checkSTTProviderAvailability(providerName: string): Promise<boolean> {
    const provider = this.sttProviders.get(providerName);
    if (!provider) return false;
    return provider.isAvailable();
  }

  async checkTTSProviderAvailability(providerName: string): Promise<boolean> {
    const provider = this.ttsProviders.get(providerName);
    if (!provider) return false;
    return provider.isAvailable();
  }
}
