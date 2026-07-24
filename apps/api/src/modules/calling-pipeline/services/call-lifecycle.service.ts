import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallState } from '../enums/call-state.enum';

/**
 * Call Lifecycle Service
 * Manages call state machine and transitions
 */
@Injectable()
export class CallLifecycleService {
  private readonly logger = new Logger(CallLifecycleService.name);
  private callStates: Map<string, CallStateData> = new Map();

  // Valid state transitions
  private readonly validTransitions: Map<CallState, CallState[]> = new Map([
    [CallState.IDLE, [CallState.QUEUED]],
    [CallState.QUEUED, [CallState.INITIALIZING, CallState.FAILED]],
    [CallState.INITIALIZING, [CallState.DIALING, CallState.FAILED]],
    [CallState.DIALING, [CallState.RINGING, CallState.FAILED]],
    [CallState.RINGING, [CallState.CONNECTED, CallState.FAILED, CallState.RETRY]],
    [CallState.CONNECTED, [CallState.GREETING, CallState.ENDING, CallState.FAILED]],
    [CallState.GREETING, [CallState.LISTENING, CallState.ENDING, CallState.FAILED]],
    [CallState.LISTENING, [CallState.PROCESSING, CallState.WAITING, CallState.ENDING]],
    [CallState.PROCESSING, [CallState.GENERATING_RESPONSE, CallState.ENDING, CallState.FAILED]],
    [CallState.GENERATING_RESPONSE, [CallState.PLAYING_RESPONSE, CallState.ENDING, CallState.FAILED]],
    [CallState.PLAYING_RESPONSE, [CallState.WAITING, CallState.ENDING]],
    [CallState.WAITING, [CallState.LISTENING, CallState.CONTINUING, CallState.ENDING]],
    [CallState.CONTINUING, [CallState.LISTENING, CallState.ENDING]],
    [CallState.ENDING, [CallState.COMPLETED, CallState.FAILED]],
    [CallState.COMPLETED, []],
    [CallState.FAILED, [CallState.RETRY]],
    [CallState.RETRY, [CallState.QUEUED]],
  ]);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize call state
   */
  initializeState(sessionId: string): void {
    this.logger.log(`Initializing state for session: ${sessionId}`);

    this.callStates.set(sessionId, {
      sessionId,
      currentState: CallState.IDLE,
      previousState: null,
      stateHistory: [
        {
          state: CallState.IDLE,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Transition to new state
   */
  async transitionState(
    sessionId: string,
    newState: CallState,
    reason?: string,
  ): Promise<void> {
    const stateData = this.callStates.get(sessionId);

    if (!stateData) {
      this.logger.warn(`State data not found for session: ${sessionId}, initializing...`);
      this.initializeState(sessionId);
      return this.transitionState(sessionId, newState, reason);
    }

    const currentState = stateData.currentState;

    // Validate transition
    if (!this.isValidTransition(currentState, newState)) {
      this.logger.warn(
        `Invalid state transition: ${currentState} -> ${newState} for session: ${sessionId}`
      );
      throw new Error(
        `Invalid state transition from ${currentState} to ${newState}`
      );
    }

    this.logger.log(
      `State transition: ${sessionId} - ${currentState} -> ${newState}${reason ? ` (${reason})` : ''}`
    );

    // Update state
    stateData.previousState = currentState;
    stateData.currentState = newState;
    stateData.updatedAt = new Date();

    // Add to history
    stateData.stateHistory.push({
      state: newState,
      timestamp: new Date(),
      reason,
    });

    // Emit state change event
    this.eventEmitter.emit('call.state.changed', {
      sessionId,
      previousState: currentState,
      currentState: newState,
      reason,
      timestamp: new Date(),
    });

    // Handle state-specific logic
    await this.handleStateTransition(sessionId, newState);
  }

  /**
   * Get current state
   */
  getCurrentState(sessionId: string): CallState {
    const stateData = this.callStates.get(sessionId);

    if (!stateData) {
      return CallState.IDLE;
    }

    return stateData.currentState;
  }

  /**
   * Get state history
   */
  getStateHistory(sessionId: string): StateHistoryEntry[] {
    const stateData = this.callStates.get(sessionId);

    if (!stateData) {
      return [];
    }

    return stateData.stateHistory;
  }

  /**
   * Check if state is terminal
   */
  isTerminalState(state: CallState): boolean {
    return [CallState.COMPLETED, CallState.FAILED].includes(state);
  }

  /**
   * Check if call is active
   */
  isActive(sessionId: string): boolean {
    const state = this.getCurrentState(sessionId);
    return !this.isTerminalState(state);
  }

  /**
   * Cleanup state data
   */
  cleanup(sessionId: string): void {
    this.logger.log(`Cleaning up state for session: ${sessionId}`);
    this.callStates.delete(sessionId);
  }

  // Private methods

  /**
   * Validate state transition
   */
  private isValidTransition(from: CallState, to: CallState): boolean {
    const allowedTransitions = this.validTransitions.get(from);

    if (!allowedTransitions) {
      return false;
    }

    return allowedTransitions.includes(to);
  }

  /**
   * Handle state-specific logic
   */
  private async handleStateTransition(
    sessionId: string,
    newState: CallState,
  ): Promise<void> {
    switch (newState) {
      case CallState.COMPLETED:
      case CallState.FAILED:
        // Schedule cleanup after some time
        setTimeout(() => {
          this.cleanup(sessionId);
        }, 60000); // 1 minute
        break;

      case CallState.RETRY:
        // Handle retry logic
        this.logger.log(`Call marked for retry: ${sessionId}`);
        break;

      default:
        break;
    }
  }

  /**
   * Get all active call states
   */
  getActiveCalls(): CallStateData[] {
    const allStates = Array.from(this.callStates.values());
    return allStates.filter(state => !this.isTerminalState(state.currentState));
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    byState: Record<CallState, number>;
  } {
    const allStates = Array.from(this.callStates.values());

    const byState = {} as Record<CallState, number>;
    Object.values(CallState).forEach(state => {
      byState[state] = 0;
    });

    allStates.forEach(state => {
      byState[state.currentState]++;
    });

    return {
      total: allStates.length,
      active: allStates.filter(s => !this.isTerminalState(s.currentState)).length,
      byState,
    };
  }
}

/**
 * Call State Data
 */
interface CallStateData {
  sessionId: string;
  currentState: CallState;
  previousState: CallState | null;
  stateHistory: StateHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * State History Entry
 */
interface StateHistoryEntry {
  state: CallState;
  timestamp: Date;
  reason?: string;
}
