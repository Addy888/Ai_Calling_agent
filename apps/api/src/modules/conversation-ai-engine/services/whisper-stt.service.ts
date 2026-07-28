/**
 * Whisper STT Service
 * HTTP client for Faster Whisper speech-to-text service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ErrorHandlerService, ErrorType } from './error-handler.service';

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  latency: number;
}

@Injectable()
export class WhisperSTTService {
  private readonly logger = new Logger(WhisperSTTService.name);
  private httpClient: AxiosInstance;
  private serviceUrl: string;
  private timeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.serviceUrl = this.configService.get('WHISPER_SERVICE_URL', 'http://localhost:8000');
    this.timeout = this.configService.get('WHISPER_TIMEOUT_MS', 5000);

    this.httpClient = axios.create({
      baseURL: this.serviceUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Whisper STT Service initialized: ${this.serviceUrl}`);
  }

  async transcribe(
    audioData: Buffer,
    options?: {
      language?: string;
      model?: string;
    },
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Transcribing audio (${audioData.length} bytes)`);

      // Convert audio to base64
      const audioBase64 = audioData.toString('base64');

      // Call Whisper service
      const response = await this.httpClient.post('/transcribe', {
        audio: audioBase64,
        language: options?.language || 'auto',
        model: options?.model || 'base',
      });

      const latency = Date.now() - startTime;

      const result: TranscriptionResult = {
        text: response.data.text || '',
        language: response.data.language || 'unknown',
        confidence: response.data.confidence || 0.9,
        segments: response.data.segments || [],
        latency,
      };

      this.logger.debug(`Transcription complete (${latency}ms): "${result.text}"`);

      return result;
    } catch (error) {
      this.logger.error(`Whisper transcription failed: ${error.message}`, error.stack);

      // Classify and handle error
      const errorType = error.code === 'ECONNABORTED' 
        ? ErrorType.WHISPER_TIMEOUT 
        : ErrorType.WHISPER_ERROR;

      throw await this.errorHandler.handleError('whisper', error as Error, {
        type: errorType,
        retryable: true,
        retryFn: () => this.transcribe(audioData, options),
      });
    }
  }

  async transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options?: {
      language?: string;
      onPartial?: (text: string) => void;
      onFinal?: (text: string) => void;
    },
  ): Promise<TranscriptionResult> {
    // For streaming, accumulate chunks and transcribe
    const chunks: Buffer[] = [];

    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const audioData = Buffer.concat(chunks);
    return this.transcribe(audioData, options);
  }

  async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const startTime = Date.now();
      await this.httpClient.get('/health');
      const latency = Date.now() - startTime;

      return { status: 'OK', latency };
    } catch (error) {
      this.logger.error(`Whisper health check failed: ${error.message}`);
      return { status: 'ERROR' };
    }
  }

  // Detect language from audio
  async detectLanguage(audioData: Buffer): Promise<string> {
    try {
      const result = await this.transcribe(audioData, { language: 'auto' });
      return result.language;
    } catch (error) {
      this.logger.error(`Language detection failed: ${error.message}`);
      return 'en'; // Default to English
    }
  }
}
