import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SIMStatus } from '@prisma/client';
import { AsteriskProductionAMIService } from '../telephony-engine/services/asterisk-production-ami.service';
import { CampaignCallDispatcherService } from '../telephony-engine/services/campaign-call-dispatcher.service';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type HealthStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'DEGRADED';

export interface ComponentHealth {
  status: HealthStatus;
  message: string;
  details?: any;
  lastCheck: Date;
}

export interface SystemHealth {
  redis: ComponentHealth;
  bullmq: ComponentHealth;
  asterisk: ComponentHealth;
  ami: ComponentHealth;
  gateway: ComponentHealth;
  sim: ComponentHealth;
  whisper: ComponentHealth;
  ollama: ComponentHealth;
  kokoro: ComponentHealth;
  database: ComponentHealth;
  overall: HealthStatus;
  timestamp: Date;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  
  // Cache health status
  private cachedHealth: SystemHealth | null = null;
  private lastHealthCheck: Date | null = null;
  private readonly cacheTimeout = 5000; // 5 seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly asteriskAMI: AsteriskProductionAMIService,
    private readonly campaignDispatcher: CampaignCallDispatcherService,
  ) {}

  /**
   * Get comprehensive system health
   */
  async getSystemHealth(forceRefresh = false): Promise<SystemHealth> {
    // Return cached health if available and recent
    if (
      !forceRefresh &&
      this.cachedHealth &&
      this.lastHealthCheck &&
      Date.now() - this.lastHealthCheck.getTime() < this.cacheTimeout
    ) {
      return this.cachedHealth;
    }

    const [
      redis,
      bullmq,
      asterisk,
      ami,
      gateway,
      sim,
      whisper,
      ollama,
      kokoro,
      database,
    ] = await Promise.all([
      this.checkRedis(),
      this.checkBullMQ(),
      this.checkAsteriskTCP(),
      this.checkAsteriskAMI(),
      this.checkGateway(),
      this.checkSIM(),
      this.checkWhisper(),
      this.checkOllama(),
      this.checkKokoro(),
      this.checkDatabase(),
    ]);

    // Determine overall status
    const statuses = [redis, bullmq, asterisk, ami, gateway, sim, whisper, ollama, kokoro, database];
    let overall: HealthStatus = 'ONLINE';
    
    if (statuses.some(s => s.status === 'OFFLINE')) {
      overall = 'DEGRADED';
    }
    if (statuses.some(s => s.status === 'WARNING')) {
      overall = 'WARNING';
    }
    if (statuses.filter(s => s.status === 'OFFLINE').length > 3) {
      overall = 'OFFLINE';
    }

    const health: SystemHealth = {
      redis,
      bullmq,
      asterisk,
      ami,
      gateway,
      sim,
      whisper,
      ollama,
      kokoro,
      database,
      overall,
      timestamp: new Date(),
    };

    this.cachedHealth = health;
    this.lastHealthCheck = new Date();

    return health;
  }

  /**
   * Check Redis health and version
   */
  private async checkRedis(): Promise<ComponentHealth> {
    try {
      const { default: Redis } = await import('ioredis');
      const redisHost = this.configService.get('REDIS_HOST', 'localhost');
      const redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'));
      const redisPassword = this.configService.get('REDIS_PASSWORD');

      const client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await client.connect();
      await client.ping();
      
      const info = await client.info('server');
      const versionMatch = info.match(/redis_version:(\d+)\.(\d+)\.(\d+)/);
      let version = 'unknown';
      let status: HealthStatus = 'ONLINE';
      let message = 'Connected';

      if (versionMatch) {
        const [, major, minor, patch] = versionMatch;
        version = `${major}.${minor}.${patch}`;
        const majorVersion = parseInt(major);

        if (majorVersion < 5) {
          status = 'WARNING';
          message = `Version ${version} is too old (need >= 5.0.0)`;
        }
      }

      await client.quit();

      return {
        status,
        message,
        details: {
          host: redisHost,
          port: redisPort,
          version,
          connected: true,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: `Connection failed: ${error.message}`,
        details: {
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get('REDIS_PORT', '6379'),
          connected: false,
          error: error.code || error.message,
        },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check BullMQ queue health
   */
  private async checkBullMQ(): Promise<ComponentHealth> {
    try {
      const stats = await this.campaignDispatcher.getQueueStats();
      const isConnected = this.campaignDispatcher['redisConnected'];

      if (!isConnected) {
        return {
          status: 'OFFLINE',
          message: 'Queue not initialized (Redis unavailable or version < 5)',
          details: {
            enabled: false,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
          },
          lastCheck: new Date(),
        };
      }

      return {
        status: 'ONLINE',
        message: 'Queue operational',
        details: {
          enabled: true,
          ...stats,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: `Queue error: ${error.message}`,
        details: {
          enabled: false,
          error: error.message,
        },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Asterisk TCP connectivity
   */
  private async checkAsteriskTCP(): Promise<ComponentHealth> {
    const host = this.configService.get('ASTERISK_HOST', '192.168.1.4');
    const port = parseInt(this.configService.get('ASTERISK_AMI_PORT', '5038'));

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 3000;

      const timer = setTimeout(() => {
        socket.destroy();
        resolve({
          status: 'OFFLINE',
          message: 'TCP connection timeout',
          details: {
            host,
            port,
            reachable: false,
            error: 'ETIMEDOUT',
          },
          lastCheck: new Date(),
        });
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({
          status: 'ONLINE',
          message: 'TCP connection successful',
          details: {
            host,
            port,
            reachable: true,
          },
          lastCheck: new Date(),
        });
      });

      socket.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        socket.destroy();
        resolve({
          status: 'OFFLINE',
          message: `TCP connection failed: ${error.message}`,
          details: {
            host,
            port,
            reachable: false,
            error: error.code || error.message,
          },
          lastCheck: new Date(),
        });
      });

      socket.connect(port, host);
    });
  }

  /**
   * Check Asterisk AMI authentication
   */
  private async checkAsteriskAMI(): Promise<ComponentHealth> {
    try {
      const health = this.asteriskAMI.getHealth();

      let status: HealthStatus = 'OFFLINE';
      let message = 'Not connected';

      if (health.status === 'ONLINE') {
        status = 'ONLINE';
        message = 'Connected and authenticated';
      } else if (health.status === 'CONNECTING') {
        status = 'WARNING';
        message = `Connecting (attempt ${health.reconnectAttempts}/${health.maxReconnectAttempts})`;
      } else {
        message = `Offline (attempted ${health.reconnectAttempts}/${health.maxReconnectAttempts} times)`;
      }

      return {
        status,
        message,
        details: {
          ...health,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: `AMI error: ${error.message}`,
        details: {
          error: error.message,
        },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Gateway health
   */
  private async checkGateway(): Promise<ComponentHealth> {
    try {
      const gatewayHost = this.configService.get('GSM_GATEWAY_HOST', '192.168.1.8');
      const gatewayPort = parseInt(this.configService.get('GSM_GATEWAY_PORT', '5060'));

      // Simple ping check
      return new Promise((resolve) => {
        exec(`ping -n 1 -w 1000 ${gatewayHost}`, (error, stdout) => {
          if (error) {
            resolve({
              status: 'OFFLINE',
              message: 'Gateway unreachable',
              details: {
                host: gatewayHost,
                port: gatewayPort,
                reachable: false,
              },
              lastCheck: new Date(),
            });
          } else {
            resolve({
              status: 'ONLINE',
              message: 'Gateway reachable',
              details: {
                host: gatewayHost,
                port: gatewayPort,
                reachable: true,
              },
              lastCheck: new Date(),
            });
          }
        });
      });
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: `Gateway check failed: ${error.message}`,
        details: { error: error.message },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check SIM cards status
   */
  private async checkSIM(): Promise<ComponentHealth> {
    try {
      const sims = await this.prisma.sIMCard.findMany({
        where: { isActive: true },
        take: 10,
      });

      // Count SIMs by status
      // ACTIVE = available for use
      // BUSY = currently in use on a call
      const activeSims = sims.filter(s => s.status === SIMStatus.ACTIVE).length;
      const busySims = sims.filter(s => s.status === SIMStatus.BUSY).length;
      const totalSims = sims.length;

      let status: HealthStatus = 'ONLINE';
      let message = `${activeSims}/${totalSims} SIM cards available`;

      if (totalSims === 0) {
        status = 'OFFLINE';
        message = 'No SIM cards configured';
      } else if (activeSims === 0) {
        status = 'WARNING';
        message = 'No SIM cards available';
      }

      return {
        status,
        message,
        details: {
          total: totalSims,
          active: activeSims,
          busy: busySims,
          inactive: sims.filter(s => s.status === SIMStatus.INACTIVE).length,
          error: sims.filter(s => s.status === SIMStatus.ERROR).length,
          blocked: sims.filter(s => s.status === SIMStatus.BLOCKED).length,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: `SIM check failed: ${error.message}`,
        details: { error: error.message },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Whisper service
   */
  private async checkWhisper(): Promise<ComponentHealth> {
    const endpoint = this.configService.get('FASTER_WHISPER_ENDPOINT', 'http://localhost:9000');
    
    try {
      const response = await fetch(`${endpoint}/health`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return {
          status: 'ONLINE',
          message: 'Whisper service running',
          details: { endpoint },
          lastCheck: new Date(),
        };
      } else {
        return {
          status: 'OFFLINE',
          message: `Whisper service returned ${response.status}`,
          details: { endpoint, statusCode: response.status },
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: 'Whisper service unreachable',
        details: { endpoint, error: error.message },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Ollama service
   */
  private async checkOllama(): Promise<ComponentHealth> {
    const baseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434');
    
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return {
          status: 'ONLINE',
          message: 'Ollama service running',
          details: { baseUrl },
          lastCheck: new Date(),
        };
      } else {
        return {
          status: 'OFFLINE',
          message: `Ollama service returned ${response.status}`,
          details: { baseUrl, statusCode: response.status },
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: 'Ollama service unreachable',
        details: { baseUrl, error: error.message },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Kokoro TTS service
   */
  private async checkKokoro(): Promise<ComponentHealth> {
    const endpoint = this.configService.get('KOKORO_ENDPOINT', 'http://localhost:5000');
    
    try {
      const response = await fetch(`${endpoint}/health`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return {
          status: 'ONLINE',
          message: 'Kokoro TTS running',
          details: { endpoint },
          lastCheck: new Date(),
        };
      } else {
        return {
          status: 'OFFLINE',
          message: `Kokoro TTS returned ${response.status}`,
          details: { endpoint, statusCode: response.status },
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: 'Kokoro TTS unreachable',
        details: { endpoint, error: error.message },
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ONLINE',
        message: 'Database connected',
        details: {
          connected: true,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'OFFLINE',
        message: `Database error: ${error.message}`,
        details: {
          connected: false,
          error: error.message,
        },
        lastCheck: new Date(),
      };
    }
  }
}
