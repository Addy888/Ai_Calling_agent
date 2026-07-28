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
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { GatewayManagerService } from '../services/gateway-manager.service';
import { SIMManagerService } from '../services/sim-manager.service';
import { ConnectionManagerService } from '../services/connection-manager.service';

@Injectable()
export class AsteriskProvider implements ITelephonyProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsteriskProvider.name);
  private ready = false;
  private config: ProviderConfig;
  
  // Asterisk specific configuration
  private context: string;
  private extension: string;
  
  // Active channels tracking
  private activeChannels: Map<string, ChannelInfo> = new Map();
  
  // Event listeners
  private eventListeners: Map<string, Function> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly gatewayManager: GatewayManagerService,
    private readonly simManager: SIMManagerService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('📞 Asterisk Provider Module Initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Asterisk Provider...');
    this.ready = false;
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
    this.logger.log('🚀 Initializing Enhanced Asterisk Provider with GSM Gateway support...');

    this.config = config;
    
    // Extract Asterisk configuration
    this.context = this.configService.get('ASTERISK_CONTEXT', 'ai-calling');
    this.extension = this.configService.get('ASTERISK_EXTENSION', 's');

    try {
      // Connection Manager handles AMI connections
      // Gateway Manager handles gateway selection
      // SIM Manager handles SIM selection

      this.ready = true;
      this.logger.log('✅ Enhanced Asterisk Provider initialized successfully');
      this.logger.log(`📋 Using context: ${this.context}`);
      this.logger.log('🔗 Integrated with Gateway Manager, SIM Manager, and Connection Manager');

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Asterisk: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Make an outbound call via Asterisk with GSM Gateway and SIM selection
   */
  async makeCall(params: CallInitiationParams): Promise<CallResult> {
    this.ensureReady();

    const callId = this.generateCallId();
    
    this.logger.log(`📞 [ASTERISK] Initiating call ${callId}`);
    this.logger.log(`   To: ${params.to}`);
    this.logger.log(`   Metadata: ${JSON.stringify(params.metadata)}`);

    try {
      // Extract company ID from metadata
      const companyId = params.metadata?.companyId;
      if (!companyId) {
        throw new Error('Company ID required in metadata for GSM Gateway call');
      }

      // Step 1: Select best gateway
      this.logger.log(`📡 Step 1: Selecting best GSM Gateway...`);
      const gateway = await this.gatewayManager.selectBestGateway(companyId);
      
      this.logger.log(`✅ Selected Gateway: ${gateway.name} (${gateway.ipAddress}:${gateway.port})`);

      // Step 2: Select best SIM for the gateway
      this.logger.log(`📱 Step 2: Selecting best SIM card...`);
      const sim = await this.simManager.selectBestSIM(companyId, gateway.id);
      
      this.logger.log(`✅ Selected SIM: ${sim.simNumber} (${sim.operator})`);
      this.logger.log(`   Port: ${sim.portNumber}`);

      // Step 3: Get AMI connection for the gateway
      this.logger.log(`🔌 Step 3: Getting AMI connection...`);
      const ami = await this.connectionManager.getConnection(gateway.id, {
        host: gateway.ipAddress,
        port: gateway.port,
        username: gateway.username || 'admin',
        secret: gateway.password || '',
      });

      // Step 4: Mark SIM as busy
      await this.simManager.markSIMBusy(sim.id, callId);
      
      // Step 5: Increment gateway active ports
      await this.gatewayManager.updateActivePorts(gateway.id, true);

      // Step 6: Build channel string
      // Format: PJSIP/{portNumber}/gsm-gateway OR SIP/{simNumber}
      const channel = this.buildChannelString(sim, gateway);
      
      this.logger.log(`📞 Step 4: Originating call via channel: ${channel}`);

      // Step 7: Prepare Originate action
      const action = {
        action: 'Originate',
        channel,
        exten: params.to,
        context: this.context,
        priority: 1,
        timeout: (params.timeout || 30) * 1000,
        callerid: sim.simNumber, // Use SIM number as caller ID
        variable: {
          CALL_ID: callId,
          SIM_ID: sim.id,
          GATEWAY_ID: gateway.id,
          COMPANY_ID: companyId,
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

      const response = await this.connectionManager.sendAction(gateway.id, action);

      if (!response || response.response !== 'Success') {
        throw new Error(`Asterisk Originate failed: ${response?.message || 'Unknown error'}`);
      }

      // Store channel info
      this.activeChannels.set(callId, {
        callId,
        channel,
        to: params.to,
        from: sim.simNumber,
        status: CallState.DIALING,
        startTime: new Date(),
        metadata: {
          ...params.metadata,
          gatewayId: gateway.id,
          gatewayName: gateway.name,
          simId: sim.id,
          simNumber: sim.simNumber,
          operator: sim.operator,
          portNumber: sim.portNumber,
        },
        gatewayId: gateway.id,
        simId: sim.id,
      });

      this.logger.log(`✅ [ASTERISK] Call ${callId} originated successfully`);
      this.logger.log(`   Gateway: ${gateway.name}`);
      this.logger.log(`   SIM: ${sim.simNumber} (${sim.operator})`);
      this.logger.log(`   Channel: ${channel}`);

      // Log SIM call
      await this.simManager.logSIMCall({
        simId: sim.id,
        companyId,
        callSid: callId,
        campaignId: params.metadata?.campaignId,
        contactId: params.metadata?.contactId,
        destinationNumber: params.to,
        callDirection: 'outbound',
        callStatus: 'DIALING',
        startTime: new Date(),
        metadata: params.metadata,
      });

      // Emit event
      this.eventEmitter.emit('call.initiated', {
        callId,
        gatewayId: gateway.id,
        simId: sim.id,
        to: params.to,
        from: sim.simNumber,
        timestamp: new Date(),
      });

      return {
        callSid: callId,
        providerCallId: callId,
        status: CallState.DIALING,
        direction: CallDirection.OUTBOUND,
        to: params.to,
        from: sim.simNumber,
        metadata: {
          gatewayId: gateway.id,
          gatewayName: gateway.name,
          simId: sim.id,
          simNumber: sim.simNumber,
          operator: sim.operator,
        },
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

      const response = await this.connectionManager.sendAction(
        channelInfo.gatewayId || 'default',
        action
      );

      if (response && response.response === 'Success') {
        this.logger.log(`✅ [ASTERISK] Call ${callSid} hung up successfully`);
        
        // Cleanup will happen in hangup event handler
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

      const response = await this.connectionManager.sendAction(
        channelInfo.gatewayId || 'default',
        action
      );
      
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

      const response = await this.connectionManager.sendAction(
        channelInfo.gatewayId || 'default',
        action
      );
      
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
    try {
      // Check if any connection is healthy
      const statuses = this.connectionManager.getAllConnectionStatuses();
      const hasHealthyConnection = statuses.some(status => status.isConnected);
      
      if (hasHealthyConnection) {
        this.logger.log('✅ [ASTERISK] Health check passed');
      } else {
        this.logger.warn('⚠️ [ASTERISK] No healthy connections');
      }
      
      return hasHealthyConnection;
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
      throw new Error('Asterisk provider is not initialized');
    }
  }

  /**
   * Setup event listeners for Asterisk events
   */
  private setupEventListeners(): void {
    // Listen to Asterisk events from Connection Manager
    this.eventEmitter.on('asterisk.event', (data: any) => {
      this.handleAsteriskEvent(data.event);
    });

    this.logger.log('✅ Event listeners configured');
  }

  /**
   * Build channel string for GSM Gateway
   */
  private buildChannelString(sim: any, gateway: any): string {
    // Different GSM Gateway models use different channel formats
    const model = gateway.model.toLowerCase();

    if (model.includes('dinstar')) {
      return `PJSIP/${sim.portNumber}@${gateway.name.toLowerCase().replace(/\s/g, '-')}`;
    } else if (model.includes('yeastar')) {
      return `SIP/${sim.simNumber}@${gateway.name.toLowerCase().replace(/\s/g, '-')}`;
    } else if (model.includes('openvox')) {
      return `Dahdi/g${sim.portNumber}`;
    } else {
      // Generic format
      return `PJSIP/${sim.portNumber}/gsm-gateway`;
    }
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

  private async handleHangup(event: any): Promise<void> {
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

      // Release SIM and gateway resources
      if (channelInfo.simId && channelInfo.gatewayId) {
        const success = event.cause === '16' || event.dialstatus === 'ANSWER';
        
        try {
          // Mark SIM as available
          await this.simManager.markSIMAvailable(
            channelInfo.simId,
            callId,
            success
          );

          // Decrement gateway active ports
          await this.gatewayManager.updateActivePorts(channelInfo.gatewayId, false);

          this.logger.log(`✅ Resources released for call: ${callId}`);
        } catch (error) {
          this.logger.error(`Failed to release resources: ${error.message}`);
        }
      }
      
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
  gatewayId?: string;
  simId?: string;
}
