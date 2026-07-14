import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface KnowledgeAccuracyResult {
  knowledgeRetrieved: number;
  relevantKnowledge: number;
  irrelevantKnowledge: number;
  missingKnowledge: number;
  invalidKnowledgeUsage: number;
  averageConfidence: number;
  accuracyScore: number;
  relevanceScore: number;
  overallScore: number;
  issues: any[];
  knowledgeGaps: any[];
}

@Injectable()
export class KnowledgeAccuracyService {
  private readonly logger = new Logger(KnowledgeAccuracyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateKnowledgeAccuracy(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<KnowledgeAccuracyResult> {
    this.logger.log(
      `Evaluating knowledge accuracy for conversation: ${conversationId}`,
    );

    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        timeline: true,
      },
    });

    if (!session) {
      throw new Error('Conversation session not found');
    }

    const knowledgeSearches = await this.prisma.searchHistory.findMany({
      where: {
        companyId,
        createdAt: {
          gte: session.startedAt,
          lte: session.endedAt || new Date(),
        },
      },
      include: {
        results: {
          include: {
            chunk: {
              include: {
                document: true,
              },
            },
          },
        },
      },
    });

    const knowledgeEvents = session.timeline.filter(
      (event: any) => event.eventType === 'KNOWLEDGE_SEARCHED',
    );

    const knowledgeRetrieved = knowledgeSearches.length;
    const relevantKnowledge = this.countRelevantKnowledge(
      knowledgeSearches,
      knowledgeEvents,
    );
    const irrelevantKnowledge = knowledgeRetrieved - relevantKnowledge;
    const missingKnowledge = this.countMissingKnowledge(
      session,
      knowledgeEvents,
    );
    const invalidKnowledgeUsage = this.countInvalidUsage(
      knowledgeSearches,
      knowledgeEvents,
    );

    const averageConfidence = this.calculateAverageConfidence(knowledgeSearches);
    const accuracyScore = this.calculateAccuracyScore({
      knowledgeRetrieved,
      relevantKnowledge,
      invalidKnowledgeUsage,
    });
    const relevanceScore = this.calculateRelevanceScore({
      relevantKnowledge,
      irrelevantKnowledge,
    });
    const overallScore = (accuracyScore + relevanceScore) / 2;

    const issues = this.identifyIssues({
      knowledgeRetrieved,
      relevantKnowledge,
      irrelevantKnowledge,
      missingKnowledge,
      invalidKnowledgeUsage,
      averageConfidence,
    });

    const knowledgeGaps = this.identifyKnowledgeGaps(
      session,
      knowledgeEvents,
    );

    return {
      knowledgeRetrieved,
      relevantKnowledge,
      irrelevantKnowledge,
      missingKnowledge,
      invalidKnowledgeUsage,
      averageConfidence,
      accuracyScore,
      relevanceScore,
      overallScore,
      issues,
      knowledgeGaps,
    };
  }

  private countRelevantKnowledge(searches: any[], events: any[]): number {
    let relevantCount = 0;

    searches.forEach((search) => {
      if (!search.results || search.results.length === 0) {
        return;
      }

      const topResult = search.results.sort((a: any, b: any) => a.rank - b.rank)[0];

      if (topResult.score >= 0.7) {
        relevantCount++;
      }
    });

    return relevantCount;
  }

  private countMissingKnowledge(session: any, knowledgeEvents: any[]): number {
    const questionEvents = session.timeline.filter(
      (e: any) => e.eventType === 'QUESTION_ASKED',
    );

    let missingCount = 0;

    questionEvents.forEach((question: any) => {
      const hasKnowledgeSearch = knowledgeEvents.some((ke: any) => {
        const timeDiff = Math.abs(
          new Date(ke.timestamp).getTime() -
            new Date(question.timestamp).getTime(),
        );
        return timeDiff < 30000;
      });

      if (
        !hasKnowledgeSearch &&
        question.eventDescription?.includes('information')
      ) {
        missingCount++;
      }
    });

    return missingCount;
  }

  private countInvalidUsage(searches: any[], events: any[]): number {
    let invalidCount = 0;

    searches.forEach((search) => {
      if (!search.results || search.results.length === 0) {
        invalidCount++;
        return;
      }

      const topResult = search.results.sort((a: any, b: any) => a.rank - b.rank)[0];

      if (topResult.score < 0.4) {
        invalidCount++;
      }
    });

    return invalidCount;
  }

  private calculateAverageConfidence(searches: any[]): number {
    if (searches.length === 0) {
      return 0;
    }

    let totalConfidence = 0;
    let count = 0;

    searches.forEach((search) => {
      if (search.results && search.results.length > 0) {
        const topResult = search.results.sort(
          (a: any, b: any) => a.rank - b.rank,
        )[0];
        totalConfidence += topResult.score;
        count++;
      }
    });

    return count > 0 ? totalConfidence / count : 0;
  }

  private calculateAccuracyScore(data: any): number {
    if (data.knowledgeRetrieved === 0) {
      return 50;
    }

    const usageRate =
      ((data.knowledgeRetrieved - data.invalidKnowledgeUsage) /
        data.knowledgeRetrieved) *
      100;
    const relevanceRate = (data.relevantKnowledge / data.knowledgeRetrieved) * 100;

    return (usageRate + relevanceRate) / 2;
  }

  private calculateRelevanceScore(data: any): number {
    const total = data.relevantKnowledge + data.irrelevantKnowledge;

    if (total === 0) {
      return 50;
    }

    return (data.relevantKnowledge / total) * 100;
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (data.knowledgeRetrieved === 0) {
      issues.push({
        type: 'NO_KNOWLEDGE_USED',
        severity: 'HIGH',
        message: 'No knowledge was retrieved during the conversation',
      });
    }

    if (data.relevantKnowledge === 0 && data.knowledgeRetrieved > 0) {
      issues.push({
        type: 'NO_RELEVANT_KNOWLEDGE',
        severity: 'HIGH',
        message: 'No relevant knowledge was found',
      });
    }

    if (data.irrelevantKnowledge > data.relevantKnowledge) {
      issues.push({
        type: 'HIGH_IRRELEVANCE',
        severity: 'HIGH',
        message: 'More irrelevant than relevant knowledge was retrieved',
      });
    }

    if (data.missingKnowledge > 0) {
      issues.push({
        type: 'MISSING_KNOWLEDGE',
        severity: 'MEDIUM',
        message: `${data.missingKnowledge} question(s) could have used knowledge`,
      });
    }

    if (data.invalidKnowledgeUsage > 0) {
      issues.push({
        type: 'INVALID_KNOWLEDGE_USAGE',
        severity: 'HIGH',
        message: `${data.invalidKnowledgeUsage} instance(s) of low-quality knowledge usage`,
      });
    }

    if (data.averageConfidence < 0.5) {
      issues.push({
        type: 'LOW_CONFIDENCE',
        severity: 'HIGH',
        message: 'Average knowledge confidence is low',
        confidence: data.averageConfidence,
      });
    }

    return issues;
  }

  private identifyKnowledgeGaps(session: any, knowledgeEvents: any[]): any[] {
    const gaps = [];

    const unansweredQuestions = session.timeline.filter(
      (e: any) =>
        e.eventType === 'QUESTION_ASKED' &&
        !session.timeline.some(
          (ae: any) =>
            ae.eventType === 'ANSWER_RECEIVED' &&
            Math.abs(
              new Date(ae.timestamp).getTime() -
                new Date(e.timestamp).getTime(),
            ) < 30000,
        ),
    );

    unansweredQuestions.forEach((question: any) => {
      gaps.push({
        type: 'UNANSWERED_QUESTION',
        question: question.eventDescription,
        timestamp: question.timestamp,
        state: question.conversationState,
      });
    });

    const lowConfidenceKnowledge = knowledgeEvents.filter(
      (e: any) => e.confidenceScore && e.confidenceScore < 0.5,
    );

    lowConfidenceKnowledge.forEach((event: any) => {
      gaps.push({
        type: 'LOW_CONFIDENCE_KNOWLEDGE',
        description: event.eventDescription,
        confidence: event.confidenceScore,
        timestamp: event.timestamp,
      });
    });

    return gaps;
  }
}
