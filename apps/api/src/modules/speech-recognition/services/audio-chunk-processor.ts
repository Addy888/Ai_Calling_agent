import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NoiseReductionManager } from './noise-reduction-manager';
import { VoiceActivityDetector } from './voice-activity-detector';
import { SpeechBufferManager } from './speech-buffer-manager';
import {
  SpeechEventType,
  SpeechStartedPayload,
  SpeechEndedPayload,
  SilenceDetectedPayload,
  NoiseDetectedPayload,
} from '../interfaces/speech-events.interface';
import { AudioException } from '../exceptions/speech-recognition.exception';

interface ChunkProcessorConfig {
  sessionId: string;
  sampleRate?: number;
  chunkDurationMs?: number;
}

@Injectable()
export class AudioChunkProcessor {
  private readonly logger = new Logger(AudioChunkProcessor.name);
  private readonly DEFAULT_SAMPLE_RATE = 16000;
  private readonly DEFAULT_CHUNK_DURATION_MS = 20; // 20ms chunks

  // Track per-session last speech start time
  private readonly speechStartTimes = new Map<string, Date>();

  constructor(
    private readonly noiseReduction: NoiseReductionManager,
    private readonly vad: VoiceActivityDetector,
    private readonly speechBuffer: SpeechBufferManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process an incoming raw PCM audio chunk for a session
   */
  async processChunk(
    config: ChunkProcessorConfig,
    rawAudioChunk: Buffer,
  ): Promise<{ isSpeech: boolean; denoisedChunk: Buffer }> {
    const {
      sessionId,
      sampleRate = this.DEFAULT_SAMPLE_RATE,
      chunkDurationMs = this.DEFAULT_CHUNK_DURATION_MS,
    } = config;

    if (!rawAudioChunk || rawAudioChunk.length === 0) {
      throw new AudioException('Received empty audio chunk');
    }

    try {
      // Stage 1: Noise Reduction
      const denoisedChunk = this.noiseReduction.process(rawAudioChunk);

      // Stage 2: Voice Activity Detection
      const vadResult = this.vad.process(sessionId, denoisedChunk, chunkDurationMs);

      // Stage 3: Buffer management
      if (vadResult.isSpeech) {
        this.speechBuffer.append(sessionId, denoisedChunk);
      }

      // Stage 4: Emit events based on VAD state changes
      if (vadResult.speechStateChanged && vadResult.newState) {
        await this.handleVADStateChange(sessionId, vadResult.newState, vadResult.rms);
      }

      return {
        isSpeech: vadResult.isSpeech,
        denoisedChunk,
      };
    } catch (error) {
      if (error instanceof AudioException) throw error;
      if (error instanceof Error) {
        this.logger.error(`Audio chunk processing failed: ${error.message}`, error.stack);
        throw new AudioException(error.message);
      }
      throw new AudioException('Unknown audio processing error');
    }
  }

  private async handleVADStateChange(
    sessionId: string,
    newState: string,
    rmsLevel: number,
  ): Promise<void> {
    const now = new Date();

    switch (newState) {
      case 'speech_started': {
        this.speechStartTimes.set(sessionId, now);
        const payload: SpeechStartedPayload = { sessionId, timestamp: now };
        this.eventEmitter.emit(SpeechEventType.SPEECH_STARTED, payload);
        this.logger.log(`[${sessionId}] Speech started`);
        break;
      }

      case 'speech_ended': {
        const startTime = this.speechStartTimes.get(sessionId) ?? now;
        const durationMs = now.getTime() - startTime.getTime();
        const payload: SpeechEndedPayload = { sessionId, timestamp: now, durationMs };
        this.eventEmitter.emit(SpeechEventType.SPEECH_ENDED, payload);
        this.speechStartTimes.delete(sessionId);
        this.logger.log(`[${sessionId}] Speech ended (duration: ${durationMs}ms)`);
        break;
      }

      case 'silence': {
        const payload: SilenceDetectedPayload = {
          sessionId,
          timestamp: now,
          silenceDurationMs: 1200,
        };
        this.eventEmitter.emit(SpeechEventType.SILENCE_DETECTED, payload);
        this.logger.log(`[${sessionId}] Long silence detected`);
        break;
      }

      case 'noise': {
        const payload: NoiseDetectedPayload = {
          sessionId,
          timestamp: now,
          noiseLevelDb: 20 * Math.log10(rmsLevel + 1e-10),
        };
        this.eventEmitter.emit(SpeechEventType.NOISE_DETECTED, payload);
        this.logger.debug(`[${sessionId}] Background noise detected (RMS: ${rmsLevel.toFixed(4)})`);
        break;
      }
    }
  }

  /**
   * Reset per-session state
   */
  resetSession(sessionId: string): void {
    this.speechStartTimes.delete(sessionId);
    this.vad.resetSession(sessionId);
    this.speechBuffer.destroySession(sessionId);
  }
}
