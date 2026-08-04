/**
 * Asterisk Production AMI Service
 * Production-ready integration with real Asterisk 1.8.23.0 server
 * 
 * Server Details:
 * - IP: 192.168.1.4
 * - Version: 1.8.23.0
 * - GSM Gateway: Dinstar (192.168.1.8)
 * - SIP Peer: GSM1
 * - Codecs: gsm, ulaw, alaw, g729
 * 
 * Features:
 * - Real AMI connection to production Asterisk
 * - Originate calls via GSM1 trunk
 * - Real-time call event monitoring
 * - Channel state tracking
 * - Recording detection
 * - DTMF handling
 * - Auto-reconnection with backoff
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as net from 'net';

export interface AMIAction {
  action: string;
  [key: string]: any;
}

export interface AMIResponse {
  response: string;
  message?: string;
  actionid?: string;
  [key: string]: any;
}

export interface AMIEvent {
  event: string;
  privilege?: string;
  [key: string]: any;
}

export interface CallChannel {
  uniqueid: string;
  channel: string;
  calleridnum: string;
  calleridname: string;
  destination: string;
  context: string;
  state: string;
  statedesc: string;
  connectedlinenum?: string;
  connectedlinename?: string;
  accountcode?: string;
  exten?: string;
  priority?: string;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration?: number;
}

export type ConnectionStage = 
  | 'DISCONNECTED'
  | 'TCP_CONNECTING'
  | 'TCP_CONNECTED'
  | 'WAITING_BANNER'
  | 'BANNER_RECEIVED'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED';

export type FailureReason =
  | 'TCP_CONNECTION_FAILED'
  | 'CONNECTION_REFUSED'
  | 'CONNECTION_TIMEOUT'
  | 'AMI_BANNER_TIMEOUT'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHENTICATION_TIMEOUT'
  | 'CONNECTION_CLOSED'
  | 'UNKNOWN';

@Injectable()
export class AsteriskProductionAMIService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsteriskProductionAMIService.name);
  
  // Connection
  private socket: net.Socket | null = null;
  private connected = false;
  private authenticated = false;
  
  // Configuration
  private host: string;
  private port: number;
  private username: string;
  private secret: string;
  private context: string;
  private sipPeer: string;
  
  // Reconnection
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastConnectionAttempt: Date | null = null;
  private lastErrorReason: string = '';
  private lastFailureReason: FailureReason = 'UNKNOWN';
  
  // Connection state
  private connectionState: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR' = 'OFFLINE';
  private connectionStage: ConnectionStage = 'DISCONNECTED';
  
  // Buffer for AMI messages
  private buffer = '';
  
  // Action tracking
  private actionIdCounter = 0;
  private pendingActions: Map<string, PendingAction> = new Map();
  
  // Active channels
  private activeChannels: Map<string, CallChannel> = new Map();
  
  // Health
  private lastPing: Date = new Date();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Asterisk Production AMI Service starting...');
    await this.loadConfiguration();
    
    // Start connection in background - don't block application startup
    this.attemptConnection();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Asterisk Production AMI Service...');
    await this.disconnect();
  }

  /**
   * Load configuration from environment
   */
  private async loadConfiguration(): Promise<void> {
    this.host = this.configService.get('ASTERISK_HOST', '192.168.1.4');
    this.port = parseInt(this.configService.get('ASTERISK_AMI_PORT', '5038'));
    this.username = this.configService.get('ASTERISK_AMI_USERNAME', 'admin');
    this.secret = this.configService.get('ASTERISK_AMI_SECRET', '');
    this.context = this.configService.get('ASTERISK_CONTEXT', 'ai-calling');
    this.sipPeer = this.configService.get('SIP_PEER_NAME', 'GSM1');

    this.logger.log('📋 Configuration loaded:');
    this.logger.log(`   Asterisk: ${this.host}:${this.port}`);
    this.logger.log(`   Username: ${this.username}`);
    this.logger.log(`   Context: ${this.context}`);
    this.logger.log(`   SIP Peer: ${this.sipPeer}`);
  }

  /**
   * Connect to Asterisk AMI
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.connectionState = 'CONNECTING';
    this.connectionStage = 'TCP_CONNECTING';

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setKeepAlive(true, 60000);
      socket.setTimeout(10000); // 10 second timeout

      let bannerTimeout: NodeJS.Timeout | null = null;
      let authTimeout: NodeJS.Timeout | null = null;

      // Connection success
      socket.on('connect', () => {
        this.connectionStage = 'TCP_CONNECTED';
        this.connected = true;
        this.reconnectAttempts = 0;
        this.socket = socket;
        
        this.logger.debug('✅ TCP connection established, waiting for AMI banner...');
        
        // Start banner timeout
        this.connectionStage = 'WAITING_BANNER';
        bannerTimeout = setTimeout(() => {
          if (this.connectionStage === 'WAITING_BANNER') {
            this.lastErrorReason = 'AMI banner not received';
            this.lastFailureReason = 'AMI_BANNER_TIMEOUT';
            this.connectionStage = 'DISCONNECTED';
            socket.destroy();
            reject(new Error('AMI banner timeout'));
          }
        }, 5000); // 5 seconds to receive banner
      });

      // Data received
      socket.on('data', (data: Buffer) => {
        const dataStr = data.toString();
        
        // First data after TCP connect is the banner
        if (this.connectionStage === 'WAITING_BANNER') {
          // Clear banner timeout
          if (bannerTimeout) {
            clearTimeout(bannerTimeout);
            bannerTimeout = null;
          }
          
          this.connectionStage = 'BANNER_RECEIVED';
          this.logger.debug('✅ AMI banner received, sending authentication...');
          
          // Start authentication
          this.connectionStage = 'AUTHENTICATING';
          authTimeout = setTimeout(() => {
            if (this.connectionStage === 'AUTHENTICATING') {
              this.lastErrorReason = 'Authentication timeout';
              this.lastFailureReason = 'AUTHENTICATION_TIMEOUT';
              this.connectionStage = 'DISCONNECTED';
              socket.destroy();
              reject(new Error('Authentication timeout'));
            }
          }, 5000); // 5 seconds to authenticate
          
          // Send login
          this.login()
            .then(() => {
              // Login sent successfully
            })
            .catch((error) => {
              this.lastErrorReason = `Login send failed: ${error.message}`;
              this.lastFailureReason = 'AUTHENTICATION_FAILED';
              this.connectionStage = 'DISCONNECTED';
              if (authTimeout) clearTimeout(authTimeout);
              socket.destroy();
              reject(error);
            });
        }
        
        this.handleData(dataStr);
      });

      // Error - Most critical handler for TCP connection failures
      socket.on('error', (error: NodeJS.ErrnoException) => {
        if (bannerTimeout) clearTimeout(bannerTimeout);
        if (authTimeout) clearTimeout(authTimeout);
        
        // Determine failure reason based on connection stage and error code
        if (this.connectionStage === 'TCP_CONNECTING') {
          // TCP connection never established
          if (error.code === 'ECONNREFUSED') {
            this.lastErrorReason = 'Connection refused';
            this.lastFailureReason = 'CONNECTION_REFUSED';
          } else if (error.code === 'ETIMEDOUT') {
            this.lastErrorReason = 'Connection timeout';
            this.lastFailureReason = 'CONNECTION_TIMEOUT';
          } else if (error.code === 'EHOSTUNREACH' || error.code === 'ENETUNREACH') {
            this.lastErrorReason = 'Host unreachable';
            this.lastFailureReason = 'TCP_CONNECTION_FAILED';
          } else {
            this.lastErrorReason = error.code || error.message;
            this.lastFailureReason = 'TCP_CONNECTION_FAILED';
          }
        } else {
          // Connection was established but failed later
          this.lastErrorReason = error.code || error.message;
          this.lastFailureReason = 'CONNECTION_CLOSED';
        }
        
        this.connectionStage = 'DISCONNECTED';
        this.connectionState = 'OFFLINE';
        this.connected = false;
        this.authenticated = false;
        socket.destroy();
        reject(error);
      });

      // Closed
      socket.on('close', () => {
        if (bannerTimeout) clearTimeout(bannerTimeout);
        if (authTimeout) clearTimeout(authTimeout);
        
        if (this.connectionStage !== 'AUTHENTICATED') {
          if (!this.lastErrorReason) {
            this.lastErrorReason = 'Connection closed unexpectedly';
            this.lastFailureReason = 'CONNECTION_CLOSED';
          }
        }
        
        this.connected = false;
        this.authenticated = false;
        this.socket = null;
        this.connectionState = 'OFFLINE';
        this.connectionStage = 'DISCONNECTED';
        this.scheduleReconnect();
      });

      // Timeout
      socket.on('timeout', () => {
        if (bannerTimeout) clearTimeout(bannerTimeout);
        if (authTimeout) clearTimeout(authTimeout);
        
        if (this.connectionStage === 'TCP_CONNECTING' || this.connectionStage === 'TCP_CONNECTED') {
          this.lastErrorReason = 'Connection timeout';
          this.lastFailureReason = 'CONNECTION_TIMEOUT';
        } else {
          this.lastErrorReason = 'Socket timeout';
          this.lastFailureReason = 'UNKNOWN';
        }
        
        this.connectionState = 'OFFLINE';
        this.connectionStage = 'DISCONNECTED';
        socket.destroy();
        reject(new Error('Socket timeout'));
      });

      // Connect - This is where TCP connection is attempted
      try {
        socket.connect(this.port, this.host);
      } catch (error) {
        if (bannerTimeout) clearTimeout(bannerTimeout);
        if (authTimeout) clearTimeout(authTimeout);
        
        this.lastErrorReason = error.message;
        this.lastFailureReason = 'TCP_CONNECTION_FAILED';
        this.connectionState = 'OFFLINE';
        this.connectionStage = 'DISCONNECTED';
        reject(error);
        return;
      }

      // Wait for authentication
      const waitForAuth = () => {
        if (this.authenticated) {
          if (authTimeout) clearTimeout(authTimeout);
          this.startPing();
          this.connectionState = 'ONLINE';
          this.connectionStage = 'AUTHENTICATED';
          this.lastErrorReason = '';
          this.lastFailureReason = 'UNKNOWN';
          resolve();
        } else if (socket.destroyed) {
          if (authTimeout) clearTimeout(authTimeout);
          // Socket destroyed, stop waiting
        } else {
          setTimeout(waitForAuth, 100);
        }
      };

      setTimeout(waitForAuth, 100);
    });
  }

  /**
   * Disconnect from Asterisk
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket && this.authenticated) {
      try {
        await this.sendAction({ action: 'Logoff' });
      } catch (error) {
        // Ignore
      }
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.connected = false;
    this.authenticated = false;
    this.logger.log('✅ Disconnected from Asterisk');
  }

  /**
   * Check if ready
   */
  isReady(): boolean {
    return this.connected && this.authenticated;
  }

  /**
   * Originate outbound call via GSM1 trunk
   */
  async originateCall(params: {
    destination: string;
    callerId: string;
    timeout?: number;
    variables?: Record<string, string>;
  }): Promise<AMIResponse> {
    if (!this.isReady()) {
      throw new Error('Not connected to Asterisk');
    }

    const { destination, callerId, timeout = 30, variables = {} } = params;

    this.logger.log(`📞 Originating call to ${destination} via ${this.sipPeer}`);

    // Build channel for GSM Gateway
    // Format: SIP/{destination}@GSM1
    const channel = `SIP/${destination}@${this.sipPeer}`;

    const action: AMIAction = {
      action: 'Originate',
      channel,
      context: this.context,
      exten: 's',
      priority: 1,
      timeout: timeout * 1000,
      callerid: callerId,
      async: 'true',
    };

    // Add custom variables
    if (Object.keys(variables).length > 0) {
      action.variable = Object.entries(variables)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    }

    const response = await this.sendAction(action);

    if (response.response === 'Success') {
      this.logger.log(`✅ Call originated successfully`);
    } else {
      this.logger.error(`❌ Call origination failed: ${response.message}`);
    }

    return response;
  }

  /**
   * Hangup a call
   */
  async hangupCall(channel: string): Promise<AMIResponse> {
    this.logger.log(`📴 Hanging up channel: ${channel}`);

    return this.sendAction({
      action: 'Hangup',
      channel,
    });
  }

  /**
   * Get channel status
   */
  async getChannelStatus(channel: string): Promise<AMIResponse> {
    return this.sendAction({
      action: 'Status',
      channel,
    });
  }

  /**
   * Get all active channels
   */
  async getAllChannels(): Promise<CallChannel[]> {
    return Array.from(this.activeChannels.values());
  }

  /**
   * Play audio file
   */
  async playAudio(channel: string, filename: string): Promise<AMIResponse> {
    return this.sendAction({
      action: 'Playback',
      channel,
      file: filename,
    });
  }

  /**
   * Send DTMF
   */
  async sendDTMF(channel: string, digit: string): Promise<AMIResponse> {
    return this.sendAction({
      action: 'PlayDTMF',
      channel,
      digit,
    });
  }

  /**
   * Redirect call
   */
  async redirectCall(
    channel: string,
    extension: string,
    context?: string,
  ): Promise<AMIResponse> {
    return this.sendAction({
      action: 'Redirect',
      channel,
      exten: extension,
      context: context || this.context,
      priority: 1,
    });
  }

  /**
   * Get SIP peers (including GSM1)
   */
  async getSIPPeers(): Promise<AMIResponse> {
    return this.sendAction({
      action: 'SIPpeers',
    });
  }

  /**
   * Get SIP peer status (GSM1 status)
   */
  async getSIPPeerStatus(peer: string = 'GSM1'): Promise<AMIResponse> {
    return this.sendAction({
      action: 'SIPshowpeer',
      peer,
    });
  }

  /**
   * Send custom AMI action
   */
  async sendAction(action: AMIAction, timeout: number = 10000): Promise<AMIResponse> {
    if (!this.isReady()) {
      throw new Error('Not connected to Asterisk');
    }

    const actionId = this.generateActionId();
    const actionWithId = { ...action, actionid: actionId };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingActions.delete(actionId);
        reject(new Error(`Action timeout: ${action.action}`));
      }, timeout);

      this.pendingActions.set(actionId, { resolve, reject, timer });

      const message = this.formatMessage(actionWithId);
      this.logger.debug(`➡️ ${action.action} (${actionId})`);

      this.socket!.write(message, (error) => {
        if (error) {
          clearTimeout(timer);
          this.pendingActions.delete(actionId);
          reject(error);
        }
      });
    });
  }

  /**
   * Get connection health
   */
  getHealth(): {
    connected: boolean;
    authenticated: boolean;
    host: string;
    port: number;
    sipPeer: string;
    activeChannels: number;
    lastPing: Date;
    uptime: number;
    status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
    stage: ConnectionStage;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    nextRetryIn?: number;
    lastAttempt?: Date;
    reason?: string;
    failureType?: FailureReason;
  } {
    const health: any = {
      connected: this.connected,
      authenticated: this.authenticated,
      host: this.host,
      port: this.port,
      sipPeer: this.sipPeer,
      activeChannels: this.activeChannels.size,
      lastPing: this.lastPing,
      uptime: this.connected ? Date.now() - this.lastPing.getTime() : 0,
      status: this.connectionState,
      stage: this.connectionStage,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };

    // Add diagnostics if offline
    if (this.connectionState !== 'ONLINE') {
      if (this.lastConnectionAttempt) {
        health.lastAttempt = this.lastConnectionAttempt;
      }
      if (this.lastErrorReason) {
        health.reason = this.lastErrorReason;
      }
      if (this.lastFailureReason !== 'UNKNOWN') {
        health.failureType = this.lastFailureReason;
      }
      if (this.reconnectTimer && this.reconnectAttempts < this.maxReconnectAttempts) {
        health.nextRetryIn = this.getNextRetryDelay();
      }
    }

    return health;
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Handle incoming data
   */
  private handleData(data: string): void {
    this.buffer += data;

    // AMI messages are separated by double \r\n
    const messages = this.buffer.split('\r\n\r\n');
    this.buffer = messages.pop() || '';

    for (const message of messages) {
      if (message.trim()) {
        this.processMessage(message);
      }
    }
  }

  /**
   * Process AMI message
   */
  private processMessage(message: string): void {
    const parsed = this.parseMessage(message);

    if (!parsed) return;

    // Handle login response
    if (this.connectionStage === 'AUTHENTICATING' && parsed.response) {
      if (parsed.response === 'Success' && parsed.message?.toLowerCase().includes('authentication')) {
        this.authenticated = true;
        this.connectionStage = 'AUTHENTICATED';
        this.logger.log('✅ Authenticated to Asterisk AMI');
        return;
      } else if (parsed.response === 'Error') {
        this.lastErrorReason = 'Invalid AMI username or password';
        this.lastFailureReason = 'AUTHENTICATION_FAILED';
        this.connectionStage = 'DISCONNECTED';
        this.logger.error(`❌ Authentication failed: ${parsed.message || 'Invalid credentials'}`);
        this.logger.error(`   Check ASTERISK_AMI_USERNAME and ASTERISK_AMI_SECRET in .env`);
        return;
      }
    }

    // Handle action response
    if (parsed.actionid && this.pendingActions.has(parsed.actionid)) {
      const pending = this.pendingActions.get(parsed.actionid)!;
      clearTimeout(pending.timer);
      this.pendingActions.delete(parsed.actionid);
      pending.resolve(parsed as AMIResponse);
      return;
    }

    // Handle event
    if (parsed.event) {
      this.handleEvent(parsed as AMIEvent);
    }
  }

  /**
   * Parse AMI message
   */
  private parseMessage(message: string): Record<string, any> | null {
    const lines = message.split('\r\n');
    const result: Record<string, any> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      if (key && value) {
        result[key] = value;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Format message for sending
   */
  private formatMessage(data: Record<string, any>): string {
    let message = '';

    for (const [key, value] of Object.entries(data)) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      message += `${capitalizedKey}: ${value}\r\n`;
    }

    message += '\r\n';
    return message;
  }

  /**
   * Handle Asterisk event
   */
  private handleEvent(event: AMIEvent): void {
    const eventName = event.event;

    // Track channels
    if (eventName === 'Newchannel') {
      this.handleNewChannel(event);
    } else if (eventName === 'Newstate') {
      this.handleNewState(event);
    } else if (eventName === 'Hangup') {
      this.handleHangup(event);
    } else if (eventName === 'DialBegin') {
      this.handleDialBegin(event);
    } else if (eventName === 'DialEnd') {
      this.handleDialEnd(event);
    }

    // Emit event
    this.eventEmitter.emit('asterisk.event', {
      event,
      timestamp: new Date(),
    });

    this.logger.debug(`📢 ${eventName}`);
  }

  /**
   * Handle new channel
   */
  private handleNewChannel(event: AMIEvent): void {
    const channel: CallChannel = {
      uniqueid: event.uniqueid,
      channel: event.channel,
      calleridnum: event.calleridnum,
      calleridname: event.calleridname,
      destination: event.exten || '',
      context: event.context,
      state: event.channelstate,
      statedesc: event.channelstatedesc,
      accountcode: event.accountcode,
      exten: event.exten,
      priority: event.priority,
      startTime: new Date(),
    };

    this.activeChannels.set(event.uniqueid, channel);
    this.logger.log(`📞 New channel: ${event.channel}`);
  }

  /**
   * Handle channel state change
   */
  private handleNewState(event: AMIEvent): void {
    const channel = this.activeChannels.get(event.uniqueid);
    if (channel) {
      channel.state = event.channelstate;
      channel.statedesc = event.channelstatedesc;
      
      if (event.channelstatedesc === 'Up' && !channel.answerTime) {
        channel.answerTime = new Date();
        this.logger.log(`✅ Call answered: ${channel.channel}`);
      }
    }
  }

  /**
   * Handle hangup
   */
  private handleHangup(event: AMIEvent): void {
    const channel = this.activeChannels.get(event.uniqueid);
    if (channel) {
      channel.endTime = new Date();
      if (channel.answerTime) {
        channel.duration = Math.floor(
          (channel.endTime.getTime() - channel.answerTime.getTime()) / 1000
        );
      }

      this.logger.log(`📴 Hangup: ${channel.channel} (${event.cause})`);

      // Remove after delay
      setTimeout(() => {
        this.activeChannels.delete(event.uniqueid);
      }, 30000);
    }
  }

  /**
   * Handle dial begin
   */
  private handleDialBegin(event: AMIEvent): void {
    this.logger.log(`📞 Dialing: ${event.destcalleridnum}`);
  }

  /**
   * Handle dial end
   */
  private handleDialEnd(event: AMIEvent): void {
    this.logger.log(`📴 Dial ended: ${event.dialstatus}`);
  }

  /**
   * Login to Asterisk
   */
  private async login(): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to Asterisk');
    }

    this.logger.log(`🔐 Authenticating with username: ${this.username}`);
    
    // For login, we send the message directly without using sendAction
    // because sendAction requires authentication which we don't have yet
    const loginMessage = this.formatMessage({
      action: 'Login',
      username: this.username,
      secret: this.secret,
      events: 'on',
    });

    this.socket.write(loginMessage, (error) => {
      if (error) {
        this.logger.error(`❌ Failed to send login: ${error.message}`);
        throw error;
      } else {
        this.logger.log(`📤 Login credentials sent, waiting for response...`);
      }
    });
  }

  /**
   * Generate action ID
   */
  private generateActionId(): string {
    this.actionIdCounter++;
    return `action_${Date.now()}_${this.actionIdCounter}`;
  }

  /**
   * Get next retry delay with exponential backoff
   * Attempt 1 → 10s, Attempt 2 → 30s, Attempt 3+ → 60s
   */
  private getNextRetryDelay(): number {
    if (this.reconnectAttempts === 0) return 10000;  // 10 seconds
    if (this.reconnectAttempts === 1) return 30000;  // 30 seconds
    return 60000;  // 60 seconds for attempt 3+
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      // Already scheduled
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState = 'ERROR';
      
      // Log once when max attempts reached
      if (this.reconnectAttempts === this.maxReconnectAttempts) {
        this.logConnectionStatus();
      }
      
      // Continue retrying every 60 seconds even after max attempts
      const delay = 60000;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.attemptConnection();
      }, delay);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.getNextRetryDelay();
    
    // Log concise reconnection info
    this.logConnectionStatus();

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptConnection();
    }, delay);
  }

  /**
   * Log connection status with proper reason differentiation
   */
  private logConnectionStatus(): void {
    const now = new Date();
    const nextRetry = new Date(now.getTime() + this.getNextRetryDelay());
    
    // Get human-readable reason
    let reasonText = this.lastErrorReason;
    
    switch (this.lastFailureReason) {
      case 'TCP_CONNECTION_FAILED':
        reasonText = `TCP connection failed: ${this.lastErrorReason}`;
        break;
      case 'CONNECTION_REFUSED':
        reasonText = `Connection refused (${this.host}:${this.port})`;
        break;
      case 'CONNECTION_TIMEOUT':
        reasonText = `TCP connection timeout`;
        break;
      case 'AMI_BANNER_TIMEOUT':
        reasonText = `AMI banner not received`;
        break;
      case 'AUTHENTICATION_FAILED':
        reasonText = `Invalid AMI username or password`;
        break;
      case 'AUTHENTICATION_TIMEOUT':
        reasonText = `Authentication timeout`;
        break;
      case 'CONNECTION_CLOSED':
        reasonText = `Connection closed: ${this.lastErrorReason}`;
        break;
      default:
        reasonText = this.lastErrorReason || 'Unknown error';
    }
    
    const isMaxAttempts = this.reconnectAttempts >= this.maxReconnectAttempts;
    const title = isMaxAttempts ? 'Asterisk OFFLINE - Max Attempts Reached' : 'Asterisk OFFLINE';
    
    this.logger.log('┌─────────────────────────────────────────────┐');
    this.logger.log(`│  ${title.padEnd(43)}│`);
    this.logger.log('├─────────────────────────────────────────────┤');
    this.logger.log(`│  Stage: ${this.connectionStage.padEnd(36)}│`);
    this.logger.log(`│  Last Attempt: ${now.toLocaleString().padEnd(27)}│`);
    
    if (!isMaxAttempts) {
      this.logger.log(`│  Next Retry: ${nextRetry.toLocaleString().padEnd(29)}│`);
    } else {
      this.logger.log(`│  Will retry every 60 seconds               │`);
    }
    
    // Truncate reason if too long
    if (reasonText.length > 33) {
      reasonText = reasonText.substring(0, 30) + '...';
    }
    this.logger.log(`│  Reason: ${reasonText.padEnd(33)}│`);
    this.logger.log('└─────────────────────────────────────────────┘');
  }

  /**
   * Attempt connection (used for initial and retry attempts)
   */
  private attemptConnection(): void {
    this.connectionState = 'CONNECTING';
    this.lastConnectionAttempt = new Date();
    
    this.connect().catch((error) => {
      // Error already logged in connect(), just update state
      this.connectionState = 'OFFLINE';
    });
  }

  /**
   * Start ping
   */
  private startPing(): void {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      if (this.isReady()) {
        this.sendAction({ action: 'Ping' })
          .then(() => {
            this.lastPing = new Date();
          })
          .catch((error) => {
            this.logger.warn(`Ping failed: ${error.message}`);
          });
      }
    }, 30000);
  }
}

interface PendingAction {
  resolve: (value: AMIResponse) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}
