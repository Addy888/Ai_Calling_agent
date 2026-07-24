import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallLifecycleService } from './call-lifecycle.service';
import { CallSessionService } from './call-session.service';
import { ConversationStateService } from './conversation-state.service';
import { AgentExecutionService } from './agent-execution.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { WorkflowManagerService } from './workflow-manager.service';
import { CallState, PipelineEvent } from '../enums/call-state.enum';
import { CallStatusResponse } from '../dto/pipeline.dto';

/**
 * Call Orchestrator Service
 * Orchestrates the complete lifecycle of a single call
 * Coordinates between: Telephony → STT → AI Agent → TTS → Telephony
 */
@Injectable()
export class CallOrchestratorService {
  private readonly logger = new Logger(CallOrchestratorService.name);

  constructor(
    private readonly callLifecycle: CallLifecycleService,
    private readonly callSession: CallSessionService,
    private readonly conversationState: ConversationStateService,
    private readonly agentExecution: AgentExecutionService,
    private readonly conversationOrchestrator: ConversationOrchestratorService,
    private readonly workflowManager: WorkflowManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Call Orchestrator initialized');
  }

  /**
   * Initialize and start a call
   */
  async initiateCall(params: {
    sessionId: string;
    contactId: string;
    campaignId: string;
    agentId: string;
    phoneNumber: string;
    context?: Record<string, any>;
  }): Promise<void> {
    const { sessionId, contactId, campaignId, agentId, phoneNumber, context } = params;

    this.logger.log(`Initiating call: ${sessionId}`);

    try {
      // Start call lifecycle
      await this.callLifecycle.transitionState(sessionId, CallState.INITIALIZING);
      
      // Emit call initiated event
      this.eventEmitter.emit(PipelineEvent.CALL_STARTED, {
        sessionId,
        contactId,
        campaignId,
        timestamp: new Date(),
      });

      this.logger.log(`Call initiated successfully: ${sessionId}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initiate call ${sessionId}: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(sessionId: string, reason?: string): Promise<void> {
    this.logger.log(`Ending call: ${sessionId}, reason: ${reason || 'normal'}`);

    try {
      await this.callLifecycle.transitionState(sessionId, CallState.ENDING, reason);

      // Emit call ended event
      this.eventEmitter.emit(PipelineEvent.CALL_COMPLETED, {
        sessionId,
        reason,
        timestamp: new Date(),
      });

      this.logger.log(`Call ended successfully: ${sessionId}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to end call ${sessionId}: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(sessionId: string): Promise<CallStatusResponse> {
    const session = await this.callSession.getSession(sessionId);

    if (!session) {
      throw new NotFoundException(`Call session not found: ${sessionId}`);
    }

    const conversationData = this.conversationState.getStateData(sessionId);

    return {
      sessionId: session.id,
      contactId: session.contactId,
      campaignId: session.campaignId,
      phoneNumber: session.phoneNumber,
      state: session.state,
      conversationTurns: session.conversationTurns,
      startedAt: session.startedAt,
      connectedAt: session.connectedAt,
      endedAt: session.endedAt,
      duration: session.duration,
      callSid: session.callSid,
    };
  }

  /**
   * Get all active call sessions
   */
  async getActiveSessions(): Promise<CallStatusResponse[]> {
    const activeSessions = await this.callSession.getActiveSessions();

    return Promise.all(
      activeSessions.map(session => this.getCallStatus(session.id))
    );
  }

  /**
   * Get count of active calls
   */
  async getActiveCallsCount(): Promise<number> {
    const activeSessions = await this.callSession.getActiveSessions();
    return activeSessions.length;
  }

  /**
   * Check if call is active
   */
  async isCallActive(sessionId: string): Promise<boolean> {
    const session = await this.callSession.getSession(sessionId);
    if (!session) return false;

    return ![CallState.COMPLETED, CallState.FAILED].includes(session.state);
  }

  /**
   * Update call state
   */
  async updateCallState(sessionId: string, state: CallState): Promise<void> {
    await this.callSession.updateState(sessionId, state);

    // Emit state change event
    this.eventEmitter.emit(PipelineEvent.TRANSCRIPT_UPDATED, {
      sessionId,
      state,
      timestamp: new Date(),
    });
  }

  /**
   * Get call transcript
   */
  async getCallTranscript(sessionId: string): Promise<{
    sessionId: string;
    transcript: Array<{ speaker: string; text: string; timestamp: Date }>;
    totalTurns: number;
  }> {
    const transcript = await this.callSession.getTranscript(sessionId);
    const session = await this.callSession.getSession(sessionId);

    if (!session) {
      throw new NotFoundException(`Call session not found: ${sessionId}`);
    }

    return {
      sessionId,
      transcript,
      totalTurns: session.conversationTurns,
    };
  }

  /**
   * Handle call connection (from telephony provider)
   */
  async handleCallConnected(sessionId: string, callSid: string): Promise<void> {
    this.logger.log(`Call connected: ${sessionId} (${callSid})`);

    try {
      // Update session with call SID
      const session = await this.callSession.getSession(sessionId);
      if (session) {
        await this.callSession.updateSession(sessionId, { callSid });
      }

      // Update state
      await this.updateCallState(sessionId, CallState.CONNECTED);

      // Start conversation
      await this.conversationOrchestrator.startConversation(sessionId);

      this.logger.log(`Call connected and conversation started: ${sessionId}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling call connection: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Handle call disconnection (from telephony provider)
   */
  async handleCallDisconnected(sessionId: string, reason?: string): Promise<void> {
    this.logger.log(`Call disconnected: ${sessionId}, reason: ${reason || 'unknown'}`);

    try {
      await this.endCall(sessionId, reason);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling call disconnection: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Handle incoming speech (from STT provider)
   */
  async handleCustomerSpeech(sessionId: string, text: string, confidence: number): Promise<void> {
    this.logger.log(`Customer speech received: ${sessionId}, text: "${text.substring(0, 50)}..."`);

    try {
      // Add to transcript
      await this.callSession.addTranscriptTurn(sessionId, 'customer', text);

      // Process through AI agent
      await this.conversationOrchestrator.processCustomerInput(sessionId, text);

      this.logger.log(`Customer speech processed: ${sessionId}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling customer speech: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Handle agent response completion (from TTS provider)
   */
  async handleAgentResponse(sessionId: string, text: string): Promise<void> {
    this.logger.log(`Agent response completed: ${sessionId}`);

    try {
      // Add to transcript
      await this.callSession.addTranscriptTurn(sessionId, 'agent', text);

      this.logger.log(`Agent response recorded: ${sessionId}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error handling agent response: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Get call statistics
   */
  getStatistics(): {
    activeCalls: number;
    totalCallsToday: number;
    averageDuration: number;
  } {
    const stats = this.callSession.getStatistics();

    return {
      activeCalls: stats.active,
      totalCallsToday: stats.total,
      averageDuration: stats.avgDuration,
    };
  }
}
