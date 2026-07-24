import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallState, PipelineEvent } from '../enums/call-state.enum';

/**
 * Call Session Service
 * Manages call session data and state
 */
@Injectable()
export class CallSessionService {
  private readonly logger = new Logger(CallSessionService.name);
  private sessions: Map<string, CallSession> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('Call Session Service initialized');
  }

  /**
   * Create a new call session
   */
  async createSession(params: {
    sessionId: string;
    contactId: string;
    campaignId: string;
    agentId: string;
    phoneNumber: string;
    campaignData?: any;
    contactData?: any;
    agentConfig?: any;
    promptTemplates?: any;
    knowledgeBase?: any;
    memoryContext?: any;
    customContext?: Record<string, any>;
  }): Promise<CallSession> {
    this.logger.log(`Creating call session: ${params.sessionId}`);

    const session: CallSession = {
      id: params.sessionId,
      contactId: params.contactId,
      campaignId: params.campaignId,
      agentId: params.agentId,
      phoneNumber: params.phoneNumber,
      state: CallState.IDLE,
      direction: 'outbound',
      campaignData: params.campaignData,
      contactData: params.contactData,
      agentConfig: params.agentConfig,
      promptTemplates: params.promptTemplates,
      knowledgeBase: params.knowledgeBase,
      memoryContext: params.memoryContext,
      context: params.customContext || {},
      transcript: [],
      conversationTurns: 0,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(params.sessionId, session);

    this.logger.log(`Call session created: ${params.sessionId}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<CallSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<CallSession>,
  ): Promise<CallSession> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    Object.assign(session, updates);
    session.updatedAt = new Date();

    return session;
  }

  /**
   * Update session state
   */
  async updateState(sessionId: string, state: CallState): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    session.state = state;
    session.updatedAt = new Date();

    // Track connection time
    if (state === CallState.CONNECTED && !session.connectedAt) {
      session.connectedAt = new Date();
    }

    // Track end time
    if (state === CallState.COMPLETED || state === CallState.FAILED) {
      session.endedAt = new Date();
      
      // Calculate duration
      if (session.connectedAt) {
        session.duration = Math.floor(
          (session.endedAt.getTime() - session.connectedAt.getTime()) / 1000
        );
      }
    }
  }

  /**
   * Add transcript turn
   */
  async addTranscriptTurn(
    sessionId: string,
    speaker: 'customer' | 'agent',
    text: string,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const turn: TranscriptTurn = {
      speaker,
      text,
      timestamp: new Date(),
    };

    session.transcript.push(turn);
    session.conversationTurns++;
    session.updatedAt = new Date();

    this.eventEmitter.emit(PipelineEvent.TRANSCRIPT_UPDATED, {
      sessionId,
      turn,
      totalTurns: session.conversationTurns,
      timestamp: new Date(),
    });
  }

  /**
   * Get transcript
   */
  async getTranscript(sessionId: string): Promise<TranscriptTurn[]> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return session.transcript;
  }

  /**
   * Update session context
   */
  async updateContext(
    sessionId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    session.context[key] = value;
    session.updatedAt = new Date();
  }

  /**
   * Get session context
   */
  async getContext(sessionId: string, key?: string): Promise<any> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (key) {
      return session.context[key];
    }

    return session.context;
  }

  /**
   * Finalize session
   */
  async finalizeSession(sessionId: string, reason?: string): Promise<void> {
    this.logger.log(`Finalizing session: ${sessionId}`);

    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // TODO: Save transcript to database
    await this.saveTranscript(session);

    // TODO: Save recording URL if available
    if (session.recordingUrl) {
      await this.saveRecording(session);
    }

    // TODO: Update analytics
    await this.updateAnalytics(session);

    session.finalizedAt = new Date();
    session.finalizeReason = reason;
    session.updatedAt = new Date();

    this.logger.log(`Session finalized: ${sessionId}`);
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<CallSession[]> {
    return Array.from(this.sessions.values()).filter(session => {
      return ![CallState.COMPLETED, CallState.FAILED].includes(session.state);
    });
  }

  /**
   * Get sessions by campaign
   */
  async getSessionsByCampaign(campaignId: string): Promise<CallSession[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.campaignId === campaignId
    );
  }

  /**
   * Get sessions by contact
   */
  async getSessionsByContact(contactId: string): Promise<CallSession[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.contactId === contactId
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.logger.log(`Deleting session: ${sessionId}`);
    this.sessions.delete(sessionId);
  }

  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    
    const toDelete: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      const isTerminal = [CallState.COMPLETED, CallState.FAILED].includes(session.state);
      const isOld = session.updatedAt.getTime() < cutoffTime;
      
      if (isTerminal && isOld) {
        toDelete.push(sessionId);
      }
    });

    toDelete.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} old sessions`);
    }
  }

  // Private helper methods

  private async saveTranscript(session: CallSession): Promise<void> {
    // TODO: Save to database via CallsService
    this.logger.debug(`Saving transcript for session: ${session.id}`);
    
    this.eventEmitter.emit(PipelineEvent.TRANSCRIPT_UPDATED, {
      sessionId: session.id,
      transcript: session.transcript,
      timestamp: new Date(),
    });
  }

  private async saveRecording(session: CallSession): Promise<void> {
    // TODO: Save recording metadata
    this.logger.debug(`Saving recording for session: ${session.id}`);
    
    this.eventEmitter.emit(PipelineEvent.RECORDING_SAVED, {
      sessionId: session.id,
      recordingUrl: session.recordingUrl,
      timestamp: new Date(),
    });
  }

  private async updateAnalytics(session: CallSession): Promise<void> {
    // TODO: Update via AnalyticsService
    this.logger.debug(`Updating analytics for session: ${session.id}`);
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    avgDuration: number;
    avgTurns: number;
  } {
    const sessions = Array.from(this.sessions.values());

    const completed = sessions.filter(s => s.state === CallState.COMPLETED);
    const failed = sessions.filter(s => s.state === CallState.FAILED);
    const active = sessions.filter(s => 
      ![CallState.COMPLETED, CallState.FAILED].includes(s.state)
    );

    const totalDuration = completed.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalTurns = completed.reduce((sum, s) => sum + (s.conversationTurns || 0), 0);

    return {
      total: sessions.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      avgDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      avgTurns: completed.length > 0 ? totalTurns / completed.length : 0,
    };
  }
}

/**
 * Call Session Interface
 */
export interface CallSession {
  id: string;
  contactId: string;
  campaignId: string;
  agentId: string;
  phoneNumber: string;
  state: CallState;
  direction: 'inbound' | 'outbound';
  
  // Campaign and agent data
  campaignData?: any;
  contactData?: any;
  agentConfig?: any;
  promptTemplates?: any;
  knowledgeBase?: any;
  memoryContext?: any;
  
  // Session context
  context: Record<string, any>;
  
  // Transcript
  transcript: TranscriptTurn[];
  conversationTurns: number;
  
  // Timestamps
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Metrics
  duration?: number; // in seconds
  
  // Recording
  recordingUrl?: string;
  recordingSid?: string;
  
  // Telephony
  callSid?: string;
  
  // Error handling
  error?: string;
  errorStack?: string;
  finalizeReason?: string;
}

/**
 * Transcript Turn
 */
export interface TranscriptTurn {
  speaker: 'customer' | 'agent';
  text: string;
  timestamp: Date;
  confidence?: number;
  duration?: number;
}
