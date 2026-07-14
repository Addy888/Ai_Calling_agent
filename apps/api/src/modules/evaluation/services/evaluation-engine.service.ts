import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationScoringService } from './conversation-scoring.service';
import { ScriptComplianceService } from './script-compliance.service';
import { KnowledgeAccuracyService } from './knowledge-accuracy.service';
import { DecisionAccuracyService } from './decision-accuracy.service';
import { LeadQualityService } from './lead-quality.service';
import { MemoryEvaluationService } from './memory-evaluation.service';
import { BusinessRuleEvaluationService } from './business-rule-evaluation.service';
import { SafetyEvaluationService } from './safety-evaluation.service';
import { ConfidenceAnalyzerService } from './confidence-analyzer.service';

@Injectable()
export class EvaluationEngineService {
  private readonly logger = new Logger(EvaluationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationScoringService: ConversationScoringService,
    private readonly scriptComplianceService: ScriptComplianceService,
    private readonly knowledgeAccuracyService: KnowledgeAccuracyService,
    private readonly decisionAccuracyService: DecisionAccuracyService,
    private readonly leadQualityService: LeadQualityService,
    private readonly memoryEvaluationService: MemoryEvaluationService,
    private readonly businessRuleEvaluationService: BusinessRuleEvaluationService,
    private readonly safetyEvaluationService: SafetyEvaluationService,
    private readonly confidenceAnalyzerService: ConfidenceAnalyzerService,
  ) {}

  async evaluateConversation(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ) {
    this.logger.log(
      `Starting evaluation for conversation: ${conversationId}`,
    );

    const existingReport = await this.prisma.evaluationReport.findUnique({
      where: { conversationId },
    });

    if (existingReport) {
      this.logger.log(`Evaluation report already exists for: ${conversationId}`);
      return this.getEvaluationReport(conversationId, companyId);
    }

    await this.prisma.evaluationReport.create({
      data: {
        conversationId,
        sessionId,
        companyId,
        evaluationStatus: 'IN_PROGRESS',
        overallScore: 0,
        conversationScore: 0,
        scriptComplianceScore: 0,
        knowledgeAccuracyScore: 0,
        decisionAccuracyScore: 0,
        leadQualityScore: 0,
        memoryUsageScore: 0,
        businessRuleScore: 0,
        safetyScore: 0,
        confidenceScore: 0,
      },
    });

    try {
      const [
        conversationScoring,
        scriptEvaluation,
        knowledgeEvaluation,
        decisionEvaluation,
        leadEvaluation,
        memoryEvaluation,
        businessRuleEvaluation,
        safetyEvaluation,
        confidenceMetrics,
      ] = await Promise.all([
        this.conversationScoringService.scoreConversation(
          conversationId,
          sessionId,
          companyId,
        ),
        this.scriptComplianceService.evaluateScriptCompliance(
          conversationId,
          sessionId,
          companyId,
        ),
        this.knowledgeAccuracyService.evaluateKnowledgeAccuracy(
          conversationId,
          sessionId,
          companyId,
        ),
        this.decisionAccuracyService.evaluateDecisionAccuracy(
          conversationId,
          sessionId,
          companyId,
        ),
        this.leadQualityService.evaluateLeadQuality(
          conversationId,
          sessionId,
          companyId,
        ),
        this.memoryEvaluationService.evaluateMemoryUsage(
          conversationId,
          sessionId,
          companyId,
        ),
        this.businessRuleEvaluationService.evaluateBusinessRules(
          conversationId,
          sessionId,
          companyId,
        ),
        this.safetyEvaluationService.evaluateSafety(
          conversationId,
          sessionId,
          companyId,
        ),
        this.confidenceAnalyzerService.analyzeConfidence(
          conversationId,
          sessionId,
          companyId,
        ),
      ]);

      const config = await this.getEvaluationConfiguration(companyId);

      const overallScore = this.calculateOverallScore(
        {
          conversationScore: conversationScoring.overallScore,
          scriptComplianceScore: scriptEvaluation.complianceScore,
          knowledgeAccuracyScore: knowledgeEvaluation.overallScore,
          decisionAccuracyScore: decisionEvaluation.overallAccuracy,
          leadQualityScore: leadEvaluation.overallScore,
          memoryUsageScore: memoryEvaluation.overallScore,
          businessRuleScore: businessRuleEvaluation.overallScore,
          safetyScore: safetyEvaluation.safetyScore,
        },
        config,
      );

      const allIssues = [
        ...conversationScoring.issues,
        ...scriptEvaluation.issues,
        ...knowledgeEvaluation.issues,
        ...decisionEvaluation.issues,
        ...leadEvaluation.issues,
        ...memoryEvaluation.issues,
        ...businessRuleEvaluation.issues,
        ...safetyEvaluation.issues,
      ];

      const recommendations = this.generateRecommendations({
        conversationScoring,
        scriptEvaluation,
        knowledgeEvaluation,
        decisionEvaluation,
        leadEvaluation,
        memoryEvaluation,
        businessRuleEvaluation,
        safetyEvaluation,
        confidenceMetrics,
      });

      const report = await this.prisma.evaluationReport.update({
        where: { conversationId },
        data: {
          overallScore,
          conversationScore: conversationScoring.overallScore,
          scriptComplianceScore: scriptEvaluation.complianceScore,
          knowledgeAccuracyScore: knowledgeEvaluation.overallScore,
          decisionAccuracyScore: decisionEvaluation.overallAccuracy,
          leadQualityScore: leadEvaluation.overallScore,
          memoryUsageScore: memoryEvaluation.overallScore,
          businessRuleScore: businessRuleEvaluation.overallScore,
          safetyScore: safetyEvaluation.safetyScore,
          confidenceScore: confidenceMetrics.overallConfidence,
          evaluationStatus: 'COMPLETED',
          issues: allIssues,
          recommendations,
          evaluatedAt: new Date(),
        },
      });

      await Promise.all([
        this.prisma.conversationScoring.create({
          data: {
            reportId: report.id,
            companyId,
            ...conversationScoring,
            metadata: {},
          },
        }),
        this.prisma.scriptEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            scriptId: null,
            ...scriptEvaluation,
            metadata: {},
          },
        }),
        this.prisma.knowledgeEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            ...knowledgeEvaluation,
            metadata: {},
          },
        }),
        this.prisma.decisionEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            ...decisionEvaluation,
            metadata: {},
          },
        }),
        this.prisma.leadEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            ...leadEvaluation,
            qualificationFactors: leadEvaluation.qualificationFactors || {},
            metadata: {},
          },
        }),
        this.prisma.memoryEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            ...memoryEvaluation,
            metadata: {},
          },
        }),
        this.prisma.businessRuleEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            ...businessRuleEvaluation,
            metadata: {},
          },
        }),
        this.prisma.safetyEvaluation.create({
          data: {
            reportId: report.id,
            companyId,
            ...safetyEvaluation,
            metadata: {},
          },
        }),
        this.prisma.confidenceMetrics.create({
          data: {
            reportId: report.id,
            companyId,
            ...confidenceMetrics,
            metadata: {},
          },
        }),
      ]);

      await this.updateEvaluationHistory(companyId, overallScore, {
        conversationScore: conversationScoring.overallScore,
        scriptScore: scriptEvaluation.complianceScore,
        knowledgeScore: knowledgeEvaluation.overallScore,
        decisionScore: decisionEvaluation.overallAccuracy,
        leadScore: leadEvaluation.overallScore,
        safetyScore: safetyEvaluation.safetyScore,
        confidence: confidenceMetrics.overallConfidence,
      });

      this.logger.log(
        `Evaluation completed for conversation: ${conversationId}`,
      );

      return this.getEvaluationReport(conversationId, companyId);
    } catch (error) {
      this.logger.error(
        `Evaluation failed for conversation: ${conversationId}`,
        error,
      );

      await this.prisma.evaluationReport.update({
        where: { conversationId },
        data: {
          evaluationStatus: 'FAILED',
          issues: [
            {
              type: 'EVALUATION_ERROR',
              severity: 'HIGH',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        },
      });

      throw error;
    }
  }

  async getEvaluationReport(conversationId: string, companyId: string) {
    const report = await this.prisma.evaluationReport.findFirst({
      where: {
        conversationId,
        companyId,
      },
      include: {
        conversationScoring: true,
        scriptEvaluation: true,
        knowledgeEvaluation: true,
        decisionEvaluation: true,
        leadEvaluation: true,
        memoryEvaluation: true,
        businessRuleEvaluation: true,
        safetyEvaluation: true,
        confidenceMetrics: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Evaluation report not found');
    }

    return report;
  }

  async getEvaluationConfiguration(companyId: string) {
    let config = await this.prisma.evaluationConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.evaluationConfiguration.create({
        data: {
          companyId,
          enableAutoEvaluation: true,
          minimumScoreThreshold: 70.0,
          hallucinationThreshold: 0.3,
          confidenceThreshold: 0.7,
          scriptComplianceWeight: 0.15,
          knowledgeAccuracyWeight: 0.20,
          decisionAccuracyWeight: 0.20,
          conversationQualityWeight: 0.15,
          leadQualityWeight: 0.10,
          safetyWeight: 0.10,
          businessRuleWeight: 0.05,
          memoryWeight: 0.05,
        },
      });
    }

    return config;
  }

  async updateEvaluationConfiguration(companyId: string, data: any) {
    return this.prisma.evaluationConfiguration.upsert({
      where: { companyId },
      update: data,
      create: {
        companyId,
        ...data,
      },
    });
  }

  private calculateOverallScore(
    scores: {
      conversationScore: number;
      scriptComplianceScore: number;
      knowledgeAccuracyScore: number;
      decisionAccuracyScore: number;
      leadQualityScore: number;
      memoryUsageScore: number;
      businessRuleScore: number;
      safetyScore: number;
    },
    config: any,
  ): number {
    return (
      scores.conversationScore * config.conversationQualityWeight +
      scores.scriptComplianceScore * config.scriptComplianceWeight +
      scores.knowledgeAccuracyScore * config.knowledgeAccuracyWeight +
      scores.decisionAccuracyScore * config.decisionAccuracyWeight +
      scores.leadQualityScore * config.leadQualityWeight +
      scores.memoryUsageScore * config.memoryWeight +
      scores.businessRuleScore * config.businessRuleWeight +
      scores.safetyScore * config.safetyWeight
    );
  }

  private generateRecommendations(evaluations: any): any[] {
    const recommendations = [];

    if (evaluations.conversationScoring.overallScore < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: 'CONVERSATION_QUALITY',
        recommendation: 'Improve conversation flow and question handling',
        details: evaluations.conversationScoring.weaknesses,
      });
    }

    if (evaluations.scriptEvaluation.complianceScore < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: 'SCRIPT_COMPLIANCE',
        recommendation: 'Review and enforce script compliance rules',
        details: evaluations.scriptEvaluation.issues,
      });
    }

    if (evaluations.knowledgeEvaluation.overallScore < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: 'KNOWLEDGE_BASE',
        recommendation: 'Expand knowledge base and improve retrieval accuracy',
        details: evaluations.knowledgeEvaluation.knowledgeGaps,
      });
    }

    if (evaluations.decisionEvaluation.overallAccuracy < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: 'DECISION_ENGINE',
        recommendation: 'Improve intent detection and entity extraction',
        details: evaluations.decisionEvaluation.issues,
      });
    }

    if (evaluations.safetyEvaluation.hallucinationRisk > 0.3) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'SAFETY',
        recommendation: 'Reduce hallucination risk through better knowledge grounding',
        details: evaluations.safetyEvaluation.risks,
      });
    }

    if (evaluations.confidenceMetrics.overallConfidence < 0.7) {
      recommendations.push({
        priority: 'HIGH',
        category: 'CONFIDENCE',
        recommendation: 'Improve model confidence through better training and validation',
        details: evaluations.confidenceMetrics.lowConfidencePoints,
      });
    }

    return recommendations;
  }

  private async updateEvaluationHistory(
    companyId: string,
    overallScore: number,
    scores: any,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.evaluationHistory.findUnique({
      where: {
        companyId_date: {
          companyId,
          date: today,
        },
      },
    });

    if (existing) {
      const newTotal = existing.totalEvaluations + 1;
      await this.prisma.evaluationHistory.update({
        where: {
          companyId_date: {
            companyId,
            date: today,
          },
        },
        data: {
          totalEvaluations: newTotal,
          averageScore:
            (existing.averageScore * existing.totalEvaluations + overallScore) /
            newTotal,
          averageConversationScore:
            (existing.averageConversationScore * existing.totalEvaluations +
              scores.conversationScore) /
            newTotal,
          averageScriptScore:
            (existing.averageScriptScore * existing.totalEvaluations +
              scores.scriptScore) /
            newTotal,
          averageKnowledgeScore:
            (existing.averageKnowledgeScore * existing.totalEvaluations +
              scores.knowledgeScore) /
            newTotal,
          averageDecisionScore:
            (existing.averageDecisionScore * existing.totalEvaluations +
              scores.decisionScore) /
            newTotal,
          averageLeadScore:
            (existing.averageLeadScore * existing.totalEvaluations +
              scores.leadScore) /
            newTotal,
          averageSafetyScore:
            (existing.averageSafetyScore * existing.totalEvaluations +
              scores.safetyScore) /
            newTotal,
          averageConfidence:
            (existing.averageConfidence * existing.totalEvaluations +
              scores.confidence) /
            newTotal,
        },
      });
    } else {
      await this.prisma.evaluationHistory.create({
        data: {
          companyId,
          date: today,
          totalEvaluations: 1,
          averageScore: overallScore,
          averageConversationScore: scores.conversationScore,
          averageScriptScore: scores.scriptScore,
          averageKnowledgeScore: scores.knowledgeScore,
          averageDecisionScore: scores.decisionScore,
          averageLeadScore: scores.leadScore,
          averageSafetyScore: scores.safetyScore,
          averageConfidence: scores.confidence,
        },
      });
    }
  }

  async getEvaluationAnalytics(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const history = await this.prisma.evaluationHistory.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    return history;
  }
}
