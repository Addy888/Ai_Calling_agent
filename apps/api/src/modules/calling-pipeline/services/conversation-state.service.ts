import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationState } from '../enums/call-state.enum';

/**
 * Conversation State Service
 * Manages conversation state machine for each call
 */
@Injectable()
export class ConversationStateService {
  private readonly logger = new Logger(ConversationStateService.name);
  private conversationStates: Map<string, ConversationStateData> = new Map();

  // Valid state transitions
  private readonly validTransitions: Map<ConversationState, ConversationState[]> = new Map([
    [ConversationState.INITIALIZING, [ConversationState.GREETING]],
    [ConversationState.GREETING, [ConversationState.LISTENING, ConversationState.ENDED]],
    [ConversationState.ACTIVE, [ConversationState.LISTENING, ConversationState.THINKING, ConversationState.ENDED]],
    [ConversationState.LISTENING, [ConversationState.THINKING, ConversationState.WAITING_FOR_INPUT, ConversationState.HANDLING_SILENCE, ConversationState.HANDLING_INTERRUPTION, ConversationState.CLOSING]],
    [ConversationState.THINKING, [ConversationState.RESPONDING, ConversationState.CONTEXT_SWITCHING, ConversationState.ENDED]],
    [ConversationState.RESPONDING, [ConversationState.LISTENING, ConversationState.WAITING_FOR_INPUT, ConversationState.HANDLING_INTERRUPTION, ConversationState.CLOSING]],
    [ConversationState.WAITING_FOR_INPUT, [ConversationState.THINKING, ConversationState.HANDLING_SILENCE, ConversationState.CLOSING]],
    [ConversationState.HANDLING_INTERRUPTION, [ConversationState.LISTENING, ConversationState.THINKING]],
    [ConversationState.HANDLING_SILENCE, [ConversationState.LISTENING, ConversationState.THINKING, ConversationState.CLOSING]],
    [ConversationState.CONTEXT_SWITCHING, [ConversationState.THINKING, ConversationState.RESPONDING]],
    [ConversationState.CLOSING, [ConversationState.ENDED]],
    [ConversationState.ENDED, []],
  ]);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize conversation state
   */
  initializeState(sessionId: string): void {
    this.logger.log(`Initializing conversation state for session: ${sessionId}`);

    this.conversationStates.set(sessionId, {
      sessionId,
      currentState: ConversationState.INITIALIZING,
      previousState: null,
      stateHistory: [
        {
          state: ConversationState.INITIALIZING,
          timestamp: new Date(),
        },
      ],
      turnCount: 0,
      lastCustomerInput: null,
      lastAgentResponse: null,
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Transition to new state
   */
  async transitionState(
    sessionId: string,
    newState: ConversationState,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      this.logger.warn(`State data not found for session: ${sessionId}, initializing...`);
      this.initializeState(sessionId);
      return this.transitionState(sessionId, newState, metadata);
    }

    const currentState = stateData.currentState;

    // Validate transition
    if (!this.isValidTransition(currentState, newState)) {
      this.logger.warn(
        `Invalid conversation state transition: ${currentState} -> ${newState} for session: ${sessionId}`
      );
      throw new Error(
        `Invalid conversation state transition from ${currentState} to ${newState}`
      );
    }

    this.logger.log(
      `Conversation state transition: ${sessionId} - ${currentState} -> ${newState}`
    );

    // Update state
    stateData.previousState = currentState;
    stateData.currentState = newState;
    stateData.updatedAt = new Date();

    // Add to history
    stateData.stateHistory.push({
      state: newState,
      timestamp: new Date(),
      metadata,
    });

    // Update turn count if completing a turn
    if (newState === ConversationState.LISTENING && currentState === ConversationState.RESPONDING) {
      stateData.turnCount++;
    }

    // Emit state change event
    this.eventEmitter.emit('conversation.state.changed', {
      sessionId,
      previousState: currentState,
      currentState: newState,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Get current state
   */
  getCurrentState(sessionId: string): ConversationState {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      return ConversationState.INITIALIZING;
    }

    return stateData.currentState;
  }

  /**
   * Get state data
   */
  getStateData(sessionId: string): ConversationStateData | null {
    return this.conversationStates.get(sessionId) || null;
  }

  /**
   * Update context
   */
  updateContext(sessionId: string, key: string, value: any): void {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      this.logger.warn(`Cannot update context: session not found: ${sessionId}`);
      return;
    }

    stateData.context[key] = value;
    stateData.updatedAt = new Date();

    this.logger.debug(`Context updated for session ${sessionId}: ${key}`);
  }

  /**
   * Get context value
   */
  getContext(sessionId: string, key: string): any {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      return null;
    }

    return stateData.context[key];
  }

  /**
   * Get all context
   */
  getAllContext(sessionId: string): Record<string, any> {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      return {};
    }

    return { ...stateData.context };
  }

  /**
   * Record customer input
   */
  recordCustomerInput(sessionId: string, text: string): void {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      return;
    }

    stateData.lastCustomerInput = {
      text,
      timestamp: new Date(),
    };

    stateData.updatedAt = new Date();
  }

  /**
   * Record agent response
   */
  recordAgentResponse(sessionId: string, text: string): void {
    const stateData = this.conversationStates.get(sessionId);

    if (!stateData) {
      return;
    }

    stateData.lastAgentResponse = {
      text,
      timestamp: new Date(),
    };

    stateData.updatedAt = new Date();
  }

  /**
   * Get turn count
   */
  getTurnCount(sessionId: string): number {
    const stateData = this.conversationStates.get(sessionId);
    return stateData ? stateData.turnCount : 0;
  }

  /**
   * Check if conversation is active
   */
  isActive(sessionId: string): boolean {
    const state = this.getCurrentState(sessionId);
    return state !== ConversationState.ENDED;
  }

  /**
   * Cleanup state data
   */
  cleanup(sessionId: string): void {
    this.logger.log(`Cleaning up conversation state for session: ${sessionId}`);
    this.conversationStates.delete(sessionId);
  }

  // Private methods

  /**
   * Validate state transition
   */
  private isValidTransition(from: ConversationState, to: ConversationState): boolean {
    const allowedTransitions = this.validTransitions.get(from);

    if (!allowedTransitions) {
      return false;
    }

    return allowedTransitions.includes(to);
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): ConversationStateData[] {
    const allStates = Array.from(this.conversationStates.values());
    return allStates.filter(state => state.currentState !== ConversationState.ENDED);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    byState: Record<ConversationState, number>;
    averageTurns: number;
  } {
    const allStates = Array.from(this.conversationStates.values());

    const byState = {} as Record<ConversationState, number>;
    Object.values(ConversationState).forEach(state => {
      byState[state] = 0;
    });

    let totalTurns = 0;

    allStates.forEach(state => {
      byState[state.currentState]++;
      totalTurns += state.turnCount;
    });

    return {
      total: allStates.length,
      active: allStates.filter(s => s.currentState !== ConversationState.ENDED).length,
      byState,
      averageTurns: allStates.length > 0 ? totalTurns / allStates.length : 0,
    };
  }
}

/**
 * Conversation State Data
 */
interface ConversationStateData {
  sessionId: string;
  currentState: ConversationState;
  previousState: ConversationState | null;
  stateHistory: StateHistoryEntry[];
  turnCount: number;
  lastCustomerInput: {
    text: string;
    timestamp: Date;
  } | null;
  lastAgentResponse: {
    text: string;
    timestamp: Date;
  } | null;
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * State History Entry
 */
interface StateHistoryEntry {
  state: ConversationState;
  timestamp: Date;
  metadata?: Record<string, any>;
}
