/**
 * Webhook Manager Service
 * Handles webhooks from telephony providers
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderManagerService } from './provider-manager.service';
import { CallSessionManagerService } from './call-session-manager.service';
import { RecordingManagerService } from './recording-manager.service';
import { WebhookPayload } from '../interfaces/telephony-provider.interface';
import { CallState } from '../enums/call-state.enum';

@Injectable()
export class WebhookManagerService {
  private readonly logger = new Logger(WebhookManagerService.name);

  constructor(
    private readonly providerManager: ProviderManagerService,
    private readonly sessionManager: CallSessionManagerService,
    private readonly recordingManager: RecordingManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process webhook from provider
   */
  async processWebhook(
    providerType: string,
    signature: string,
    url: string,
    payload: any,
  ): Promise<{ processed: boolean; error?: string }> {
    this.logger.log(`Processing webhook from ${providerType}`);

    try {
      // Get provider
      const provider = this.providerManager.getActiveProvider();

      if (!provider || provider.getType() !== providerType) {
        throw new Error(`Provider ${providerType} not active`);
      }

      // Validate signature
      const isValid = provider.validateWebhookSignature(signature, url, payload);

      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        return { processed: false, error: 'Invalid signature' };
      }

      // Parse webhook
      const webhookData = provider.parseWebhook(payload);

      // Handle webhook by type
      await this.handleWebhookByType(webhookData);

      this.logger.log(`Webhook processed: ${webhookData.type}`);

      return { processed: true };
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`);
      return { processed: false, error: error.message };
    }
  }

  /**
   * Handle webhook by type
   */
  private async handleWebhookByType(webhook: WebhookPayload): Promise<void> {
    switch (webhook.type) {
      case 'call_status':
        await this.handleCallStatusWebhook(webhook);
        break;

      case 'recording_ready':
        await this.handleRecordingReadyWebhook(webhook);
        break;

      case 'dtmf_received':
        await this.handleDTMFWebhook(webhook);
        break;

      case 'error':
        await this.handleErrorWebhook(webhook);
        break;

      default:
        this.logger.warn(`Unknown webhook type: ${webhook.type}`);
    }
  }

  /**
   * Handle call status webhook
   */
  private async handleCallStatusWebhook(webhook: WebhookPayload): Promise<void> {
    this.logger.log(`Call status update: ${webhook.callSid} -> ${webhook.status}`);

    try {
      // Update session
      await this.sessionManager.updateSession(webhook.callSid, {
        status: webhook.status,
        duration: webhook.duration,
      });

      // Emit specific events based on status
      switch (webhook.status) {
        case CallState.RINGING:
          this.eventEmitter.emit('telephony.call.ringing', {
            callSid: webhook.callSid,
            timestamp: webhook.timestamp,
          });
          break;

        case CallState.ANSWERED:
          await this.sessionManager.markAnswered(webhook.callSid);
          this.eventEmitter.emit('telephony.call.answered', {
            callSid: webhook.callSid,
            timestamp: webhook.timestamp,
          });
          break;

        case CallState.COMPLETED:
          await this.sessionManager.markCompleted(webhook.callSid, webhook.duration);
          this.eventEmitter.emit('telephony.call.completed', {
            callSid: webhook.callSid,
            duration: webhook.duration,
            timestamp: webhook.timestamp,
          });
          break;

        case CallState.BUSY:
        case CallState.NO_ANSWER:
        case CallState.FAILED:
          await this.sessionManager.markFailed(
            webhook.callSid,
            webhook.errorCode,
            webhook.errorMessage,
          );
          this.eventEmitter.emit('telephony.call.failed', {
            callSid: webhook.callSid,
            status: webhook.status,
            error: webhook.errorMessage,
            timestamp: webhook.timestamp,
          });
          break;
      }

      // Notify AI Calling Pipeline
      this.eventEmitter.emit('calling-pipeline.call.status', {
        callSid: webhook.callSid,
        status: webhook.status,
        timestamp: webhook.timestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to handle call status webhook: ${error.message}`);
    }
  }

  /**
   * Handle recording ready webhook
   */
  private async handleRecordingReadyWebhook(webhook: WebhookPayload): Promise<void> {
    this.logger.log(`Recording ready: ${webhook.recordingSid}`);

    try {
      if (!webhook.recordingSid) {
        throw new Error('Recording SID missing from webhook');
      }

      // Download and save recording
      await this.recordingManager.handleRecordingReady(
        webhook.callSid,
        webhook.recordingSid,
      );

      // Notify AI Calling Pipeline
      this.eventEmitter.emit('calling-pipeline.recording.ready', {
        callSid: webhook.callSid,
        recordingSid: webhook.recordingSid,
        timestamp: webhook.timestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to handle recording webhook: ${error.message}`);
    }
  }

  /**
   * Handle DTMF webhook
   */
  private async handleDTMFWebhook(webhook: WebhookPayload): Promise<void> {
    this.logger.log(`DTMF received: ${webhook.callSid} -> ${webhook.dtmfDigits}`);

    try {
      this.eventEmitter.emit('telephony.dtmf.received', {
        callSid: webhook.callSid,
        digits: webhook.dtmfDigits,
        timestamp: webhook.timestamp,
      });

      // Notify AI Calling Pipeline
      this.eventEmitter.emit('calling-pipeline.dtmf.received', {
        callSid: webhook.callSid,
        digits: webhook.dtmfDigits,
        timestamp: webhook.timestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to handle DTMF webhook: ${error.message}`);
    }
  }

  /**
   * Handle error webhook
   */
  private async handleErrorWebhook(webhook: WebhookPayload): Promise<void> {
    this.logger.error(
      `Call error: ${webhook.callSid} - ${webhook.errorCode}: ${webhook.errorMessage}`,
    );

    try {
      await this.sessionManager.markFailed(
        webhook.callSid,
        webhook.errorCode,
        webhook.errorMessage,
      );

      this.eventEmitter.emit('telephony.call.error', {
        callSid: webhook.callSid,
        errorCode: webhook.errorCode,
        errorMessage: webhook.errorMessage,
        timestamp: webhook.timestamp,
      });

      // Notify AI Calling Pipeline
      this.eventEmitter.emit('calling-pipeline.call.error', {
        callSid: webhook.callSid,
        errorCode: webhook.errorCode,
        errorMessage: webhook.errorMessage,
        timestamp: webhook.timestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to handle error webhook: ${error.message}`);
    }
  }

  /**
   * Get webhook statistics
   */
  async getStatistics(): Promise<{
    totalProcessed: number;
    byType: Record<string, number>;
    errors: number;
  }> {
    // This would track actual webhook processing stats
    return {
      totalProcessed: 0,
      byType: {},
      errors: 0,
    };
  }

  /**
   * Replay webhook (for debugging/recovery)
   */
  async replayWebhook(webhookId: string): Promise<boolean> {
    this.logger.log(`Replaying webhook: ${webhookId}`);
    
    // This would fetch stored webhook and reprocess
    return true;
  }
}
