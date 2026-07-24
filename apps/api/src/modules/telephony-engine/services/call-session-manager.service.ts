/**
 * Call Session Manager Service
 * Manages call sessions, tracking, and state
 */

import { Injectable, Logger } from '@nestjs/common';
import { CallState, CallDirection } from '../enums/call-state.enum';

export interface CallSession {
  callSid: string;
  providerType: string;
  status: CallState;
  direction: CallDirection;
  to: string;
  from: string;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  recordingSid?: string;
  metadata: Record<string, any>;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class CallSessionManagerService {
  private readonly logger = new Logger(CallSessionManagerService.name);
  private sessions: Map<string, CallSession> = new Map();

  /**
   * Create a new call session
   */
  async createSession(params: {
    callSid: string;
    providerType: string;
    status: CallState;
    direction: CallDirection;
    to: string;
    from: string;
    metadata?: Record<string, any>;
  }): Promise<CallSession> {
    this.logger.log(`Creating session for call: ${params.callSid}`);

    const session: CallSession = {
      callSid: params.callSid,
      providerType: params.providerType,
      status: params.status,
      direction: params.direction,
      to: params.to,
      from: params.from,
      startTime: new Date(),
      metadata: params.metadata || {},
      retryCount: 0,
    };

    this.sessions.set(params.callSid, session);

    this.logger.log(`Session created: ${params.callSid}`);

    return session;
  }

  /**
   * Get a call session
   */
  async getSession(callSid: string): Promise<CallSession | undefined> {
    return this.sessions.get(callSid);
  }

  /**
   * Update a call session
   */
  async updateSession(
    callSid: string,
    updates: Partial<CallSession>,
  ): Promise<CallSession | undefined> {
    const session = this.sessions.get(callSid);

    if (!session) {
      this.logger.warn(`Session not found for update: ${callSid}`);
      return undefined;
    }

    Object.assign(session, updates);

    // Calculate duration if call ended
    if (updates.endTime && session.answerTime) {
      session.duration = Math.floor(
        (updates.endTime.getTime() - session.answerTime.getTime()) / 1000,
      );
    }

    this.sessions.set(callSid, session);

    this.logger.log(`Session updated: ${callSid}`);

    return session;
  }

  /**
   * Mark call as answered
   */
  async markAnswered(callSid: string): Promise<void> {
    await this.updateSession(callSid, {
      status: CallState.ANSWERED,
      answerTime: new Date(),
    });
  }

  /**
   * Mark call as completed
   */
  async markCompleted(callSid: string, duration?: number): Promise<void> {
    await this.updateSession(callSid, {
      status: CallState.COMPLETED,
      endTime: new Date(),
      duration,
    });
  }

  /**
   * Mark call as failed
   */
  async markFailed(
    callSid: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.updateSession(callSid, {
      status: CallState.FAILED,
      endTime: new Date(),
      errorCode,
      errorMessage,
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetry(callSid: string): Promise<number> {
    const session = this.sessions.get(callSid);

    if (!session) {
      return 0;
    }

    session.retryCount++;
    this.sessions.set(callSid, session);

    return session.retryCount;
  }

  /**
   * Add recording info to session
   */
  async addRecordingInfo(
    callSid: string,
    recordingSid: string,
    recordingUrl: string,
  ): Promise<void> {
    await this.updateSession(callSid, {
      recordingSid,
      recordingUrl,
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(callSid: string): Promise<boolean> {
    const deleted = this.sessions.delete(callSid);

    if (deleted) {
      this.logger.log(`Session deleted: ${callSid}`);
    }

    return deleted;
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<CallSession[]> {
    return Array.from(this.sessions.values()).filter(
      session =>
        session.status !== CallState.COMPLETED &&
        session.status !== CallState.FAILED &&
        session.status !== CallState.CANCELLED,
    );
  }

  /**
   * Get sessions by status
   */
  async getSessionsByStatus(status: CallState): Promise<CallSession[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.status === status,
    );
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  /**
   * Get active call count
   */
  async getActiveCallCount(): Promise<number> {
    const activeSessions = await this.getActiveSessions();
    return activeSessions.length;
  }

  /**
   * Clear completed sessions older than specified minutes
   */
  async clearOldSessions(olderThanMinutes: number = 60): Promise<number> {
    const cutoffTime = Date.now() - olderThanMinutes * 60 * 1000;
    let cleared = 0;

    for (const [callSid, session] of this.sessions.entries()) {
      const isCompleted =
        session.status === CallState.COMPLETED ||
        session.status === CallState.FAILED ||
        session.status === CallState.CANCELLED;

      const isOld = session.endTime && session.endTime.getTime() < cutoffTime;

      if (isCompleted && isOld) {
        this.sessions.delete(callSid);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.log(`Cleared ${cleared} old sessions`);
    }

    return cleared;
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    byStatus: Record<string, number>;
  }> {
    const sessions = Array.from(this.sessions.values());

    const stats = {
      total: sessions.length,
      active: 0,
      completed: 0,
      failed: 0,
      byStatus: {} as Record<string, number>,
    };

    for (const session of sessions) {
      // Count by status
      stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1;

      // Count specific states
      if (
        session.status !== CallState.COMPLETED &&
        session.status !== CallState.FAILED &&
        session.status !== CallState.CANCELLED
      ) {
        stats.active++;
      }

      if (session.status === CallState.COMPLETED) {
        stats.completed++;
      }

      if (session.status === CallState.FAILED) {
        stats.failed++;
      }
    }

    return stats;
  }
}
