import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateConversationSessionDto,
  UpdateConversationStateDto,
  CompleteConversationDto,
  ConversationSessionListDto,
  ConversationState,
} from '../dto/conversation-session.dto';

@Injectable()
export class ConversationSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConversationSessionDto) {
    const existing = await this.prisma.conversationSession.findUnique({
      where: { sessionId: dto.sessionId },
    });

    if (existing) {
      throw new BadRequestException('Session already exists');
    }

    return this.prisma.conversationSession.create({
      data: {
        sessionId: dto.sessionId,
        companyId: dto.companyId,
        campaignId: dto.campaignId,
        contactId: dto.contactId,
        callId: dto.callId,
        scriptId: dto.scriptId,
        language: dto.language || 'en',
        currentState: ConversationState.GREETING,
        metadata: dto.metadata,
      },
    });
  }

  async findById(id: string) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id },
      include: {
        timeline: {
          orderBy: { timestamp: 'asc' },
        },
        stateTransitions: {
          orderBy: { createdAt: 'asc' },
        },
        questions: {
          orderBy: { askedAt: 'asc' },
        },
        objections: {
          orderBy: { detectedAt: 'asc' },
        },
        followUps: {
          orderBy: { createdAt: 'asc' },
        },
        summary: true,
        metrics: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async findBySessionId(sessionId: string) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        timeline: {
          orderBy: { timestamp: 'asc' },
        },
        stateTransitions: {
          orderBy: { createdAt: 'asc' },
        },
        questions: {
          orderBy: { askedAt: 'asc' },
        },
        objections: {
          orderBy: { detectedAt: 'asc' },
        },
        followUps: {
          orderBy: { createdAt: 'asc' },
        },
        summary: true,
        metrics: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async findAll(dto: ConversationSessionListDto) {
    const { companyId, campaignId, contactId, state, isActive, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (campaignId) where.campaignId = campaignId;
    if (contactId) where.contactId = contactId;
    if (state) where.currentState = state;
    if (isActive !== undefined) where.isActive = isActive;

    const [sessions, total] = await Promise.all([
      this.prisma.conversationSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          summary: true,
          metrics: true,
        },
      }),
      this.prisma.conversationSession.count({ where }),
    ]);

    return {
      data: sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateState(sessionId: string, dto: UpdateConversationStateDto) {
    const session = await this.findBySessionId(sessionId);

    const updated = await this.prisma.conversationSession.update({
      where: { id: session.id },
      data: {
        previousState: session.currentState,
        currentState: dto.newState,
        lastActivityAt: new Date(),
      },
    });

    await this.prisma.conversationStateTransition.create({
      data: {
        sessionId: session.id,
        fromState: session.currentState,
        toState: dto.newState,
        transitionReason: dto.reason,
        triggerType: dto.triggerType || 'MANUAL',
        metadata: dto.metadata,
      },
    });

    return updated;
  }

  async updateActivity(sessionId: string) {
    const session = await this.findBySessionId(sessionId);

    return this.prisma.conversationSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }

  async complete(sessionId: string, dto: CompleteConversationDto) {
    const session = await this.findBySessionId(sessionId);

    if (!session.isActive) {
      throw new BadRequestException('Session already completed');
    }

    const endedAt = new Date();
    const totalDuration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    return this.prisma.conversationSession.update({
      where: { id: session.id },
      data: {
        currentState: ConversationState.COMPLETED,
        conversationResult: dto.result,
        isActive: false,
        endedAt,
        totalDuration,
        lastActivityAt: endedAt,
        metadata: {
          ...(session.metadata as object || {}),
          ...(dto.metadata as object || {}),
          completionNotes: dto.notes,
        },
      },
    });
  }

  async cancel(sessionId: string, reason: string) {
    const session = await this.findBySessionId(sessionId);

    if (!session.isActive) {
      throw new BadRequestException('Session already ended');
    }

    const endedAt = new Date();
    const totalDuration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    return this.prisma.conversationSession.update({
      where: { id: session.id },
      data: {
        currentState: ConversationState.CANCELLED,
        isActive: false,
        endedAt,
        totalDuration,
        lastActivityAt: endedAt,
        metadata: {
          ...(session.metadata as object || {}),
          cancellationReason: reason,
        },
      },
    });
  }

  async getActiveSessionsByCompany(companyId: string) {
    return this.prisma.conversationSession.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async getSessionStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = startDate;
      if (endDate) where.startedAt.lte = endDate;
    }

    const [total, active, completed, cancelled] = await Promise.all([
      this.prisma.conversationSession.count({ where }),
      this.prisma.conversationSession.count({ where: { ...where, isActive: true } }),
      this.prisma.conversationSession.count({ where: { ...where, currentState: ConversationState.COMPLETED } }),
      this.prisma.conversationSession.count({ where: { ...where, currentState: ConversationState.CANCELLED } }),
    ]);

    return {
      total,
      active,
      completed,
      cancelled,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }
}
