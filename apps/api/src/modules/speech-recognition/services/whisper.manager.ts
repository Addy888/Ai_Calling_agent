import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STTProvider, TranscriptionResult } from '../interfaces/stt-provider.interface';
import { WhisperException } from '../exceptions/speech-recognition.exception';

// ─────────────────────────────────────────────
// Provider Implementations
// ─────────────────────────────────────────────

/**
 * FasterWhisperProvider
 * Default provider — calls the Python Faster-Whisper HTTP microservice.
 * Architecture-ready: swap endpoint for any Faster-Whisper deployment.
 */
class FasterWhisperProvider implements STTProvider {
  name = 'faster-whisper';
  private readonly logger = new Logger(FasterWhisperProvider.name);

  constructor(private readonly endpoint: string) {}

  async transcribe(audioBuffer: Buffer, options: { language?: string } = {}): Promise<TranscriptionResult> {
    this.logger.debug(`[FasterWhisper] Transcribing ${audioBuffer.length} bytes, lang: ${options.language ?? 'auto'}`);

    try {
      // Create form data with audio buffer
      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('audio', audioBuffer, {
        filename: 'audio.pcm',
        contentType: 'application/octet-stream',
      });
      
      if (options.language) {
        formData.append('language', options.language);
      }
      
      // Additional transcription options
      formData.append('beam_size', '5');
      formData.append('vad_filter', 'true');
      formData.append('word_timestamps', 'true');

      // Call the Python microservice
      const response = await fetch(`${this.endpoint}/transcribe`, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper service error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as {
        text?: string;
        confidence?: number;
        language?: string;
        words?: Array<{ word: string; start: number; end: number; confidence: number }>;
      };

      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        language: result.language || options.language || 'en',
        words: result.words || [],
      };

    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Faster Whisper transcription failed: ${error.message}`);
        
        // Fallback to mock for development if service is unavailable
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          this.logger.warn('Whisper service unavailable, using mock transcription');
          return this.generateMockTranscript(audioBuffer.length, options.language);
        }
        
        throw error;
      }
      throw new Error('Unknown Faster Whisper error');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Ping the health endpoint
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (!response.ok) {
        return false;
      }
      
      const health = await response.json() as { status?: string };
      return health.status === 'healthy';
      
    } catch (error) {
      this.logger.warn('Faster Whisper health check failed, service may be unavailable');
      return false;
    }
  }

  private generateMockTranscript(bufferLength: number, language?: string): TranscriptionResult {
    const durationS = bufferLength / (16000 * 2);
    const mockText = `[Mock transcript — ${durationS.toFixed(1)}s audio segment]`;
    
    return {
      text: mockText,
      confidence: 0.85,
      language: language ?? 'en',
      words: [
        { word: mockText, start: 0.0, end: durationS, confidence: 0.85 },
      ],
    };
  }
}

/**
 * OpenAIWhisperProvider
 * Architecture-ready: calls OpenAI Whisper API using your OPENAI_API_KEY.
 */
class OpenAIWhisperProvider implements STTProvider {
  name = 'openai-whisper';
  private readonly logger = new Logger(OpenAIWhisperProvider.name);

  constructor(private readonly apiKey: string) {}

  async transcribe(audioBuffer: Buffer, options: { language?: string } = {}): Promise<TranscriptionResult> {
    // Architecture-ready: POST to https://api.openai.com/v1/audio/transcriptions
    this.logger.debug(`[OpenAI Whisper] Provider available — mocked`);
    return { text: '', confidence: 0, language: options.language ?? 'en' };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/**
 * DeepgramProvider — architecture-ready
 */
class DeepgramProvider implements STTProvider {
  name = 'deepgram';

  constructor(private readonly apiKey: string) {}

  async transcribe(audioBuffer: Buffer, options: { language?: string } = {}): Promise<TranscriptionResult> {
    return { text: '', confidence: 0, language: options.language ?? 'en' };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/**
 * AzureSpeechProvider — architecture-ready
 */
class AzureSpeechProvider implements STTProvider {
  name = 'azure-speech';

  constructor(
    private readonly apiKey: string,
    private readonly region: string,
  ) {}

  async transcribe(audioBuffer: Buffer, options: { language?: string } = {}): Promise<TranscriptionResult> {
    return { text: '', confidence: 0, language: options.language ?? 'en' };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && !!this.region;
  }
}

/**
 * GoogleSpeechProvider — architecture-ready
 */
class GoogleSpeechProvider implements STTProvider {
  name = 'google-speech';

  async transcribe(audioBuffer: Buffer, options: { language?: string } = {}): Promise<TranscriptionResult> {
    return { text: '', confidence: 0, language: options.language ?? 'en' };
  }

  async isAvailable(): Promise<boolean> {
    return false; // Activate when credentials are configured
  }
}

// ─────────────────────────────────────────────
// Whisper Manager
// ─────────────────────────────────────────────

export type STTProviderName = 'faster-whisper' | 'openai-whisper' | 'deepgram' | 'azure-speech' | 'google-speech';

@Injectable()
export class WhisperManager {
  private readonly logger = new Logger(WhisperManager.name);

  private readonly providers = new Map<string, STTProvider>();
  private activeProvider: STTProvider;

  constructor(private readonly configService: ConfigService) {
    // Register all providers
    const whisperEndpoint = this.configService.get<string>('FASTER_WHISPER_ENDPOINT', 'http://localhost:9000');
    this.providers.set('faster-whisper', new FasterWhisperProvider(whisperEndpoint));

    const openAIKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.providers.set('openai-whisper', new OpenAIWhisperProvider(openAIKey));

    const deepgramKey = this.configService.get<string>('DEEPGRAM_API_KEY', '');
    this.providers.set('deepgram', new DeepgramProvider(deepgramKey));

    const azureKey = this.configService.get<string>('AZURE_SPEECH_KEY', '');
    const azureRegion = this.configService.get<string>('AZURE_SPEECH_REGION', '');
    this.providers.set('azure-speech', new AzureSpeechProvider(azureKey, azureRegion));

    this.providers.set('google-speech', new GoogleSpeechProvider());

    // Select active provider
    const selectedProvider = this.configService.get<STTProviderName>('STT_PROVIDER', 'faster-whisper');
    this.activeProvider = this.providers.get(selectedProvider) ?? this.providers.get('faster-whisper')!;

    this.logger.log(`WhisperManager initialized. Active provider: ${this.activeProvider.name}`);
  }

  /**
   * Transcribe a full audio buffer using the active provider
   */
  async transcribe(audioBuffer: Buffer, options: { language?: string } = {}): Promise<TranscriptionResult> {
    if (!audioBuffer || audioBuffer.length === 0) {
      return { text: '', confidence: 0, language: options.language ?? 'en' };
    }

    try {
      const result = await this.activeProvider.transcribe(audioBuffer, options);
      this.logger.debug(`Transcription complete. Text: "${result.text.substring(0, 80)}", Confidence: ${result.confidence}`);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Transcription failed: ${error.message}`, error.stack);
        throw new WhisperException(error.message);
      }
      throw new WhisperException('Unknown transcription error');
    }
  }

  /**
   * Switch the active provider at runtime
   */
  async switchProvider(providerName: STTProviderName): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new WhisperException(`Provider not registered: ${providerName}`);
    }

    const available = await provider.isAvailable();
    if (!available) {
      throw new WhisperException(`Provider not available: ${providerName}`);
    }

    this.activeProvider = provider;
    this.logger.log(`STT provider switched to: ${providerName}`);
  }

  /**
   * Get all registered providers with their availability status
   */
  async getProvidersStatus(): Promise<Array<{ name: string; available: boolean }>> {
    const statuses = await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => ({
        name,
        available: await provider.isAvailable(),
      })),
    );
    return statuses;
  }

  getActiveProviderName(): string {
    return this.activeProvider.name;
  }
}
