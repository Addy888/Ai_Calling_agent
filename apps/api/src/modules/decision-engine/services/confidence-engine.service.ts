import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConfidenceScoreType } from '@prisma/client';
import {
  CalculateConfidenceDto,
  ConfidenceScoreResultDto,
  AllConfidenceScoresDto,
} from '../dto/confidence.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class ConfidenceEngineService {
  private readonly logger = new Logger(ConfidenceEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateAllConfidenceScores(
    companyId: string,
    conversationId: string,
    decisionLogId: string,
    factors: {
      intentConfidence: number;
      entityCount: number;
      entityAvgConfidence: number;
      businessRulesPassed: number;
      businessRulesTotal: number;
      knowledgeRelevance?: number;
      conversationLength: number;
      responseQuality?: number;
    },
  ): Promise<AllConfidenceScoresDto> {
    const config = await this.getConfiguration(companyId);

    const intentScore = this.calculateIntentConfidence(factors, config);
    const knowledgeScore = this.calculateKnowledgeConfidence(factors, config);
    const decisionScore = this.calculateDecisionConfidence(factors, config);
    const conversationScore = this.calculateConversationConfidence(factors, config);
    const overallScore = this.calculateOverallConfidence(
      [intentScore.score, knowledgeScore.score, decisionScore.score, conversationScore.score],
      config,
    );

    const scores = [intentScore, knowledgeScore, decisionScore, conversationScore, overallScore];
    const lowestScore = Math.min(...scores.map((s) => s.score));
    const lowestScoreType = scores.find((s) => s.score === lowestScore)?.scoreType;

    const shouldTriggerFallback = scores.some((s) => !s.isAboveThreshold);

    await this.saveConfidenceScores(companyId, conversationId, decisionLogId, scores);

    return {
      intent: intentScore,
      knowledge: knowledgeScore,
      decision: decisionScore,
      conversation: conversationScore,
      overall: overallScore,
      shouldTriggerFallback,
      lowestScoreType,
      lowestScore,
    };
  }

  private calculateIntentConfidence(
    factors: any,
    config: any,
  ): ConfidenceScoreResultDto {
    const score = factors.intentConfidence;
    const threshold = config.intentConfidenceThreshold;

    return {
      scoreType: ConfidenceScoreType.INTENT,
      score,
      threshold,
      isAboveThreshold: score >= threshold,
      factors: {
        rawConfidence: factors.intentConfidence,
      },
      calculationMethod: 'direct-confidence',
    };
  }

  private calculateKnowledgeConfidence(
    factors: any,
    config: any,
  ): ConfidenceScoreResultDto {
    const relevance = factors.knowledgeRelevance || 0.5;
    const hasKnowledge = factors.knowledgeRelevance !== undefined;

    let score = relevance;
    if (!hasKnowledge) {
      score = 0.5;
    }

    const threshold = config.knowledgeConfidenceThreshold;

    return {
      scoreType: ConfidenceScoreType.KNOWLEDGE,
      score,
      threshold,
      isAboveThreshold: score >= threshold,
      factors: {
        relevance,
        hasKnowledge,
      },
      calculationMethod: 'relevance-based',
    };
  }

  private calculateDecisionConfidence(
    factors: any,
    config: any,
  ): ConfidenceScoreResultDto {
    const entityScore =
      factors.entityCount > 0 ? factors.entityAvgConfidence : 0.5;

    const ruleScore =
      factors.businessRulesTotal > 0
        ? factors.businessRulesPassed / factors.businessRulesTotal
        : 0.7;

    const score = entityScore * 0.5 + ruleScore * 0.5;
    const threshold = config.decisionConfidenceThreshold;

    return {
      scoreType: ConfidenceScoreType.DECISION,
      score,
      threshold,
      isAboveThreshold: score >= threshold,
      factors: {
        entityScore,
        ruleScore,
        entityCount: factors.entityCount,
        rulesPassedRatio: ruleScore,
      },
      calculationMethod: 'weighted-average',
    };
  }

  private calculateConversationConfidence(
    factors: any,
    config: any,
  ): ConfidenceScoreResultDto {
    const lengthScore = Math.min(factors.conversationLength / 10, 1);
    const responseQuality = factors.responseQuality || 0.7;

    const score = lengthScore * 0.3 + responseQuality * 0.7;
    const threshold = config.conversationConfidenceThreshold;

    return {
      scoreType: ConfidenceScoreType.CONVERSATION,
      score,
      threshold,
      isAboveThreshold: score >= threshold,
      factors: {
        lengthScore,
        responseQuality,
        conversationLength: factors.conversationLength,
      },
      calculationMethod: 'composite-score',
    };
  }

  private calculateOverallConfidence(
    scores: number[],
    config: any,
  ): ConfidenceScoreResultDto {
    const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const threshold = config.overallConfidenceThreshold;

    return {
      scoreType: ConfidenceScoreType.OVERALL,
      score,
      threshold,
      isAboveThreshold: score >= threshold,
      factors: {
        intentScore: scores[0],
        knowledgeScore: scores[1],
        decisionScore: scores[2],
        conversationScore: scores[3],
      },
      calculationMethod: 'average',
    };
  }

  private async getConfiguration(companyId: string) {
    let config = await this.prisma.decisionConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.decisionConfiguration.create({
        data: {
          companyId,
          intentConfidenceThreshold: 0.7,
          knowledgeConfidenceThreshold: 0.6,
          decisionConfidenceThreshold: 0.7,
          conversationConfidenceThreshold: 0.65,
          overallConfidenceThreshold: 0.7,
          enableFallback: true,
          maxFallbackAttempts: 3,
          enableLeadQualification: true,
          enableBusinessRules: true,
          enableEntityExtraction: true,
        },
      });
    }

    return config;
  }

  private async saveConfidenceScores(
    companyId: string,
    conversationId: string,
    decisionLogId: string,
    scores: ConfidenceScoreResultDto[],
  ): Promise<void> {
    try {
      await this.prisma.confidenceScore.createMany({
        data: scores.map((score) => ({
          companyId,
          conversationId,
          decisionLogId,
          scoreType: score.scoreType,
          score: score.score,
          threshold: score.threshold,
          isAboveThreshold: score.isAboveThreshold,
          factors: score.factors,
          calculationMethod: score.calculationMethod,
          metadata: score.metadata,
        })),
      });
    } catch (error) {
      this.logger.error(`Error saving confidence scores: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  async updateConfiguration(companyId: string, data: any) {
    return this.prisma.decisionConfiguration.upsert({
      where: { companyId },
      create: {
        companyId,
        ...data,
      },
      update: data,
    });
  }
}
