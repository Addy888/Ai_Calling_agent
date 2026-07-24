import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VADResult {
  isSpeech: boolean;
  rms: number;
  speechStateChanged: boolean;
  newState?: 'speech_started' | 'speech_ended' | 'silence' | 'noise';
  durationMs: number;
}

@Injectable()
export class VoiceActivityDetector {
  private readonly logger = new Logger(VoiceActivityDetector.name);

  // VAD thresholds
  private speechThreshold = 0.025; // normalized RMS energy
  private silenceThreshold = 0.015;
  private minSpeechDurationMs = 150; // speech confirmation window
  private minSilenceDurationMs = 1200; // long silence threshold
  private minShortPauseDurationMs = 500; // short pause threshold

  // Current session states keyed by sessionId
  private states = new Map<string, {
    isSpeaking: boolean;
    consecutiveSpeechMs: number;
    consecutiveSilenceMs: number;
    lastStateChangeTime: Date;
    hasSpokenInTurn: boolean;
  }>();

  constructor(private readonly configService: ConfigService) {
    this.speechThreshold = this.configService.get<number>('STT_VAD_SPEECH_THRESHOLD', 0.025);
    this.silenceThreshold = this.configService.get<number>('STT_VAD_SILENCE_THRESHOLD', 0.015);
    this.minSilenceDurationMs = this.configService.get<number>('STT_VAD_SILENCE_MS', 1200);
    this.minShortPauseDurationMs = this.configService.get<number>('STT_VAD_SHORT_PAUSE_MS', 500);
  }

  /**
   * Reset the VAD state for a session
   */
  resetSession(sessionId: string): void {
    this.states.delete(sessionId);
  }

  /**
   * Process a 16-bit PCM Mono 16kHz audio buffer chunk
   */
  process(sessionId: string, audioBuffer: Buffer, chunkDurationMs: number): VADResult {
    let state = this.states.get(sessionId);
    if (!state) {
      state = {
        isSpeaking: false,
        consecutiveSpeechMs: 0,
        consecutiveSilenceMs: 0,
        lastStateChangeTime: new Date(),
        hasSpokenInTurn: false,
      };
      this.states.set(sessionId, state);
    }

    const rms = this.calculateRMS(audioBuffer);
    const isChunkSpeech = rms > this.speechThreshold;

    let speechStateChanged = false;
    let newState: 'speech_started' | 'speech_ended' | 'silence' | 'noise' | undefined;

    if (isChunkSpeech) {
      state.consecutiveSpeechMs += chunkDurationMs;
      state.consecutiveSilenceMs = 0;

      // Trigger Speech Start if enough consecutive active speech chunks are received
      if (!state.isSpeaking && state.consecutiveSpeechMs >= this.minSpeechDurationMs) {
        state.isSpeaking = true;
        state.hasSpokenInTurn = true;
        speechStateChanged = true;
        newState = 'speech_started';
        state.lastStateChangeTime = new Date();
        this.logger.debug(`[VAD] [${sessionId}] Speech Started detected (RMS: ${rms.toFixed(4)})`);
      }
    } else {
      state.consecutiveSilenceMs += chunkDurationMs;
      state.consecutiveSpeechMs = 0;

      // Trigger Speech End if silence duration exceeds pause/silence threshold while speaking
      if (state.isSpeaking && state.consecutiveSilenceMs >= this.minShortPauseDurationMs) {
        state.isSpeaking = false;
        speechStateChanged = true;
        newState = 'speech_ended';
        state.lastStateChangeTime = new Date();
        this.logger.debug(`[VAD] [${sessionId}] Speech Ended (RMS: ${rms.toFixed(4)}, Silence: ${state.consecutiveSilenceMs}ms)`);
      } else if (!state.isSpeaking && state.consecutiveSilenceMs >= this.minSilenceDurationMs && state.hasSpokenInTurn) {
        // Trigger Long Silence notification
        speechStateChanged = true;
        newState = 'silence';
        state.hasSpokenInTurn = false; // Reset turn speaker detection
        state.lastStateChangeTime = new Date();
        this.logger.debug(`[VAD] [${sessionId}] Long Silence detected`);
      }
    }

    // Detect excessive background noise
    if (rms > this.speechThreshold * 3.5 && !state.isSpeaking) {
      newState = 'noise';
    }

    return {
      isSpeech: state.isSpeaking,
      rms,
      speechStateChanged,
      newState,
      durationMs: chunkDurationMs,
    };
  }

  private calculateRMS(buffer: Buffer): number {
    if (buffer.length === 0) return 0;
    const samplesCount = buffer.length / 2;
    let sumSquares = 0;

    for (let i = 0; i < samplesCount; i++) {
      const sample = buffer.readInt16LE(i * 2);
      const normalized = sample / 32768.0;
      sumSquares += normalized * normalized;
    }

    return Math.sqrt(sumSquares / samplesCount);
  }
}
