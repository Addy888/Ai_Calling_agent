import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSummaryDto, UpdateSummaryDto, LeadStatus } from '../dto/conversation-summary.dto';
import { ConversationSessionService } from './conversation-session.service';
import { QuestionManagerService } from './question-manager.service';
import { ObjectionHandlerService } from './objection-handler.service';
import { TimelineService } from './timeline.service';

@Injectable()
export class SummaryBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: ConversationSessionService,
    private readonly questionManager: QuestionManagerService,
    private readonly objectionHandler: ObjectionHandlerService,
    private readonly timelineService: TimelineService,
  ) {}

  async create(dto: CreateSummaryDto) {
    return this.prisma.conversationSummary.create({
      data: {
        sessionId: dto.sessionId,
        companyId: dto.companyId,
        contactId: dto.contactId,
        campaignId: dto.campaignId,
        conversationResult: dto.conversationResult,
        leadStatus: dto.leadStatus,
        customerName: dto.customerName,
        customerCity: dto.customerCity,
        customerBudget: dto.customerBudget,
        customerPropertyType: dto.customerPropertyType,
        keyInterests: dto.keyInterests,
        extractedEntities: dto.extractedEntities,
        questionsAsked: dto.questionsAsked,
        questionsAnswered: dto.questionsAnswered,
        objectionsRaised: dto.objectionsRaised,
        objectionsResolved: dto.objectionsResolved,
        knowledgeQueriesCount: dto.knowledgeQueriesCount,
        stateTransitionsCount: dto.stateTransitionsCount,
        totalDuration: dto.totalDuration,
        averageResponseTime: dto.averageResponseTime,
        customerSentiment: dto.customerSentiment,
        conversationQuality: dto.conversationQuality,
        nextAction: dto.nextAction,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
        followUpRequired: dto.followUpRequired,
        appointmentScheduled: dto.appointmentScheduled,
        detailedNotes: dto.detailedNotes,
        summaryText: dto.summaryText,
        metadata: dto.metadata,
      },
    });
  }

  async update(sessionId: string, dto: UpdateSummaryDto) {
    return this.prisma.conversationSummary.update({
      where: { sessionId },
      data: {
        conversationResult: dto.conversationResult,
        leadStatus: dto.leadStatus,
        nextAction: dto.nextAction,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : undefined,
        detailedNotes: dto.detailedNotes,
        summaryText: dto.summaryText,
      },
    });
  }

  async generateAutoSummary(sessionId: string) {
    const session = await this.sessionService.findBySessionId(sessionId);

    const [questionStats, objectionStats, timelineStats] = await Promise.all([
      this.questionManager.getQuestionStats(sessionId),
      this.objectionHandler.getObjectionStats(sessionId),
      this.timelineService.getTimelineStats(sessionId),
    ]);

    const questions = await this.questionManager.getQuestionsBySession(sessionId);
    const extractedEntities: any = {};
    const keyInterests: string[] = [];

    questions.forEach((q) => {
      if (q.wasAnswered && q.extractedValue) {
        extractedEntities[q.questionType] = q.extractedValue;

        if (q.questionType === 'NAME') extractedEntities.customerName = q.extractedValue;
        if (q.questionType === 'CITY') extractedEntities.customerCity = q.extractedValue;
        if (q.questionType === 'BUDGET') extractedEntities.customerBudget = q.extractedValue;
        if (q.questionType === 'PROPERTY_TYPE') {
          extractedEntities.customerPropertyType = q.extractedValue;
          keyInterests.push(q.extractedValue);
        }
      }
    });

    const stateTransitions = await this.prisma.conversationStateTransition.count({
      where: { sessionId: session.id },
    });

    const totalDuration = session.totalDuration || 0;

    const summaryText = this.buildSummaryText({
      customerName: extractedEntities.customerName,
      customerCity: extractedEntities.customerCity,
      customerBudget: extractedEntities.customerBudget,
      customerPropertyType: extractedEntities.customerPropertyType,
      questionsAsked: questionStats.asked,
      questionsAnswered: questionStats.answered,
      objectionsRaised: objectionStats.total,
      objectionsResolved: objectionStats.resolved,
      totalDuration,
      conversationResult: session.conversationResult,
    });

    return this.create({
      sessionId,
      companyId: session.companyId,
      contactId: session.contactId,
      campaignId: session.campaignId,
      conversationResult: (session.conversationResult as any) || 'COMPLETED',
      leadStatus: this.determineleadStatus(session, objectionStats),
      customerName: extractedEntities.customerName,
      customerCity: extractedEntities.customerCity,
      customerBudget: extractedEntities.customerBudget,
      customerPropertyType: extractedEntities.customerPropertyType,
      keyInterests,
      extractedEntities,
      questionsAsked: questionStats.asked,
      questionsAnswered: questionStats.answered,
      objectionsRaised: objectionStats.total,
      objectionsResolved: objectionStats.resolved,
      knowledgeQueriesCount: timelineStats.knowledgeQueriesCount,
      stateTransitionsCount: stateTransitions,
      totalDuration,
      averageResponseTime: null,
      customerSentiment: this.detectSentiment(objectionStats),
      conversationQuality: this.calculateQuality(questionStats, objectionStats, timelineStats),
      nextAction: this.determineNextAction(session, objectionStats),
      nextActionDate: null,
      followUpRequired: objectionStats.total > 0 && objectionStats.unresolved > 0,
      appointmentScheduled: false,
      detailedNotes: null,
      summaryText,
      metadata: {
        questionStats,
        objectionStats,
        timelineStats,
      },
    });
  }

  private buildSummaryText(data: any): string {
    const parts: string[] = [];

    if (data.customerName) {
      parts.push(`Customer: ${data.customerName}`);
    }

    if (data.customerCity) {
      parts.push(`Looking for property in: ${data.customerCity}`);
    }

    if (data.customerBudget) {
      parts.push(`Budget: ${data.customerBudget}`);
    }

    if (data.customerPropertyType) {
      parts.push(`Property Type: ${data.customerPropertyType}`);
    }

    parts.push(`Questions asked: ${data.questionsAsked}, Answered: ${data.questionsAnswered}`);

    if (data.objectionsRaised > 0) {
      parts.push(`Objections raised: ${data.objectionsRaised}, Resolved: ${data.objectionsResolved}`);
    }

    parts.push(`Duration: ${Math.floor(data.totalDuration / 60)} minutes ${data.totalDuration % 60} seconds`);

    if (data.conversationResult) {
      parts.push(`Result: ${data.conversationResult}`);
    }

    return parts.join('. ');
  }

  private determineleadStatus(session: any, objectionStats: any): LeadStatus {
    if (objectionStats.byType?.DO_NOT_CALL) {
      return LeadStatus.DO_NOT_CALL;
    }

    if (objectionStats.byType?.WRONG_NUMBER) {
      return LeadStatus.WRONG_NUMBER;
    }

    if (objectionStats.byType?.NOT_INTERESTED) {
      return LeadStatus.NOT_INTERESTED;
    }

    if (objectionStats.byType?.CALL_LATER || objectionStats.byType?.BUSY) {
      return LeadStatus.CALL_BACK_LATER;
    }

    if (objectionStats.total === 0 || objectionStats.resolved === objectionStats.total) {
      return LeadStatus.INTERESTED;
    }

    return LeadStatus.NEW;
  }

  private detectSentiment(objectionStats: any): string {
    if (objectionStats.total === 0) {
      return 'POSITIVE';
    }

    if (objectionStats.resolutionRate > 70) {
      return 'NEUTRAL';
    }

    if (objectionStats.byType?.NOT_INTERESTED || objectionStats.byType?.DO_NOT_CALL) {
      return 'NEGATIVE';
    }

    return 'NEUTRAL';
  }

  private calculateQuality(questionStats: any, objectionStats: any, timelineStats: any): number {
    let score = 0;

    if (questionStats.answerRate > 70) score += 30;
    else if (questionStats.answerRate > 50) score += 20;
    else score += 10;

    if (objectionStats.resolutionRate > 80) score += 30;
    else if (objectionStats.resolutionRate > 50) score += 20;
    else score += 10;

    if (timelineStats.averageConfidence > 0.8) score += 20;
    else if (timelineStats.averageConfidence > 0.6) score += 15;
    else score += 10;

    if (timelineStats.knowledgeQueriesCount > 0) score += 20;

    return Math.min(score, 100);
  }

  private determineNextAction(session: any, objectionStats: any): string {
    if (objectionStats.byType?.DO_NOT_CALL) {
      return 'DO_NOT_CONTACT';
    }

    if (objectionStats.byType?.CALL_LATER || objectionStats.byType?.BUSY) {
      return 'SCHEDULE_CALLBACK';
    }

    if (objectionStats.byType?.NOT_INTERESTED) {
      return 'MARK_AS_NOT_INTERESTED';
    }

    if (objectionStats.unresolved > 0) {
      return 'FOLLOW_UP_REQUIRED';
    }

    return 'MARK_AS_COMPLETED';
  }

  async findBySessionId(sessionId: string) {
    return this.prisma.conversationSummary.findUnique({
      where: { sessionId },
    });
  }

  async findByCompany(companyId: string, limit: number = 20) {
    return this.prisma.conversationSummary.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
