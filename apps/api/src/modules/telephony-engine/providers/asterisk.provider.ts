/**
 * Asterisk Telephony Provider Implementation
 * Production-ready implementation for GSM Gateway + Asterisk integration
 * 
 * Features:
 * - AMI (Asterisk Manager Interface) for call origination
 * - Real-time event handling
 * - Multi-SIM support via channel selection
 * - Recording management
 * - Call control (hangup, transfer, DTMF)
 * - AGI integration for audio streaming
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AsteriskManager from 'asterisk-manager';
import {
  ITelephonyProvider,
  CallInitiationParams,
  CallResult,
  RecordingInfo,
  CallControlResponse,
  CallControlInstructions,
  WebhookPayload,
  ProviderCapabilities,
  ProviderConfig,
} from '../interfaces/telephony-provider.interface';
import { CallDirection, CallState, ProviderType } from '../enums/call-state.enum';
// TODO: Re-enable when GSM Gateway is fixed
// import { SIMManagerService } from '../../gsm-gateway/services/sim-manager.service';
// import { ChannelManagerService } from '../../gsm-gateway/services/channel-manager.service';

@Injectable()
export class AsteriskProvider implements ITelephonyProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsteriskProvider.name);
  private ami: any;
  private ready = false;
  private config: ProviderConfig;
  
  // Asterisk specific configuration
  private host: string;
  private port: number;
  private username: string;
  private secret: string;
  private context: string;
  private extension: string;
  
  // Active channels tracking
  private activeChannels: Map<string, ChannelInfo> = new Map();
  
  // Event listeners
  private eventListeners: Map<string, Function> = new Map();

  constructor(
    private readonly configService: ConfigService,
    // TODO: Re-enable when GSM Gateway is fixed
    // private readonly simManager: SIMManagerService,
    // private readonly channelManager: ChannelManagerService,
  ) {}

  async onModuleInit() {
    this.logger.log('📞 Asterisk Provider Module Initialized');
  }

  async onModuleDestroy() {
    if (this.ami && this.ready) {
      this.logger.log('Disconnecting from Asterisk AMI...');
      await this.disconnect();
    }
  }

  getName(): string {
    return 'Asterisk PBX';
  }

  getType(): string {
    return ProviderType.ASTERISK;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRecording: true,
      supportsDTMF: true,
      supportsConferencing: true,
      supportsTransfer: true,
      supportsMachineDetection: false, // Can be added via AGI
      supportsWebhooks: false, // Uses AMI events instead
      supportsStreaming: true,
      maxConcurrentCalls: 1000, // Depends on Asterisk configuration
    };
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.logger.log('🚀 Initializing Asterisk Provider...');

    this.config = config;
    
    // Extract Asterisk configuration
    this.host = this.configService.get('ASTERISK_HOST', 'localhost');
    this.port = parseInt(this.configService.get('ASTERISK_AMI_PORT', '5038'));
    this.username = this.configService.get('ASTERISK_AMI_USERNAME', 'admin');
    this.secret = this.configService.get('ASTERISK_AMI_SECRET');
    this.context = this.configService.get('ASTERISK_CONTEXT', 'ai-calling');
    this.extension = this.configService.get('ASTERISK_EXTENSION', 's');

    if (!this.secret) {
      throw new Error('Asterisk AMI credentials missing. Set ASTERISK_AMI_SECRET in .env');
    }

    try {
      // Create AMI connection
      this.ami = new AsteriskManager(
        this.port,
        this.host,
        this.username,
        this.secret,
        true // Enable events
      );

      // Setup event handlers
      this.setupEventHandlers();

      // Connect to Asterisk
      await this.connect();

      this.ready = true;
      this.logger.log('✅ Asterisk Provider initialized successfully');
      this.logger.log(`📡 Connected to Asterisk at ${this.host}:${this.port}`);
      this.logger.log(`📋 Using context: ${this.context}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Asterisk: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready && this.ami && this.ami.isConnected();
  }

  /**
   * Make an outbound call via Asterisk
   * TODO: Re-enable SIM selection when GSM Gateway is fixed
   */
  async makeCall(params: CallInitiationParams): Promise<CallResult> {
    this.ensureReady();

    const callId = this.generateCallId();
    
    this.logger.log(`📞 [ASTERISK] Initiating call ${callId}`);
    this.logger.log(`   From: ${params.from}`);
    this.logger.log(`   To: ${params.to}`);

    try {
      // TODO: Use SIM Manager when GSM Gateway is fixed
      // For now, use simple channel selection
      const channel = this.getChannelForNumber(params.from);

      // Prepare Originate action
      const action = {
        action: 'Originate',
        channel,
        exten: params.to,
        context: this.context,
        priority: 1,
        timeout: (params.timeout || 30) * 1000,
        callerid: params.from,
        variable: {
          CALL_ID: callId,
          CALLBACK_URL: params.callbackUrl,
          STATUS_CALLBACK_URL: params.statusCallbackUrl || params.callbackUrl,
          CAMPAIGN_ID: params.metadata?.campaignId || '',
          CONTACT_ID: params.metadata?.contactId || '',
          RECORD: params.record !== false ? 'yes' : 'no',
        },
        async: true,
      };

      if (params.record !== false) {
        action.variable['MONITOR_FILENAME'] = `${callId}`;
        action.variable['MIXMONITOR_OPTIONS'] = 'b';
      }

      const response = await this.sendAction(action);

      if (!response || response.response !== 'Success') {
        throw new Error(`Asterisk Originate failed: ${response?.message || 'Unknown error'}`);
      }

      this.activeChannels.set(callId, {
        callId,
        channel,
        to: params.to,
        from: params.from,
        status: CallState.DIALING,
        startTime: new Date(),
        metadata: params.metadata,
      });

      this.logger.log(`✅ [ASTERISK] Call ${callId} originated successfully`);

      return {
        callSid: callId,
        providerCallId: callId,
        status: CallState.DIALING,
        direction: CallDirection.OUTBOUND,
        to: params.to,
        from: params.from,
      };
    } catch (error) {
      this.logger.error(`❌ [ASTERISK] Failed to make call: ${error.message}`);
      throw new Error(`Asterisk call failed: ${error.message}`);
    }
  }

  /**
   * Hangup an active call
   */
  async hangupCall(callSid: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`📴 [ASTERISK] Hanging up call: ${callSid}`);

    try {
      const channelInfo = this.activeChannels.get(callSid);
      
      if (!channelInfo) {
        this.logger.warn(`Call ${callSid} not found in active channels`);
        return false;
      }

      const action = {
        action: 'Hangup',
        channel: channelInfo.channel,
      };

      const response = await this.sendAction(action);

      if (response && response.response === 'Success') {
        this.logger.log(`✅ [ASTERISK] Call ${callSid} hung up successfully`);
        this.activeChannels.delete(callSid);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`❌ [ASTERISK] Failed to hangup call: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current call status
   */
  async getCallStatus(callSid: string): Promise<CallResult> {
    this.ensureReady();

    const channelInfo = this.activeChannels.get(callSid);

    if (!channelInfo) {
      throw new Error(`Call ${callSid} not found`);
    }

    return {
      callSid,
      providerCallId: callSid,
      status: channelInfo.status,
      direction: CallDirection.OUTBOUND,
      to: channelInfo.to,
      from: channelInfo.from,
      startTime: channelInfo.startTime,
      duration: channelInfo.duration,
    };
  }

  /**
   * Update call in progress
   */
  async updateCall(
    callSid: string,
    updates: Partial<CallInitiationParams>,
  ): Promise<CallResult> {
    this.ensureReady();

    this.logger.log(`🔄 [ASTERISK] Updating call: ${callSid}`);

    // Asterisk doesn't support updating calls like Twilio
    // This is a placeholder for compatibility
    return this.getCallStatus(callSid);
  }

  /**
   * Send DTMF tones
   */
  async sendDTMF(callSid: string, digits: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`🔢 [ASTERISK] Sending DTMF to ${callSid}: ${digits}`);

    try {
      const channelInfo = this.activeChannels.get(callSid);
      
      if (!channelInfo) {
        return false;
      }

      const action = {
        action: 'PlayDTMF',
        channel: channelInfo.channel,
        digit: digits,
      };

      const response = await this.sendAction(action);
      return response && response.response === 'Success';
    } catch (error) {
      this.logger.error(`❌ [ASTERISK] Failed to send DTMF: ${error.message}`);
      return false;
    }
  }

  /**
   * Transfer call to another number
   */
  async transferCall(callSid: string, to: string): Promise<boolean> {
    this.ensureReady();

    this.logger.log(`📲 [ASTERISK] Transferring call ${callSid} to ${to}`);

    try {
      const channelInfo = this.activeChannels.get(callSid);
      
      if (!channelInfo) {
        return false;
      }

      const action = {
        action: 'Redirect',
        channel: channelInfo.channel,
        exten: to,
        context: this.context,
        priority: 1,
      };

      const response = await this.sendAction(action);
      return response && response.response === 'Success';
    } catch (error) {
      this.logger.error(`❌ [ASTERISK] Failed to transfer call: ${error.message}`);
      return false;
    }
  }

  /**
   * Get recording information
   */
  async getRecording(recordingSid: string): Promise<RecordingInfo> {
    this.ensureReady();

    // Asterisk stores recordings in /var/spool/asterisk/monitor/
    const recordingPath = `/var/spool/asterisk/monitor/${recordingSid}.wav`;

    return {
      recordingSid,
      callSid: recordingSid,
      url: recordingPath,
      duration: 0, // Would need to analyze file
      format: 'wav',
      channels: 2, // Stereo (both directions)
    };
  }

  /**
   * Download recording as buffer
   */
  async downloadRecording(recordingUrl: string): Promise<Buffer> {
    this.ensureReady();

    // In production, read from file system or S3
    // For now, return empty buffer
    return Buffer.from([]);
  }

  /**
   * Generate call control response
   * Asterisk uses dialplan, not TwiML
   */
  generateCallControl(instructions: CallControlInstructions): CallControlResponse {
    // Convert instructions to Asterisk AGI commands
    const agiCommands: string[] = [];

    if (instructions.say) {
      agiCommands.push(`EXEC Swift "${instructions.say.text}"`);
    }

    if (instructions.play) {
      agiCommands.push(`EXEC Playback ${instructions.play.url}`);
    }

    if (instructions.gather) {
      agiCommands.push(`EXEC Read variable,${instructions.gather.timeout || 5}`);
    }

    if (instructions.record) {
      agiCommands.push(`EXEC Record filename:${instructions.record.maxLength || 3600}`);
    }

    if (instructions.dial) {
      agiCommands.push(`EXEC Dial ${instructions.dial.number},${instructions.dial.timeout || 30}`);
    }

    if (instructions.hangup) {
      agiCommands.push('HANGUP');
    }

    return {
      content: agiCommands.join('\n'),
      contentType: 'text/xml', // AGI expects XML format
    };
  }

  /**
   * Parse webhook payload
   * Asterisk doesn't use webhooks, uses AMI events instead
   */
  parseWebhook(payload: any): WebhookPayload {
    return {
      type: 'call_status',
      callSid: payload.callId || payload.uniqueid,
      status: this.mapAsteriskEventToState(payload.event),
      timestamp: new Date(),
      rawPayload: payload,
    };
  }

  /**
   * Validate webhook signature
   * Not applicable for Asterisk (uses AMI events)
   */
  validateWebhookSignature(signature: string, url: string, params: any): boolean {
    return true;
  }

  /**
   * Estimate call cost
   * For GSM Gateway, cost is based on SIM plan
   */
  async estimateCallCost(from: string, to: string, duration: number): Promise<number> {
    // Indian GSM rates: ₹0.30-0.50 per minute
    const pricePerMinute = 0.006; // $0.006 USD = ₹0.50
    const minutes = Math.ceil(duration / 60);
    return minutes * pricePerMinute;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.ami) {
      return false;
    }

    try {
      const response = await this.sendAction({ action: 'Ping' });
      const healthy = response && response.response === 'Success';
      
      if (healthy) {
        this.logger.log('✅ [ASTERISK] Health check passed');
      }
      
      return healthy;
    } catch (error) {
      this.logger.error(`❌ [ASTERISK] Health check failed: ${error.message}`);
      return false;
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private ensureReady(): void {
    if (!this.isReady()) {
      throw new Error('Asterisk provider is not initialized or connected');
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ami.on('connect', () => {
        this.logger.log('✅ Connected to Asterisk AMI');
        resolve();
      });

      this.ami.on('error', (error) => {
        this.logger.error(`❌ AMI Connection Error: ${error}`);
        reject(error);
      });

      // Keepalive
      this.ami.keepConnected();
    });
  }

  private async disconnect(): Promise<void> {
    if (this.ami) {
      this.ami.disconnect();
      this.ready = false;
    }
  }

  private setupEventHandlers(): void {
    // Listen to Asterisk events
    this.ami.on('managerevent', (event) => {
      this.handleAsteriskEvent(event);
    });

    this.ami.on('disconnect', () => {
      this.logger.warn('⚠️ Disconnected from Asterisk AMI');
      this.ready = false;
    });

    this.ami.on('reconnection', () => {
      this.logger.log('🔄 Reconnecting to Asterisk AMI...');
    });
  }

  private handleAsteriskEvent(event: any): void {
    const eventName = event.event;

    switch (eventName) {
      case 'DialBegin':
        this.handleDialBegin(event);
        break;
      case 'DialEnd':
        this.handleDialEnd(event);
        break;
      case 'Hangup':
        this.handleHangup(event);
        break;
      case 'Newchannel':
        this.handleNewChannel(event);
        break;
      case 'Newstate':
        this.handleNewState(event);
        break;
      default:
        // Log other events for debugging
        this.logger.debug(`[ASTERISK EVENT] ${eventName}: ${JSON.stringify(event)}`);
    }
  }

  private handleDialBegin(event: any): void {
    this.logger.log(`📞 [DIAL BEGIN] ${event.channel} → ${event.destcalleridnum}`);
    
    const callId = event.linkedid || event.uniqueid;
    const channelInfo = this.activeChannels.get(callId);
    
    if (channelInfo) {
      channelInfo.status = CallState.RINGING;
      this.activeChannels.set(callId, channelInfo);
    }
  }

  private handleDialEnd(event: any): void {
    this.logger.log(`📴 [DIAL END] ${event.channel} - Status: ${event.dialstatus}`);
    
    const callId = event.linkedid || event.uniqueid;
    const channelInfo = this.activeChannels.get(callId);
    
    if (channelInfo) {
      if (event.dialstatus === 'ANSWER') {
        channelInfo.status = CallState.ANSWERED;
      } else if (event.dialstatus === 'BUSY') {
        channelInfo.status = CallState.BUSY;
      } else if (event.dialstatus === 'NOANSWER') {
        channelInfo.status = CallState.NO_ANSWER;
      } else {
        channelInfo.status = CallState.FAILED;
      }
      
      this.activeChannels.set(callId, channelInfo);
    }
  }

  private handleHangup(event: any): void {
    this.logger.log(`📴 [HANGUP] ${event.channel} - Cause: ${event.cause}`);
    
    const callId = event.linkedid || event.uniqueid;
    const channelInfo = this.activeChannels.get(callId);
    
    if (channelInfo) {
      channelInfo.status = CallState.COMPLETED;
      channelInfo.endTime = new Date();
      
      if (channelInfo.startTime) {
        channelInfo.duration = Math.floor(
          (channelInfo.endTime.getTime() - channelInfo.startTime.getTime()) / 1000
        );
      }

      // TODO: Re-enable SIM release when GSM Gateway is fixed
      // if (channelInfo.metadata?.simId) {
      //   const success = event.cause === '16' || event.cause === 'ANSWERED';
      //   this.simManager.markSIMAvailable(...).catch(...);
      // }
      
      // Remove from active channels after delay
      setTimeout(() => {
        this.activeChannels.delete(callId);
      }, 60000);
    }
  }

  private handleNewChannel(event: any): void {
    this.logger.debug(`📢 [NEW CHANNEL] ${event.channel}`);
  }

  private handleNewState(event: any): void {
    this.logger.debug(`🔄 [NEW STATE] ${event.channel} - ${event.channelstatedesc}`);
  }

  private async sendAction(action: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ami.action(action, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  private getChannelForNumber(from: string): string {
    // TODO: Replace with SIM Manager when GSM Gateway is fixed
    return `PJSIP/gsm-1`;
  }

  private getAvailableSIMPort(from: string): number {
    // TODO: Replace with SIM Manager when GSM Gateway is fixed
    return 1;
  }

  private generateCallId(): string {
    return `ast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapAsteriskEventToState(event: string): CallState {
    const stateMap: Record<string, CallState> = {
      'DialBegin': CallState.DIALING,
      'DialEnd': CallState.ANSWERED,
      'Hangup': CallState.COMPLETED,
      'Newchannel': CallState.QUEUED,
    };

    return stateMap[event] || CallState.DIALING;
  }
}

/**
 * Channel Info Interface
 */
interface ChannelInfo {
  callId: string;
  channel: string;
  to: string;
  from: string;
  status: CallState;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metadata?: any;
}
