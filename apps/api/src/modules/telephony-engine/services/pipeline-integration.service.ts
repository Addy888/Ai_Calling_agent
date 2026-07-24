/**
 * Pipeline Integration Service
 * Connects the new Telephony Engine with the existing AI Calling Pipeline
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TelephonyManagerService } from './telephony-manager.service';
import { CallState } from '../enums/call-state.enum';

/**
 * Pipeline Call Request
 * Interface expected by the AI Calling Pipeline
 */
export interface PipelineCallRequest {
  contactId: string;
  campaignId: string;
  phoneNumber: string;
  fromNumber: string;
  callbackUrl: string;
  statusCallbackUrl?: string;
  recordingCallbackUrl?: string;
  metadata?: Record<string, any>;
  timeout?: number;
  machineDetection?: boolean;
}

/**
 * Pipeline Call Result
 * Interface returned to the AI Calling Pipeline
 */
export interface PipelineCallResult {
  callSid: string;
  status: string;
  contactId: string;
  campaignId: string;
  phoneNumber: string;
  timestamp: Date;
}

@Injectable()
export class PipelineIntegrationService {
  private readonly logger = new Logger(PipelineIntegrationService.name);

  // Map internal call SIDs to pipeline metadata
  private callMetadataMap: Map<
    string,
    {
      contactId: string;
      campaignId: string;
      executionId?: string;
      sessionId?: string;
    }
  > = new Map();

  constructor(
    private readonly telephonyManager: TelephonyManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Pipeline Integration Service initialized');
  }

  /**
   * Initiate a call from the pipeline
   * This is the main entry point for the AI Calling Pipeline
   */
  async initiateCallFromPipeline(
    request: PipelineCallRequest,
  ): Promise<PipelineCallResult> {
    this.logger.log(`Initiating call from pipeline for contact: ${request.contactId}`);

    try {
      // Make the call through Telephony Engine
      const callResult = await this.telephonyManager.makeCall({
        to: request.phoneNumber,
        from: request.fromNumber,
        callbackUrl: request.callbackUrl,
        statusCallbackUrl: request.statusCallbackUrl,
        recordingCallbackUrl: request.recordingCallbackUrl,
        timeout: request.timeout,
        record: true, // Always record for AI Calling
        machineDetection: request.machineDetection !== false,
        metadata: {
          contactId: request.contactId,
          campaignId: request.campaignId,
          ...request.metadata,
        },
      });

      // Store metadata mapping
      this.callMetadataMap.set(callResult.callSid, {
        contactId: request.contactId,
        campaignId: request.campaignId,
        executionId: request.metadata?.executionId,
        sessionId: request.metadata?.sessionId,
      });

      // Emit pipeline event
      this.eventEmitter.emit('pipeline.call.initiated', {
        callSid: callResult.callSid,
        contactId: request.contactId,
        campaignId: request.campaignId,
        phoneNumber: request.phoneNumber,
        status: callResult.status,
        timestamp: new Date(),
      });

      this.logger.log(
        `Call initiated from pipeline: ${callResult.callSid} for contact: ${request.contactId}`,
      );

      // Return result in pipeline format
      return {
        callSid: callResult.callSid,
        status: this.mapCallStateToString(callResult.status),
        contactId: request.contactId,
        campaignId: request.campaignId,
        phoneNumber: request.phoneNumber,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to initiate call from pipeline: ${error.message}`);
      
      // Emit failure event
      this.eventEmitter.emit('pipeline.call.failed', {
        contactId: request.contactId,
        campaignId: request.campaignId,
        phoneNumber: request.phoneNumber,
        error: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * End a call from the pipeline
   */
  async endCallFromPipeline(callSid: string): Promise<boolean> {
    this.logger.log(`Ending call from pipeline: ${callSid}`);

    try {
      const success = await this.telephonyManager.hangupCall(callSid);

      if (success) {
        const metadata = this.callMetadataMap.get(callSid);
        
        if (metadata) {
          this.eventEmitter.emit('pipeline.call.ended', {
            callSid,
            contactId: metadata.contactId,
            campaignId: metadata.campaignId,
            timestamp: new Date(),
          });
        }
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to end call from pipeline: ${error.message}`);
      return false;
    }
  }

  /**
   * Get call status for the pipeline
   */
  async getCallStatusForPipeline(callSid: string): Promise<{
    callSid: string;
    status: string;
    duration?: number;
    contactId?: string;
    campaignId?: string;
  }> {
    try {
      const callResult = await this.telephonyManager.getCallStatus(callSid);
      const metadata = this.callMetadataMap.get(callSid);

      return {
        callSid,
        status: this.mapCallStateToString(callResult.status),
        duration: callResult.duration,
        contactId: metadata?.contactId,
        campaignId: metadata?.campaignId,
      };
    } catch (error) {
      this.logger.error(`Failed to get call status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recording for the pipeline
   */
  async getRecordingForPipeline(recordingSid: string): Promise<{
    recordingSid: string;
    callSid: string;
    url: string;
    duration: number;
    buffer?: Buffer;
  }> {
    try {
      const recording = await this.telephonyManager.getRecording(recordingSid);

      return {
        recordingSid: recording.recordingSid,
        callSid: recording.callSid,
        url: recording.filePath,
        duration: recording.duration,
      };
    } catch (error) {
      this.logger.error(`Failed to get recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download recording buffer for the pipeline
   */
  async downloadRecordingForPipeline(recordingSid: string): Promise<Buffer> {
    try {
      return await this.telephonyManager.getRecordingBuffer(recordingSid);
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get call metadata (contactId, campaignId, etc.)
   */
  getCallMetadata(callSid: string): {
    contactId: string;
    campaignId: string;
    executionId?: string;
    sessionId?: string;
  } | null {
    return this.callMetadataMap.get(callSid) || null;
  }

  /**
   * EVENT HANDLERS
   * Listen to Telephony Engine events and forward to Pipeline
   */

  /**
   * Handle call status updates from Telephony Engine
   */
  @OnEvent('telephony.call.initiated')
  handleCallInitiated(payload: any) {
    this.logger.debug(`Telephony call initiated: ${payload.callSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.call.dialing', {
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        timestamp: payload.timestamp,
      });
    }
  }

  @OnEvent('telephony.call.ringing')
  handleCallRinging(payload: any) {
    this.logger.debug(`Telephony call ringing: ${payload.callSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.call.ringing', {
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        timestamp: payload.timestamp,
      });
    }
  }

  @OnEvent('telephony.call.answered')
  handleCallAnswered(payload: any) {
    this.logger.debug(`Telephony call answered: ${payload.callSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.call.answered', {
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        answeredBy: payload.answeredBy,
        timestamp: payload.timestamp,
      });
    }
  }

  @OnEvent('telephony.call.completed')
  handleCallCompleted(payload: any) {
    this.logger.debug(`Telephony call completed: ${payload.callSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.call.completed', {
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        duration: payload.duration,
        timestamp: payload.timestamp,
      });

      // Cleanup metadata after completion
      setTimeout(() => {
        this.callMetadataMap.delete(payload.callSid);
      }, 300000); // Keep for 5 minutes after completion
    }
  }

  @OnEvent('telephony.call.failed')
  handleCallFailed(payload: any) {
    this.logger.debug(`Telephony call failed: ${payload.callSid || 'unknown'}`);
    
    if (payload.callSid) {
      const metadata = this.callMetadataMap.get(payload.callSid);
      
      if (metadata) {
        this.eventEmitter.emit('pipeline.call.failed', {
          callSid: payload.callSid,
          contactId: metadata.contactId,
          campaignId: metadata.campaignId,
          error: payload.error,
          timestamp: payload.timestamp,
        });

        // Cleanup metadata after failure
        this.callMetadataMap.delete(payload.callSid);
      }
    }
  }

  @OnEvent('telephony.call.busy')
  handleCallBusy(payload: any) {
    this.logger.debug(`Telephony call busy: ${payload.callSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.call.busy', {
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        timestamp: payload.timestamp,
      });
    }
  }

  @OnEvent('telephony.call.no_answer')
  handleCallNoAnswer(payload: any) {
    this.logger.debug(`Telephony call no answer: ${payload.callSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.call.no_answer', {
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        timestamp: payload.timestamp,
      });
    }
  }

  @OnEvent('telephony.recording.ready')
  handleRecordingReady(payload: any) {
    this.logger.debug(`Recording ready: ${payload.recordingSid}`);
    
    const metadata = this.callMetadataMap.get(payload.callSid);
    
    if (metadata) {
      this.eventEmitter.emit('pipeline.recording.ready', {
        recordingSid: payload.recordingSid,
        callSid: payload.callSid,
        contactId: metadata.contactId,
        campaignId: metadata.campaignId,
        url: payload.url,
        duration: payload.duration,
        timestamp: payload.timestamp,
      });
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Map CallState enum to string for pipeline compatibility
   */
  private mapCallStateToString(state: CallState): string {
    const stateMap: Record<CallState, string> = {
      [CallState.QUEUED]: 'QUEUED',
      [CallState.DIALING]: 'CALLING',
      [CallState.RINGING]: 'RINGING',
      [CallState.ANSWERED]: 'IN_PROGRESS',
      [CallState.TALKING]: 'IN_PROGRESS',
      [CallState.BUSY]: 'BUSY',
      [CallState.NO_ANSWER]: 'NO_ANSWER',
      [CallState.FAILED]: 'FAILED',
      [CallState.COMPLETED]: 'COMPLETED',
      [CallState.CANCELLED]: 'CANCELLED',
      [CallState.RETRY]: 'RETRY',
    };

    return stateMap[state] || 'UNKNOWN';
  }

  /**
   * Get statistics for the pipeline
   */
  async getPipelineStatistics() {
    const stats = await this.telephonyManager.getStatistics();
    
    return {
      activeCalls: stats.sessions.active,
      totalCalls: stats.sessions.total,
      completedCalls: stats.sessions.completed,
      failedCalls: stats.sessions.failed,
      recordings: stats.recordings.total,
      provider: stats.provider.name,
      healthy: await this.telephonyManager.healthCheck(),
    };
  }

  /**
   * Cleanup old metadata
   */
  cleanupOldMetadata(olderThanMinutes: number = 60) {
    // Note: In production, metadata should include timestamp for proper cleanup
    // For now, this is a placeholder for manual cleanup
    this.logger.log(`Cleanup triggered for metadata older than ${olderThanMinutes} minutes`);
  }
}
