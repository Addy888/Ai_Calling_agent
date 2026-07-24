/**
 * Conversation Runtime Manager Service
 * Main orchestrator for the entire conversation runtime
 * Coordinates all services and manages the complete conversation lifecycle
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationSessionService } from './conversation-session.service';
import { ConversationProcessorService } from './conversation-processor.service';
import { ResponseValidatorService } from './response-validator.service';
import { FallbackManagerService } from './fallback-manager.service';
import { SessionPersistenceService } from './session-persistence.service';
import {
  ConversationStartRequest,
  ConversationMessageRequest,
  ConversationEndRequest,
  ConversationSession,
  ResponseGenerationResult,
} from '../interfaces/conversation-session.interface';
import {
  ConversationState,
  ConversationEndReason,
  ConversationEvent,
} from '../enums/conversation-state.enum';

@Injectable()
export class ConversationRuntimeManagerService {
  private readonly logger = new Logger(ConversationRuntimeManagerService.name);

  constructor(
    private readonly sessionService: ConversationSessionService,
    private readonly processor: ConversationProcessorService,
    private readonly validator: ResponseValidatorService,
    private readonly fallbackManager: FallbackManagerService,
    private readonly persistence: SessionPersistenceService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Conversation Runtime Manager initialized');
  }

  /**
   * Start a new conversation
   */
  async startConversation(
    request: ConversationStartRequest,
  ): Promise<{
    session: ConversationSession;
    greeting: ResponseGenerationResult;
  }> {
    this.logger.log(
      `Starting conversation for call: ${request.callId}, campaign: ${request.campaignId}`,
    );

    try {
      // Create session
      const session = await this.sessionService.createSession(request);

      this.logger.log(`Session created: ${session.sessionId}`);

      // Load campaign data and initialize context
      await this.loadSessionData(session.sessionId, request);

      // Generate greeting
      const greeting = await this.processor.generateGreeting(session.sessionId);

      // Validate greeting
      const validatedGreeting = await this.validator.validateResponse(
        greeting,
        session.sessionId,
      );

      // If validation failed, use fallback
      if (!validatedGreeting.isValid) {
        this.logger.warn(
          `Greeting validation failed: ${validatedGreeting.reason}. Using fallback.`,
        );
        const fallback = await this.fallbackManager.getFallbackGreeting(
          session.sessionId,
        );
        greeting.response = fallback;
      }

      this.logger.log(
        `Conversation started successfully: ${session.sessionId}`,
      );

      return {
        session,
        greeting,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start conversation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process customer message
   */
  async processMessage(
    request: ConversationMessageRequest,
  ): Promise<ResponseGenerationResult> {
    this.logger.debug(
      `Processing message for session: ${request.sessionId}`,
    );

    try {
      // Check if session exists and is active
      const session = await this.sessionService.getSession(request.sessionId);

      if (!session.isActive) {
        throw new Error('Session is not active');
      }

      // Process the message through the conversation processor
      let response = await this.processor.processMessage(request);

      // Validate response
      const validation = await this.validator.validateResponse(
        response,
        request.sessionId,
      );

      // If validation failed, get fallback
      if (!validation.isValid) {
        this.logger.warn(
          `Response validation failed: ${validation.reason}. Using fallback.`,
        );

        const fallbackResponse = await this.fallbackManager.getFallbackResponse(
          request.sessionId,
          request.message,
          validation.reason,
        );

        response = {
          ...response,
          response: fallbackResponse,
          metadata: {
            ...response.metadata,
            fallback: true,
            originalResponse: response.response,
            validationIssue: validation.reason,
          },
        };
      }

      // Update conversation state based on response
      if (response.shouldEndConversation) {
        await this.sessionService.updateState(
          request.sessionId,
          ConversationState.COMPLETED,
        );
      } else {
        await this.sessionService.updateState(
          request.sessionId,
          ConversationState.WAITING,
        );
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process message: ${error.message}`,
        error.stack,
      );

      // Try to generate error fallback
      try {
        const fallback = await this.fallbackManager.getErrorFallback(
          request.sessionId,
        );

        return {
          success: false,
          response: fallback,
          confidence: 0.5,
          duration: 0,
          shouldEndConversation: false,
          error: error.message,
          metadata: { errorFallback: true },
        };
      } catch (fallbackError) {
        this.logger.error(
          `Even fallback failed: ${fallbackError.message}`,
        );
        throw error;
      }
    }
  }

  /**
   * Handle silence timeout
   */
  async handleSilenceTimeout(sessionId: string): Promise<ResponseGenerationResult> {
    this.logger.log(`Handling silence timeout for session: ${sessionId}`);

    try {
      const response = await this.processor.handleSilence(sessionId);

      // If we've had too many silence events, prepare to end
      const session = await this.sessionService.getSession(sessionId);

      if (response.shouldEndConversation || session.silenceCount >= 3) {
        await this.sessionService.updateState(
          sessionId,
          ConversationState.COMPLETED,
        );
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to handle silence: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * End conversation
   */
  async endConversation(
    request: ConversationEndRequest,
  ): Promise<{
    session: ConversationSession;
    goodbye?: ResponseGenerationResult;
  }> {
    this.logger.log(
      `Ending conversation: ${request.sessionId}, reason: ${request.reason}`,
    );

    try {
      const session = await this.sessionService.getSession(request.sessionId);

      // Generate goodbye if not already ended
      let goodbye: ResponseGenerationResult | undefined;

      if (
        session.state !== ConversationState.COMPLETED &&
        request.reason !== ConversationEndReason.ERROR
      ) {
        goodbye = await this.processor.generateGoodbye(
          request.sessionId,
          request.reason,
        );
      }

      // End the session
      await this.sessionService.endSession(request.sessionId, request.reason);

      // Persist conversation data
      await this.persistence.persistSession(request.sessionId);

      this.logger.log(`Conversation ended successfully: ${request.sessionId}`);

      return {
        session: await this.sessionService.getSession(request.sessionId),
        goodbye,
      };
    } catch (error) {
      this.logger.error(
        `Failed to end conversation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get conversation session
   */
  async getSession(sessionId: string): Promise<ConversationSession> {
    return this.sessionService.getSession(sessionId);
  }

  /**
   * Get session by call ID
   */
  async getSessionByCallId(callId: string): Promise<ConversationSession | null> {
    return this.sessionService.getSessionByCallId(callId);
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(sessionId: string) {
    return this.sessionService.getSessionStatistics(sessionId);
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<ConversationSession[]> {
    return this.sessionService.getActiveSessions();
  }

  /**
   * Get active sessions count
   */
  async getActiveSessionsCount(): Promise<number> {
    const sessions = await this.getActiveSessions();
    return sessions.length;
  }

  /**
   * Pause conversation (e.g., for transfer or hold)
   */
  async pauseConversation(sessionId: string): Promise<void> {
    this.logger.log(`Pausing conversation: ${sessionId}`);
    await this.sessionService.updateState(sessionId, ConversationState.PAUSED);
  }

  /**
   * Resume conversation
   */
  async resumeConversation(sessionId: string): Promise<void> {
    this.logger.log(`Resuming conversation: ${sessionId}`);
    await this.sessionService.updateState(sessionId, ConversationState.WAITING);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    activeSessions: number;
    timestamp: Date;
  }> {
    try {
      const activeSessions = await this.getActiveSessionsCount();

      return {
        healthy: true,
        activeSessions,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        healthy: false,
        activeSessions: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cleanup old sessions
   */
  async cleanup(olderThanMinutes: number = 60): Promise<number> {
    this.logger.log(`Running cleanup for sessions older than ${olderThanMinutes} minutes`);
    return this.sessionService.cleanupOldSessions(olderThanMinutes);
  }

  // Private helper methods

  /**
   * Load session data from database
   */
  private async loadSessionData(
    sessionId: string,
    request: ConversationStartRequest,
  ): Promise<void> {
    try {
      // This method would load campaign, script, agent data
      // For now, we store the metadata in the session
      const session = await this.sessionService.getSession(sessionId);

      // Update session with loaded data
      session.metadata = {
        ...session.metadata,
        ...request.metadata,
      };

      this.logger.debug(`Session data loaded for: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to load session data: ${error.message}`);
      throw error;
    }
  }
}
