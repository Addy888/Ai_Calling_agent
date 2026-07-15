import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentStatus } from './dto/ai-agent.dto';

@Injectable()
export class AgentRuntimeService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeRuntime(sessionId: string, agentId: string, companyId: string) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    await this.updateAgentStatus(agentId, AgentStatus.INITIALIZING);

    const runtimeState = await this.prisma.runtimeState.create({
      data: {
        sessionId,
        agentId,
        companyId,
        state: AgentStatus.INITIALIZING,
        stateData: {},
        variables: {},
        context: {},
        metadata: { initializedAt: new Date() },
        transitionReason: 'Runtime initialization started',
      },
    });

    await this.loadPrompt(sessionId, agentId, agent.promptId);
    await this.loadScript(sessionId, agentId, agent.scriptId);
    await this.loadKnowledge(sessionId, agentId, agent.knowledgeBaseIds as string[]);
    await this.loadMemory(sessionId, companyId);

    await this.updateAgentStatus(agentId, AgentStatus.READY);

    await this.transitionState(
      sessionId,
      agentId,
      companyId,
      AgentStatus.INITIALIZING,
      AgentStatus.READY,
      'Runtime initialization completed',
    );

    return runtimeState;
  }

  async loadPrompt(sessionId: string, agentId: string, promptId?: string) {
    if (!promptId) return null;

    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (prompt) {
      await this.prisma.runtimeState.updateMany({
        where: { sessionId, agentId },
        data: {
          prompt: prompt.content,
        },
      });
    }

    return prompt;
  }

  async loadScript(sessionId: string, agentId: string, scriptId?: string) {
    if (!scriptId) return null;

    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          include: {
            nodes: true,
            branches: true,
            variables: true,
          },
          take: 1,
        },
      },
    });

    if (script) {
      await this.prisma.runtimeState.updateMany({
        where: { sessionId, agentId },
        data: {
          script: script.content,
        },
      });
    }

    return script;
  }

  async loadKnowledge(sessionId: string, agentId: string, knowledgeBaseIds?: string[]) {
    if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) return [];

    const knowledgeDocs = await this.prisma.knowledgeDocument.findMany({
      where: {
        id: { in: knowledgeBaseIds },
        isActive: true,
      },
      include: {
        chunks: {
          where: { isActive: true },
          take: 100,
        },
      },
    });

    if (knowledgeDocs.length > 0) {
      await this.prisma.runtimeState.updateMany({
        where: { sessionId, agentId },
        data: {
          knowledge: knowledgeDocs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            category: doc.category,
            chunks: doc.chunks.length,
          })),
        },
      });
    }

    return knowledgeDocs;
  }

  async loadMemory(sessionId: string, companyId: string) {
    const config = await this.prisma.memoryConfiguration.findUnique({
      where: { companyId },
    });

    return config;
  }

  async executeConversationTurn(
    sessionId: string,
    agentId: string,
    companyId: string,
    userInput: string,
  ) {
    await this.updateAgentStatus(agentId, AgentStatus.THINKING);

    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    let conversation = session.conversations[0];

    if (!conversation) {
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversation = await this.prisma.conversationRuntime.create({
        data: {
          sessionId,
          conversationId,
          agentId,
          companyId,
          campaignId: session.campaignId,
          contactId: session.contactId,
          currentState: 'GREETING',
          conversationContext: {},
          conversationVariables: {},
          timeline: [],
        },
      });
    }

    const turnData = {
      turnNumber: conversation.turnCount + 1,
      userInput,
      timestamp: new Date(),
      state: conversation.currentState,
    };

    await this.prisma.conversationRuntime.update({
      where: { id: conversation.id },
      data: {
        turnCount: { increment: 1 },
        lastTurnAt: new Date(),
        timeline: {
          ...(conversation.timeline as any),
          turns: [
            ...((conversation.timeline as any)?.turns || []),
            turnData,
          ],
        },
      },
    });

    await this.updateAgentStatus(agentId, AgentStatus.RESPONDING);

    const response = await this.generateResponse(
      sessionId,
      agentId,
      companyId,
      userInput,
      conversation,
    );

    await this.updateAgentStatus(agentId, AgentStatus.WAITING);

    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    return {
      conversationId: conversation.conversationId,
      turnNumber: conversation.turnCount + 1,
      userInput,
      response,
      state: conversation.currentState,
      timestamp: new Date(),
    };
  }

  private async generateResponse(
    sessionId: string,
    agentId: string,
    companyId: string,
    userInput: string,
    conversation: any,
  ) {
    const runtimeState = await this.prisma.runtimeState.findFirst({
      where: { sessionId, agentId },
      orderBy: { timestamp: 'desc' },
    });

    const config = await this.prisma.runtimeConfiguration.findUnique({
      where: { companyId },
    });

    const response = {
      text: `AI Response to: ${userInput}`,
      confidence: 0.95,
      intent: 'general_inquiry',
      entities: [],
      nextAction: 'continue',
      metadata: {
        temperature: config?.temperature || 0.7,
        maxTokens: config?.maxTokens || 4000,
        latency: Math.random() * 1000,
      },
    };

    return response;
  }

  async updateAgentStatus(agentId: string, status: AgentStatus) {
    await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: { status: status as any },
    });
  }

  async transitionState(
    sessionId: string,
    agentId: string,
    companyId: string,
    fromState: AgentStatus,
    toState: AgentStatus,
    reason: string,
  ) {
    await this.prisma.runtimeState.create({
      data: {
        sessionId,
        agentId,
        companyId,
        state: toState as any,
        previousState: fromState as any,
        transitionReason: reason,
      },
    });
  }

  async recordMetrics(agentId: string, companyId: string) {
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

    await this.prisma.agentMetrics.upsert({
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
        successRate: sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0,
      },
      update: {
        totalSessions: sessions.length,
        activeSessions,
        completedSessions,
        failedSessions,
        averageSessionDuration: avgDuration,
        successRate: sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0,
      },
    });
  }
}
