import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SpeechEventType,
  PartialTranscriptPayload,
  FinalTranscriptPayload,
  TranscriptCompletedPayload,
  LanguageDetectedPayload,
} from '../interfaces/speech-events.interface';
import { LanguageDetector } from './language-detector';
import { TranscriptException } from '../exceptions/speech-recognition.exception';

export interface WordToken {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AssembledTranscript {
  sessionId: string;
  text: string;
  words: WordToken[];
  language: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
  turnIndex: number;
}

@Injectable()
export class TranscriptAssembler {
  private readonly logger = new Logger(TranscriptAssembler.name);

  // Per-session turn management
  private readonly turnCounters = new Map<string, number>();
  private readonly transcriptHistory = new Map<string, AssembledTranscript[]>();
  private readonly fullTextBuffers = new Map<string, string[]>();

  constructor(
    private readonly languageDetector: LanguageDetector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize a transcript session
   */
  initSession(sessionId: string): void {
    this.turnCounters.set(sessionId, 0);
    this.transcriptHistory.set(sessionId, []);
    this.fullTextBuffers.set(sessionId, []);
    this.logger.debug(`Transcript session initialized: ${sessionId}`);
  }

  /**
   * Assemble and emit a partial transcript
   */
  emitPartial(
    sessionId: string,
    text: string,
    confidence: number,
    words: WordToken[] = [],
  ): void {
    try {
      const payload: PartialTranscriptPayload = {
        sessionId,
        timestamp: new Date(),
        text,
        confidence,
        words,
      };

      this.eventEmitter.emit(SpeechEventType.PARTIAL_TRANSCRIPT, payload);
      this.logger.debug(`[${sessionId}] Partial transcript: "${text.substring(0, 60)}..."`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to emit partial transcript: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Assemble and emit a final transcript for a conversation turn
   */
  async emitFinal(
    sessionId: string,
    text: string,
    confidence: number,
    words: WordToken[] = [],
    detectedLanguage?: string,
  ): Promise<AssembledTranscript> {
    try {
      // Detect language if not already provided
      const langDetection = this.languageDetector.detect(text);
      const language = detectedLanguage ?? langDetection.language;

      // Emit language detection if determined from text
      if (!detectedLanguage) {
        const langPayload: LanguageDetectedPayload = {
          sessionId,
          timestamp: new Date(),
          language,
          confidence: langDetection.confidence,
        };
        this.eventEmitter.emit(SpeechEventType.LANGUAGE_DETECTED, langPayload);
      }

      // Increment turn counter
      const turnIndex = (this.turnCounters.get(sessionId) ?? 0) + 1;
      this.turnCounters.set(sessionId, turnIndex);

      const assembled: AssembledTranscript = {
        sessionId,
        text,
        words,
        language,
        confidence,
        isFinal: true,
        timestamp: new Date(),
        turnIndex,
      };

      // Store in history
      const history = this.transcriptHistory.get(sessionId) ?? [];
      history.push(assembled);
      this.transcriptHistory.set(sessionId, history);

      // Accumulate full conversation text
      const fullBuffer = this.fullTextBuffers.get(sessionId) ?? [];
      fullBuffer.push(text);
      this.fullTextBuffers.set(sessionId, fullBuffer);

      // Emit final transcript event
      const finalPayload: FinalTranscriptPayload = {
        sessionId,
        timestamp: new Date(),
        text,
        confidence,
        language,
        words,
      };
      this.eventEmitter.emit(SpeechEventType.FINAL_TRANSCRIPT, finalPayload);

      this.logger.log(`[${sessionId}] Final transcript (turn ${turnIndex}, lang: ${language}): "${text.substring(0, 80)}"`);

      return assembled;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to emit final transcript: ${error.message}`, error.stack);
        throw new TranscriptException(error.message);
      }
      throw new TranscriptException('Unknown transcript assembly error');
    }
  }

  /**
   * Complete the transcript session and emit TranscriptCompleted event
   */
  completeSession(sessionId: string): string {
    const fullTextBuffer = this.fullTextBuffers.get(sessionId) ?? [];
    const fullText = fullTextBuffer.join(' ').trim();

    const payload: TranscriptCompletedPayload = {
      sessionId,
      timestamp: new Date(),
      fullText,
    };

    this.eventEmitter.emit(SpeechEventType.TRANSCRIPT_COMPLETED, payload);
    this.logger.log(`[${sessionId}] Transcript session completed. Total turns: ${this.turnCounters.get(sessionId) ?? 0}`);

    return fullText;
  }

  /**
   * Get all transcripts for a session
   */
  getHistory(sessionId: string): AssembledTranscript[] {
    return this.transcriptHistory.get(sessionId) ?? [];
  }

  /**
   * Get the full conversation text from accumulated turns
   */
  getFullText(sessionId: string): string {
    const buffer = this.fullTextBuffers.get(sessionId) ?? [];
    return buffer.join(' ').trim();
  }

  /**
   * Destroy session and release memory
   */
  destroySession(sessionId: string): void {
    this.turnCounters.delete(sessionId);
    this.transcriptHistory.delete(sessionId);
    this.fullTextBuffers.delete(sessionId);
    this.logger.debug(`Transcript session destroyed: ${sessionId}`);
  }
}
