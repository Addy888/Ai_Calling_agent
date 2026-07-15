import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AgentStatus } from '../dto/ai-agent.dto';

@Injectable()
export class StateManagerService {
  private readonly logger = new Logger(StateManagerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentState(sessionId: string, agentId: string) {
    const state = await this.prisma.runtimeState.findFirst({
      where: { sessionId, agentId },
      orderBy: { timestamp: 'desc' },
    });

    return state;
  }

  async transitionTo(
    sessionId: string,
    agentId: string,
    companyId: string,
    newState: AgentStatus,
    reason: string,
    metadata?: any,
  ) {
    const currentState = await this.getCurrentState(sessionId, agentId);

    const state = await this.prisma.runtimeState.create({
      data: {
        sessionId,
        agentId,
        companyId,
        state: newState as any,
        previousState: currentState?.state as any,
        transitionReason: reason,
        metadata,
      },
    });

    await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: { status: newState as any },
    });

    this.logger.log(`State transition: ${currentState?.state || 'NONE'} -> ${newState} for session ${sessionId}`);

    return state;
  }

  async getStateHistory(sessionId: string, agentId: string, limit = 50) {
    const history = await this.prisma.runtimeState.findMany({
      where: { sessionId, agentId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return history;
  }

  async updateStateData(sessionId: string, agentId: string, stateData: any) {
    const currentState = await this.getCurrentState(sessionId, agentId);

    if (!currentState) {
      throw new Error('No current state found');
    }

    const updated = await this.prisma.runtimeState.update({
      where: { id: currentState.id },
      data: {
        stateData: {
          ...(currentState.stateData as any),
          ...stateData,
        },
      },
    });

    return updated;
  }

  async updateStateVariables(sessionId: string, agentId: string, variables: any) {
    const currentState = await this.getCurrentState(sessionId, agentId);

    if (!currentState) {
      throw new Error('No current state found');
    }

    const updated = await this.prisma.runtimeState.update({
      where: { id: currentState.id },
      data: {
        variables: {
          ...(currentState.variables as any),
          ...variables,
        },
      },
    });

    return updated;
  }

  async updateStateContext(sessionId: string, agentId: string, context: any) {
    const currentState = await this.getCurrentState(sessionId, agentId);

    if (!currentState) {
      throw new Error('No current state found');
    }

    const updated = await this.prisma.runtimeState.update({
      where: { id: currentState.id },
      data: {
        context: {
          ...(currentState.context as any),
          ...context,
        },
      },
    });

    return updated;
  }

  async resetState(sessionId: string, agentId: string, companyId: string) {
    await this.transitionTo(
      sessionId,
      agentId,
      companyId,
      AgentStatus.IDLE,
      'State reset',
      { resetAt: new Date() },
    );

    this.logger.log(`State reset for session ${sessionId}`);
  }

  async getStateMetrics(agentId: string, companyId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const states = await this.prisma.runtimeState.findMany({
      where: {
        agentId,
        companyId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    const stateDistribution: Record<string, number> = {};
    const transitionCounts: Record<string, number> = {};

    states.forEach((state) => {
      const stateKey = state.state;
      stateDistribution[stateKey] = (stateDistribution[stateKey] || 0) + 1;

      if (state.previousState) {
        const transitionKey = `${state.previousState}->${state.state}`;
        transitionCounts[transitionKey] = (transitionCounts[transitionKey] || 0) + 1;
      }
    });

    return {
      totalStates: states.length,
      stateDistribution,
      transitionCounts,
      startDate,
      endDate: new Date(),
    };
  }
}
