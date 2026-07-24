import { Injectable, Logger } from '@nestjs/common';

export enum TranscriptionSessionStatus {
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface TranscriptionSession {
  sessionId: string;
  callSessionId: string;
  language: string;
  providerName: string;
  status: TranscriptionSessionStatus;
  startedAt: Date;
  endedAt?: Date;
  totalChunksProcessed: number;
  totalBytesProcessed: number;
  turnsCount: number;
  lastActivityAt: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TranscriptionSessionManager {
  private readonly logger = new Logger(TranscriptionSessionManager.name);
  private readonly sessions = new Map<string, TranscriptionSession>();

  /**
   * Create a new transcription session linked to a call session
   */
  createSession(params: {
    sessionId: string;
    callSessionId: string;
    language?: string;
    providerName?: string;
    metadata?: Record<string, unknown>;
  }): TranscriptionSession {
    const session: TranscriptionSession = {
      sessionId: params.sessionId,
      callSessionId: params.callSessionId,
      language: params.language ?? 'en',
      providerName: params.providerName ?? 'faster-whisper',
      status: TranscriptionSessionStatus.INITIALIZING,
      startedAt: new Date(),
      totalChunksProcessed: 0,
      totalBytesProcessed: 0,
      turnsCount: 0,
      lastActivityAt: new Date(),
      metadata: params.metadata,
    };

    this.sessions.set(params.sessionId, session);
    this.logger.log(`Transcription session created: ${params.sessionId} (call: ${params.callSessionId})`);
    return session;
  }

  /**
   * Activate a session
   */
  activate(sessionId: string): void {
    const session = this.getOrThrow(sessionId);
    session.status = TranscriptionSessionStatus.ACTIVE;
    session.lastActivityAt = new Date();
    this.logger.debug(`Session activated: ${sessionId}`);
  }

  /**
   * Update a session with chunk processing stats
   */
  recordChunk(sessionId: string, bytesProcessed: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.totalChunksProcessed++;
    session.totalBytesProcessed += bytesProcessed;
    session.lastActivityAt = new Date();
  }

  /**
   * Increment transcript turn count
   */
  recordTurn(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.turnsCount++;
    session.lastActivityAt = new Date();
  }

  /**
   * Update detected language
   */
  updateLanguage(sessionId: string, language: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.language = language;
  }

  /**
   * Complete the session
   */
  complete(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = TranscriptionSessionStatus.COMPLETED;
    session.endedAt = new Date();
    this.logger.log(`Transcription session completed: ${sessionId} (turns: ${session.turnsCount})`);
  }

  /**
   * Fail the session
   */
  fail(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = TranscriptionSessionStatus.FAILED;
    session.endedAt = new Date();
    this.logger.warn(`Transcription session failed: ${sessionId}`);
  }

  /**
   * Retrieve a session (or null if not found)
   */
  getSession(sessionId: string): TranscriptionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): TranscriptionSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.status === TranscriptionSessionStatus.ACTIVE,
    );
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Destroy a session and release memory
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.debug(`Transcription session destroyed: ${sessionId}`);
  }

  private getOrThrow(sessionId: string): TranscriptionSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Transcription session not found: ${sessionId}`);
    }
    return session;
  }
}
