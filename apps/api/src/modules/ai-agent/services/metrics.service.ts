import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordAgentMetrics(agentId: string, companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.agentSession.findMany({
      where: {
        agentId,
        companyId,
        startedAt: { gte: today },
      },
    });

    const activeSessions = sessions.filter((s) => s.status === 'ACTIVE').length;
    const completedSessions = sessions.filter((s) => s.status === 'CLOSED').length;
    const failedSessions = sessions.filter((s) => s.status === 'ERROR').length;

    const totalDuration = sessions
      .filter((s) => s.duration)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const avgTurnCount = sessions.length > 0 ? totalMessages / sessions.length : 0;

    const conversations = await this.prisma.conversationRuntime.findMany({
      where: {
        agentId,
        companyId,
        startedAt: { gte: today },
      },
    });

    const avgResponseTime = conversations.length > 0 ? 250 : 0;

    const metrics = await this.prisma.agentMetrics.upsert({
      where: {
        agentId_date: {
          agentId,
          date: today,
        },
      },
      create: {
        agentId,
        companyId,
        date: today,
        totalSessions: sessions.length,
        activeSessions,
        completedSessions,
        failedSessions,
        averageSessionDuration: avgDuration,
        averageResponseTime: avgResponseTime,
        averageTurnCount: avgTurnCount,
        successRate: sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0,
        errorRate: sessions.length > 0 ? (failedSessions / sessions.length) * 100 : 0,
        knowledgeQueryCount: 0,
        promptExecutionCount: sessions.length,
        decisionCount: totalMessages,
      },
      update: {
        totalSessions: sessions.length,
        activeSessions,
        completedSessions,
        failedSessions,
        averageSessionDuration: avgDuration,
        averageResponseTime: avgResponseTime,
        averageTurnCount: avgTurnCount,
        successRate: sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0,
        errorRate: sessions.length > 0 ? (failedSessions / sessions.length) * 100 : 0,
        promptExecutionCount: sessions.length,
        decisionCount: totalMessages,
      },
    });

    this.logger.debug(`Metrics recorded for agent ${agentId}`);

    return metrics;
  }

  async getAgentMetrics(agentId: string, companyId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.prisma.agentMetrics.findMany({
      where: {
        agentId,
        companyId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    return metrics;
  }

  async getCompanyMetrics(companyId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.prisma.agentMetrics.findMany({
      where: {
        companyId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    const aggregated = metrics.reduce(
      (acc, m) => {
        acc.totalSessions += m.totalSessions;
        acc.activeSessions += m.activeSessions;
        acc.completedSessions += m.completedSessions;
        acc.failedSessions += m.failedSessions;
        acc.totalDuration += m.averageSessionDuration || 0;
        acc.totalResponseTime += m.averageResponseTime || 0;
        acc.count += 1;
        return acc;
      },
      {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        totalDuration: 0,
        totalResponseTime: 0,
        count: 0,
      },
    );

    return {
      totalSessions: aggregated.totalSessions,
      activeSessions: aggregated.activeSessions,
      completedSessions: aggregated.completedSessions,
      failedSessions: aggregated.failedSessions,
      averageSessionDuration:
        aggregated.count > 0 ? aggregated.totalDuration / aggregated.count : 0,
      averageResponseTime:
        aggregated.count > 0 ? aggregated.totalResponseTime / aggregated.count : 0,
      successRate:
        aggregated.totalSessions > 0
          ? (aggregated.completedSessions / aggregated.totalSessions) * 100
          : 0,
      errorRate:
        aggregated.totalSessions > 0
          ? (aggregated.failedSessions / aggregated.totalSessions) * 100
          : 0,
      metrics,
    };
  }

  async getRealTimeMetrics(agentId: string, companyId: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, companyId },
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
    const totalSessions = agent.totalSessions;
    const successfulSessions = agent.successfulSessions;
    const failedSessions = agent.failedSessions;

    return {
      agentId,
      agentName: agent.agentName,
      status: agent.status,
      isActive: agent.isActive,
      activeSessions,
      totalSessions,
      successfulSessions,
      failedSessions,
      successRate: totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0,
      averageResponseTime: agent.averageResponseTime || 0,
      timestamp: new Date(),
    };
  }

  async getPerformanceMetrics(agentId: string, companyId: string, days = 1) {
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

    const runtimeStates = await this.prisma.runtimeState.findMany({
      where: {
        agentId,
        companyId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    const avgMemory =
      healthChecks.length > 0
        ? healthChecks.reduce((sum, h) => sum + (h.memoryUsageMB || 0), 0) /
          healthChecks.length
        : 0;

    const avgCpu =
      healthChecks.length > 0
        ? healthChecks.reduce((sum, h) => sum + (h.cpuUsagePercent || 0), 0) /
          healthChecks.length
        : 0;

    const avgRuntimeLatency =
      healthChecks.length > 0
        ? healthChecks.reduce((sum, h) => sum + (h.runtimeLatencyMs || 0), 0) /
          healthChecks.length
        : 0;

    const avgResponseLatency =
      healthChecks.length > 0
        ? healthChecks.reduce((sum, h) => sum + (h.responseLatencyMs || 0), 0) /
          healthChecks.length
        : 0;

    return {
      averageMemoryUsage: avgMemory,
      averageCpuUsage: avgCpu,
      averageRuntimeLatency: avgRuntimeLatency,
      averageResponseLatency: avgResponseLatency,
      totalHealthChecks: healthChecks.length,
      totalStateTransitions: runtimeStates.length,
      startDate,
      endDate: new Date(),
    };
  }
}
