import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { HealthStatus, RecordHealthCheckDto } from '../dto/ai-agent.dto';

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordHealthCheck(agentId: string, companyId: string, dto: RecordHealthCheckDto) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const healthCheck = await this.prisma.agentHealth.create({
      data: {
        agentId,
        companyId,
        status: dto.status as any,
        heartbeatAt: new Date(),
        memoryUsageMB: dto.memoryUsageMB,
        cpuUsagePercent: dto.cpuUsagePercent,
        runtimeLatencyMs: dto.runtimeLatencyMs,
        responseLatencyMs: dto.responseLatencyMs,
        activeSessions: dto.activeSessions || 0,
      },
    });

    this.logger.debug(`Health check recorded for agent ${agentId}: ${dto.status}`);

    return healthCheck;
  }

  async getLatestHealthCheck(agentId: string) {
    const healthCheck = await this.prisma.agentHealth.findFirst({
      where: { agentId },
      orderBy: { checkedAt: 'desc' },
    });

    return healthCheck;
  }

  async getHealthHistory(agentId: string, limit = 100) {
    const history = await this.prisma.agentHealth.findMany({
      where: { agentId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });

    return history;
  }

  async getHealthMetrics(agentId: string, companyId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const healthChecks = await this.prisma.agentHealth.findMany({
      where: {
        agentId,
        companyId,
        checkedAt: { gte: startDate },
      },
      orderBy: { checkedAt: 'asc' },
    });

    if (healthChecks.length === 0) {
      return {
        totalChecks: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        averageRuntimeLatency: 0,
        averageResponseLatency: 0,
        healthyPercentage: 0,
        statusDistribution: {},
      };
    }

    const totalMemory = healthChecks.reduce((sum, h) => sum + (h.memoryUsageMB || 0), 0);
    const totalCpu = healthChecks.reduce((sum, h) => sum + (h.cpuUsagePercent || 0), 0);
    const totalRuntimeLatency = healthChecks.reduce((sum, h) => sum + (h.runtimeLatencyMs || 0), 0);
    const totalResponseLatency = healthChecks.reduce((sum, h) => sum + (h.responseLatencyMs || 0), 0);

    const healthyCount = healthChecks.filter((h) => h.status === 'HEALTHY').length;

    const statusDistribution: Record<string, number> = {};
    healthChecks.forEach((h) => {
      statusDistribution[h.status] = (statusDistribution[h.status] || 0) + 1;
    });

    return {
      totalChecks: healthChecks.length,
      averageMemoryUsage: totalMemory / healthChecks.length,
      averageCpuUsage: totalCpu / healthChecks.length,
      averageRuntimeLatency: totalRuntimeLatency / healthChecks.length,
      averageResponseLatency: totalResponseLatency / healthChecks.length,
      healthyPercentage: (healthyCount / healthChecks.length) * 100,
      statusDistribution,
      startDate,
      endDate: new Date(),
    };
  }

  async checkAgentHealth(agentId: string, companyId: string) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const activeSessions = agent.sessions.length;
    const latestHealth = await this.getLatestHealthCheck(agentId);

    let healthStatus: HealthStatus = HealthStatus.HEALTHY;

    if (!agent.isEnabled || !agent.isActive) {
      healthStatus = HealthStatus.UNHEALTHY;
    } else if (agent.status === 'ERROR') {
      healthStatus = HealthStatus.CRITICAL;
    } else if (activeSessions > 80) {
      healthStatus = HealthStatus.DEGRADED;
    }

    const healthCheck = await this.recordHealthCheck(agentId, companyId, {
      status: healthStatus,
      activeSessions,
    });

    return {
      agent: {
        id: agent.id,
        name: agent.agentName,
        status: agent.status,
        isActive: agent.isActive,
        isEnabled: agent.isEnabled,
      },
      health: healthCheck,
      activeSessions,
      lastChecked: healthCheck.checkedAt,
    };
  }

  async getSystemHealth(companyId: string) {
    const agents = await this.prisma.aIAgent.findMany({
      where: { companyId },
      include: {
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        sessions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.isActive).length;
    const enabledAgents = agents.filter((a) => a.isEnabled).length;
    const totalActiveSessions = agents.reduce((sum, a) => sum + a.sessions.length, 0);

    const healthyAgents = agents.filter(
      (a) => a.healthChecks[0]?.status === 'HEALTHY',
    ).length;

    const degradedAgents = agents.filter(
      (a) => a.healthChecks[0]?.status === 'DEGRADED',
    ).length;

    const unhealthyAgents = agents.filter(
      (a) => a.healthChecks[0]?.status === 'UNHEALTHY',
    ).length;

    const criticalAgents = agents.filter(
      (a) => a.healthChecks[0]?.status === 'CRITICAL',
    ).length;

    return {
      totalAgents,
      activeAgents,
      enabledAgents,
      totalActiveSessions,
      healthDistribution: {
        healthy: healthyAgents,
        degraded: degradedAgents,
        unhealthy: unhealthyAgents,
        critical: criticalAgents,
      },
      healthPercentage: totalAgents > 0 ? (healthyAgents / totalAgents) * 100 : 0,
      timestamp: new Date(),
    };
  }

  async getHeartbeat(agentId: string) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const latestHealth = await this.getLatestHealthCheck(agentId);

    return {
      agentId,
      isActive: agent.isActive,
      isEnabled: agent.isEnabled,
      status: agent.status,
      lastHeartbeat: latestHealth?.heartbeatAt,
      healthStatus: latestHealth?.status,
      timestamp: new Date(),
    };
  }

  async updateHeartbeat(agentId: string, companyId: string) {
    const latestHealth = await this.getLatestHealthCheck(agentId);

    if (latestHealth) {
      await this.prisma.agentHealth.update({
        where: { id: latestHealth.id },
        data: {
          heartbeatAt: new Date(),
        },
      });
    } else {
      await this.recordHealthCheck(agentId, companyId, {
        status: HealthStatus.HEALTHY,
      });
    }

    this.logger.debug(`Heartbeat updated for agent ${agentId}`);
  }
}
