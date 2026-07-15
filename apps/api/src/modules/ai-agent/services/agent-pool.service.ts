import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AgentPoolService {
  private readonly logger = new Logger(AgentPoolService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllocatableAgents(companyId: string, campaignId?: string) {
    const where: any = {
      companyId,
      isEnabled: true,
      isActive: false,
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const agents = await this.prisma.aIAgent.findMany({
      where,
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
        },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { totalSessions: 'asc' },
    });

    return agents;
  }

  async allocateAgent(companyId: string, campaignId?: string) {
    const agents = await this.getAllocatableAgents(companyId, campaignId);

    if (agents.length === 0) {
      throw new Error('No available agents in pool');
    }

    const agent = agents[0];

    await this.prisma.aIAgent.update({
      where: { id: agent.id },
      data: {
        isActive: true,
        lastStartedAt: new Date(),
      },
    });

    this.logger.log(`Agent ${agent.id} allocated from pool`);

    return agent;
  }

  async releaseAgent(agentId: string, companyId: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, companyId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: {
        isActive: false,
        lastStoppedAt: new Date(),
      },
    });

    this.logger.log(`Agent ${agentId} released to pool`);

    return agent;
  }

  async getPoolStatistics(companyId: string) {
    const totalAgents = await this.prisma.aIAgent.count({
      where: { companyId },
    });

    const activeAgents = await this.prisma.aIAgent.count({
      where: { companyId, isActive: true },
    });

    const availableAgents = await this.prisma.aIAgent.count({
      where: { companyId, isEnabled: true, isActive: false },
    });

    const disabledAgents = await this.prisma.aIAgent.count({
      where: { companyId, isEnabled: false },
    });

    const activeSessions = await this.prisma.agentSession.count({
      where: { companyId, status: 'ACTIVE' },
    });

    return {
      totalAgents,
      activeAgents,
      availableAgents,
      disabledAgents,
      activeSessions,
      utilizationRate: totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0,
      timestamp: new Date(),
    };
  }

  async getCampaignAgents(companyId: string, campaignId: string) {
    const agents = await this.prisma.aIAgent.findMany({
      where: {
        companyId,
        campaignId,
      },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
        },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    return agents;
  }

  async redistributeLoad(companyId: string) {
    const agents = await this.prisma.aIAgent.findMany({
      where: {
        companyId,
        isEnabled: true,
      },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    const totalSessions = agents.reduce((sum, agent) => sum + agent.sessions.length, 0);
    const averageSessions = totalSessions / agents.length;

    const overloadedAgents = agents.filter(
      (agent) => agent.sessions.length > averageSessions * 1.5,
    );

    const underloadedAgents = agents.filter(
      (agent) => agent.sessions.length < averageSessions * 0.5,
    );

    this.logger.log(
      `Load redistribution: ${overloadedAgents.length} overloaded, ${underloadedAgents.length} underloaded`,
    );

    return {
      totalSessions,
      averageSessions,
      overloadedAgents: overloadedAgents.length,
      underloadedAgents: underloadedAgents.length,
      redistributionNeeded: overloadedAgents.length > 0 && underloadedAgents.length > 0,
    };
  }
}
