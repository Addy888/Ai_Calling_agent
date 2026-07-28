/**
 * Gateway Manager Service
 * Manages GSM Gateway registration, health monitoring, and selection
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GatewayManagerService implements OnModuleInit {
  private readonly logger = new Logger(GatewayManagerService.name);
  private gatewayHealthStatus: Map<string, GatewayHealthInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('🌐 Gateway Manager Service initialized');
    await this.loadGateways();
    this.startHealthMonitoring();
  }

  /**
   * Register a new GSM Gateway
   */
  async registerGateway(params: {
    companyId: string;
    name: string;
    ipAddress: string;
    port: number;
    username?: string;
    password?: string;
    model: string;
    manufacturer?: string;
    totalPorts: number;
    metadata?: any;
  }) {
    this.logger.log(`📝 Registering new GSM Gateway: ${params.name}`);
    this.logger.log(`   IP: ${params.ipAddress}:${params.port}`);
    this.logger.log(`   Model: ${params.model}`);
    this.logger.log(`   Ports: ${params.totalPorts}`);

    try {
      const gateway = await this.prisma.gSMGateway.create({
        data: {
          companyId: params.companyId,
          name: params.name,
          ipAddress: params.ipAddress,
          port: params.port,
          username: params.username,
          password: params.password,
          model: params.model,
          manufacturer: params.manufacturer,
          totalPorts: params.totalPorts,
          activePorts: 0,
          status: 'ACTIVE',
          isOnline: false,
          metadata: params.metadata || {},
        },
      });

      this.logger.log(`✅ Gateway registered: ${gateway.id}`);

      // Initialize health status
      this.gatewayHealthStatus.set(gateway.id, {
        gatewayId: gateway.id,
        isOnline: false,
        lastChecked: new Date(),
        consecutiveFailures: 0,
      });

      // Emit event
      this.eventEmitter.emit('gateway.registered', {
        gatewayId: gateway.id,
        name: params.name,
        ipAddress: params.ipAddress,
        timestamp: new Date(),
      });

      return gateway;
    } catch (error) {
      this.logger.error(`❌ Failed to register gateway: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all available gateways for a company
   */
  async getAvailableGateways(companyId: string) {
    try {
      const gateways = await this.prisma.gSMGateway.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          sims: {
            where: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Enrich with health status
      return gateways.map(gateway => ({
        ...gateway,
        health: this.gatewayHealthStatus.get(gateway.id),
        availableSIMs: gateway.sims.filter(sim => sim.status === 'ACTIVE').length,
      }));
    } catch (error) {
      this.logger.error(`Failed to get available gateways: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get gateway by ID
   */
  async getGateway(gatewayId: string) {
    try {
      const gateway = await this.prisma.gSMGateway.findUnique({
        where: { id: gatewayId },
        include: {
          sims: true,
        },
      });

      if (!gateway) {
        throw new Error(`Gateway not found: ${gatewayId}`);
      }

      return {
        ...gateway,
        health: this.gatewayHealthStatus.get(gatewayId),
      };
    } catch (error) {
      this.logger.error(`Failed to get gateway: ${error.message}`);
      throw error;
    }
  }

  /**
   * Select best available gateway for making a call
   * Selection criteria:
   * 1. Online status
   * 2. Available SIM cards
   * 3. Active ports < total ports
   * 4. Health score
   */
  async selectBestGateway(companyId: string): Promise<any> {
    this.logger.log(`🔍 Selecting best gateway for company: ${companyId}`);

    const gateways = await this.getAvailableGateways(companyId);

    if (gateways.length === 0) {
      throw new Error('No available gateways found');
    }

    // Filter online gateways with available SIMs
    const onlineGateways = gateways.filter(
      gw => gw.isOnline && gw.availableSIMs > 0 && gw.activePorts < gw.totalPorts
    );

    if (onlineGateways.length === 0) {
      throw new Error('No online gateways with available capacity found');
    }

    // Sort by health score and available capacity
    const sortedGateways = onlineGateways.sort((a, b) => {
      const aHealth = this.calculateHealthScore(a.health);
      const bHealth = this.calculateHealthScore(b.health);

      if (aHealth !== bHealth) {
        return bHealth - aHealth; // Higher health first
      }

      // If health is equal, prefer gateway with more available capacity
      const aCapacity = (a.totalPorts - a.activePorts) / a.totalPorts;
      const bCapacity = (b.totalPorts - b.activePorts) / b.totalPorts;
      return bCapacity - aCapacity;
    });

    const bestGateway = sortedGateways[0];

    this.logger.log(`✅ Selected gateway: ${bestGateway.name} (${bestGateway.id})`);
    this.logger.log(`   IP: ${bestGateway.ipAddress}:${bestGateway.port}`);
    this.logger.log(`   Active Ports: ${bestGateway.activePorts}/${bestGateway.totalPorts}`);
    this.logger.log(`   Available SIMs: ${bestGateway.availableSIMs}`);

    return bestGateway;
  }

  /**
   * Mark gateway as online
   */
  async markGatewayOnline(gatewayId: string) {
    this.logger.log(`✅ Gateway online: ${gatewayId}`);

    await this.prisma.gSMGateway.update({
      where: { id: gatewayId },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });

    const health = this.gatewayHealthStatus.get(gatewayId);
    if (health) {
      health.isOnline = true;
      health.lastChecked = new Date();
      health.consecutiveFailures = 0;
    }

    this.eventEmitter.emit('gateway.online', {
      gatewayId,
      timestamp: new Date(),
    });
  }

  /**
   * Mark gateway as offline
   */
  async markGatewayOffline(gatewayId: string, reason?: string) {
    this.logger.warn(`⚠️ Gateway offline: ${gatewayId} - ${reason || 'Unknown'}`);

    await this.prisma.gSMGateway.update({
      where: { id: gatewayId },
      data: {
        isOnline: false,
      },
    });

    const health = this.gatewayHealthStatus.get(gatewayId);
    if (health) {
      health.isOnline = false;
      health.lastChecked = new Date();
      health.consecutiveFailures++;
    }

    this.eventEmitter.emit('gateway.offline', {
      gatewayId,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Update gateway active ports
   */
  async updateActivePorts(gatewayId: string, increment: boolean) {
    const delta = increment ? 1 : -1;

    await this.prisma.gSMGateway.update({
      where: { id: gatewayId },
      data: {
        activePorts: {
          increment: delta,
        },
      },
    });

    this.logger.debug(`Gateway ${gatewayId} active ports ${increment ? '+1' : '-1'}`);
  }

  /**
   * Record gateway health metrics
   */
  async recordHealthMetrics(
    gatewayId: string,
    metrics: {
      status: string;
      isOnline: boolean;
      activePorts: number;
      temperature?: number;
      uptime?: number;
      cpuUsage?: number;
      memoryUsage?: number;
      errors?: any;
    }
  ) {
    try {
      const gateway = await this.prisma.gSMGateway.findUnique({
        where: { id: gatewayId },
      });

      if (!gateway) {
        return;
      }

      await this.prisma.gatewayHealthLog.create({
        data: {
          gatewayId,
          companyId: gateway.companyId,
          status: metrics.status,
          isOnline: metrics.isOnline,
          activePorts: metrics.activePorts,
          temperature: metrics.temperature,
          uptime: metrics.uptime,
          cpuUsage: metrics.cpuUsage,
          memoryUsage: metrics.memoryUsage,
          errors: metrics.errors,
          metadata: {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record health metrics: ${error.message}`);
    }
  }

  /**
   * Get gateway statistics
   */
  async getGatewayStatistics(gatewayId: string, days: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const healthLogs = await this.prisma.gatewayHealthLog.findMany({
        where: {
          gatewayId,
          checkedAt: {
            gte: cutoffDate,
          },
        },
        orderBy: {
          checkedAt: 'desc',
        },
      });

      const onlineCount = healthLogs.filter(log => log.isOnline).length;
      const totalCount = healthLogs.length;
      const uptime = totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;

      return {
        gatewayId,
        days,
        totalChecks: totalCount,
        onlineChecks: onlineCount,
        uptimePercentage: uptime,
        averageActivePorts: this.calculateAverage(healthLogs.map(log => log.activePorts)),
        averageTemperature: this.calculateAverage(
          healthLogs.map(log => log.temperature).filter(t => t !== null)
        ),
        averageCpuUsage: this.calculateAverage(
          healthLogs.map(log => log.cpuUsage).filter(c => c !== null)
        ),
        averageMemoryUsage: this.calculateAverage(
          healthLogs.map(log => log.memoryUsage).filter(m => m !== null)
        ),
      };
    } catch (error) {
      this.logger.error(`Failed to get gateway statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update gateway configuration
   */
  async updateGateway(
    gatewayId: string,
    updates: {
      name?: string;
      ipAddress?: string;
      port?: number;
      username?: string;
      password?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ERROR';
      metadata?: any;
    }
  ) {
    this.logger.log(`🔄 Updating gateway: ${gatewayId}`);

    try {
      const updateData: any = { ...updates, updatedAt: new Date() };
      
      const gateway = await this.prisma.gSMGateway.update({
        where: { id: gatewayId },
        data: updateData,
      });

      this.logger.log(`✅ Gateway updated: ${gatewayId}`);

      this.eventEmitter.emit('gateway.updated', {
        gatewayId,
        updates,
        timestamp: new Date(),
      });

      return gateway;
    } catch (error) {
      this.logger.error(`Failed to update gateway: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete gateway (soft delete)
   */
  async deleteGateway(gatewayId: string) {
    this.logger.log(`🗑️ Deleting gateway: ${gatewayId}`);

    try {
      const gateway = await this.prisma.gSMGateway.update({
        where: { id: gatewayId },
        data: {
          status: 'INACTIVE',
          deletedAt: new Date(),
        },
      });

      this.logger.log(`✅ Gateway deleted: ${gatewayId}`);

      this.eventEmitter.emit('gateway.deleted', {
        gatewayId,
        timestamp: new Date(),
      });

      return gateway;
    } catch (error) {
      this.logger.error(`Failed to delete gateway: ${error.message}`);
      throw error;
    }
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Load all gateways from database
   */
  private async loadGateways() {
    try {
      const gateways = await this.prisma.gSMGateway.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      this.logger.log(`📚 Loaded ${gateways.length} gateways from database`);

      gateways.forEach(gateway => {
        this.gatewayHealthStatus.set(gateway.id, {
          gatewayId: gateway.id,
          isOnline: gateway.isOnline,
          lastChecked: gateway.lastSeenAt || new Date(),
          consecutiveFailures: 0,
        });
      });
    } catch (error) {
      this.logger.error(`Failed to load gateways: ${error.message}`);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    const intervalMs = this.configService.get('GATEWAY_HEALTH_CHECK_INTERVAL_MS', 60000);

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        this.logger.error(`Health check error: ${error.message}`);
      });
    }, intervalMs);

    this.logger.log(`❤️ Health monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Perform health checks on all gateways
   */
  private async performHealthChecks() {
    const gateways = await this.prisma.gSMGateway.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    for (const gateway of gateways) {
      try {
        // Check if gateway is reachable
        const isReachable = await this.checkGatewayConnectivity(gateway.ipAddress, gateway.port);

        if (isReachable) {
          await this.markGatewayOnline(gateway.id);
        } else {
          await this.markGatewayOffline(gateway.id, 'Health check failed');
        }

        // Record health metrics
        await this.recordHealthMetrics(gateway.id, {
          status: isReachable ? 'HEALTHY' : 'UNHEALTHY',
          isOnline: isReachable,
          activePorts: gateway.activePorts,
        });
      } catch (error) {
        this.logger.error(`Health check failed for gateway ${gateway.id}: ${error.message}`);
        await this.markGatewayOffline(gateway.id, error.message);
      }
    }
  }

  /**
   * Check gateway connectivity
   */
  private async checkGatewayConnectivity(ipAddress: string, port: number): Promise<boolean> {
    // In production, implement actual TCP/UDP connectivity check
    // For now, assume online if lastSeenAt is within last 5 minutes
    return true; // Placeholder
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(health?: GatewayHealthInfo): number {
    if (!health) {
      return 0;
    }

    let score = 100;

    // Penalize for consecutive failures
    score -= health.consecutiveFailures * 10;

    // Penalize if not online
    if (!health.isOnline) {
      score -= 50;
    }

    // Penalize if last check was long ago
    const minutesSinceLastCheck = (Date.now() - health.lastChecked.getTime()) / 60000;
    if (minutesSinceLastCheck > 10) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
}

/**
 * Gateway Health Info Interface
 */
interface GatewayHealthInfo {
  gatewayId: string;
  isOnline: boolean;
  lastChecked: Date;
  consecutiveFailures: number;
}
