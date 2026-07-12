import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateTimelineEventDto, TimelineQueryDto } from '../dto/conversation-timeline.dto';

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(dto: CreateTimelineEventDto) {
    return this.prisma.conversationTimeline.create({
      data: {
        sessionId: dto.sessionId,
        companyId: dto.companyId,
        eventType: dto.eventType,
        eventTitle: dto.eventTitle,
        eventDescription: dto.eventDescription,
        conversationState: dto.conversationState,
        nodeId: dto.nodeId,
        intentDetected: dto.intentDetected,
        customerInput: dto.customerInput,
        systemResponse: dto.systemResponse,
        knowledgeUsed: dto.knowledgeUsed || false,
        knowledgeIds: dto.knowledgeIds,
        entitiesExtracted: dto.entitiesExtracted,
        confidenceScore: dto.confidenceScore,
        duration: dto.duration,
        metadata: dto.metadata,
      },
    });
  }

  async getTimeline(sessionId: string, query?: TimelineQueryDto) {
    const where: any = { sessionId };

    if (query?.eventType) {
      where.eventType = query.eventType;
    }

    if (query?.state) {
      where.conversationState = query.state;
    }

    if (query?.intentDetected) {
      where.intentDetected = query.intentDetected;
    }

    return this.prisma.conversationTimeline.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });
  }

  async getTimelineStats(sessionId: string) {
    const timeline = await this.prisma.conversationTimeline.findMany({
      where: { sessionId },
    });

    const eventTypeCounts = timeline.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const knowledgeQueriesCount = timeline.filter((e) => e.knowledgeUsed).length;

    const averageConfidence =
      timeline.filter((e) => e.confidenceScore !== null).reduce((sum, e) => sum + (e.confidenceScore || 0), 0) /
        timeline.filter((e) => e.confidenceScore !== null).length || 0;

    return {
      totalEvents: timeline.length,
      eventTypeCounts,
      knowledgeQueriesCount,
      averageConfidence,
    };
  }

  async getRecentEvents(sessionId: string, limit: number = 10) {
    return this.prisma.conversationTimeline.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
