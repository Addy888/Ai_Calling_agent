/**
 * Call Manager Service
 * Core service for managing call operations through providers
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderManagerService } from './provider-manager.service';
import { CallSessionManagerService } from './call-session-manager.service';
import {
  CallInitiationParams,
  CallResult,
  CallControlInstructions,
} from '../interfaces/telephony-provider.interface';
import { CallState } from '../enums/call-state.enum';

@Injectable()
export class CallManagerService {
  private readonly logger = new Logger(CallManagerService.name);

  constructor(
    private readonly providerManager: ProviderManagerService,
    private readonly sessionManager: CallSessionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Make an outbound call
   */
  async makeCall(params: CallInitiationParams): Promise<CallResult> {
    this.logger.log(`Initiating call to ${params.to}`);

    try {
      const provider = this.providerManager.getActiveProvider();

      if (!provider) {
        throw new Error('No active telephony provider');
      }

      // Make the call through provider
      const result = await provider.makeCall(params);

      // Create session
      await this.sessionManager.createSession({
        callSid: result.callSid,
        providerType: provider.getType(),
        status: result.status,
        direction: result.direction,
        to: result.to,
        from: result.from,
        metadata: params.metadata || {},
      });

      // Emit event
      this.eventEmitter.emit('telephony.call.initiated', {
        callSid: result.callSid,
        to: result.to,
        from: result.from,
        timestamp: new Date(),
      });

      this.logger.log(`Call initiated: ${result.callSid}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to make call: ${error.message}`);
      
      this.eventEmitter.emit('telephony.call.failed', {
        to: params.to,
        error: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Hangup a call
   */
  async hangupCall(callSid: string): Promise<boolean> {
    this.logger.log(`Hanging up call: ${callSid}`);

    try {
      const session = await this.sessionManager.getSession(callSid);

      if (!session) {
        throw new Error(`Call session not found: ${callSid}`);
      }

      const provider = this.providerManager.getActiveProvider();

      if (!provider) {
        throw new Error('No active telephony provider');
      }

      const success = await provider.hangupCall(callSid);

      if (success) {
        await this.sessionManager.updateSession(callSid, {
          status: CallState.COMPLETED,
          endTime: new Date(),
        });

        this.eventEmitter.emit('telephony.call.hungup', {
          callSid,
          timestamp: new Date(),
        });
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to hangup call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<CallResult> {
    this.logger.log(`Getting call status: ${callSid}`);

    try {
      const provider = this.providerManager.getActiveProvider();

      if (!provider) {
        throw new Error('No active telephony provider');
      }

      const result = await provider.getCallStatus(callSid);

      // Update session
      await this.sessionManager.updateSession(callSid, {
        status: result.status,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get call status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transfer call
   */
  async transferCall(callSid: string, to: string): Promise<boolean> {
    this.logger.log(`Transferring call ${callSid} to ${to}`);

    try {
      const provider = this.providerManager.getActiveProvider();

      if (!provider) {
        throw new Error('No active telephony provider');
      }

      const success = await provider.transferCall(callSid, to);

      if (success) {
        this.eventEmitter.emit('telephony.call.transferred', {
          callSid,
          to,
          timestamp: new Date(),
        });
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to transfer call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send DTMF tones
   */
  async sendDTMF(callSid: string, digits: string): Promise<boolean> {
    this.logger.log(`Sending DTMF to call ${callSid}: ${digits}`);

    try {
      const provider = this.providerManager.getActiveProvider();

      if (!provider) {
        throw new Error('No active telephony provider');
      }

      const success = await provider.sendDTMF(callSid, digits);

      if (success) {
        this.eventEmitter.emit('telephony.dtmf.sent', {
          callSid,
          digits,
          timestamp: new Date(),
        });
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to send DTMF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate call control response
   */
  generateCallControl(instructions: CallControlInstructions) {
    const provider = this.providerManager.getActiveProvider();

    if (!provider) {
      throw new Error('No active telephony provider');
    }

    return provider.generateCallControl(instructions);
  }

  /**
   * Get all active calls
   */
  async getActiveCalls() {
    return this.sessionManager.getActiveSessions();
  }

  /**
   * Get call session
   */
  async getCallSession(callSid: string) {
    return this.sessionManager.getSession(callSid);
  }

  /**
   * Estimate call cost
   */
  async estimateCallCost(from: string, to: string, duration: number): Promise<number> {
    const provider = this.providerManager.getActiveProvider();

    if (!provider) {
      throw new Error('No active telephony provider');
    }

    return provider.estimateCallCost(from, to, duration);
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    const provider = this.providerManager.getActiveProvider();

    if (!provider) {
      return null;
    }

    return {
      name: provider.getName(),
      type: provider.getType(),
      capabilities: provider.getCapabilities(),
      ready: provider.isReady(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    const provider = this.providerManager.getActiveProvider();

    if (!provider) {
      return false;
    }

    return provider.healthCheck();
  }
}
