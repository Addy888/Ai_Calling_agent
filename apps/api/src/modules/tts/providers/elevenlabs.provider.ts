import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TTSProvider,
  SynthesizeParams,
  SynthesizeResponse,
  Voice,
} from '../interfaces/tts-provider.interface';

/**
 * ElevenLabs TTS Provider
 * Production-ready ElevenLabs integration for high-quality voice synthesis
 */
@Injectable()
export class ElevenLabsProvider implements TTSProvider {
  readonly name = 'elevenlabs';
  private readonly logger = new Logger(ElevenLabsProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly defaultVoiceId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY', '');
    this.defaultVoiceId = this.configService.get<string>(
      'ELEVENLABS_VOICE_ID',
      'EXAVITQu4vr4xnSDxMaL' // Default: Bella voice
    );
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResponse> {
    // Mock mode if no API key
    if (!this.apiKey) {
      return this.mockSynthesize(params);
    }

    const voiceId = params.voiceId || this.defaultVoiceId;

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: params.text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: params.stability ?? 0.5,
              similarity_boost: params.similarityBoost ?? 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Estimate duration (rough calculation)
      const estimatedDuration = params.text.length / 15; // ~15 chars per second

      this.logger.log(
        `Synthesized ${params.text.length} characters, ~${estimatedDuration.toFixed(1)}s audio`
      );

      return {
        audio: audioBuffer,
        format: 'mp3',
        sampleRate: 44100,
        duration: estimatedDuration,
        characterCount: params.text.length,
      };
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
    const voiceId = params.voiceId || this.defaultVoiceId;

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: params.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: params.stability ?? 0.5,
            similarity_boost: params.similarityBoost ?? 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs streaming error: ${response.statusText}`);
    }

    return response.body as ReadableStream;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Voice[]> {
    if (!this.apiKey) {
      return this.getMockVoices();
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json() as { voices: Array<any> };

      return data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        gender: this.detectGender(voice.name, voice.labels),
        language: 'English',
        languageCode: 'en',
        description: voice.description,
        previewUrl: voice.preview_url,
        labels: voice.labels,
        category: voice.category,
      }));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get voices: ${error.message}`, error.stack);
      }
      return this.getMockVoices();
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect gender from voice name/labels
   */
  private detectGender(
    name: string,
    labels?: Record<string, string>
  ): 'male' | 'female' | 'neutral' {
    const nameLower = name.toLowerCase();

    if (
      nameLower.includes('male') ||
      nameLower.includes('man') ||
      nameLower.includes('boy') ||
      labels?.gender === 'male'
    ) {
      return 'male';
    }

    if (
      nameLower.includes('female') ||
      nameLower.includes('woman') ||
      nameLower.includes('girl') ||
      labels?.gender === 'female'
    ) {
      return 'female';
    }

    return 'neutral';
  }

  /**
   * Mock synthesis for development
   */
  private mockSynthesize(params: SynthesizeParams): SynthesizeResponse {
    this.logger.log(`[MOCK] Synthesizing: "${params.text.substring(0, 50)}..."`);

    // Return empty audio buffer
    const mockAudio = Buffer.alloc(1000);
    const estimatedDuration = params.text.length / 15;

    return {
      audio: mockAudio,
      format: 'mp3',
      sampleRate: 44100,
      duration: estimatedDuration,
      characterCount: params.text.length,
      metadata: { mock: true },
    };
  }

  /**
   * Mock voices for development
   */
  private getMockVoices(): Voice[] {
    return [
      {
        id: 'mock-voice-1',
        name: 'Bella (Mock)',
        gender: 'female',
        language: 'English',
        languageCode: 'en',
        description: 'Mock voice for development',
      },
      {
        id: 'mock-voice-2',
        name: 'Adam (Mock)',
        gender: 'male',
        language: 'English',
        languageCode: 'en',
        description: 'Mock voice for development',
      },
    ];
  }
}
