import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SpeechRecognitionManager } from './speech-recognition-manager';
import { SpeechRuntimeManager } from './speech-runtime-manager';
import { SpeechEventType, FinalTranscriptPayload } from '../interfaces/speech-events.interface';

/**
 * Pipeline Integration Service
 * 
 * Bridges the Speech Recognition Engine with the AI Calling Pipeline:
 * - Automatically starts STT sessions when calls are initiated
 * - Streams audio from telephony to STT engine
 * - Forwards transcripts to Conversation Engine
 * - Manages lifecycle sync between call and STT sessions
 */
@Injectable()
export class PipelineIntegrationService {
  private readonly logger = new Logger(PipelineIntegrationService.name);
  
  // Map call session IDs to STT session IDs
  private readonly callToSttSessionMap = new Map<string, string>();
  
  constructor(
    private readonly sttManager: SpeechRecognitionManager,
    private readonly runtimeManager: SpeechRuntimeManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize STT for a new call session
   * Called by CallLifecycleService when a call is initiated
   */
  async initializeForCall(params: {
    callSessionId: string;
    language?: string;
    enablePartialResults?: boolean;
  }): Promise<string> {
    const { callSessionId, language, enablePartialResults } = params;

    try {
      // Start STT session
      const sttSessionId = await this.sttManager.startSession({
        callSessionId,
        language,
        enablePartialResults: enablePartialResults ?? true,
      });

      // Map call session to STT session
      this.callToSttSessionMap.set(callSessionId, sttSessionId);

      // Register runtime callbacks to forward events to calling pipeline
      this.runtimeManager.registerSession(sttSessionId, callSessionId, {
        onSpeechStarted: (payload) => {
          this.eventEmitter.emit('call.speech.started', {
            callSessionId,
            ...payload,
          });
        },
        onSpeechEnded: (payload) => {
          this.eventEmitter.emit('call.speech.ended', {
            callSessionId,
            ...payload,
          });
        },
        onPartialTranscript: (payload) => {
          this.eventEmitter.emit('call.partial.transcript', {
            callSessionId,
            ...payload,
          });
        },
        onFinalTranscript: (payload) => {
          // Forward to conversation engine for processing
          this.eventEmitter.emit('call.final.transcript', {
            callSessionId,
            ...payload,
          });
        },
        onSilenceDetected: (payload) => {
          this.eventEmitter.emit('call.silence.detected', {
            callSessionId,
            ...payload,
          });
        },
        onLanguageDetected: (payload) => {
          this.eventEmitter.emit('call.language.detected', {
            callSessionId,
            ...payload,
          });
        },
      });

      this.logger.log(
        `STT initialized for call ${callSessionId} → STT session ${sttSessionId}`
      );

      return sttSessionId;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to initialize STT for call ${callSessionId}: ${error.message}`,
          error.stack
        );
      }
      throw error;
    }
  }

  /**
   * Stream audio chunk from telephony to STT
   * Called by telephony provider when audio arrives
   */
  async streamAudioFromCall(
    callSessionId: string,
    audioChunk: Buffer,
    chunkDurationMs?: number,
  ): Promise<void> {
    const sttSessionId = this.callToSttSessionMap.get(callSessionId);

    if (!sttSessionId) {
      this.logger.warn(
        `No STT session found for call ${callSessionId}, ignoring audio chunk`
      );
      return;
    }

    try {
      await this.sttManager.streamChunk(
        sttSessionId,
        audioChunk,
        chunkDurationMs ?? 20
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to stream audio for call ${callSessionId}: ${error.message}`
        );
      }
    }
  }

  /**
   * Finalize STT when call ends
   * Called by CallLifecycleService when call is completed
   */
  async finalizeForCall(callSessionId: string): Promise<{
    fullText: string;
    turnsCount: number;
  }> {
    const sttSessionId = this.callToSttSessionMap.get(callSessionId);

    if (!sttSessionId) {
      this.logger.warn(`No STT session found for call ${callSessionId}`);
      return { fullText: '', turnsCount: 0 };
    }

    try {
      // Stop STT session and get final transcript
      const result = await this.sttManager.stopSession(sttSessionId);

      // Clean up mapping
      this.callToSttSessionMap.delete(callSessionId);

      this.logger.log(
        `STT finalized for call ${callSessionId} (${result.turnsCount} turns)`
      );

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to finalize STT for call ${callSessionId}: ${error.message}`,
          error.stack
        );
      }
      return { fullText: '', turnsCount: 0 };
    }
  }

  /**
   * Get STT session ID for a call session
   */
  getSttSessionId(callSessionId: string): string | undefined {
    return this.callToSttSessionMap.get(callSessionId);
  }

  /**
   * Check if STT is active for a call
   */
  isActiveForCall(callSessionId: string): boolean {
    return this.callToSttSessionMap.has(callSessionId);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeSessions: number;
    totalCallsWithSTT: number;
  } {
    return {
      activeSessions: this.callToSttSessionMap.size,
      totalCallsWithSTT: this.callToSttSessionMap.size,
    };
  }
}
