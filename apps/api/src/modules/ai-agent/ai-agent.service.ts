import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateAIAgentDto,
  UpdateAIAgentDto,
  AgentStatus,
  CreateSessionDto,
  UpdateSessionDto,
  RuntimeConfigurationDto,
  EventType,
  EventSeverity,
} from './dto/ai-agent.dto';
import { MemoryService } from '../memory/memory.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PromptService } from '../prompts/prompts.service';

@Injectable()
export class AIAgentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MemoryService))
    private readonly memoryService: MemoryService,
    @Inject(forwardRef(() => KnowledgeService))
    private readonly knowledgeService: KnowledgeService,
    @Inject(forwardRef(() => PromptService))
    private readonly promptService: PromptService,
  ) {}

  async createAgent(companyId: string, userId: string, dto: CreateAIAgentDto) {
    const agent = await this.prisma.aIAgent.create({
      data: {
        companyId,
        agentName: dto.agentName,
        agentType: dto.agentType,
        campaignId: dto.campaignId,
        promptId: dto.promptId,
        scriptId: dto.scriptId,
        knowledgeBaseIds: dto.knowledgeBaseIds || [],
        configuration: dto.configuration,
        metadata: dto.metadata || {},
        status: AgentStatus.IDLE,
        version: '1.0.0',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.logEvent(agent.id, companyId, 'AGENT_STARTED', 'Agent created', 'INFO');

    return agent;
  }

  async getAgents(companyId: string, filters?: {
    status?: AgentStatus;
    campaignId?: string;
    isEnabled?: boolean;
  }) {
    const where: any = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.campaignId) {
      where.campaignId = filters.campaignId;
    }
    if (filters?.isEnabled !== undefined) {
      where.isEnabled = filters.isEnabled;
    }

    return this.prisma.aIAgent.findMany({
      where,
      include: {
        _count: {
          select: {
            sessions: true,
            healthChecks: true,
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgentById(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async updateAgent(companyId: string, id: string, userId: string, dto: UpdateAIAgentDto) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    await this.logEvent(id, companyId, 'CONFIGURATION_CHANGED', 'Agent configuration updated', 'INFO');

    return updated;
  }

  async deleteAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.isActive) {
      throw new BadRequestException('Cannot delete active agent. Stop agent first.');
    }

    await this.prisma.aIAgent.delete({ where: { id } });

    return { message: 'Agent deleted successfully' };
  }

  async enableAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: { isEnabled: true },
    });

    await this.logEvent(id, companyId, 'AGENT_STARTED', 'Agent enabled', 'INFO');

    return updated;
  }

  async disableAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: { 
        isEnabled: false,
        isActive: false,
        status: AgentStatus.IDLE,
      },
    });

    await this.logEvent(id, companyId, 'AGENT_STOPPED', 'Agent disabled', 'INFO');

    return updated;
  }

  async startAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.isEnabled) {
      throw new BadRequestException('Agent is disabled. Enable agent first.');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: {
        isActive: true,
        status: AgentStatus.READY,
        lastStartedAt: new Date(),
      },
    });

    await this.logEvent(id, companyId, 'AGENT_STARTED', 'Agent started', 'INFO');
    await this.recordHealthCheck(id, companyId, 'HEALTHY');

    return updated;
  }

  async stopAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: {
        isActive: false,
        status: AgentStatus.IDLE,
        lastStoppedAt: new Date(),
      },
    });

    await this.logEvent(id, companyId, 'AGENT_STOPPED', 'Agent stopped', 'INFO');

    return updated;
  }

  async pauseAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: { status: AgentStatus.PAUSED },
    });

    await this.logEvent(id, companyId, 'AGENT_PAUSED', 'Agent paused', 'INFO');

    return updated;
  }

  async resumeAgent(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.prisma.aIAgent.update({
      where: { id },
      data: { status: AgentStatus.READY },
    });

    await this.logEvent(id, companyId, 'AGENT_RESUMED', 'Agent resumed', 'INFO');

    return updated;
  }

  async restartAgent(companyId: string, id: string) {
    await this.stopAgent(companyId, id);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.startAgent(companyId, id);
  }

  async getAgentHealth(companyId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const latestHealth = await this.prisma.agentHealth.findFirst({
      where: { agentId: id },
      orderBy: { checkedAt: 'desc' },
    });

    const activeSessions = await this.prisma.agentSession.count({
      where: { agentId: id, status: 'ACTIVE' },
    });

    return {
      agent: {
        id: agent.id,
        name: agent.agentName,
        status: agent.status,
        isActive: agent.isActive,
      },
      health: latestHealth || {},
      activeSessions,
      lastChecked: latestHealth?.checkedAt || null,
    };
  }

  async getAgentMetrics(companyId: string, id: string, days = 7) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.prisma.agentMetrics.findMany({
      where: {
        agentId: id,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    return metrics;
  }

  async createSession(companyId: string, dto: CreateSessionDto) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: dto.agentId, companyId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.isEnabled || !agent.isActive) {
      throw new BadRequestException('Agent is not active');
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 1800);

    const session = await this.prisma.agentSession.create({
      data: {
        sessionId,
        agentId: dto.agentId,
        companyId,
        campaignId: dto.campaignId,
        contactId: dto.contactId,
        status: 'ACTIVE',
        sessionVariables: dto.sessionVariables || {},
        sessionContext: dto.sessionContext || {},
        sessionMetadata: dto.sessionMetadata || {},
        expiresAt,
      },
    });

    await this.prisma.aIAgent.update({
      where: { id: dto.agentId },
      data: { totalSessions: { increment: 1 } },
    });

    await this.logEvent(dto.agentId, companyId, 'SESSION_CREATED', 'Session created', 'INFO', session.id);

    return session;
  }

  async getSessions(companyId: string, filters?: {
    agentId?: string;
    status?: string;
  }) {
    const where: any = { companyId };

    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.agentSession.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            agentName: true,
            status: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSessionById(companyId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, companyId },
      include: {
        agent: true,
        events: {
          orderBy: { timestamp: 'desc' },
        },
        states: {
          orderBy: { timestamp: 'desc' },
        },
        conversations: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async updateSession(companyId: string, id: string, dto: UpdateSessionDto) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.agentSession.update({
      where: { id },
      data: {
        ...dto,
        lastActivityAt: new Date(),
      },
    });
  }

  async pauseSession(companyId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.agentSession.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });
  }

  async resumeSession(companyId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.agentSession.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        resumedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }

  async closeSession(companyId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const duration = Math.floor(
      (new Date().getTime() - session.startedAt.getTime()) / 1000,
    );

    const updated = await this.prisma.agentSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        duration,
      },
    });

    await this.logEvent(
      session.agentId,
      companyId,
      'SESSION_CLOSED',
      'Session closed',
      'INFO',
      id,
    );

    return updated;
  }

  async getRuntimeConfiguration(companyId: string) {
    let config = await this.prisma.runtimeConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.runtimeConfiguration.create({
        data: { companyId },
      });
    }

    return config;
  }

  async updateRuntimeConfiguration(
    companyId: string,
    dto: RuntimeConfigurationDto,
  ) {
    const config = await this.prisma.runtimeConfiguration.upsert({
      where: { companyId },
      create: {
        companyId,
        ...dto,
      },
      update: dto,
    });

    return config;
  }

  private async logEvent(
    agentId: string,
    companyId: string,
    eventType: string,
    message: string,
    severity: string,
    sessionId?: string,
  ) {
    await this.prisma.agentEvent.create({
      data: {
        agentId,
        companyId,
        sessionId,
        eventType: eventType as any,
        eventName: message,
        severity: severity as any,
        message,
      },
    });
  }

  private async recordHealthCheck(agentId: string, companyId: string, status: string) {
    await this.prisma.agentHealth.create({
      data: {
        agentId,
        companyId,
        status: status as any,
        heartbeatAt: new Date(),
        activeSessions: 0,
        totalSessions: 0,
      },
    });
  }
}
