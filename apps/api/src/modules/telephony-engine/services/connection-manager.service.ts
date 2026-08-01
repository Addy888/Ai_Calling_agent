/**
 * Connection Manager Service
 * Manages persistent AMI/ARI connections to Asterisk servers
 * Handles connection pooling, auto-reconnect, and health monitoring
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as AsteriskManager from 'asterisk-manager';

@Injectable()
export class ConnectionManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private connections: Map<string, AsteriskConnection> = new Map();
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('🔌 Connection Manager Service initialized');
    await this.initializeDefaultConnection();
    this.startHealthMonitoring();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Connection Manager...');
    await this.disconnectAll();
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Get or create connection for a gateway
   */
  async getConnection(gatewayId: string, config?: AsteriskConnectionConfig): Promise<any> {
    let connection = this.connections.get(gatewayId);

    if (connection && connection.isConnected) {
      return connection.ami;
    }

    // Create new connection
    if (!connection) {
      if (!config) {
        throw new Error(`Connection config required for gateway: ${gatewayId}`);
      }

      connection = await this.createConnection(gatewayId, config);
    } else {
      // Reconnect existing connection
      await this.reconnect(gatewayId);
    }

    return connection.ami;
  }

  /**
   * Create a new AMI connection
   */
  private async createConnection(
    gatewayId: string,
    config: AsteriskConnectionConfig
  ): Promise<AsteriskConnection> {
    this.logger.log(`📞 Creating AMI connection for gateway: ${gatewayId}`);
    this.logger.log(`   Host: ${config.host}:${config.port}`);

    const ami = new AsteriskManager(
      config.port,
      config.host,
      config.username,
      config.secret,
      true // Enable events
    );

    const connection: AsteriskConnection = {
      gatewayId,
      ami,
      config,
      isConnected: false,
      lastConnected: null,
      lastDisconnected: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      reconnectDelay: config.reconnectDelay || 5000,
    };

    // Setup event handlers
    this.setupConnectionHandlers(connection);

    // Connect
    await this.connect(connection);

    // Store connection
    this.connections.set(gatewayId, connection);

    return connection;
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(connection: AsteriskConnection): void {
    const { ami, gatewayId } = connection;

    // Connection successful
    ami.on('connect', () => {
      this.logger.log(`✅ Connected to Asterisk: ${gatewayId}`);
      connection.isConnected = true;
      connection.lastConnected = new Date();
      connection.reconnectAttempts = 0;

      this.eventEmitter.emit('asterisk.connected', {
        gatewayId,
        timestamp: new Date(),
      });
    });

    // Connection error
    ami.on('error', (error: Error) => {
      this.logger.error(`❌ AMI Error [${gatewayId}]: ${error.message}`);
      connection.isConnected = false;

      this.eventEmitter.emit('asterisk.error', {
        gatewayId,
        error: error.message,
        timestamp: new Date(),
      });
    });

    // Disconnected
    ami.on('disconnect', () => {
      this.logger.warn(`⚠️ Disconnected from Asterisk: ${gatewayId}`);
      connection.isConnected = false;
      connection.lastDisconnected = new Date();

      this.eventEmitter.emit('asterisk.disconnected', {
        gatewayId,
        timestamp: new Date(),
      });

      // Auto-reconnect
      this.scheduleReconnect(connection);
    });

    // Reconnection
    ami.on('reconnection', () => {
      this.logger.log(`🔄 Reconnecting to Asterisk: ${gatewayId}...`);
      connection.reconnectAttempts++;
    });

    // Manager events
    ami.on('managerevent', (event: any) => {
      this.handleManagerEvent(gatewayId, event);
    });

    // Response events
    ami.on('response', (response: any) => {
      this.logger.debug(`[${gatewayId}] Response: ${response.response}`);
    });
  }

  /**
   * Connect to Asterisk
   */
  private async connect(connection: AsteriskConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const { ami } = connection;

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      ami.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      ami.once('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Keep connection alive
      ami.keepConnected();
    });
  }

  /**
   * Reconnect to Asterisk
   */
  private async reconnect(gatewayId: string): Promise<void> {
    const connection = this.connections.get(gatewayId);

    if (!connection) {
      throw new Error(`Connection not found: ${gatewayId}`);
    }

    if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
      this.logger.error(`❌ Max reconnect attempts reached for: ${gatewayId}`);
      
      this.eventEmitter.emit('asterisk.reconnect_failed', {
        gatewayId,
        attempts: connection.reconnectAttempts,
        timestamp: new Date(),
      });

      return;
    }

    this.logger.log(`🔄 Reconnecting to Asterisk: ${gatewayId} (attempt ${connection.reconnectAttempts + 1})`);

    try {
      connection.ami.disconnect();
      await new Promise(resolve => setTimeout(resolve, connection.reconnectDelay));
      await this.connect(connection);
    } catch (error) {
      this.logger.error(`Failed to reconnect: ${error.message}`);
      this.scheduleReconnect(connection);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(connection: AsteriskConnection): void {
    if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
      this.logger.error(`❌ Max reconnect attempts reached for: ${connection.gatewayId}`);
      return;
    }

    const delay = connection.reconnectDelay * Math.pow(2, connection.reconnectAttempts); // Exponential backoff

    this.logger.log(`⏱️ Scheduling reconnect in ${delay}ms for: ${connection.gatewayId}`);

    setTimeout(() => {
      this.reconnect(connection.gatewayId).catch(error => {
        this.logger.error(`Reconnect failed: ${error.message}`);
      });
    }, delay);
  }

  /**
   * Disconnect from Asterisk
   */
  async disconnect(gatewayId: string): Promise<void> {
    const connection = this.connections.get(gatewayId);

    if (!connection) {
      return;
    }

    this.logger.log(`📴 Disconnecting from Asterisk: ${gatewayId}`);

    try {
      connection.ami.disconnect();
      connection.isConnected = false;
      this.connections.delete(gatewayId);
    } catch (error) {
      this.logger.error(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    this.logger.log('📴 Disconnecting all Asterisk connections...');

    const disconnectPromises = Array.from(this.connections.keys()).map(gatewayId =>
      this.disconnect(gatewayId)
    );

    await Promise.all(disconnectPromises);

    this.logger.log('✅ All connections disconnected');
  }

  /**
   * Send AMI action
   */
  async sendAction(gatewayId: string, action: any): Promise<any> {
    const connection = this.connections.get(gatewayId);

    if (!connection || !connection.isConnected) {
      throw new Error(`Not connected to gateway: ${gatewayId}`);
    }

    return new Promise((resolve, reject) => {
      connection.ami.action(action, (err: Error, res: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * Check connection health
   */
  async checkHealth(gatewayId: string): Promise<boolean> {
    const connection = this.connections.get(gatewayId);

    if (!connection || !connection.isConnected) {
      return false;
    }

    try {
      const response = await this.sendAction(gatewayId, { action: 'Ping' });
      return response && response.response === 'Success';
    } catch (error) {
      this.logger.error(`Health check failed for ${gatewayId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(gatewayId: string): ConnectionStatus {
    const connection = this.connections.get(gatewayId);

    if (!connection) {
      return {
        gatewayId,
        isConnected: false,
        isAuthenticated: false,
        status: 'NOT_FOUND',
      };
    }

    return {
      gatewayId,
      isConnected: connection.isConnected,
      isAuthenticated: connection.isConnected, // If connected, assume authenticated
      status: connection.isConnected ? 'CONNECTED' : 'DISCONNECTED',
      host: connection.config.host,
      port: connection.config.port,
      lastConnected: connection.lastConnected,
      lastDisconnected: connection.lastDisconnected,
      reconnectAttempts: connection.reconnectAttempts,
      maxReconnectAttempts: connection.maxReconnectAttempts,
    };
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): ConnectionStatus[] {
    return Array.from(this.connections.keys()).map(gatewayId =>
      this.getConnectionStatus(gatewayId)
    );
  }

  /**
   * Handle manager events
   */
  private handleManagerEvent(gatewayId: string, event: any): void {
    const eventName = event.event;

    // Emit to event emitter for other services to listen
    this.eventEmitter.emit('asterisk.event', {
      gatewayId,
      eventName,
      event,
      timestamp: new Date(),
    });

    // Log important events
    if (['DialBegin', 'DialEnd', 'Hangup', 'Newchannel'].includes(eventName)) {
      this.logger.debug(`[${gatewayId}] Event: ${eventName}`);
    }
  }

  /**
   * Initialize default connection
   */
  private async initializeDefaultConnection(): Promise<void> {
    const enabled = this.configService.get('ASTERISK_ENABLED', 'true') === 'true';

    if (!enabled) {
      this.logger.log('⏭️ Asterisk disabled, skipping default connection');
      return;
    }

    const host = this.configService.get('ASTERISK_HOST', 'localhost');
    const port = parseInt(this.configService.get('ASTERISK_AMI_PORT', '5038'));
    const username = this.configService.get('ASTERISK_AMI_USERNAME', 'admin');
    const secret = this.configService.get('ASTERISK_AMI_SECRET');

    if (!secret) {
      this.logger.warn('⚠️ ASTERISK_AMI_SECRET not set, skipping default connection');
      return;
    }

    try {
      await this.createConnection('default', {
        host,
        port,
        username,
        secret,
        maxReconnectAttempts: 10,
        reconnectDelay: 5000,
      });

      this.logger.log('✅ Default Asterisk connection initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize default connection: ${error.message}`);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const intervalMs = this.configService.get('ASTERISK_HEALTH_CHECK_INTERVAL_MS', 30000);

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        this.logger.error(`Health monitoring error: ${error.message}`);
      });
    }, intervalMs);

    this.logger.log(`❤️ Health monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks(): Promise<void> {
    const gatewayIds = Array.from(this.connections.keys());

    for (const gatewayId of gatewayIds) {
      try {
        const healthy = await this.checkHealth(gatewayId);

        if (!healthy) {
          this.logger.warn(`⚠️ Health check failed for: ${gatewayId}`);
          
          this.eventEmitter.emit('asterisk.health_check_failed', {
            gatewayId,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        this.logger.error(`Health check error for ${gatewayId}: ${error.message}`);
      }
    }
  }
}

/**
 * Asterisk Connection Configuration
 */
export interface AsteriskConnectionConfig {
  host: string;
  port: number;
  username: string;
  secret: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Asterisk Connection Interface
 */
interface AsteriskConnection {
  gatewayId: string;
  ami: any;
  config: AsteriskConnectionConfig;
  isConnected: boolean;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

/**
 * Connection Status Interface
 */
export interface ConnectionStatus {
  gatewayId: string;
  isConnected: boolean;
  isAuthenticated?: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'NOT_FOUND';
  host?: string;
  port?: number;
  lastConnected?: Date | null;
  lastDisconnected?: Date | null;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}
