import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RuntimeEngineService } from './runtime-engine.service';
import { AgentStatus } from '../dto/ai-agent.dto';

@Injectable()
export class ConversationRuntimeService {
  private readonly logger = new Logger(ConversationRuntimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runtimeEngine: RuntimeEngineService,
  ) {}

  async startConversation(
    sessionId: string,
    agentId: string,
    companyId: string,
    campaignId?: string,
    contactId?: string,
  ) {
    this.logger.log(`Starting conversation for session ${sessionId}`);

    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversation = await this.prisma.conversationRuntime.create({
      data: {
        sessionId: session.id,
        conversationId,
        agentId,
        companyId,
        campaignId,
        contactId,
        currentState: 'GREETING',
        conversationContext: {},
        conversationVariables: {},
        timeline: {
          events: [],
          turns: [],
        },
      },
    });

    this.logger.log(`Conversation ${conversationId} started`);

    return conversation;
  }

  async continueConversation(
    sessionId: string,
    agentId: string,
    companyId: string,
    userInput: string,
  ) {
    this.logger.log(`Continuing conversation for session ${sessionId}`);

    await this.runtimeEngine.updateAgentStatus(agentId, AgentStatus.THINKING);

    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    let conversation = session.conversations[0];

    if (!conversation) {
      conversation = await this.startConversation(
        sessionId,
        agentId,
        companyId,
        session.campaignId || undefined,
        session.contactId || undefined,
      );
    }

    const turnData = {
      turnNumber: conversation.turnCount + 1,
      userInput,
      timestamp: new Date(),
      state: conversation.currentState,
    };

    const timeline = conversation.timeline as any;
    const updatedTimeline = {
      ...timeline,
      turns: [...(timeline?.turns || []), turnData],
    };

    await this.prisma.conversationRuntime.update({
      where: { id: conversation.id },
      data: {
        turnCount: { increment: 1 },
        lastTurnAt: new Date(),
        timeline: updatedTimeline,
      },
    });

    await this.runtimeEngine.updateAgentStatus(agentId, AgentStatus.RESPONDING);

    const response = await this.runtimeEngine.executeAIPipeline(
      sessionId,
      agentId,
      companyId,
      userInput,
      conversation.conversationContext,
    );

    await this.runtimeEngine.updateAgentStatus(agentId, AgentStatus.WAITING);

    await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        messageCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Conversation turn completed for session ${sessionId}`);

    return {
      conversationId: conversation.conversationId,
      turnNumber: conversation.turnCount + 1,
      userInput,
      response,
      state: conversation.currentState,
      timestamp: new Date(),
    };
  }

  async pauseConversation(sessionId: string, companyId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      throw new NotFoundException('No active conversation found');
    }

    await this.prisma.conversationRuntime.update({
      where: { id: conversation.id },
      data: {
        pausedAt: new Date(),
      },
    });

    this.logger.log(`Conversation ${conversation.conversationId} paused`);

    return conversation;
  }

  async resumeConversation(sessionId: string, companyId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      throw new NotFoundException('No conversation found');
    }

    await this.prisma.conversationRuntime.update({
      where: { id: conversation.id },
      data: {
        pausedAt: null,
      },
    });

    this.logger.log(`Conversation ${conversation.conversationId} resumed`);

    return conversation;
  }

  async endConversation(sessionId: string, companyId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      throw new NotFoundException('No active conversation found');
    }

    const duration = Math.floor(
      (new Date().getTime() - conversation.startedAt.getTime()) / 1000,
    );

    await this.prisma.conversationRuntime.update({
      where: { id: conversation.id },
      data: {
        currentState: 'COMPLETED',
        endedAt: new Date(),
        duration,
      },
    });

    this.logger.log(`Conversation ${conversation.conversationId} ended`);

    return conversation;
  }

  async getConversationContext(sessionId: string, companyId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      return null;
    }

    return {
      conversationId: conversation.conversationId,
      currentState: conversation.currentState,
      turnCount: conversation.turnCount,
      context: conversation.conversationContext,
      variables: conversation.conversationVariables,
      timeline: conversation.timeline,
      startedAt: conversation.startedAt,
      lastTurnAt: conversation.lastTurnAt,
    };
  }

  async updateConversationContext(
    sessionId: string,
    companyId: string,
    context: any,
    variables?: any,
  ) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      throw new NotFoundException('No active conversation found');
    }

    const updated = await this.prisma.conversationRuntime.update({
      where: { id: conversation.id },
      data: {
        conversationContext: context,
        ...(variables && { conversationVariables: variables }),
      },
    });

    return updated;
  }

  async getConversationTimeline(sessionId: string, companyId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      return null;
    }

    return conversation.timeline;
  }

  async getConversationSummary(sessionId: string, companyId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const conversation = session.conversations[0];

    if (!conversation) {
      return null;
    }

    const duration = conversation.endedAt
      ? Math.floor((conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 1000)
      : Math.floor((new Date().getTime() - conversation.startedAt.getTime()) / 1000);

    return {
      conversationId: conversation.conversationId,
      currentState: conversation.currentState,
      turnCount: conversation.turnCount,
      duration,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
      lastTurnAt: conversation.lastTurnAt,
      metadata: conversation.metadata,
    };
  }
}
