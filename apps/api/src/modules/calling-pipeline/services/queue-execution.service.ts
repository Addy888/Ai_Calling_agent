import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallOrchestratorService } from '../../call-orchestrator/call-orchestrator.service';
import { CallState } from '../enums/call-state.enum';

/**
 * Queue Execution Service
 * Manages call queue and execution
 */
@Injectable()
export class QueueExecutionService {
  private readonly logger = new Logger(QueueExecutionService.name);

  private callQueue: Map<string, QueuedCall> = new Map();
  private campaignQueues: Map<string, Set<string>> = new Map();
  private processing: Set<string> = new Set();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => CallOrchestratorService))
    private readonly callOrchestrator: CallOrchestratorService,
  ) {
    this.logger.log('Queue Execution Service initialized');
    this.startQueueProcessor();
  }

  /**
   * Queue a call for execution
   */
  async queueCall(params: {
    contactId: string;
    campaignId: string;
    agentId: string;
    phoneNumber: string;
    context?: Record<string, any>;
    priority?: number;
    scheduledTime?: Date;
  }): Promise<QueuedCall> {
    this.logger.log(`🟢 [QUEUE] ===============================================`);
    this.logger.log(`🟢 [QUEUE] Queuing call for contact: ${params.contactId}`);
    this.logger.log(`🟢 [QUEUE] Phone: ${params.phoneNumber}`);
    this.logger.log(`🟢 [QUEUE] Campaign: ${params.campaignId}`);

    const callId = this.generateCallId();
    const sessionId = this.generateSessionId();

    const queuedCall: QueuedCall = {
      callId,
      sessionId,
      contactId: params.contactId,
      campaignId: params.campaignId,
      agentId: params.agentId,
      phoneNumber: params.phoneNumber,
      context: params.context,
      priority: params.priority || 0,
      scheduledTime: params.scheduledTime,
      queuedAt: new Date(),
      status: 'queued',
      retryCount: 0,
      maxRetries: 3,
    };

    // Add to queue
    this.callQueue.set(callId, queuedCall);

    // Add to campaign queue
    let campaignQueue = this.campaignQueues.get(params.campaignId);
    if (!campaignQueue) {
      campaignQueue = new Set();
      this.campaignQueues.set(params.campaignId, campaignQueue);
    }
    campaignQueue.add(callId);

    this.logger.log(`🟢 [QUEUE] ✅ Call queued: ${callId}`);
    this.logger.log(`🟢 [QUEUE] Session ID: ${sessionId}`);
    this.logger.log(`🟢 [QUEUE] Queue size: ${this.callQueue.size}`);
    this.logger.log(`🟢 [QUEUE] Campaign queue size: ${campaignQueue.size}`);
    this.logger.log(`🟢 [QUEUE] ===============================================`);

    return queuedCall;
  }

  /**
   * Dequeue next call
   */
  private dequeueNext(): QueuedCall | null {
    const availableCalls = Array.from(this.callQueue.values())
      .filter(call => {
        // Must be in queued status
        if (call.status !== 'queued') {
          return false;
        }

        // Check if scheduled time has passed
        if (call.scheduledTime && call.scheduledTime > new Date()) {
          return false;
        }

        // Not already processing
        if (this.processing.has(call.callId)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by priority (higher first), then by queued time (earlier first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.queuedAt.getTime() - b.queuedAt.getTime();
      });

    return availableCalls[0] || null;
  }

  /**
   * Process queued calls
   */
  private async processQueue(): Promise<void> {
    const call = this.dequeueNext();

    if (!call) {
      return;
    }

    this.logger.log(`🟡 [QUEUE PROCESSOR] ==========================================`);
    this.logger.log(`🟡 [QUEUE PROCESSOR] Processing queued call: ${call.callId}`);
    this.logger.log(`🟡 [QUEUE PROCESSOR] Contact: ${call.contactId}`);
    this.logger.log(`🟡 [QUEUE PROCESSOR] Phone: ${call.phoneNumber}`);

    // Mark as processing
    this.processing.add(call.callId);
    call.status = 'processing';

    try {
      this.logger.log(`🟡 [QUEUE PROCESSOR] Calling CallOrchestrator.initiateCall()...`);
      
      // Initialize call through orchestrator
      const result = await this.callOrchestrator.initiateCall({
        campaignId: call.campaignId,
        contactId: call.contactId,
        companyId: call.context?.companyId,
        scriptContent: call.context?.scriptContent,
        voiceId: call.context?.voiceId,
        metadata: call.context,
      });
      
      this.logger.log(`🟡 [QUEUE PROCESSOR] ✅ Call initiated successfully!`);
      this.logger.log(`🟡 [QUEUE PROCESSOR] Call ID: ${result.callId}`);
      
      this.eventEmitter.emit('call.queued.processing', {
        callId: call.callId,
        sessionId: call.sessionId,
        contactId: call.contactId,
        campaignId: call.campaignId,
        realCallId: result.callId,
        timestamp: new Date(),
      });

      // Update status
      call.status = 'active';
      call.startedAt = new Date();
      call.id = result.callId; // Store real call ID

      this.logger.log(`🟡 [QUEUE PROCESSOR] Call status: ${call.status}`);
      this.logger.log(`🟡 [QUEUE PROCESSOR] ==========================================`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`🟡 [QUEUE PROCESSOR] ❌ Failed to process queued call: ${errorMessage}`, errorStack);
      
      call.status = 'failed';
      call.error = errorMessage;
      call.retryCount++;

      // Retry if under max retries
      if (call.retryCount < call.maxRetries) {
        call.status = 'queued';
        call.scheduledTime = new Date(Date.now() + 60000 * call.retryCount); // Exponential backoff
        this.logger.log(`🟡 [QUEUE PROCESSOR] 🔄 Call will be retried: ${call.callId} (attempt ${call.retryCount + 1}/${call.maxRetries})`);
      } else {
        this.logger.error(`🟡 [QUEUE PROCESSOR] ❌ Max retries reached for call: ${call.callId}`);
      }
      this.logger.log(`🟡 [QUEUE PROCESSOR] ==========================================`);
    } finally {
      this.processing.delete(call.callId);
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue().catch(error => {
        this.logger.error(`Queue processor error: ${error.message}`);
      });
    }, 1000); // Process every second

    this.logger.log('Queue processor started');
  }

  /**
   * Cancel a queued call
   */
  async cancelCall(callId: string, reason?: string): Promise<void> {
    const call = this.callQueue.get(callId);

    if (!call) {
      this.logger.warn(`Cannot cancel: call not found: ${callId}`);
      return;
    }

    if (call.status === 'active') {
      throw new Error('Cannot cancel active call, use endCall instead');
    }

    call.status = 'cancelled';
    call.cancelledAt = new Date();
    call.cancelReason = reason;

    // Remove from campaign queue
    const campaignQueue = this.campaignQueues.get(call.campaignId);
    if (campaignQueue) {
      campaignQueue.delete(callId);
    }

    this.logger.log(`Call cancelled: ${callId}`);
  }

  /**
   * Cancel all calls for a campaign
   */
  async cancelAllCallsForCampaign(campaignId: string): Promise<number> {
    this.logger.log(`Cancelling all calls for campaign: ${campaignId}`);

    const campaignQueue = this.campaignQueues.get(campaignId);

    if (!campaignQueue) {
      return 0;
    }

    let cancelledCount = 0;

    for (const callId of campaignQueue) {
      const call = this.callQueue.get(callId);
      
      if (call && (call.status === 'queued' || call.status === 'processing')) {
        await this.cancelCall(callId, 'Campaign stopped');
        cancelledCount++;
      }
    }

    this.logger.log(`Cancelled ${cancelledCount} calls for campaign: ${campaignId}`);

    return cancelledCount;
  }

  /**
   * Stop queueing for campaign
   */
  async stopQueueingForCampaign(campaignId: string): Promise<void> {
    this.logger.log(`Stopping queueing for campaign: ${campaignId}`);

    const campaignQueue = this.campaignQueues.get(campaignId);

    if (!campaignQueue) {
      return;
    }

    for (const callId of campaignQueue) {
      const call = this.callQueue.get(callId);
      
      if (call && call.status === 'queued') {
        await this.cancelCall(callId, 'Campaign stopped');
      }
    }
  }

  /**
   * Get queued calls count
   */
  async getQueuedCallsCount(): Promise<number> {
    return Array.from(this.callQueue.values())
      .filter(call => call.status === 'queued')
      .length;
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    total: number;
    queued: number;
    processing: number;
    active: number;
    failed: number;
    cancelled: number;
  }> {
    const calls = Array.from(this.callQueue.values());

    return {
      total: calls.length,
      queued: calls.filter(c => c.status === 'queued').length,
      processing: calls.filter(c => c.status === 'processing').length,
      active: calls.filter(c => c.status === 'active').length,
      failed: calls.filter(c => c.status === 'failed').length,
      cancelled: calls.filter(c => c.status === 'cancelled').length,
    };
  }

  /**
   * Get campaign queue status
   */
  async getCampaignQueueStatus(campaignId: string): Promise<{
    total: number;
    queued: number;
    active: number;
  }> {
    const campaignQueue = this.campaignQueues.get(campaignId);

    if (!campaignQueue) {
      return { total: 0, queued: 0, active: 0 };
    }

    const calls = Array.from(campaignQueue)
      .map(callId => this.callQueue.get(callId))
      .filter(call => call !== undefined);

    return {
      total: calls.length,
      queued: calls.filter(c => c.status === 'queued').length,
      active: calls.filter(c => c.status === 'active').length,
    };
  }

  /**
   * Clean up completed calls
   */
  cleanupCompletedCalls(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - olderThanMinutes * 60 * 1000;
    
    const toDelete: string[] = [];

    this.callQueue.forEach((call, callId) => {
      const completedAt = call.completedAt || call.cancelledAt;
      
      if (completedAt && completedAt.getTime() < cutoffTime) {
        toDelete.push(callId);
      }
    });

    toDelete.forEach(callId => {
      const call = this.callQueue.get(callId);
      
      if (call) {
        // Remove from campaign queue
        const campaignQueue = this.campaignQueues.get(call.campaignId);
        if (campaignQueue) {
          campaignQueue.delete(callId);
        }
        
        // Remove from call queue
        this.callQueue.delete(callId);
      }
    });

    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} completed calls`);
    }
  }

  // Private helper methods

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Queued Call Interface
 */
export interface QueuedCall {
  callId: string;
  sessionId: string;
  contactId: string;
  campaignId: string;
  agentId: string;
  phoneNumber: string;
  context?: Record<string, any>;
  priority: number;
  scheduledTime?: Date;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  status: 'queued' | 'processing' | 'active' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  error?: string;
  cancelReason?: string;
  id?: string; // For compatibility with other interfaces
}
