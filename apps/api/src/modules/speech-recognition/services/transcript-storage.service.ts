import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
  SpeechEventType, 
  FinalTranscriptPayload,
  TranscriptCompletedPayload 
} from '../interfaces/speech-events.interface';

/**
 * Transcript Storage Service
 * 
 * Persists transcripts for:
 * - Call history and playback
 * - Analytics and reporting
 * - Training data collection
 * - Compliance and audit logs
 */
@Injectable()
export class TranscriptStorageService {
  private readonly logger = new Logger(TranscriptStorageService.name);

  // In-memory storage for development (replace with database in production)
  private readonly transcripts = new Map<string, StoredTranscript>();
  private readonly turnHistory = new Map<string, TranscriptTurn[]>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Handle FinalTranscript event and store it
   */
  @OnEvent(SpeechEventType.FINAL_TRANSCRIPT)
  async handleFinalTranscript(payload: FinalTranscriptPayload): Promise<void> {
    try {
      await this.storeTurn(payload);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to store transcript turn: ${error.message}`,
          error.stack
        );
      }
    }
  }

  /**
   * Handle TranscriptCompleted event
   */
  @OnEvent(SpeechEventType.TRANSCRIPT_COMPLETED)
  async handleTranscriptCompleted(payload: TranscriptCompletedPayload): Promise<void> {
    try {
      await this.finalizeTranscript(payload.sessionId, payload.fullText);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to finalize transcript: ${error.message}`,
          error.stack
        );
      }
    }
  }

  /**
   * Store a transcript turn
   */
  async storeTurn(payload: FinalTranscriptPayload): Promise<void> {
    const { sessionId, text, confidence, language, words, timestamp } = payload;

    // Get or create turn history
    if (!this.turnHistory.has(sessionId)) {
      this.turnHistory.set(sessionId, []);
    }

    const turns = this.turnHistory.get(sessionId)!;

    const turn: TranscriptTurn = {
      turnIndex: turns.length + 1,
      text,
      confidence,
      language,
      words: words || [],
      timestamp,
      speaker: 'customer', // In STT, we only transcribe customer speech
    };

    turns.push(turn);

    this.logger.debug(
      `Stored transcript turn ${turn.turnIndex} for session ${sessionId}`
    );
  }

  /**
   * Finalize transcript when session ends
   */
  async finalizeTranscript(sessionId: string, fullText: string): Promise<void> {
    const turns = this.turnHistory.get(sessionId) || [];

    const transcript: StoredTranscript = {
      sessionId,
      fullText,
      turns,
      totalTurns: turns.length,
      createdAt: new Date(),
      finalizedAt: new Date(),
      metadata: {
        totalWords: this.countWords(fullText),
        averageConfidence: this.calculateAverageConfidence(turns),
        languages: this.extractLanguages(turns),
      },
    };

    // Store transcript
    this.transcripts.set(sessionId, transcript);

    this.logger.log(
      `Transcript finalized for session ${sessionId}: ${turns.length} turns, ${transcript.metadata.totalWords} words`
    );

    // TODO: In production, save to database
    // await this.databaseService.saveTranscript(transcript);

    // Emit storage complete event
    this.eventEmitter.emit('transcript.stored', {
      sessionId,
      transcript,
      timestamp: new Date(),
    });
  }

  /**
   * Retrieve stored transcript by session ID
   */
  async getTranscript(sessionId: string): Promise<StoredTranscript | null> {
    return this.transcripts.get(sessionId) || null;
  }

  /**
   * Retrieve transcript turns for a session
   */
  async getTurns(sessionId: string): Promise<TranscriptTurn[]> {
    return this.turnHistory.get(sessionId) || [];
  }

  /**
   * Search transcripts by text
   */
  async searchTranscripts(query: string): Promise<StoredTranscript[]> {
    const results: StoredTranscript[] = [];

    for (const transcript of this.transcripts.values()) {
      if (transcript.fullText.toLowerCase().includes(query.toLowerCase())) {
        results.push(transcript);
      }
    }

    return results;
  }

  /**
   * Get transcripts by date range
   */
  async getTranscriptsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StoredTranscript[]> {
    const results: StoredTranscript[] = [];

    for (const transcript of this.transcripts.values()) {
      if (
        transcript.createdAt >= startDate &&
        transcript.createdAt <= endDate
      ) {
        results.push(transcript);
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get statistics
   */
  getStatistics(): TranscriptStatistics {
    const transcripts = Array.from(this.transcripts.values());

    return {
      totalTranscripts: transcripts.length,
      totalTurns: transcripts.reduce((sum, t) => sum + t.totalTurns, 0),
      totalWords: transcripts.reduce((sum, t) => sum + t.metadata.totalWords, 0),
      averageConfidence: this.calculateGlobalAverageConfidence(transcripts),
      languageDistribution: this.calculateLanguageDistribution(transcripts),
    };
  }

  /**
   * Export transcript to various formats
   */
  async exportTranscript(
    sessionId: string,
    format: 'json' | 'txt' | 'srt' | 'vtt'
  ): Promise<string> {
    const transcript = await this.getTranscript(sessionId);

    if (!transcript) {
      throw new Error(`Transcript not found: ${sessionId}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(transcript, null, 2);

      case 'txt':
        return this.exportAsText(transcript);

      case 'srt':
        return this.exportAsSRT(transcript);

      case 'vtt':
        return this.exportAsVTT(transcript);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Clean up old transcripts
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;

    for (const [sessionId, transcript] of this.transcripts.entries()) {
      if (transcript.createdAt < cutoffDate) {
        this.transcripts.delete(sessionId);
        this.turnHistory.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} old transcripts`);
    }

    return deletedCount;
  }

  // Private helper methods

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateAverageConfidence(turns: TranscriptTurn[]): number {
    if (turns.length === 0) return 0;

    const sum = turns.reduce((acc, turn) => acc + turn.confidence, 0);
    return sum / turns.length;
  }

  private calculateGlobalAverageConfidence(transcripts: StoredTranscript[]): number {
    if (transcripts.length === 0) return 0;

    const sum = transcripts.reduce(
      (acc, t) => acc + t.metadata.averageConfidence,
      0
    );
    return sum / transcripts.length;
  }

  private extractLanguages(turns: TranscriptTurn[]): string[] {
    const languages = new Set<string>();
    turns.forEach(turn => languages.add(turn.language));
    return Array.from(languages);
  }

  private calculateLanguageDistribution(
    transcripts: StoredTranscript[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    transcripts.forEach(transcript => {
      transcript.metadata.languages.forEach(lang => {
        distribution[lang] = (distribution[lang] || 0) + 1;
      });
    });

    return distribution;
  }

  private exportAsText(transcript: StoredTranscript): string {
    const lines: string[] = [];
    lines.push(`Transcript: ${transcript.sessionId}`);
    lines.push(`Date: ${transcript.createdAt.toISOString()}`);
    lines.push(`Total Turns: ${transcript.totalTurns}`);
    lines.push('─'.repeat(50));
    lines.push('');

    transcript.turns.forEach(turn => {
      lines.push(`[Turn ${turn.turnIndex}] (${turn.language}, confidence: ${turn.confidence.toFixed(2)})`);
      lines.push(turn.text);
      lines.push('');
    });

    return lines.join('\n');
  }

  private exportAsSRT(transcript: StoredTranscript): string {
    const lines: string[] = [];
    let index = 1;

    transcript.turns.forEach(turn => {
      if (!turn.words || turn.words.length === 0) return;

      const startTime = turn.words[0].start;
      const endTime = turn.words[turn.words.length - 1].end;

      lines.push(index.toString());
      lines.push(`${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}`);
      lines.push(turn.text);
      lines.push('');

      index++;
    });

    return lines.join('\n');
  }

  private exportAsVTT(transcript: StoredTranscript): string {
    const lines: string[] = ['WEBVTT', ''];

    transcript.turns.forEach(turn => {
      if (!turn.words || turn.words.length === 0) return;

      const startTime = turn.words[0].start;
      const endTime = turn.words[turn.words.length - 1].end;

      lines.push(`${this.formatVTTTime(startTime)} --> ${this.formatVTTTime(endTime)}`);
      lines.push(turn.text);
      lines.push('');
    });

    return lines.join('\n');
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)},${this.pad(ms, 3)}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)}.${this.pad(ms, 3)}`;
  }

  private pad(num: number, size: number): string {
    return num.toString().padStart(size, '0');
  }
}

/**
 * Stored Transcript Interface
 */
export interface StoredTranscript {
  sessionId: string;
  fullText: string;
  turns: TranscriptTurn[];
  totalTurns: number;
  createdAt: Date;
  finalizedAt: Date;
  metadata: {
    totalWords: number;
    averageConfidence: number;
    languages: string[];
  };
}

/**
 * Transcript Turn Interface
 */
export interface TranscriptTurn {
  turnIndex: number;
  text: string;
  confidence: number;
  language: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  timestamp: Date;
  speaker: 'customer' | 'agent';
}

/**
 * Transcript Statistics Interface
 */
export interface TranscriptStatistics {
  totalTranscripts: number;
  totalTurns: number;
  totalWords: number;
  averageConfidence: number;
  languageDistribution: Record<string, number>;
}
