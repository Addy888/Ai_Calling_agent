/**
 * Incoming Call Service
 * Handles all inbound call operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallSessionManagerService } from './call-session-manager.service';
import { CallDirection, CallState } from '../enums/call-state.enum';
import { CallControlInstructions } from '../interfaces/telephony-provider.interface';

export interface IncomingCallInfo {
  callSid: string;
  from: string;
  to: string;
  callerName?: string;
  callerCity?: string;
  callerState?: string;
  callerCountry?: string;
  timestamp: Date;
}

@Injectable()
export class IncomingCallService {
  private readonly logger = new Logger(IncomingCallService.name);

  constructor(
    private readonly sessionManager: CallSessionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handle incoming call
   */
  async handleIncomingCall(info: IncomingCallInfo): Promise<{
    accepted: boolean;
    instructions?: CallControlInstructions;
  }> {
    this.logger.log(`Handling incoming call from ${info.from}`);

    try {
      // Create session for incoming call
      await this.sessionManager.createSession({
        callSid: info.callSid,
        providerType: 'twilio', // Detected from webhook
        status: CallState.RINGING,
        direction: CallDirection.INBOUND,
        to: info.to,
        from: info.from,
        metadata: {
          callerName: info.callerName,
          callerCity: info.callerCity,
          callerState: info.callerState,
          callerCountry: info.callerCountry,
        },
      });

      // Emit event for routing/handling
      this.eventEmitter.emit('telephony.incoming.received', {
        callSid: info.callSid,
        from: info.from,
        to: info.to,
        timestamp: new Date(),
      });

      // Check if we should accept this call
      const shouldAccept = await this.shouldAcceptCall(info);

      if (!shouldAccept) {
        this.logger.log(`Rejecting incoming call from ${info.from}`);
        
        return {
          accepted: false,
          instructions: {
            say: {
              text: 'Thank you for calling. We are unable to take your call at this time. Please try again later.',
            },
            hangup: true,
          },
        };
      }

      // Generate greeting instructions
      const instructions = await this.generateGreetingInstructions(info);

      this.logger.log(`Accepting incoming call: ${info.callSid}`);

      return {
        accepted: true,
        instructions,
      };
    } catch (error) {
      this.logger.error(`Failed to handle incoming call: ${error.message}`);
      
      return {
        accepted: false,
        instructions: {
          say: {
            text: 'We apologize, but we are experiencing technical difficulties. Please try again later.',
          },
          hangup: true,
        },
      };
    }
  }

  /**
   * Route incoming call to appropriate handler
   */
  async routeCall(callSid: string, destination: string): Promise<boolean> {
    this.logger.log(`Routing call ${callSid} to ${destination}`);

    try {
      this.eventEmitter.emit('telephony.incoming.routed', {
        callSid,
        destination,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to route call: ${error.message}`);
      return false;
    }
  }

  /**
   * Forward call to another number
   */
  async forwardCall(callSid: string, forwardTo: string): Promise<CallControlInstructions> {
    this.logger.log(`Forwarding call ${callSid} to ${forwardTo}`);

    return {
      say: {
        text: 'Please hold while we connect your call.',
      },
      dial: {
        number: forwardTo,
        timeout: 30,
      },
    };
  }

  /**
   * Send to voicemail
   */
  async sendToVoicemail(callSid: string): Promise<CallControlInstructions> {
    this.logger.log(`Sending call ${callSid} to voicemail`);

    return {
      say: {
        text: 'Please leave a message after the beep.',
      },
      record: {
        maxLength: 180,
        playBeep: true,
        timeout: 5,
      },
      hangup: true,
    };
  }

  /**
   * Put caller on hold
   */
  async holdCall(callSid: string, holdMusic?: string): Promise<CallControlInstructions> {
    this.logger.log(`Putting call ${callSid} on hold`);

    return {
      say: {
        text: 'Please hold while we transfer your call.',
      },
      play: {
        url: holdMusic || 'http://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3',
        loop: 10,
      },
    };
  }

  /**
   * Get incoming call statistics
   */
  async getStatistics(timeRange?: { start: Date; end: Date }): Promise<{
    total: number;
    answered: number;
    missed: number;
    averageWaitTime: number;
  }> {
    // This would query actual data
    return {
      total: 0,
      answered: 0,
      missed: 0,
      averageWaitTime: 0,
    };
  }

  /**
   * Check if call should be accepted
   */
  private async shouldAcceptCall(info: IncomingCallInfo): Promise<boolean> {
    // Check business hours
    const isBusinessHours = this.isWithinBusinessHours();
    if (!isBusinessHours) {
      this.logger.log('Outside business hours');
      return false;
    }

    // Check if number is blocked
    const isBlocked = await this.isNumberBlocked(info.from);
    if (isBlocked) {
      this.logger.log(`Number is blocked: ${info.from}`);
      return false;
    }

    // Check concurrent call limit
    const activeCallCount = await this.sessionManager.getActiveCallCount();
    const maxConcurrentCalls = 100; // Configuration
    if (activeCallCount >= maxConcurrentCalls) {
      this.logger.log('Max concurrent calls reached');
      return false;
    }

    return true;
  }

  /**
   * Generate greeting instructions
   */
  private async generateGreetingInstructions(
    info: IncomingCallInfo,
  ): Promise<CallControlInstructions> {
    return {
      say: {
        text: 'Thank you for calling. Please hold while we connect you.',
        voice: 'alice',
        language: 'en-US',
      },
      gather: {
        input: 'dtmf',
        timeout: 5,
        numDigits: 1,
      },
    };
  }

  /**
   * Check if within business hours
   */
  private isWithinBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Monday-Friday, 9 AM - 6 PM
    const isWeekday = day >= 1 && day <= 5;
    const isBusinessHour = hour >= 9 && hour < 18;

    return isWeekday && isBusinessHour;
  }

  /**
   * Check if number is blocked
   */
  private async isNumberBlocked(phoneNumber: string): Promise<boolean> {
    // This would check against a blocklist database
    return false;
  }
}
