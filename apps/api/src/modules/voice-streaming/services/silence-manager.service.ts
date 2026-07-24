import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SilenceConfig {
  warningTimeoutMs: number; // e.g. 5000ms
  disconnectTimeoutMs: number; // e.g. 5000ms
}

@Injectable()
export class SilenceManager {
  private readonly logger = new Logger(SilenceManager.name);
  private timers = new Map<string, NodeJS.Timeout>();
  private warningTimers = new Map<string, NodeJS.Timeout>();
  private sessionWarnings = new Map<string, boolean>(); // has a warning been sent?
  
  private readonly config: SilenceConfig = {
    warningTimeoutMs: 5000,
    disconnectTimeoutMs: 5000,
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Reset the silence timers because activity was detected (customer speaking or speech recognized)
   */
  resetSilenceTimer(sessionId: string): void {
    this.clearTimers(sessionId);
    this.sessionWarnings.set(sessionId, false);

    // Set warning timer
    const warningTimer = setTimeout(() => {
      this.handleSilenceWarning(sessionId);
    }, this.config.warningTimeoutMs);

    this.warningTimers.set(sessionId, warningTimer);
  }

  /**
   * Handle when the initial silence warning triggers
   */
  private handleSilenceWarning(sessionId: string): void {
    this.logger.warn(`Silence warning timeout triggered for session: ${sessionId}`);
    this.sessionWarnings.set(sessionId, true);
    
    // Emit silence warning event (will synthesize "Hello, are you still there?")
    this.eventEmitter.emit('SilenceDetected', { sessionId, type: 'WARNING' });

    // Set secondary disconnect timer
    const disconnectTimer = setTimeout(() => {
      this.handleSilenceDisconnect(sessionId);
    }, this.config.disconnectTimeoutMs);

    this.timers.set(sessionId, disconnectTimer);
  }

  /**
   * Handle final disconnect after silence persists
   */
  private handleSilenceDisconnect(sessionId: string): void {
    this.logger.error(`Polite disconnect due to inactivity for session: ${sessionId}`);
    this.eventEmitter.emit('SilenceDetected', { sessionId, type: 'DISCONNECT' });
    this.clearTimers(sessionId);
  }

  /**
   * Clear all silence timers for a session
   */
  clearTimers(sessionId: string): void {
    const warningTimer = this.warningTimers.get(sessionId);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.warningTimers.delete(sessionId);
    }

    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  /**
   * Destroy session silence state
   */
  destroySession(sessionId: string): void {
    this.clearTimers(sessionId);
    this.sessionWarnings.delete(sessionId);
  }
}
