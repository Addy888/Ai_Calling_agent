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
  private reconnectDelay = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
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
    
    // Don't await connect - let it run in background
    // Application should start even if Asterisk is unavailable
    this.connect().catch((error) => {
      this.logger.error(`❌ Initial Asterisk connection failed: ${error.message}`);
      this.logger.warn('⚠️  Asterisk AMI will retry connection in background');
      this.logger.warn('⚠️  Application will continue without telephony features');
    });
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
      this.logger.warn('Already connected to Asterisk');
      return;
    }

    return new Promise((resolve, reject) => {
      this.logger.log(`🔌 Connecting to Asterisk AMI at ${this.host}:${this.port}...`);
      this.logger.log(`   Host: ${this.host}`);
      this.logger.log(`   Port: ${this.port} (AMI port, not SIP)`);
      this.logger.log(`   Username: ${this.username}`);

      this.socket = new net.Socket();
      this.socket.setKeepAlive(true, 60000);
      this.socket.setTimeout(10000); // Reduced to 10s for faster failure detection

      let greeterReceived = false;
      let tcpConnected = false;

      // Connection success
      this.socket.on('connect', () => {
        tcpConnected = true;
        this.logger.log(`✅ TCP connected to ${this.host}:${this.port}`);
        this.connected = true;
        this.reconnectAttempts = 0;
        // Wait for Asterisk greeter message before sending login
      });

      // Data received
      this.socket.on('data', (data: Buffer) => {
        const dataStr = data.toString();
        
        // Log first message received (should be Asterisk greeter)
        if (!greeterReceived) {
          this.logger.log(`📨 Received Asterisk greeter: ${dataStr.substring(0, 100).replace(/\r\n/g, ' ')}`);
          greeterReceived = true;
          
          // Send login after receiving greeter
          this.logger.log(`🔐 Sending login credentials...`);
          this.login()
            .then(() => {
              this.logger.log(`✅ Login credentials sent`);
            })
            .catch((error) => {
              this.logger.error(`❌ Failed to send login: ${error.message}`);
              this.socket?.destroy();
              reject(error);
            });
        }
        
        this.handleData(dataStr);
      });

      // Error - Most critical handler for TCP connection failures
      this.socket.on('error', (error: NodeJS.ErrnoException) => {
        if (!tcpConnected) {
          // TCP connection never established
          this.logger.error('═══════════════════════════════════════════════════════');
          this.logger.error('❌ ASTERISK AMI TCP CONNECTION FAILED');
          this.logger.error('═══════════════════════════════════════════════════════');
          this.logger.error(`Host: ${this.host}`);
          this.logger.error(`Port: ${this.port}`);
          this.logger.error(`Error: ${error.message}`);
          this.logger.error(`Code: ${error.code || 'N/A'}`);
          this.logger.error('');
          
          if (error.code === 'ECONNREFUSED') {
            this.logger.error('🔍 Diagnostic: Connection Refused');
            this.logger.error('   Possible causes:');
            this.logger.error('   1. Asterisk server is not running');
            this.logger.error('   2. AMI is not enabled in manager.conf');
            this.logger.error('   3. Firewall blocking port ' + this.port);
            this.logger.error('   4. Wrong IP address: ' + this.host);
            this.logger.error('   5. Wrong port: ' + this.port + ' (should be AMI port, not SIP 5060/5061)');
          } else if (error.code === 'ETIMEDOUT') {
            this.logger.error('🔍 Diagnostic: Connection Timeout');
            this.logger.error('   Possible causes:');
            this.logger.error('   1. Network connectivity issue');
            this.logger.error('   2. Firewall dropping packets');
            this.logger.error('   3. Host unreachable: ' + this.host);
            this.logger.error('   4. Asterisk server not responding');
          } else if (error.code === 'EHOSTUNREACH') {
            this.logger.error('🔍 Diagnostic: Host Unreachable');
            this.logger.error('   Possible causes:');
            this.logger.error('   1. Wrong IP address: ' + this.host);
            this.logger.error('   2. Network routing issue');
            this.logger.error('   3. Host is offline');
          } else if (error.code === 'ENETUNREACH') {
            this.logger.error('🔍 Diagnostic: Network Unreachable');
            this.logger.error('   Possible causes:');
            this.logger.error('   1. No network connectivity');
            this.logger.error('   2. Wrong network configuration');
          }
          
          this.logger.error('');
          this.logger.error('⚠️  Asterisk AMI Status: OFFLINE');
          this.logger.error(`⏳ Will retry connection in ${this.getNextRetryDelay()}ms`);
          this.logger.error('✅ Application continues without telephony features');
          this.logger.error('═══════════════════════════════════════════════════════');
        } else {
          // Connection was established but failed later
          this.logger.error(`❌ Connection error after TCP connect: ${error.message}`);
        }
        
        this.connected = false;
        this.authenticated = false;
        this.socket?.destroy();
        reject(error);
      });

      // Closed
      this.socket.on('close', () => {
        if (tcpConnected) {
          this.logger.warn('⚠️  Asterisk AMI connection closed');
        }
        this.connected = false;
        this.authenticated = false;
        this.scheduleReconnect();
      });

      // Timeout
      this.socket.on('timeout', () => {
        this.logger.error('═══════════════════════════════════════════════════════');
        this.logger.error('❌ ASTERISK AMI SOCKET TIMEOUT');
        this.logger.error('═══════════════════════════════════════════════════════');
        this.logger.error(`Host: ${this.host}:${this.port}`);
        this.logger.error(`TCP Connected: ${tcpConnected}`);
        this.logger.error(`Greeter Received: ${greeterReceived}`);
        this.logger.error(`Authenticated: ${this.authenticated}`);
        this.logger.error('');
        
        if (!tcpConnected) {
          this.logger.error('🔍 Diagnostic: TCP connection timeout');
          this.logger.error('   The server is not responding on port ' + this.port);
        } else if (!greeterReceived) {
          this.logger.error('🔍 Diagnostic: No greeter message');
          this.logger.error('   This is NOT an AMI port!');
          this.logger.error('   Expected AMI port: 5038');
          this.logger.error('   Current port: ' + this.port);
        } else if (!this.authenticated) {
          this.logger.error('🔍 Diagnostic: Authentication timeout');
          this.logger.error('   Check credentials in manager.conf');
        }
        
        this.logger.error('');
        this.logger.error('⚠️  Asterisk AMI Status: OFFLINE');
        this.logger.error('✅ Application continues without telephony features');
        this.logger.error('═══════════════════════════════════════════════════════');
        
        this.socket?.destroy();
        reject(new Error('Socket timeout'));
      });

      // Connect - This is where TCP connection is attempted
      this.logger.log(`📡 Attempting TCP connection to ${this.host}:${this.port}...`);
      
      try {
        this.socket.connect(this.port, this.host);
      } catch (error) {
        this.logger.error(`❌ Failed to initiate connection: ${error.message}`);
        reject(error);
        return;
      }

      // Wait for authentication
      const authTimeout = setTimeout(() => {
        if (!this.authenticated) {
          this.logger.error('❌ Authentication timeout after 10 seconds');
          this.socket?.destroy();
          reject(new Error('Authentication timeout'));
        }
      }, 10000);

      const waitForAuth = () => {
        if (this.authenticated) {
          clearTimeout(authTimeout);
          this.startPing();
          this.logger.log('✅ Asterisk Production AMI ready');
          this.logger.log(`   Successfully connected to AMI at ${this.host}:${this.port}`);
          resolve();
        } else if (this.socket && this.socket.destroyed) {
          clearTimeout(authTimeout);
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
    status: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    nextRetryIn?: number;
  } {
    let status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' = 'OFFLINE';
    
    if (this.connected && this.authenticated) {
      status = 'ONLINE';
    } else if (this.reconnectTimer || this.socket) {
      status = 'CONNECTING';
    }

    const health: any = {
      connected: this.connected,
      authenticated: this.authenticated,
      host: this.host,
      port: this.port,
      sipPeer: this.sipPeer,
      activeChannels: this.activeChannels.size,
      lastPing: this.lastPing,
      uptime: this.connected ? Date.now() - this.lastPing.getTime() : 0,
      status,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };

    // Add next retry time if reconnection is scheduled
    if (this.reconnectTimer && this.reconnectAttempts < this.maxReconnectAttempts) {
      health.nextRetryIn = this.getNextRetryDelay();
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
    if (!this.authenticated && parsed.response) {
      if (parsed.response === 'Success' && parsed.message?.toLowerCase().includes('authentication')) {
        this.authenticated = true;
        this.logger.log('✅ Authenticated to Asterisk AMI');
        return;
      } else if (parsed.response === 'Error') {
        this.logger.error(`❌ Authentication failed: ${parsed.message || 'Unknown error'}`);
        this.logger.error(`   Check username and password in manager.conf`);
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
   */
  private getNextRetryDelay(): number {
    // Exponential backoff: 5s, 10s, 20s, 30s, 40s, 50s, 60s (max)
    const delays = [5000, 10000, 20000, 30000, 40000, 50000, 60000];
    const index = Math.min(this.reconnectAttempts, delays.length - 1);
    return delays[index];
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
      this.logger.error('═══════════════════════════════════════════════════════');
      this.logger.error('❌ MAX RECONNECTION ATTEMPTS REACHED');
      this.logger.error('═══════════════════════════════════════════════════════');
      this.logger.error(`Attempted ${this.maxReconnectAttempts} times to reconnect to Asterisk AMI`);
      this.logger.error(`Host: ${this.host}:${this.port}`);
      this.logger.error('');
      this.logger.error('⚠️  Asterisk AMI Status: PERMANENTLY OFFLINE');
      this.logger.error('⚠️  Manual intervention required');
      this.logger.error('✅ Application continues without telephony features');
      this.logger.error('');
      this.logger.error('To fix:');
      this.logger.error('  1. Check Asterisk server status');
      this.logger.error('  2. Verify network connectivity');
      this.logger.error('  3. Verify manager.conf configuration');
      this.logger.error('  4. Restart the application after fixing');
      this.logger.error('═══════════════════════════════════════════════════════');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.getNextRetryDelay();

    this.logger.log(`⏳ Scheduling Asterisk AMI reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000}s`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.logger.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      
      this.connect().catch((error) => {
        // Error already logged in connect(), just continue
        this.logger.debug(`Reconnect attempt ${this.reconnectAttempts} failed: ${error.message}`);
      });
    }, delay);
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
