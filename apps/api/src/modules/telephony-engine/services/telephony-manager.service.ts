/**
 * Telephony Manager Service
 * Main facade service that coordinates all telephony operations
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ProviderManagerService } from './provider-manager.service';
import { CallManagerService } from './call-manager.service';
import { OutgoingCallService, OutboundCallRequest } from './outgoing-call.service';
import { IncomingCallService } from './incoming-call.service';
import { RecordingManagerService } from './recording-manager.service';
import { WebhookManagerService } from './webhook-manager.service';
import { CallSessionManagerService } from './call-session-manager.service';

@Injectable()
export class TelephonyManagerService implements OnModuleInit {
  private readonly logger = new Logger(TelephonyManagerService.name);

  constructor(
    private readonly providerManager: ProviderManagerService,
    private readonly callManager: CallManagerService,
    private readonly outgoingCallService: OutgoingCallService,
    private readonly incomingCallService: IncomingCallService,
    private readonly recordingManager: RecordingManagerService,
    private readonly webhookManager: WebhookManagerService,
    private readonly sessionManager: CallSessionManagerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Telephony Manager initialized');
    await this.logSystemStatus();
  }

  /**
   * ===================================
   * OUTGOING CALLS
   * ===================================
   */

  /**
   * Make an outbound call
   */
  async makeCall(request: OutboundCallRequest) {
    return this.outgoingCallService.initiateCall(request);
  }

  /**
   * Retry a failed call
   */
  async retryCall(originalCallSid: string, request: OutboundCallRequest) {
    return this.outgoingCallService.retryCall(originalCallSid, request);
  }

  /**
   * Cancel a call
   */
  async cancelCall(callSid: string, reason?: string) {
    return this.outgoingCallService.cancelCall(callSid, reason);
  }

  /**
   * ===================================
   * INCOMING CALLS
   * ===================================
   */

  /**
   * Handle incoming call
   */
  async handleIncomingCall(info: any) {
    return this.incomingCallService.handleIncomingCall(info);
  }

  /**
   * Forward call
   */
  async forwardCall(callSid: string, forwardTo: string) {
    return this.incomingCallService.forwardCall(callSid, forwardTo);
  }

  /**
   * Send to voicemail
   */
  async sendToVoicemail(callSid: string) {
    return this.incomingCallService.sendToVoicemail(callSid);
  }

  /**
   * ===================================
   * CALL CONTROL
   * ===================================
   */

  /**
   * Hang up a call
   */
  async hangupCall(callSid: string) {
    return this.callManager.hangupCall(callSid);
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string) {
    return this.callManager.getCallStatus(callSid);
  }

  /**
   * Transfer call
   */
  async transferCall(callSid: string, to: string) {
    return this.callManager.transferCall(callSid, to);
  }

  /**
   * Send DTMF tones
   */
  async sendDTMF(callSid: string, digits: string) {
    return this.callManager.sendDTMF(callSid, digits);
  }

  /**
   * Generate call control response
   */
  generateCallControl(instructions: any) {
    return this.callManager.generateCallControl(instructions);
  }

  /**
   * ===================================
   * RECORDINGS
   * ===================================
   */

  /**
   * Get recording
   */
  async getRecording(recordingSid: string) {
    return this.recordingManager.getRecording(recordingSid);
  }

  /**
   * Get recording buffer
   */
  async getRecordingBuffer(recordingSid: string) {
    return this.recordingManager.getRecordingBuffer(recordingSid);
  }

  /**
   * Get recordings for call
   */
  async getRecordingsForCall(callSid: string) {
    return this.recordingManager.getRecordingsForCall(callSid);
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingSid: string) {
    return this.recordingManager.deleteRecording(recordingSid);
  }

  /**
   * ===================================
   * WEBHOOKS
   * ===================================
   */

  /**
   * Process webhook
   */
  async processWebhook(
    providerType: string,
    signature: string,
    url: string,
    payload: any,
  ) {
    return this.webhookManager.processWebhook(providerType, signature, url, payload);
  }

  /**
   * ===================================
   * SESSIONS
   * ===================================
   */

  /**
   * Get call session
   */
  async getCallSession(callSid: string) {
    return this.sessionManager.getSession(callSid);
  }

  /**
   * Get active calls
   */
  async getActiveCalls() {
    return this.sessionManager.getActiveSessions();
  }

  /**
   * Get active call count
   */
  async getActiveCallCount() {
    return this.sessionManager.getActiveCallCount();
  }

  /**
   * ===================================
   * PROVIDER MANAGEMENT
   * ===================================
   */

  /**
   * Get active provider info
   */
  getActiveProvider() {
    return this.callManager.getProviderInfo();
  }

  /**
   * Get all providers
   */
  getAllProviders() {
    return this.providerManager.getAllProviders();
  }

  /**
   * Switch provider
   */
  async switchProvider(providerType: string) {
    return this.providerManager.switchProvider(providerType);
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(providerType?: string) {
    return this.providerManager.getProviderCapabilities(providerType);
  }

  /**
   * ===================================
   * STATISTICS & MONITORING
   * ===================================
   */

  /**
   * Get system statistics
   */
  async getStatistics() {
    const [
      sessionStats,
      recordingStats,
      outboundStats,
      inboundStats,
    ] = await Promise.all([
      this.sessionManager.getStatistics(),
      this.recordingManager.getStatistics(),
      this.outgoingCallService.getStatistics(),
      this.incomingCallService.getStatistics(),
    ]);

    return {
      sessions: sessionStats,
      recordings: recordingStats,
      outbound: outboundStats,
      inbound: inboundStats,
      provider: this.getActiveProvider(),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const providerHealthy = await this.callManager.healthCheck();
    const activeCallCount = await this.getActiveCallCount();

    return {
      healthy: providerHealthy,
      provider: this.getActiveProvider(),
      activeCalls: activeCallCount,
      timestamp: new Date(),
    };
  }

  /**
   * ===================================
   * UTILITY
   * ===================================
   */

  /**
   * Estimate call cost
   */
  async estimateCallCost(from: string, to: string, duration: number) {
    return this.callManager.estimateCallCost(from, to, duration);
  }

  /**
   * Log system status
   */
  private async logSystemStatus() {
    const provider = this.getActiveProvider();
    const activeCallCount = await this.getActiveCallCount();

    this.logger.log('=================================');
    this.logger.log('Telephony Engine Status');
    this.logger.log('=================================');
    this.logger.log(`Active Provider: ${provider?.name || 'None'}`);
    this.logger.log(`Provider Type: ${provider?.type || 'None'}`);
    this.logger.log(`Provider Ready: ${provider?.ready || false}`);
    this.logger.log(`Active Calls: ${activeCallCount}`);
    this.logger.log('=================================');
  }

  /**
   * Cleanup old data
   */
  async cleanup(config?: { sessionsOlderThan?: number; recordingsOlderThan?: number }) {
    const [sessionsCleared, recordingsDeleted] = await Promise.all([
      this.sessionManager.clearOldSessions(config?.sessionsOlderThan),
      this.recordingManager.cleanupOldRecordings(config?.recordingsOlderThan),
    ]);

    this.logger.log(`Cleanup complete: ${sessionsCleared} sessions, ${recordingsDeleted} recordings`);

    return {
      sessionsCleared,
      recordingsDeleted,
    };
  }
}
