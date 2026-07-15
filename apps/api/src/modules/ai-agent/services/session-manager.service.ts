import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSessionDto, UpdateSessionDto, SessionStatus } from '../dto/ai-agent.dto';

@Injectable()
export class SessionManagerService {
  constructor(private readonly prisma: PrismaService) {}

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
        status: SessionStatus.ACTIVE as any,
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

    await this.logSessionEvent(session.id, 'SESSION_CREATED', 'Session created successfully');

    return session;
  }

  async getSession(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      include: {
        agent: {
          select: {
            id: true,
            agentName: true,
            status: true,
            isActive: true,
          },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        states: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        conversations: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getSessions(companyId: string, filters?: { agentId?: string; status?: string }) {
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
      take: 100,
    });
  }

  async updateSession(companyId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        ...dto,
        lastActivityAt: new Date(),
      },
    });

    await this.logSessionEvent(session.id, 'SESSION_UPDATED', 'Session updated');

    return updated;
  }

  async pauseSession(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Session is not active');
    }

    const updated = await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.PAUSED as any,
        pausedAt: new Date(),
      },
    });

    await this.logSessionEvent(session.id, 'SESSION_PAUSED', 'Session paused');

    return updated;
  }

  async resumeSession(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'PAUSED') {
      throw new BadRequestException('Session is not paused');
    }

    const updated = await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.ACTIVE as any,
        resumedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    await this.logSessionEvent(session.id, 'SESSION_RESUMED', 'Session resumed');

    return updated;
  }

  async closeSession(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const duration = Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000);

    const updated = await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.CLOSED as any,
        closedAt: new Date(),
        duration,
      },
    });

    await this.logSessionEvent(session.id, 'SESSION_CLOSED', 'Session closed');

    return updated;
  }

  async expireSession(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.EXPIRED as any,
        closedAt: new Date(),
      },
    });

    await this.logSessionEvent(session.id, 'SESSION_EXPIRED', 'Session expired');

    return updated;
  }

  async getSessionHistory(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const events = await this.prisma.sessionEvent.findMany({
      where: { sessionId: session.id },
      orderBy: { timestamp: 'desc' },
    });

    return events;
  }

  async getSessionMetadata(companyId: string, sessionId: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { sessionId, companyId },
      select: {
        sessionId: true,
        status: true,
        sessionVariables: true,
        sessionContext: true,
        sessionMetadata: true,
        startedAt: true,
        lastActivityAt: true,
        duration: true,
        messageCount: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async cleanupExpiredSessions(companyId: string) {
    const expiredSessions = await this.prisma.agentSession.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    for (const session of expiredSessions) {
      await this.expireSession(companyId, session.sessionId);
    }

    return {
      expired: expiredSessions.length,
      message: `Cleaned up ${expiredSessions.length} expired sessions`,
    };
  }

  private async logSessionEvent(sessionId: string, eventType: string, message: string) {
    await this.prisma.sessionEvent.create({
      data: {
        sessionId,
        eventType,
        eventData: { message },
      },
    });
  }
}
