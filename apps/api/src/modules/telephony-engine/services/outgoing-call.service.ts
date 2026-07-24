/**
 * Outgoing Call Service
 * Handles all outbound call operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallManagerService } from './call-manager.service';
import { CallSessionManagerService } from './call-session-manager.service';
import { CallInitiationParams, CallResult } from '../interfaces/telephony-provider.interface';
import { CallState } from '../enums/call-state.enum';

export interface OutboundCallRequest {
  to: string;
  from?: string;
  callbackUrl: string;
  statusCallbackUrl?: string;
  recordingCallbackUrl?: string;
  timeout?: number;
  record?: boolean;
  machineDetection?: boolean;
  campaignId?: string;
  contactId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class OutgoingCallService {
  private readonly logger = new Logger(OutgoingCallService.name);

  constructor(
    private readonly callManager: CallManagerService,
    private readonly sessionManager: CallSessionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initiate an outbound call
   */
  async initiateCall(request: OutboundCallRequest): Promise<CallResult> {
    this.logger.log(`Initiating outbound call to ${request.to}`);

    try {
      // Prepare call params
      const params: CallInitiationParams = {
        to: request.to,
        from: request.from,
        callbackUrl: request.callbackUrl,
        statusCallbackUrl: request.statusCallbackUrl,
        recordingCallbackUrl: request.recordingCallbackUrl,
        timeout: request.timeout || 60,
        record: request.record !== false,
        machineDetection: request.machineDetection || false,
        metadata: {
          ...request.metadata,
          campaignId: request.campaignId,
          contactId: request.contactId,
          initiatedAt: new Date().toISOString(),
        },
      };

      // Make the call
      const result = await this.callManager.makeCall(params);

      // Emit success event
      this.eventEmitter.emit('telephony.outbound.initiated', {
        callSid: result.callSid,
        to: request.to,
        campaignId: request.campaignId,
        contactId: request.contactId,
        timestamp: new Date(),
      });

      this.logger.log(`Outbound call initiated: ${result.callSid}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to initiate outbound call: ${error.message}`);

      // Emit failure event
      this.eventEmitter.emit('telephony.outbound.failed', {
        to: request.to,
        error: error.message,
        campaignId: request.campaignId,
        contactId: request.contactId,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Retry a failed call
   */
  async retryCall(
    originalCallSid: string,
    request: OutboundCallRequest,
  ): Promise<CallResult> {
    this.logger.log(`Retrying call: ${originalCallSid}`);

    try {
      // Get original session
      const originalSession = await this.sessionManager.getSession(originalCallSid);

      if (originalSession) {
        // Increment retry count
        await this.sessionManager.incrementRetry(originalCallSid);

        // Add retry info to metadata
        request.metadata = {
          ...request.metadata,
          originalCallSid,
          retryCount: originalSession.retryCount + 1,
          previousStatus: originalSession.status,
        };
      }

      // Make new call attempt
      const result = await this.initiateCall(request);

      this.eventEmitter.emit('telephony.outbound.retried', {
        originalCallSid,
        newCallSid: result.callSid,
        retryCount: originalSession?.retryCount || 0,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to retry call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch initiate multiple calls
   */
  async initiateMultipleCalls(
    requests: OutboundCallRequest[],
  ): Promise<Array<{ request: OutboundCallRequest; result?: CallResult; error?: string }>> {
    this.logger.log(`Initiating ${requests.length} outbound calls`);

    const results = await Promise.allSettled(
      requests.map(request => this.initiateCall(request)),
    );

    return requests.map((request, index) => {
      const result = results[index];

      if (result.status === 'fulfilled') {
        return { request, result: result.value };
      } else {
        return { request, error: result.reason?.message || 'Unknown error' };
      }
    });
  }

  /**
   * Schedule a call for future execution
   */
  async scheduleCall(
    request: OutboundCallRequest,
    scheduledTime: Date,
  ): Promise<{ scheduled: boolean; scheduledFor: Date }> {
    this.logger.log(`Scheduling call to ${request.to} for ${scheduledTime}`);

    // This would integrate with a job queue (Bull, Agenda, etc.)
    // For now, emit an event that can be consumed by a scheduler

    this.eventEmitter.emit('telephony.call.scheduled', {
      request,
      scheduledTime,
      timestamp: new Date(),
    });

    return {
      scheduled: true,
      scheduledFor: scheduledTime,
    };
  }

  /**
   * Check if number is callable
   */
  async isCallable(phoneNumber: string): Promise<{ callable: boolean; reason?: string }> {
    // Basic validation
    if (!phoneNumber || phoneNumber.length < 10) {
      return { callable: false, reason: 'Invalid phone number format' };
    }

    // Check if number starts with + (international format)
    if (!phoneNumber.startsWith('+')) {
      return { callable: false, reason: 'Phone number must be in international format (+...)' };
    }

    // Additional checks can be added here
    // - DNC (Do Not Call) list
    // - Blacklist
    // - Country restrictions
    // - Time zone restrictions

    return { callable: true };
  }

  /**
   * Get call attempts for a contact
   */
  async getCallAttempts(contactId: string): Promise<Array<{
    callSid: string;
    status: CallState;
    timestamp: Date;
  }>> {
    const allSessions = Array.from((await this.sessionManager.getActiveSessions()) || []);
    
    return allSessions
      .filter(session => session.metadata?.contactId === contactId)
      .map(session => ({
        callSid: session.callSid,
        status: session.status,
        timestamp: session.startTime,
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Cancel a scheduled or queued call
   */
  async cancelCall(callSid: string, reason?: string): Promise<boolean> {
    this.logger.log(`Cancelling call: ${callSid}`);

    try {
      const session = await this.sessionManager.getSession(callSid);

      if (!session) {
        throw new Error('Call session not found');
      }

      // If call is active, hang it up
      if (
        session.status !== CallState.COMPLETED &&
        session.status !== CallState.FAILED &&
        session.status !== CallState.CANCELLED
      ) {
        await this.callManager.hangupCall(callSid);
      }

      // Update session
      await this.sessionManager.updateSession(callSid, {
        status: CallState.CANCELLED,
        errorMessage: reason || 'Call cancelled by user',
      });

      this.eventEmitter.emit('telephony.call.cancelled', {
        callSid,
        reason,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel call: ${error.message}`);
      return false;
    }
  }

  /**
   * Get outbound call statistics
   */
  async getStatistics(timeRange?: { start: Date; end: Date }): Promise<{
    total: number;
    successful: number;
    failed: number;
    busy: number;
    noAnswer: number;
    averageDuration: number;
  }> {
    const stats = await this.sessionManager.getStatistics();

    return {
      total: stats.total,
      successful: stats.byStatus[CallState.COMPLETED] || 0,
      failed: stats.byStatus[CallState.FAILED] || 0,
      busy: stats.byStatus[CallState.BUSY] || 0,
      noAnswer: stats.byStatus[CallState.NO_ANSWER] || 0,
      averageDuration: 0, // Calculate from completed calls
    };
  }
}
