/**
 * Telephony Health Dashboard Controller
 * Production-ready API endpoints for monitoring GSM Gateway infrastructure
 * 
 * Features:
 * - System diagnostics
 * - Gateway health monitoring
 * - SIM card status
 * - Real-time metrics
 * - Historical analytics
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SystemDiagnosticsService } from './services/system-diagnostics.service';
import { GatewayManagerService } from './services/gateway-manager.service';
import { SIMManagerService } from './services/sim-manager.service';
import { ConnectionManagerService } from './services/connection-manager.service';

@Controller('telephony/health')
@UseGuards(JwtAuthGuard)
export class TelephonyHealthController {
  private readonly logger = new Logger(TelephonyHealthController.name);

  constructor(
    private readonly diagnostics: SystemDiagnosticsService,
    private readonly gatewayManager: GatewayManagerService,
    private readonly simManager: SIMManagerService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * GET /telephony/health/diagnostics
   * Run complete system diagnostics
   */
  @Get('diagnostics')
  async runDiagnostics(@CurrentUser() user: any) {
    this.logger.log(`Running diagnostics for user: ${user.id}`);

    try {
      const report = await this.diagnostics.runDiagnostics();

      return {
        statusCode: HttpStatus.OK,
        message: 'Diagnostics completed successfully',
        data: report,
      };
    } catch (error) {
      this.logger.error(`Diagnostics failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/component/:name
   * Check specific component health
   */
  @Get('component/:name')
  async checkComponent(
    @Param('name') componentName: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Checking ${componentName} health for user: ${user.id}`);

    try {
      const result = await this.diagnostics.checkComponent(componentName);

      return {
        statusCode: HttpStatus.OK,
        message: `${componentName} health check completed`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Component check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/history
   * Get diagnostics history
   */
  @Get('history')
  async getDiagnosticsHistory(
    @Query('days') days: string = '7',
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Getting diagnostics history for user: ${user.id}`);

    try {
      const history = await this.diagnostics.getDiagnosticsHistory(parseInt(days));

      return {
        statusCode: HttpStatus.OK,
        message: 'Diagnostics history retrieved successfully',
        data: history,
      };
    } catch (error) {
      this.logger.error(`Failed to get history: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/gateways
   * Get all gateways with health status
   */
  @Get('gateways')
  async getGatewayHealth(@CurrentUser() user: any) {
    this.logger.log(`Getting gateway health for company: ${user.companyId}`);

    try {
      const gateways = await this.gatewayManager.getAvailableGateways(user.companyId);

      const gatewayHealth = gateways.map(gateway => ({
        id: gateway.id,
        name: gateway.name,
        model: gateway.model,
        manufacturer: gateway.manufacturer,
        ipAddress: gateway.ipAddress,
        port: gateway.port,
        status: gateway.status,
        isOnline: gateway.isOnline,
        totalPorts: gateway.totalPorts,
        activePorts: gateway.activePorts,
        availablePorts: gateway.totalPorts - gateway.activePorts,
        utilizationPercentage: Math.round((gateway.activePorts / gateway.totalPorts) * 100),
        totalSIMs: gateway.sims.length,
        availableSIMs: gateway.availableSIMs,
        health: gateway.health,
        lastSeenAt: gateway.lastSeenAt,
      }));

      return {
        statusCode: HttpStatus.OK,
        message: 'Gateway health retrieved successfully',
        data: {
          total: gatewayHealth.length,
          online: gatewayHealth.filter(g => g.isOnline).length,
          offline: gatewayHealth.filter(g => !g.isOnline).length,
          gateways: gatewayHealth,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get gateway health: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/gateway/:id
   * Get detailed gateway health
   */
  @Get('gateway/:id')
  async getGatewayDetails(
    @Param('id') gatewayId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Getting gateway details: ${gatewayId}`);

    try {
      const gateway = await this.gatewayManager.getGateway(gatewayId);

      return {
        statusCode: HttpStatus.OK,
        message: 'Gateway details retrieved successfully',
        data: gateway,
      };
    } catch (error) {
      this.logger.error(`Failed to get gateway details: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/gateway/:id/statistics
   * Get gateway statistics
   */
  @Get('gateway/:id/statistics')
  async getGatewayStatistics(
    @Param('id') gatewayId: string,
    @Query('days') days: string = '7',
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Getting gateway statistics: ${gatewayId}`);

    try {
      const stats = await this.gatewayManager.getGatewayStatistics(
        gatewayId,
        parseInt(days),
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Gateway statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get gateway statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/sims
   * Get all SIM cards with status
   */
  @Get('sims')
  async getSIMHealth(@CurrentUser() user: any) {
    this.logger.log(`Getting SIM health for company: ${user.companyId}`);

    try {
      const sims = await this.simManager.getAllSIMs(user.companyId);

      const simHealth = sims.map(sim => ({
        id: sim.id,
        simNumber: sim.simNumber,
        operator: sim.operator,
        portNumber: sim.portNumber,
        status: sim.status,
        signal: sim.signal,
        isActive: sim.isActive,
        gatewayId: sim.gatewayId,
        gatewayName: sim.gateway?.name,
        callsToday: sim.callsToday,
        dailyLimit: sim.dailyLimit,
        usagePercentage: Math.round((sim.callsToday / sim.dailyLimit) * 100),
        lastUsed: sim.lastUsed,
        health: this.calculateSIMHealth(sim),
      }));

      const groupedByStatus = simHealth.reduce((acc, sim) => {
        acc[sim.status] = (acc[sim.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        statusCode: HttpStatus.OK,
        message: 'SIM health retrieved successfully',
        data: {
          total: simHealth.length,
          byStatus: groupedByStatus,
          sims: simHealth,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get SIM health: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/sim/:id/statistics
   * Get SIM card statistics
   */
  @Get('sim/:id/statistics')
  async getSIMStatistics(
    @Param('id') simId: string,
    @Query('days') days: string = '7',
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Getting SIM statistics: ${simId}`);

    try {
      const stats = await this.simManager.getSIMStatistics(simId, parseInt(days));

      return {
        statusCode: HttpStatus.OK,
        message: 'SIM statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get SIM statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/connections
   * Get AMI connection status
   */
  @Get('connections')
  async getConnectionStatus(@CurrentUser() user: any) {
    this.logger.log(`Getting connection status for user: ${user.id}`);

    try {
      const statuses = this.connectionManager.getAllConnectionStatuses();

      return {
        statusCode: HttpStatus.OK,
        message: 'Connection status retrieved successfully',
        data: {
          total: statuses.length,
          connected: statuses.filter(s => s.isConnected).length,
          authenticated: statuses.filter(s => s.isAuthenticated).length,
          connections: statuses,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get connection status: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /telephony/health/overview
   * Get complete health overview
   */
  @Get('overview')
  async getHealthOverview(@CurrentUser() user: any) {
    this.logger.log(`Getting health overview for company: ${user.companyId}`);

    try {
      // Run diagnostics
      const diagnostics = await this.diagnostics.runDiagnostics();

      // Get gateway summary
      const gateways = await this.gatewayManager.getAvailableGateways(user.companyId);
      const onlineGateways = gateways.filter(g => g.isOnline).length;

      // Get SIM summary
      const sims = await this.simManager.getAllSIMs(user.companyId);
      const activeSIMs = sims.filter(s => s.status === 'ACTIVE').length;

      // Get connection summary
      const connections = this.connectionManager.getAllConnectionStatuses();
      const activeConnections = connections.filter(c => c.isConnected).length;

      return {
        statusCode: HttpStatus.OK,
        message: 'Health overview retrieved successfully',
        data: {
          overall: diagnostics.overall,
          timestamp: diagnostics.timestamp,
          components: {
            gateways: {
              total: gateways.length,
              online: onlineGateways,
              offline: gateways.length - onlineGateways,
              healthPercentage: gateways.length > 0 
                ? Math.round((onlineGateways / gateways.length) * 100) 
                : 0,
            },
            sims: {
              total: sims.length,
              active: activeSIMs,
              busy: sims.filter(s => s.status === 'BUSY').length,
              error: sims.filter(s => s.status === 'ERROR').length,
              healthPercentage: sims.length > 0 
                ? Math.round((activeSIMs / sims.length) * 100) 
                : 0,
            },
            connections: {
              total: connections.length,
              active: activeConnections,
              inactive: connections.length - activeConnections,
              healthPercentage: connections.length > 0 
                ? Math.round((activeConnections / connections.length) * 100) 
                : 0,
            },
          },
          diagnostics: diagnostics.components,
          systemInfo: diagnostics.systemInfo,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get health overview: ${error.message}`);
      throw error;
    }
  }

  /**
   * POST /telephony/health/gateway/:id/refresh
   * Force refresh gateway health
   */
  @Post('gateway/:id/refresh')
  async refreshGatewayHealth(
    @Param('id') gatewayId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Refreshing gateway health: ${gatewayId}`);

    try {
      // Force health check
      await this.gatewayManager.markGatewayOnline(gatewayId);

      const gateway = await this.gatewayManager.getGateway(gatewayId);

      return {
        statusCode: HttpStatus.OK,
        message: 'Gateway health refreshed successfully',
        data: gateway,
      };
    } catch (error) {
      this.logger.error(`Failed to refresh gateway health: ${error.message}`);
      throw error;
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Calculate SIM health score
   */
  private calculateSIMHealth(sim: any): string {
    if (sim.status === 'ERROR' || sim.status === 'BLOCKED') {
      return 'unhealthy';
    }

    if (sim.status === 'BUSY' || sim.status === 'LIMIT_EXCEEDED') {
      return 'degraded';
    }

    if (!sim.isActive) {
      return 'degraded';
    }

    // Check signal strength
    if (sim.signal !== null && sim.signal < 15) {
      return 'degraded';
    }

    // Check usage
    const usagePercentage = (sim.callsToday / sim.dailyLimit) * 100;
    if (usagePercentage > 90) {
      return 'degraded';
    }

    return 'healthy';
  }
}
