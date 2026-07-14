import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ConfidenceAnalysisResult {
  intentConfidence: number;
  knowledgeConfidence: number;
  decisionConfidence: number;
  conversationConfidence: number;
  overallConfidence: number;
  lowConfidencePoints: any[];
  confidenceDistribution: any;
}

@Injectable()
export class ConfidenceAnalyzerService {
  private readonly logger = new Logger(ConfidenceAnalyzerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeConfidence(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<ConfidenceAnalysisResult> {
    this.logger.log(
      `Analyzing confidence for conversation: ${conversationId}`,
    );

    const decisionLogs = await this.prisma.decisionLog.findMany({
      where: { conversationId, companyId },
      include: {
        intentDetails: true,
      },
    });

    const confidenceScores = await this.prisma.confidenceScore.findMany({
      where: { conversationId, companyId },
    });

    const knowledgeSearches = await this.prisma.searchHistory.findMany({
      where: { companyId },
      include: { results: true },
    });

    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        questions: true,
        metrics: true,
      },
    });

    const intentConfidence = this.calculateIntentConfidence(decisionLogs);
    const knowledgeConfidence = this.calculateKnowledgeConfidence(
      knowledgeSearches,
      decisionLogs,
    );
    const decisionConfidence = this.calculateDecisionConfidence(decisionLogs);
    const conversationConfidence =
      this.calculateConversationConfidence(session);
    const overallConfidence =
      (intentConfidence +
        knowledgeConfidence +
        decisionConfidence +
        conversationConfidence) /
      4;

    const lowConfidencePoints = this.identifyLowConfidencePoints(
      decisionLogs,
      session,
      knowledgeSearches,
    );

    const confidenceDistribution = this.calculateConfidenceDistribution(
      decisionLogs,
      confidenceScores,
    );

    return {
      intentConfidence,
      knowledgeConfidence,
      decisionConfidence,
      conversationConfidence,
      overallConfidence,
      lowConfidencePoints,
      confidenceDistribution,
    };
  }

  private calculateIntentConfidence(decisionLogs: any[]): number {
    if (decisionLogs.length === 0) return 0;

    const totalConfidence = decisionLogs.reduce(
      (sum, log) => sum + log.intentConfidence,
      0,
    );

    return totalConfidence / decisionLogs.length;
  }

  private calculateKnowledgeConfidence(
    searches: any[],
    decisionLogs: any[],
  ): number {
    if (searches.length === 0) return 0.5;

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

    return count > 0 ? totalConfidence / count : 0.5;
  }

  private calculateDecisionConfidence(decisionLogs: any[]): number {
    if (decisionLogs.length === 0) return 0;

    const totalConfidence = decisionLogs.reduce(
      (sum, log) => sum + log.overallConfidence,
      0,
    );

    return totalConfidence / decisionLogs.length;
  }

  private calculateConversationConfidence(session: any): number {
    if (!session) return 0;

    let confidence = 0.5;
    let factors = 0;

    if (session.questions && session.questions.length > 0) {
      const answeredQuestions = session.questions.filter(
        (q: any) => q.wasAnswered && q.confidenceScore !== null,
      );

      if (answeredQuestions.length > 0) {
        const avgQuestionConfidence =
          answeredQuestions.reduce(
            (sum: number, q: any) => sum + (q.confidenceScore || 0),
            0,
          ) / answeredQuestions.length;
        confidence += avgQuestionConfidence * 0.3;
        factors++;
      }
    }

    if (session.metrics?.averageConfidenceScore) {
      confidence += session.metrics.averageConfidenceScore * 0.3;
      factors++;
    }

    if (session.conversationResult === 'COMPLETED') {
      confidence += 0.1;
    } else if (session.conversationResult === 'FAILED') {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private identifyLowConfidencePoints(
    decisionLogs: any[],
    session: any,
    searches: any[],
  ): any[] {
    const lowPoints = [];

    decisionLogs.forEach((log, index) => {
      if (log.intentConfidence < 0.6) {
        lowPoints.push({
          type: 'INTENT',
          position: index,
          confidence: log.intentConfidence,
          intent: log.detectedIntent,
          timestamp: log.createdAt,
          reason: 'Low intent detection confidence',
        });
      }

      if (log.overallConfidence < 0.6) {
        lowPoints.push({
          type: 'DECISION',
          position: index,
          confidence: log.overallConfidence,
          action: log.conversationAction,
          timestamp: log.createdAt,
          reason: 'Low overall decision confidence',
        });
      }
    });

    searches.forEach((search, index) => {
      if (search.results && search.results.length > 0) {
        const topResult = search.results.sort(
          (a: any, b: any) => a.rank - b.rank,
        )[0];

        if (topResult.score < 0.5) {
          lowPoints.push({
            type: 'KNOWLEDGE',
            position: index,
            confidence: topResult.score,
            query: search.query,
            timestamp: search.createdAt,
            reason: 'Low knowledge retrieval confidence',
          });
        }
      }
    });

    if (session?.questions) {
      session.questions.forEach((question: any, index: number) => {
        if (question.confidenceScore && question.confidenceScore < 0.6) {
          lowPoints.push({
            type: 'QUESTION',
            position: index,
            confidence: question.confidenceScore,
            question: question.questionText,
            timestamp: question.askedAt,
            reason: 'Low answer confidence',
          });
        }
      });
    }

    return lowPoints.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  private calculateConfidenceDistribution(
    decisionLogs: any[],
    confidenceScores: any[],
  ): any {
    const distribution = {
      veryHigh: 0,
      high: 0,
      medium: 0,
      low: 0,
      veryLow: 0,
    };

    const allConfidences: number[] = [];

    decisionLogs.forEach((log) => {
      allConfidences.push(log.intentConfidence);
      allConfidences.push(log.overallConfidence);
    });

    confidenceScores.forEach((score) => {
      allConfidences.push(score.score);
    });

    allConfidences.forEach((confidence) => {
      if (confidence >= 0.9) {
        distribution.veryHigh++;
      } else if (confidence >= 0.75) {
        distribution.high++;
      } else if (confidence >= 0.6) {
        distribution.medium++;
      } else if (confidence >= 0.4) {
        distribution.low++;
      } else {
        distribution.veryLow++;
      }
    });

    const total = allConfidences.length || 1;

    return {
      counts: distribution,
      percentages: {
        veryHigh: (distribution.veryHigh / total) * 100,
        high: (distribution.high / total) * 100,
        medium: (distribution.medium / total) * 100,
        low: (distribution.low / total) * 100,
        veryLow: (distribution.veryLow / total) * 100,
      },
      total: allConfidences.length,
      average:
        allConfidences.length > 0
          ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
          : 0,
    };
  }
}
