import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISTTProvider, STTOptions, STTResult } from '../interfaces/stt-provider.interface';
import OpenAI from 'openai';

/**
 * OpenAI Whisper STT Provider
 */
@Injectable()
export class OpenAISTTProvider implements ISTTProvider {
  private readonly logger = new Logger(OpenAISTTProvider.name);
  private client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI STT provider initialized');
    } else {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  getName(): string {
    return 'openai-whisper';
  }

  async transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<STTResult> {
    this.logger.log('Transcribing audio with OpenAI Whisper');

    try {
      // Create a File object from buffer
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: options?.model || 'whisper-1',
        language: options?.language || undefined,
        response_format: 'verbose_json',
      });

      return {
        transcript: response.text,
        confidence: 1.0, // OpenAI doesn't provide confidence scores
        isFinal: true,
        language: response.language,
        metadata: {
          duration: response.duration,
        },
      };
    } catch (error) {
      this.logger.error(`Transcription failed: ${error.message}`);
      throw error;
    }
  }

  createStream(options?: STTOptions): any {
    // OpenAI Whisper API doesn't support streaming directly
    // For streaming, we would need to use a different implementation
    throw new Error('Streaming not supported for OpenAI Whisper provider');
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }
}
