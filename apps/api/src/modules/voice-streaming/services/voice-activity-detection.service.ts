import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface VADState {
  isSpeaking: boolean;
  backgroundNoiseDb: number;
  lastActiveTime: number;
  lastSilenceTime: number;
  consecutiveSilenceFrames: number;
  consecutiveSpeechFrames: number;
}

@Injectable()
export class VoiceActivityDetectionService {
  private readonly logger = new Logger(VoiceActivityDetectionService.name);
  private sessions = new Map<string, VADState>();

  // Configuration thresholds
  private readonly energyThreshold = 0.015; // Amplitude threshold (0.0 to 1.0)
  private readonly frameSizeMs = 20;
  private readonly minSpeechFrames = 3; // ~60ms to confirm speech start
  private readonly minSilenceFrames = 25; // ~500ms to confirm speech stop (Short Pause)
  private readonly longPauseFrames = 75; // ~1.5s to confirm Long Pause

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize VAD state for a session
   */
  initSession(sessionId: string): void {
    this.sessions.set(sessionId, {
      isSpeaking: false,
      backgroundNoiseDb: -60, // approximate initial background noise in dB
      lastActiveTime: Date.now(),
      lastSilenceTime: Date.now(),
      consecutiveSilenceFrames: 0,
      consecutiveSpeechFrames: 0,
    });
    this.logger.debug(`VAD session initialized for: ${sessionId}`);
  }

  /**
   * Remove VAD session
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.debug(`VAD session destroyed for: ${sessionId}`);
  }

  /**
   * Process a chunk of PCM 16-bit Mono audio
   */
  processAudioChunk(sessionId: string, chunk: Buffer): void {
    let state = this.sessions.get(sessionId);
    if (!state) {
      this.initSession(sessionId);
      state = this.sessions.get(sessionId)!;
    }

    const rms = this.calculateRMS(chunk);
    const db = 20 * Math.log10(rms || 0.0001);

    // Dynamic background noise estimation (rolling average of low energy segments)
    if (rms < this.energyThreshold) {
      state.backgroundNoiseDb = 0.95 * state.backgroundNoiseDb + 0.05 * db;
    }

    const isFrameSpeech = rms > this.energyThreshold;

    if (isFrameSpeech) {
      state.consecutiveSpeechFrames++;
      state.consecutiveSilenceFrames = 0;
      state.lastActiveTime = Date.now();

      // Detect start of speaking
      if (!state.isSpeaking && state.consecutiveSpeechFrames >= this.minSpeechFrames) {
        state.isSpeaking = true;
        this.eventEmitter.emit('CustomerStartedSpeaking', { sessionId, timestamp: Date.now() });
        this.logger.debug(`VAD: Customer started speaking in session ${sessionId}`);
      }

      // Check if it's high energy but too short to be speech (just noise)
      if (!state.isSpeaking && state.consecutiveSpeechFrames === 1) {
        this.eventEmitter.emit('NoiseDetected', { sessionId, rms, db });
      }
    } else {
      state.consecutiveSilenceFrames++;
      state.consecutiveSpeechFrames = 0;
      state.lastSilenceTime = Date.now();

      // Detect stop of speaking / pause
      if (state.isSpeaking && state.consecutiveSilenceFrames >= this.minSilenceFrames) {
        state.isSpeaking = false;
        this.eventEmitter.emit('CustomerStoppedSpeaking', { sessionId, timestamp: Date.now() });
        this.eventEmitter.emit('ShortPauseDetected', { sessionId, durationMs: state.consecutiveSilenceFrames * this.frameSizeMs });
        this.logger.debug(`VAD: Customer stopped speaking in session ${sessionId} (Short Pause)`);
      } else if (!state.isSpeaking && state.consecutiveSilenceFrames === this.longPauseFrames) {
        this.eventEmitter.emit('LongPauseDetected', { sessionId, durationMs: state.consecutiveSilenceFrames * this.frameSizeMs });
        this.eventEmitter.emit('SilenceDetected', { sessionId, durationMs: state.consecutiveSilenceFrames * this.frameSizeMs });
        this.logger.debug(`VAD: Long pause / silence detected in session ${sessionId}`);
      }
    }

    // Keep track of background noise updates
    if (state.consecutiveSilenceFrames % 100 === 0 && state.consecutiveSilenceFrames > 0) {
      this.eventEmitter.emit('BackgroundNoiseEstimated', { sessionId, db: state.backgroundNoiseDb });
    }
  }

  /**
   * Calculate root-mean-square energy of 16-bit PCM buffer
   */
  private calculateRMS(buffer: Buffer): number {
    if (buffer.length < 2) return 0;
    
    let sum = 0;
    const numSamples = Math.floor(buffer.length / 2);

    for (let i = 0; i < numSamples; i++) {
      const sample = buffer.readInt16LE(i * 2);
      // Normalize to -1.0 to 1.0 range
      const normalized = sample / 32768;
      sum += normalized * normalized;
    }

    return Math.sqrt(sum / numSamples);
  }

  /**
   * Get current state of VAD session
   */
  getSessionState(sessionId: string): VADState | undefined {
    return this.sessions.get(sessionId);
  }
}
