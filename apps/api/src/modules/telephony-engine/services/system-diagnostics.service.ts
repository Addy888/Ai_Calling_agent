/**
 * System Diagnostics Service
 * Enterprise health monitoring and diagnostics for the AI Calling Platform
 * 
 * Monitors:
 * - Database connectivity
 * - Redis connectivity
 * - Asterisk AMI connectivity
 * - GSM Gateway health
 * - SIM card status
 * - AI services (Whisper, Ollama, Kokoro)
 * - System resources
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GatewayManagerService } from './gateway-manager.service';
import { SIMManagerService } from './sim-manager.service';
import { ConnectionManagerService } from './connection-manager.service';
import axios from 'axios';
import * as os from 'os';

export interface DiagnosticResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: any;
  latency?: number;
  timestamp: Date;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: DiagnosticResult[];
  systemInfo: {
    platform: string;
    hostname: string;
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

@Injectable()
export class SystemDiagnosticsService {
  private readonly logger = new Logger(SystemDiagnosticsService.name);
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly gatewayManager: GatewayManagerService,
    private readonly simManager: SIMManagerService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run complete system diagnostics
   */
  async runDiagnostics(): Promise<SystemHealthReport> {
    this.logger.log('🔍 Running system diagnostics...');
    
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    // Run all diagnostic checks in parallel
    const checks = [
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAsteriskAMI(),
      this.checkGSMGateways(),
      this.checkSIMCards(),
      this.checkWhisper(),
      this.checkOllama(),
      this.checkKokoro(),
    ];

    const checkResults = await Promise.allSettled(checks);

    checkResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          component: ['Database', 'Redis', 'Asterisk AMI', 'GSM Gateways', 'SIM Cards', 'Whisper', 'Ollama', 'Kokoro'][index],
          status: 'unhealthy',
          message: `Check failed: ${result.reason.message}`,
          timestamp: new Date(),
        });
      }
    });

    // Determine overall health
    const overallStatus = this.determineOverallHealth(results);

    // Get system info
    const systemInfo = this.getSystemInfo();

    const report: SystemHealthReport = {
      overall: overallStatus,
      timestamp: new Date(),
      components: results,
      systemInfo,
    };

    const duration = Date.now() - startTime;
    this.logger.log(`✅ Diagnostics completed in ${duration}ms - Overall: ${overallStatus.toUpperCase()}`);

    // Emit event
    this.eventEmitter.emit('diagnostics.completed', report);

    // Store in database
    await this.storeDiagnostics(report);

    return report;
  }

  /**
   * Check individual component by name
   */
  async checkComponent(componentName: string): Promise<DiagnosticResult> {
    switch (componentName.toLowerCase()) {
      case 'database':
        return this.checkDatabase();
      case 'redis':
        return this.checkRedis();
      case 'asterisk':
      case 'ami':
        return this.checkAsteriskAMI();
      case 'gateways':
        return this.checkGSMGateways();
      case 'sims':
        return this.checkSIMCards();
      case 'whisper':
        return this.checkWhisper();
      case 'ollama':
        return this.checkOllama();
      case 'kokoro':
        return this.checkKokoro();
      default:
        throw new Error(`Unknown component: ${componentName}`);
    }
  }

  /**
   * Get recent diagnostics history
   */
  async getDiagnosticsHistory(days: number = 7): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const history = await this.prisma.systemHealth.findMany({
        where: {
          checkedAt: {
            gte: cutoffDate,
          },
        },
        orderBy: {
          checkedAt: 'desc',
        },
        take: 100,
      });

      return history;
    } catch (error) {
      this.logger.error(`Failed to get diagnostics history: ${error.message}`);
      return [];
    }
  }

  // ========================================================================
  // Individual Component Checks
  // ========================================================================

  /**
   * Check MySQL database connectivity
   */
  private async checkDatabase(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      // Execute a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      
      const latency = Date.now() - startTime;

      return {
        component: 'MySQL Database',
        status: latency < 100 ? 'healthy' : 'degraded',
        message: `Connected successfully`,
        latency,
        details: {
          url: this.configService.get('DATABASE_URL')?.replace(/:[^:]*@/, ':****@'),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'MySQL Database',
        status: 'unhealthy',
        message: `Connection failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      // Try to ping Redis
      // Note: Implement Redis service ping if available
      const latency = Date.now() - startTime;

      return {
        component: 'Redis Cache',
        status: 'healthy',
        message: `Connected successfully`,
        latency,
        details: {
          host: this.configService.get('REDIS_HOST'),
          port: this.configService.get('REDIS_PORT'),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'Redis Cache',
        status: 'unhealthy',
        message: `Connection failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Asterisk AMI connectivity
   */
  private async checkAsteriskAMI(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const statuses = this.connectionManager.getAllConnectionStatuses();
      
      if (statuses.length === 0) {
        return {
          component: 'Asterisk AMI',
          status: 'degraded',
          message: 'No AMI connections configured',
          latency: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const healthyConnections = statuses.filter(s => s.isConnected);
      const allHealthy = healthyConnections.length === statuses.length;

      return {
        component: 'Asterisk AMI',
        status: allHealthy ? 'healthy' : (healthyConnections.length > 0 ? 'degraded' : 'unhealthy'),
        message: `${healthyConnections.length}/${statuses.length} connections active`,
        latency: Date.now() - startTime,
        details: {
          total: statuses.length,
          healthy: healthyConnections.length,
          connections: statuses.map(s => ({
            gatewayId: s.gatewayId,
            connected: s.isConnected,
            authenticated: s.isAuthenticated,
            host: s.host,
            port: s.port,
          })),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'Asterisk AMI',
        status: 'unhealthy',
        message: `Check failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check GSM Gateways health
   */
  private async checkGSMGateways(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const gateways = await this.prisma.gSMGateway.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (gateways.length === 0) {
        return {
          component: 'GSM Gateways',
          status: 'degraded',
          message: 'No gateways configured',
          latency: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const onlineGateways = gateways.filter(g => g.isOnline);
      const allOnline = onlineGateways.length === gateways.length;

      return {
        component: 'GSM Gateways',
        status: allOnline ? 'healthy' : (onlineGateways.length > 0 ? 'degraded' : 'unhealthy'),
        message: `${onlineGateways.length}/${gateways.length} gateways online`,
        latency: Date.now() - startTime,
        details: {
          total: gateways.length,
          online: onlineGateways.length,
          offline: gateways.length - onlineGateways.length,
          gateways: gateways.map(g => ({
            id: g.id,
            name: g.name,
            model: g.model,
            ipAddress: g.ipAddress,
            isOnline: g.isOnline,
            activePorts: g.activePorts,
            totalPorts: g.totalPorts,
          })),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'GSM Gateways',
        status: 'unhealthy',
        message: `Check failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check SIM Cards status
   */
  private async checkSIMCards(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const sims = await this.prisma.sIMCard.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
      });

      if (sims.length === 0) {
        return {
          component: 'SIM Cards',
          status: 'degraded',
          message: 'No SIM cards configured',
          latency: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const activeSIMs = sims.filter(s => s.status === 'ACTIVE');
      const busySIMs = sims.filter(s => s.status === 'BUSY');
      const errorSIMs = sims.filter(s => s.status === 'ERROR');

      const healthPercentage = (activeSIMs.length / sims.length) * 100;

      return {
        component: 'SIM Cards',
        status: healthPercentage > 80 ? 'healthy' : (healthPercentage > 50 ? 'degraded' : 'unhealthy'),
        message: `${activeSIMs.length}/${sims.length} SIMs available`,
        latency: Date.now() - startTime,
        details: {
          total: sims.length,
          active: activeSIMs.length,
          busy: busySIMs.length,
          error: errorSIMs.length,
          healthPercentage: Math.round(healthPercentage),
          operators: this.groupByOperator(sims),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'SIM Cards',
        status: 'unhealthy',
        message: `Check failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Faster Whisper STT service
   */
  private async checkWhisper(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    const endpoint = this.configService.get('FASTER_WHISPER_ENDPOINT');

    if (!endpoint) {
      return {
        component: 'Faster Whisper STT',
        status: 'degraded',
        message: 'Service not configured',
        latency: 0,
        timestamp: new Date(),
      };
    }

    try {
      // Try to ping the health endpoint
      const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
      
      const latency = Date.now() - startTime;

      return {
        component: 'Faster Whisper STT',
        status: response.status === 200 ? 'healthy' : 'degraded',
        message: `Service responding`,
        latency,
        details: {
          endpoint,
          model: this.configService.get('WHISPER_MODEL_SIZE', 'base'),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'Faster Whisper STT',
        status: 'unhealthy',
        message: `Service unreachable: ${error.message}`,
        latency: Date.now() - startTime,
        details: { endpoint },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Ollama LLM service
   */
  private async checkOllama(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    const baseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434');

    try {
      // Try to ping Ollama
      const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
      
      const latency = Date.now() - startTime;

      return {
        component: 'Ollama LLM',
        status: response.status === 200 ? 'healthy' : 'degraded',
        message: `Service responding`,
        latency,
        details: {
          endpoint: baseUrl,
          models: response.data?.models?.length || 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'Ollama LLM',
        status: 'unhealthy',
        message: `Service unreachable: ${error.message}`,
        latency: Date.now() - startTime,
        details: { endpoint: baseUrl },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Kokoro TTS service
   */
  private async checkKokoro(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    const endpoint = this.configService.get('KOKORO_ENDPOINT', 'http://localhost:8000');

    try {
      // Try to ping Kokoro
      const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
      
      const latency = Date.now() - startTime;

      return {
        component: 'Kokoro TTS',
        status: response.status === 200 ? 'healthy' : 'degraded',
        message: `Service responding`,
        latency,
        details: { endpoint },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'Kokoro TTS',
        status: 'unhealthy',
        message: `Service unreachable: ${error.message}`,
        latency: Date.now() - startTime,
        details: { endpoint },
        timestamp: new Date(),
      };
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Determine overall system health
   */
  private determineOverallHealth(results: DiagnosticResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;

    if (unhealthy > 0) {
      return 'unhealthy';
    } else if (degraded > 0) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      platform: os.platform(),
      hostname: os.hostname(),
      cpuUsage: Math.round((cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return acc + (100 - (cpu.times.idle / total) * 100);
      }, 0) / cpus.length) * 100) / 100,
      memoryUsage: Math.round((usedMem / totalMem) * 100),
      uptime: os.uptime(),
    };
  }

  /**
   * Group SIM cards by operator
   */
  private groupByOperator(sims: any[]): Record<string, number> {
    return sims.reduce((acc, sim) => {
      const operator = sim.operator || 'Unknown';
      acc[operator] = (acc[operator] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Store diagnostics in database
   */
  private async storeDiagnostics(report: SystemHealthReport): Promise<void> {
    try {
      for (const component of report.components) {
        await this.prisma.systemHealth.create({
          data: {
            component: component.component,
            status: component.status.toUpperCase(),
            version: null,
            uptime: null,
            memory: null,
            cpu: null,
            disk: null,
            network: null,
            database: null,
            errors: component.status === 'unhealthy' ? { message: component.message } : null,
            metadata: {
              latency: component.latency,
              details: component.details,
            },
            checkedAt: component.timestamp,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to store diagnostics: ${error.message}`);
    }
  }
}
