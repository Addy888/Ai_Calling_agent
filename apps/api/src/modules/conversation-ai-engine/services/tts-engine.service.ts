/**
 * TTS Engine Service
 * Wrapper for Kokoro XTTS text-to-speech synthesis
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { KokoroTTSProvider } from '../../ai-agent/services/kokoro-tts.provider';
import { ErrorHandlerService, ErrorType } from './error-handler.service';

interface SynthesizeOptions {
  text: string;
  voiceId?: string;
  emotion?: string;
  speed?: number;
  pitch?: number;
}

interface SynthesizeResult {
  audioData: Buffer;
  duration: number;
  sampleRate: number;
}

@Injectable()
export class TTSEngineService {
  private readonly logger = new Logger(TTSEngineService.name);

  constructor(
    @Inject(forwardRef(() => KokoroTTSProvider))
    private readonly kokoroTTS: KokoroTTSProvider,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.logger.log('TTS Engine Service initialized (Kokoro XTTS)');
  }

  async synthesize(options: SynthesizeOptions): Promise<SynthesizeResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Synthesizing: "${options.text.substring(0, 50)}..."`);

      // Call Kokoro TTS using generateSpeech
      const result = await this.kokoroTTS.generateSpeech({
        text: options.text,
        voiceCode: options.voiceId || 'default',
        language: 'en',
        speakingSpeed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
      });

      const duration = Date.now() - startTime;

      this.logger.debug(`TTS synthesis complete (${duration}ms, ${result.audioBuffer.length} bytes)`);

      return {
        audioData: result.audioBuffer,
        duration,
        sampleRate: 24000, // Default sample rate
      };
    } catch (error) {
      this.logger.error(`TTS synthesis failed: ${error.message}`, error.stack);

      throw await this.errorHandler.handleError('tts', error as Error, {
        type: ErrorType.TTS_ERROR,
        retryable: true,
        retryFn: () => this.synthesize(options),
      });
    }
  }

  async synthesizeStreaming(
    options: SynthesizeOptions,
    onChunk: (audioChunk: Buffer) => Promise<void>,
  ): Promise<void> {
    try {
      this.logger.debug(`Streaming TTS: "${options.text.substring(0, 50)}..."`);

      // Split text into sentences for streaming
      const sentences = this.splitIntoSentences(options.text);

      for (const sentence of sentences) {
        if (sentence.trim().length === 0) continue;

        const result = await this.synthesize({
          ...options,
          text: sentence,
        });

        await onChunk(result.audioData);
      }

      this.logger.debug('TTS streaming complete');
    } catch (error) {
      this.logger.error(`TTS streaming failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries
    return text
      .split(/([.!?]+\s+)/)
      .filter(s => s.trim().length > 0)
      .reduce((acc, curr, idx, arr) => {
        if (idx % 2 === 0) {
          const sentence = curr + (arr[idx + 1] || '');
          acc.push(sentence.trim());
        }
        return acc;
      }, [] as string[]);
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      // Test with a simple phrase
      await this.synthesize({ text: 'Hello', voiceId: 'default' });
      return { status: 'OK' };
    } catch (error) {
      this.logger.error(`TTS health check failed: ${error.message}`);
      return { status: 'ERROR' };
    }
  }

  async listVoices(): Promise<string[]> {
    try {
      // TODO: Query available voices from Kokoro
      return ['default', 'female_1', 'male_1', 'female_2', 'male_2'];
    } catch (error) {
      this.logger.error(`Failed to list voices: ${error.message}`);
      return ['default'];
    }
  }
}
