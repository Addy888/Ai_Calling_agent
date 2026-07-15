import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AgentStatus } from '../dto/ai-agent.dto';

@Injectable()
export class RuntimeEngineService {
  private readonly logger = new Logger(RuntimeEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async initializeRuntime(sessionId: string, agentId: string, companyId: string) {
    this.logger.log(`Initializing runtime for session ${sessionId}`);

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
        state: AgentStatus.INITIALIZING as any,
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
    await this.loadConfiguration(sessionId, companyId);

    await this.updateAgentStatus(agentId, AgentStatus.READY);

    await this.transitionState(
      sessionId,
      agentId,
      companyId,
      AgentStatus.INITIALIZING,
      AgentStatus.READY,
      'Runtime initialization completed',
    );

    this.logger.log(`Runtime initialized successfully for session ${sessionId}`);

    return runtimeState;
  }

  async loadPrompt(sessionId: string, agentId: string, promptId?: string) {
    if (!promptId) {
      this.logger.warn(`No prompt ID provided for session ${sessionId}`);
      return null;
    }

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
      this.logger.log(`Loaded prompt ${promptId} for session ${sessionId}`);
    }

    return prompt;
  }

  async loadScript(sessionId: string, agentId: string, scriptId?: string) {
    if (!scriptId) {
      this.logger.warn(`No script ID provided for session ${sessionId}`);
      return null;
    }

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
      this.logger.log(`Loaded script ${scriptId} for session ${sessionId}`);
    }

    return script;
  }

  async loadKnowledge(sessionId: string, agentId: string, knowledgeBaseIds?: string[]) {
    if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) {
      this.logger.warn(`No knowledge base IDs provided for session ${sessionId}`);
      return [];
    }

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
      this.logger.log(`Loaded ${knowledgeDocs.length} knowledge documents for session ${sessionId}`);
    }

    return knowledgeDocs;
  }

  async loadMemory(sessionId: string, companyId: string) {
    const config = await this.prisma.memoryConfiguration.findUnique({
      where: { companyId },
    });

    if (config) {
      this.logger.log(`Loaded memory configuration for session ${sessionId}`);
    }

    return config;
  }

  async loadConfiguration(sessionId: string, companyId: string) {
    const config = await this.prisma.runtimeConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      this.logger.warn(`No runtime configuration found for company ${companyId}`);
      return await this.prisma.runtimeConfiguration.create({
        data: { companyId },
      });
    }

    this.logger.log(`Loaded runtime configuration for session ${sessionId}`);
    return config;
  }

  async executeAIPipeline(
    sessionId: string,
    agentId: string,
    companyId: string,
    userInput: string,
    context: any,
  ) {
    this.logger.log(`Executing AI pipeline for session ${sessionId}`);

    await this.updateAgentStatus(agentId, AgentStatus.THINKING);

    const runtimeState = await this.prisma.runtimeState.findFirst({
      where: { sessionId, agentId },
      orderBy: { timestamp: 'desc' },
    });

    const config = await this.prisma.runtimeConfiguration.findUnique({
      where: { companyId },
    });

    const startTime = Date.now();

    const response = await this.generateResponse(
      sessionId,
      agentId,
      companyId,
      userInput,
      context,
      runtimeState,
      config,
    );

    const executionTime = Date.now() - startTime;

    await this.updateAgentStatus(agentId, AgentStatus.RESPONDING);

    await this.storeRuntimeState(sessionId, agentId, companyId, {
      lastInput: userInput,
      lastOutput: response.text,
      executionTime,
      timestamp: new Date(),
    });

    this.logger.log(`AI pipeline executed in ${executionTime}ms for session ${sessionId}`);

    return {
      ...response,
      executionTime,
    };
  }

  private async generateResponse(
    sessionId: string,
    agentId: string,
    companyId: string,
    userInput: string,
    context: any,
    runtimeState: any,
    config: any,
  ) {
    this.logger.debug(`Generating response for input: ${userInput.substring(0, 50)}...`);

    const response = {
      text: `AI Response to: ${userInput}`,
      confidence: 0.95,
      intent: 'general_inquiry',
      entities: [],
      nextAction: 'continue',
      metadata: {
        temperature: config?.temperature || 0.7,
        maxTokens: config?.maxTokens || 4000,
        prompt: runtimeState?.prompt ? 'loaded' : 'not_loaded',
        script: runtimeState?.script ? 'loaded' : 'not_loaded',
        knowledge: runtimeState?.knowledge?.length || 0,
      },
    };

    return response;
  }

  async storeRuntimeState(sessionId: string, agentId: string, companyId: string, stateData: any) {
    const existingState = await this.prisma.runtimeState.findFirst({
      where: { sessionId, agentId },
      orderBy: { timestamp: 'desc' },
    });

    if (existingState) {
      await this.prisma.runtimeState.update({
        where: { id: existingState.id },
        data: {
          stateData: {
            ...(existingState.stateData as any),
            ...stateData,
          },
        },
      });
    } else {
      await this.prisma.runtimeState.create({
        data: {
          sessionId,
          agentId,
          companyId,
          state: AgentStatus.READY as any,
          stateData,
        },
      });
    }
  }

  async getRuntimeState(sessionId: string, agentId: string) {
    return this.prisma.runtimeState.findFirst({
      where: { sessionId, agentId },
      orderBy: { timestamp: 'desc' },
    });
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

    this.logger.debug(`State transition: ${fromState} -> ${toState} (${reason})`);
  }

  async emitRuntimeEvent(
    agentId: string,
    sessionId: string,
    companyId: string,
    eventType: string,
    eventName: string,
    eventData: any,
    severity: string = 'INFO',
  ) {
    await this.prisma.agentEvent.create({
      data: {
        agentId,
        sessionId,
        companyId,
        eventType: eventType as any,
        eventName,
        eventData,
        severity: severity as any,
        message: eventName,
      },
    });

    this.logger.debug(`Runtime event emitted: ${eventType} - ${eventName}`);
  }
}
