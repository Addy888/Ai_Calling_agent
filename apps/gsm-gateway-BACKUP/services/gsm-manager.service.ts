import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma, GSMGateway, SIMCard } from '@prisma/client';

/**
 * GSM Manager Service
 * Manages GSM Gateway CRUD operations and health monitoring
 */
@Injectable()
export class GSMManagerService {
  private readonly logger = new Logger(GSMManagerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new GSM Gateway
   */
  async createGateway(data: {
    name: string;
    ipAddress: string;
    port?: number;
    username?: string;
    password?: string;
    totalPorts: number;
    companyId: string;
    metadata?: any;
  }): Promise<GSMGateway> {
    this.logger.log(`Creating GSM Gateway: ${data.name}`);

    try {
      const gateway = await this.prisma.gSMGateway.create({
        data: {
          name: data.name,
          ipAddress: data.ipAddress,
          port: data.port || 5038,
          username: data.username,
          password: data.password,
          totalPorts: data.totalPorts,
          availablePorts: data.totalPorts,
          status: 'ONLINE',
          isActive: true,
          companyId: data.companyId,
          metadata: data.metadata || {},
        },
      });

      this.logger.log(`✅ GSM Gateway created: ${gateway.id}`);
      return gateway;
    } catch (error) {
      this.logger.error(`Failed to create GSM Gateway: ${error.message}`);
      throw new BadRequestException(`Failed to create GSM Gateway: ${error.message}`);
    }
  }

  /**
   * Get all gateways for a company
   */
  async getAllGateways(companyId: string): Promise<GSMGateway[]> {
    return this.prisma.gSMGateway.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        simCards: {
          where: { isActive: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get gateway by ID
   */
  async getGateway(gatewayId: string, companyId: string): Promise<GSMGateway> {
    const gateway = await this.prisma.gSMGateway.findFirst({
      where: {
        id: gatewayId,
        companyId,
        isActive: true,
      },
      include: {
        simCards: {
          where: { isActive: true },
        },
      },
    });

    if (!gateway) {
      throw new NotFoundException(`GSM Gateway not found: ${gatewayId}`);
    }

    return gateway;
  }

  /**
   * Update gateway
   */
  async updateGateway(
    gatewayId: string,
    companyId: string,
    data: {
      name?: string;
      ipAddress?: string;
      port?: number;
      username?: string;
      password?: string;
      totalPorts?: number;
      status?: string;
      isActive?: boolean;
      metadata?: any;
    },
  ): Promise<GSMGateway> {
    this.logger.log(`Updating GSM Gateway: ${gatewayId}`);

    // Verify ownership
    await this.getGateway(gatewayId, companyId);

    try {
      const gateway = await this.prisma.gSMGateway.update({
        where: { id: gatewayId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`✅ GSM Gateway updated: ${gateway.id}`);
      return gateway;
    } catch (error) {
      this.logger.error(`Failed to update GSM Gateway: ${error.message}`);
      throw new BadRequestException(`Failed to update GSM Gateway: ${error.message}`);
    }
  }

  /**
   * Delete gateway (soft delete)
   */
  async deleteGateway(gatewayId: string, companyId: string): Promise<void> {
    this.logger.log(`Deleting GSM Gateway: ${gatewayId}`);

    // Verify ownership
    await this.getGateway(gatewayId, companyId);

    try {
      await this.prisma.gSMGateway.update({
        where: { id: gatewayId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Also deactivate all SIMs
      await this.prisma.sIMCard.updateMany({
        where: { gatewayId },
        data: { isActive: false },
      });

      this.logger.log(`✅ GSM Gateway deleted: ${gatewayId}`);
    } catch (error) {
      this.logger.error(`Failed to delete GSM Gateway: ${error.message}`);
      throw new BadRequestException(`Failed to delete GSM Gateway: ${error.message}`);
    }
  }

  /**
   * Add SIM Card to Gateway
   */
  async addSIMCard(data: {
    gatewayId: string;
    companyId: string;
    simNumber: string;
    operator: string;
    portNumber: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    preferredOperator?: string;
    metadata?: any;
  }): Promise<SIMCard> {
    this.logger.log(`Adding SIM Card to Gateway: ${data.gatewayId}`);

    // Verify gateway exists
    const gateway = await this.getGateway(data.gatewayId, data.companyId);

    // Check if port is available
    const existingSIM = await this.prisma.sIMCard.findFirst({
      where: {
        gatewayId: data.gatewayId,
        portNumber: data.portNumber,
        isActive: true,
      },
    });

    if (existingSIM) {
      throw new BadRequestException(`Port ${data.portNumber} is already occupied`);
    }

    // Check if port number is valid
    if (data.portNumber < 1 || data.portNumber > gateway.totalPorts) {
      throw new BadRequestException(
        `Invalid port number. Must be between 1 and ${gateway.totalPorts}`,
      );
    }

    try {
      const simCard = await this.prisma.sIMCard.create({
        data: {
          gatewayId: data.gatewayId,
          companyId: data.companyId,
          simNumber: data.simNumber,
          operator: data.operator,
          portNumber: data.portNumber,
          status: 'AVAILABLE',
          signalStrength: 0,
          dailyLimit: data.dailyLimit || 500,
          monthlyLimit: data.monthlyLimit || 10000,
          dailyUsage: 0,
          monthlyUsage: 0,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          isActive: true,
          preferredOperator: data.preferredOperator,
          metadata: data.metadata || {},
        },
      });

      // Update gateway available ports
      await this.updateAvailablePorts(data.gatewayId);

      this.logger.log(`✅ SIM Card added: ${simCard.id}`);
      return simCard;
    } catch (error) {
      this.logger.error(`Failed to add SIM Card: ${error.message}`);
      throw new BadRequestException(`Failed to add SIM Card: ${error.message}`);
    }
  }

  /**
   * Get all SIM cards for a gateway
   */
  async getSIMCards(gatewayId: string, companyId: string): Promise<SIMCard[]> {
    // Verify gateway ownership
    await this.getGateway(gatewayId, companyId);

    return this.prisma.sIMCard.findMany({
      where: {
        gatewayId,
        isActive: true,
      },
      orderBy: {
        portNumber: 'asc',
      },
    });
  }

  /**
   * Update SIM Card
   */
  async updateSIMCard(
    simId: string,
    companyId: string,
    data: {
      simNumber?: string;
      operator?: string;
      status?: string;
      signalStrength?: number;
      dailyLimit?: number;
      monthlyLimit?: number;
      isActive?: boolean;
      preferredOperator?: string;
      metadata?: any;
    },
  ): Promise<SIMCard> {
    this.logger.log(`Updating SIM Card: ${simId}`);

    // Verify SIM exists and ownership
    const existingSIM = await this.prisma.sIMCard.findFirst({
      where: {
        id: simId,
        companyId,
      },
    });

    if (!existingSIM) {
      throw new NotFoundException(`SIM Card not found: ${simId}`);
    }

    try {
      const simCard = await this.prisma.sIMCard.update({
        where: { id: simId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`✅ SIM Card updated: ${simCard.id}`);
      return simCard;
    } catch (error) {
      this.logger.error(`Failed to update SIM Card: ${error.message}`);
      throw new BadRequestException(`Failed to update SIM Card: ${error.message}`);
    }
  }

  /**
   * Delete SIM Card (soft delete)
   */
  async deleteSIMCard(simId: string, companyId: string): Promise<void> {
    this.logger.log(`Deleting SIM Card: ${simId}`);

    const simCard = await this.prisma.sIMCard.findFirst({
      where: { id: simId, companyId },
    });

    if (!simCard) {
      throw new NotFoundException(`SIM Card not found: ${simId}`);
    }

    try {
      await this.prisma.sIMCard.update({
        where: { id: simId },
        data: {
          isActive: false,
          status: 'INACTIVE',
          updatedAt: new Date(),
        },
      });

      // Update gateway available ports
      await this.updateAvailablePorts(simCard.gatewayId);

      this.logger.log(`✅ SIM Card deleted: ${simId}`);
    } catch (error) {
      this.logger.error(`Failed to delete SIM Card: ${error.message}`);
      throw new BadRequestException(`Failed to delete SIM Card: ${error.message}`);
    }
  }

  /**
   * Update available ports count for a gateway
   */
  private async updateAvailablePorts(gatewayId: string): Promise<void> {
    const availableSIMs = await this.prisma.sIMCard.count({
      where: {
        gatewayId,
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    await this.prisma.gSMGateway.update({
      where: { id: gatewayId },
      data: { availablePorts: availableSIMs },
    });
  }

  /**
   * Gateway health check
   */
  async performHealthCheck(gatewayId: string, companyId: string): Promise<{
    status: string;
    lastCheck: Date;
    availableSIMs: number;
    totalSIMs: number;
  }> {
    const gateway = await this.getGateway(gatewayId, companyId);

    const totalSIMs = await this.prisma.sIMCard.count({
      where: { gatewayId, isActive: true },
    });

    const availableSIMs = await this.prisma.sIMCard.count({
      where: {
        gatewayId,
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    // Log health check
    await this.prisma.gatewayHealthLog.create({
      data: {
        gatewayId,
        companyId,
        status: gateway.status,
        availablePorts: availableSIMs,
        activeCalls: 0, // Would be calculated from active calls
        cpuUsage: 0,
        memoryUsage: 0,
        signalQuality: 0,
        metadata: {},
      },
    });

    return {
      status: gateway.status,
      lastCheck: new Date(),
      availableSIMs,
      totalSIMs,
    };
  }

  /**
   * Get SIM statistics
   */
  async getSIMStatistics(simId: string, companyId: string): Promise<any> {
    const simCard = await this.prisma.sIMCard.findFirst({
      where: { id: simId, companyId },
    });

    if (!simCard) {
      throw new NotFoundException(`SIM Card not found: ${simId}`);
    }

    const callLogs = await this.prisma.sIMCallLog.findMany({
      where: { simId },
      orderBy: { startTime: 'desc' },
      take: 10,
    });

    const usageStats = await this.prisma.sIMUsageStats.findMany({
      where: { simId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    return {
      simCard,
      recentCalls: callLogs,
      usageHistory: usageStats,
      successRate:
        simCard.totalCalls > 0
          ? ((simCard.successfulCalls / simCard.totalCalls) * 100).toFixed(2)
          : 0,
    };
  }
}
