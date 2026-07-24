import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TranscriptionSessionManager } from './transcription-session-manager';
import { StreamingSpeechEngine } from './streaming-speech-engine';
import { TranscriptAssembler } from './transcript-assembler';
import { SpeechBufferManager } from './speech-buffer-manager';
import { AudioChunkProcessor } from './audio-chunk-processor';
import { WhisperManager, STTProviderName } from './whisper.manager';
import { SpeechRuntimeManager } from './speech-runtime-manager';
import { SpeechEventType, SpeechEndedPayload } from '../interfaces/speech-events.interface';
import { SpeechRecognitionException } from '../exceptions/speech-recognition.exception';

export interface StartSessionOptions {
  callSessionId: string;
  language?: string;
  provider?: STTProviderName;
  enablePartialResults?: boolean;
}

export interface SessionSummary {
  sessionId: string;
  callSessionId: string;
  status: string;
  language: string;
  turnsCount: number;
  totalChunksProcessed: number;
  startedAt: Date;
  endedAt?: Date;
}

@Injectable()
export class SpeechRecognitionManager implements OnModuleInit {
  private readonly logger = new Logger(SpeechRecognitionManager.name);
  private sessionCounter = 0;

  constructor(
    private readonly sessionManager: TranscriptionSessionManager,
    private readonly streamingEngine: StreamingSpeechEngine,
    private readonly transcriptAssembler: TranscriptAssembler,
    private readonly bufferManager: SpeechBufferManager,
    private readonly chunkProcessor: AudioChunkProcessor,
    private readonly whisperManager: WhisperManager,
    private readonly runtimeManager: SpeechRuntimeManager,
  ) {}

  onModuleInit(): void {
    this.logger.log('SpeechRecognitionManager initialized — STT engine ready');
  }

  /**
   * Start a new transcription session linked to a call session
   */
  async startSession(options: StartSessionOptions): Promise<string> {
    const sessionId = this.generateSessionId();

    try {
      // Switch provider if requested
      if (options.provider) {
        await this.whisperManager.switchProvider(options.provider);
      }

      // Create session in session manager
      this.sessionManager.createSession({
        sessionId,
        callSessionId: options.callSessionId,
        language: options.language ?? 'auto',
        providerName: this.whisperManager.getActiveProviderName(),
      });

      // Initialize buffer and transcript assembler per-session
      this.bufferManager.initSession(sessionId);
      this.transcriptAssembler.initSession(sessionId);

      // Activate session
      this.sessionManager.activate(sessionId);

      this.logger.log(
        `STT session started: ${sessionId} (call: ${options.callSessionId}, ` +
        `lang: ${options.language ?? 'auto'}, provider: ${this.whisperManager.getActiveProviderName()})`,
      );

      return sessionId;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to start STT session: ${error.message}`, error.stack);
        throw new SpeechRecognitionException(`Failed to start STT session: ${error.message}`);
      }
      throw new SpeechRecognitionException('Unknown error starting STT session');
    }
  }

  /**
   * Stream an audio chunk to an active session
   */
  async streamChunk(
    sessionId: string,
    audioChunk: Buffer,
    chunkDurationMs = 20,
  ): Promise<void> {
    await this.streamingEngine.processStreamChunk(audioChunk, {
      sessionId,
      chunkDurationMs,
      enablePartialResults: true,
    });
  }

  /**
   * Stop a transcription session and get the final transcript
   */
  async stopSession(sessionId: string): Promise<{ fullText: string; turnsCount: number }> {
    try {
      // Flush any remaining buffered audio for final transcription
      const remainingBuffer = this.bufferManager.flush(sessionId);
      if (remainingBuffer.length > 0) {
        await this.streamingEngine.transcribeSegment(sessionId, remainingBuffer);
      }

      // Assemble full transcript
      const fullText = this.transcriptAssembler.completeSession(sessionId);

      // Get turn count
      const session = this.sessionManager.getSession(sessionId);
      const turnsCount = session?.turnsCount ?? 0;

      // Complete session lifecycle
      this.sessionManager.complete(sessionId);

      // Cleanup resources
      this.runtimeManager.deregisterSession(sessionId);
      this.bufferManager.destroySession(sessionId);
      this.transcriptAssembler.destroySession(sessionId);
      this.chunkProcessor.resetSession(sessionId);

      this.logger.log(`STT session stopped: ${sessionId} (turns: ${turnsCount})`);

      return { fullText, turnsCount };
    } catch (error) {
      this.sessionManager.fail(sessionId);
      if (error instanceof Error) {
        this.logger.error(`Failed to stop STT session: ${error.message}`, error.stack);
        throw new SpeechRecognitionException(`Failed to stop STT session: ${error.message}`);
      }
      throw new SpeechRecognitionException('Unknown error stopping STT session');
    }
  }

  /**
   * Handle SpeechEnded event — flush buffer and trigger final transcription
   */
  @OnEvent(SpeechEventType.SPEECH_ENDED)
  async onSpeechEnded(payload: SpeechEndedPayload): Promise<void> {
    const { sessionId } = payload;

    const audioSegment = this.bufferManager.flush(sessionId);
    if (audioSegment.length > 0) {
      await this.streamingEngine.transcribeSegment(sessionId, audioSegment);
    }
  }

  /**
   * Get status of a specific session
   */
  getSessionStatus(sessionId: string): SessionSummary | null {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      callSessionId: session.callSessionId,
      status: session.status,
      language: session.language,
      turnsCount: session.turnsCount,
      totalChunksProcessed: session.totalChunksProcessed,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionSummary[] {
    return this.sessionManager.getActiveSessions().map(s => ({
      sessionId: s.sessionId,
      callSessionId: s.callSessionId,
      status: s.status,
      language: s.language,
      turnsCount: s.turnsCount,
      totalChunksProcessed: s.totalChunksProcessed,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }));
  }

  /**
   * Get all registered providers and their status
   */
  async getProviders(): Promise<Array<{ name: string; available: boolean; isActive: boolean }>> {
    const providers = await this.whisperManager.getProvidersStatus();
    const activeName = this.whisperManager.getActiveProviderName();
    return providers.map(p => ({ ...p, isActive: p.name === activeName }));
  }

  private generateSessionId(): string {
    this.sessionCounter++;
    return `stt_${Date.now()}_${this.sessionCounter}`;
  }
}
