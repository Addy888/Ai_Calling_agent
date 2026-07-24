/**
 * Conversation Session Service
 * Manages conversation sessions and their lifecycle
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConversationSession,
  ConversationMessage,
  SessionMemory,
  ConversationStartRequest,
} from '../interfaces/conversation-session.interface';
import {
  ConversationState,
  ConversationEvent,
  MessageRole,
  SpeakerType,
  IntentType,
  ConversationEndReason,
} from '../enums/conversation-state.enum';

@Injectable()
export class ConversationSessionService {
  private readonly logger = new Logger(ConversationSessionService.name);
  private sessions: Map<string, ConversationSession> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Create a new conversation session
   */
  async createSession(request: ConversationStartRequest): Promise<ConversationSession> {
    this.logger.log(`Creating conversation session for call: ${request.callId}`);

    const sessionId = this.generateSessionId();

    const session: ConversationSession = {
      // Identifiers
      sessionId,
      callId: request.callId,
      campaignId: request.campaignId,
      contactId: request.contactId,
      companyId: request.companyId,

      // State
      state: ConversationState.INITIALIZING,
      currentStep: 0,
      isActive: true,

      // Customer Context
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerLanguage: request.customerLanguage || 'en',
      customerContext: request.metadata || {},

      // Conversation Data
      conversationHistory: [],
      detectedIntents: [],

      // Memory
      sessionMemory: this.initializeMemory(),

      // Timing
      startedAt: new Date(),
      lastActivityAt: new Date(),

      // Statistics
      turnCount: 0,
      customerMessageCount: 0,
      aiMessageCount: 0,
      silenceCount: 0,

      // Metadata
      metadata: request.metadata || {},
    };

    this.sessions.set(sessionId, session);

    // Emit event
    this.eventEmitter.emit(ConversationEvent.STARTED, {
      sessionId,
      callId: request.callId,
      campaignId: request.campaignId,
      contactId: request.contactId,
      timestamp: new Date(),
    });

    this.logger.log(`Conversation session created: ${sessionId}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ConversationSession> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return session;
  }

  /**
   * Get session by call ID
   */
  async getSessionByCallId(callId: string): Promise<ConversationSession | null> {
    for (const session of this.sessions.values()) {
      if (session.callId === callId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Update session state
   */
  async updateState(
    sessionId: string,
    state: ConversationState,
  ): Promise<ConversationSession> {
    const session = await this.getSession(sessionId);

    const previousState = session.state;
    session.state = state;
    session.lastActivityAt = new Date();

    this.logger.debug(
      `Session ${sessionId} state changed: ${previousState} -> ${state}`,
    );

    // Emit event
    this.eventEmitter.emit(ConversationEvent.STATE_CHANGED, {
      sessionId,
      previousState,
      newState: state,
      timestamp: new Date(),
    });

    return session;
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    sessionId: string,
    message: ConversationMessage,
  ): Promise<ConversationSession> {
    const session = await this.getSession(sessionId);

    session.conversationHistory.push(message);
    session.turnCount++;
    session.lastActivityAt = new Date();

    // Update counters
    if (message.speaker === SpeakerType.CUSTOMER) {
      session.customerMessageCount++;
    } else if (message.speaker === SpeakerType.AI) {
      session.aiMessageCount++;
    }

    // Track intent
    if (message.intent && !session.detectedIntents.includes(message.intent)) {
      session.detectedIntents.push(message.intent);
      session.currentIntent = message.intent;
    }

    return session;
  }

  /**
   * Update session memory
   */
  async updateMemory(
    sessionId: string,
    updates: Partial<SessionMemory>,
  ): Promise<ConversationSession> {
    const session = await this.getSession(sessionId);

    session.sessionMemory = {
      ...session.sessionMemory,
      ...updates,
    };

    session.lastActivityAt = new Date();

    // Emit event
    this.eventEmitter.emit(ConversationEvent.MEMORY_UPDATED, {
      sessionId,
      updates,
      timestamp: new Date(),
    });

    return session;
  }

  /**
   * Add detected intent
   */
  async addIntent(
    sessionId: string,
    intent: IntentType,
    confidence: number,
  ): Promise<ConversationSession> {
    const session = await this.getSession(sessionId);

    // Add to detected intents if not already present
    if (!session.detectedIntents.includes(intent)) {
      session.detectedIntents.push(intent);
    }

    // Update current intent
    session.currentIntent = intent;

    // Add to memory intent history
    session.sessionMemory.intentHistory.push({
      intent,
      confidence,
      timestamp: new Date(),
    });

    session.lastActivityAt = new Date();

    // Emit event
    this.eventEmitter.emit(ConversationEvent.INTENT_DETECTED, {
      sessionId,
      intent,
      confidence,
      timestamp: new Date(),
    });

    return session;
  }

  /**
   * Increment silence count
   */
  async incrementSilence(sessionId: string): Promise<ConversationSession> {
    const session = await this.getSession(sessionId);

    session.silenceCount++;
    session.lastActivityAt = new Date();

    // Emit event
    this.eventEmitter.emit(ConversationEvent.SILENCE_DETECTED, {
      sessionId,
      silenceCount: session.silenceCount,
      timestamp: new Date(),
    });

    return session;
  }

  /**
   * End conversation session
   */
  async endSession(
    sessionId: string,
    reason: ConversationEndReason,
  ): Promise<ConversationSession> {
    this.logger.log(`Ending conversation session: ${sessionId}, reason: ${reason}`);

    const session = await this.getSession(sessionId);

    session.state = ConversationState.COMPLETED;
    session.isActive = false;
    session.endedAt = new Date();
    session.endReason = reason;
    session.duration = session.endedAt.getTime() - session.startedAt.getTime();

    // Emit event
    this.eventEmitter.emit(ConversationEvent.ENDED, {
      sessionId,
      callId: session.callId,
      reason,
      duration: session.duration,
      turnCount: session.turnCount,
      timestamp: new Date(),
    });

    this.logger.log(`Conversation session ended: ${sessionId}`);

    return session;
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<ConversationSession[]> {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(sessionId: string) {
    const session = await this.getSession(sessionId);

    const responseTimestamps: number[] = [];
    for (let i = 1; i < session.conversationHistory.length; i++) {
      const prev = session.conversationHistory[i - 1];
      const curr = session.conversationHistory[i];

      if (
        prev.speaker === SpeakerType.CUSTOMER &&
        curr.speaker === SpeakerType.AI
      ) {
        const responseTime =
          curr.timestamp.getTime() - prev.timestamp.getTime();
        responseTimestamps.push(responseTime);
      }
    }

    const averageResponseTime =
      responseTimestamps.length > 0
        ? responseTimestamps.reduce((a, b) => a + b, 0) / responseTimestamps.length
        : 0;

    // Intent counts
    const intentCounts = new Map<IntentType, number>();
    session.sessionMemory.intentHistory.forEach(({ intent }) => {
      intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1);
    });

    return {
      sessionId: session.sessionId,
      duration: session.duration || Date.now() - session.startedAt.getTime(),
      turnCount: session.turnCount,
      customerMessageCount: session.customerMessageCount,
      aiMessageCount: session.aiMessageCount,
      averageResponseTime,
      detectedIntents: Array.from(intentCounts.entries()).map(
        ([intent, count]) => ({ intent, count }),
      ),
      silenceCount: session.silenceCount,
      successfulResponses: session.aiMessageCount,
      failedResponses: 0, // Track separately if needed
      knowledgeRetrievals: 0, // Track separately if needed
    };
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions(olderThanMinutes: number = 60): Promise<number> {
    const cutoffTime = Date.now() - olderThanMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        !session.isActive &&
        session.endedAt &&
        session.endedAt.getTime() < cutoffTime
      ) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old sessions`);
    }

    return cleanedCount;
  }

  // Private helper methods

  private generateSessionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMemory(): SessionMemory {
    return {
      previousAnswers: [],
      currentStep: 0,
      scriptProgress: 0,
      extractedData: {},
      intentHistory: [],
      custom: {},
    };
  }
}
