import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITTSProvider, TTSOptions, TTSResult, Voice } from '../interfaces/tts-provider.interface';

/**
 * ElevenLabs TTS Provider
 */
@Injectable()
export class ElevenLabsTTSProvider implements ITTSProvider {
  private readonly logger = new Logger(ElevenLabsTTSProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    
    if (this.apiKey) {
      this.logger.log('ElevenLabs TTS provider initialized');
    } else {
      this.logger.warn('ElevenLabs API key not configured');
    }
  }

  getName(): string {
    return 'elevenlabs';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    this.logger.log('Synthesizing speech with ElevenLabs');

    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const voiceId = options?.voiceId || this.configService.get<string>('ELEVENLABS_VOICE_ID');

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
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              speed: options?.speed || 1.0,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);

      return {
        audio,
        format: 'mp3',
        sampleRate: 44100,
        metadata: {
          provider: 'elevenlabs',
          voiceId,
        },
      };
    } catch (error) {
      this.logger.error(`Speech synthesis failed: ${error.message}`);
      throw error;
    }
  }

  createStream(options?: TTSOptions): any {
    // ElevenLabs supports streaming via WebSocket
    throw new Error('Streaming not yet implemented for ElevenLabs provider');
  }

  async getVoices(language?: string): Promise<Voice[]> {
    this.logger.log('Fetching available voices from ElevenLabs');

    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const data = await response.json();

      return data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || 'en',
        gender: voice.labels?.gender,
        preview: voice.preview_url,
        metadata: {
          category: voice.category,
          labels: voice.labels,
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch voices: ${error.message}`);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}
