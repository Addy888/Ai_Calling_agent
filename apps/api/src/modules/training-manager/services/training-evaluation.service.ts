import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateTrainingEvaluationDto,
  UpdateTrainingEvaluationDto,
  ApproveEvaluationDto,
  RejectEvaluationDto,
  CompareModelsDto,
  ValidationRulesDto,
  EvaluationType,
  ApprovalStatus,
  ModelMetrics,
  BenchmarkComparison,
  ValidationSummary,
  EvaluationReport,
  ModelComparisonResult,
  EvaluationListQueryDto,
} from '../dto/training-evaluation.dto';

/**
 * Training Evaluation Service
 * 
 * Manages evaluation configurations, validation rules, and evaluation reports
 * for trained AI models. Provides comprehensive metrics, benchmarks, and
 * approval workflows.
 * 
 * NOTE: This service prepares the evaluation architecture.
 * Actual model evaluation will be performed when training engine is integrated.
 */
@Injectable()
export class TrainingEvaluationService {
  private readonly logger = new Logger(TrainingEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new training evaluation
   */
  async createEvaluation(
    companyId: string,
    userId: string,
    dto: CreateTrainingEvaluationDto,
  ) {
    this.logger.log(`Creating evaluation for session: ${dto.trainingSessionId}`);

    // Verify training session exists
    const session = await this.prisma.trainingSession.findFirst({
      where: {
        id: dto.trainingSessionId,
        companyId,
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Verify model exists
    const model = await this.prisma.modelRegistry.findFirst({
      where: {
        id: dto.modelRegistryId,
        companyId,
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // Generate mock evaluation data
    const mockMetrics = this.generateMockMetrics(dto.evaluationType);
    const mockBenchmarks = this.generateMockBenchmarks();
    const validationSummary = this.generateValidationSummary(mockMetrics);
    const overallScore = this.calculateOverallScore(mockMetrics);

    // Create evaluation record (using JSON storage as no dedicated table exists)
    const evaluation = {
      id: this.generateId(),
      workspaceId: dto.workspaceId || null,
      trainingSessionId: dto.trainingSessionId,
      modelRegistryId: dto.modelRegistryId,
      evaluationType: dto.evaluationType,
      name: dto.name || `Evaluation - ${dto.evaluationType}`,
      description: dto.description || null,
      overallScore,
      metricSummary: mockMetrics,
      benchmarkSummary: mockBenchmarks,
      validationSummary,
      recommendations: this.generateRecommendations(mockMetrics, validationSummary),
      strengths: this.identifyStrengths(mockMetrics),
      weaknesses: this.identifyWeaknesses(mockMetrics),
      failedMetrics: validationSummary.failedRules,
      warnings: validationSummary.warnings,
      approvalStatus: ApprovalStatus.DRAFT,
      configuration: dto.configuration || {},
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in training session metadata (temporary solution)
    await this.prisma.trainingSession.update({
      where: { id: dto.trainingSessionId },
      data: {
        metadata: {
          evaluations: [evaluation],
        },
      },
    });

    this.logger.log(`Evaluation created: ${evaluation.id}`);

    return evaluation;
  }

  /**
   * Update an existing evaluation
   */
  async updateEvaluation(
    companyId: string,
    evaluationId: string,
    dto: UpdateTrainingEvaluationDto,
  ) {
    this.logger.log(`Updating evaluation: ${evaluationId}`);

    // In production, this would update the dedicated evaluation table
    // For now, return mock updated data
    return {
      id: evaluationId,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get evaluation by ID
   */
  async getEvaluation(companyId: string, evaluationId: string): Promise<EvaluationReport> {
    this.logger.log(`Fetching evaluation: ${evaluationId}`);

    // Generate mock evaluation report
    const mockReport: EvaluationReport = {
      id: evaluationId,
      evaluationType: EvaluationType.FINAL_MODEL,
      overallScore: 87.5,
      validationSummary: {
        passed: true,
        passedRules: [
          'Minimum accuracy met (85%)',
          'F1 score above threshold',
          'Hallucination rate acceptable',
          'Conversation quality excellent',
        ],
        failedRules: [],
        warnings: [
          'Response latency slightly higher than target',
        ],
        validationDate: new Date().toISOString(),
      },
      metrics: this.generateMockMetrics(EvaluationType.FINAL_MODEL),
      benchmarks: this.generateMockBenchmarks(),
      strengths: [
        'Excellent conversation quality (92%)',
        'High knowledge accuracy (89%)',
        'Strong objection handling',
        'Natural language flow',
      ],
      weaknesses: [
        'Slight latency in complex queries',
        'Occasional context loss in long conversations',
      ],
      failedMetrics: [],
      warnings: [
        'Memory usage approaching limits',
        'Consider optimization for production',
      ],
      recommendations: [
        'Deploy to staging environment for real-world testing',
        'Optimize model inference for reduced latency',
        'Monitor memory usage in production',
        'Collect user feedback for continuous improvement',
      ],
      approvalStatus: ApprovalStatus.PENDING_REVIEW,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return mockReport;
  }

  /**
   * List evaluations with filtering
   */
  async listEvaluations(
    companyId: string,
    query: EvaluationListQueryDto,
  ) {
    this.logger.log(`Listing evaluations for company: ${companyId}`);

    const page = query.page || 1;
    const limit = query.limit || 20;

    // Generate mock list of evaluations
    const mockEvaluations = Array.from({ length: 10 }, (_, i) => ({
      id: `eval-${i + 1}`,
      trainingSessionId: `session-${i + 1}`,
      modelRegistryId: `model-${i + 1}`,
      evaluationType: [
        EvaluationType.PRE_TRAINING,
        EvaluationType.TRAINING,
        EvaluationType.POST_TRAINING,
        EvaluationType.FINAL_MODEL,
      ][i % 4],
      overallScore: 75 + Math.random() * 20,
      approvalStatus: [
        ApprovalStatus.DRAFT,
        ApprovalStatus.PENDING_REVIEW,
        ApprovalStatus.APPROVED,
        ApprovalStatus.PRODUCTION_READY,
      ][i % 4],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    return {
      evaluations: mockEvaluations.slice((page - 1) * limit, page * limit),
      total: mockEvaluations.length,
      page,
      limit,
      totalPages: Math.ceil(mockEvaluations.length / limit),
    };
  }

  /**
   * Delete evaluation
   */
  async deleteEvaluation(companyId: string, evaluationId: string) {
    this.logger.log(`Deleting evaluation: ${evaluationId}`);

    // In production, this would delete from database
    return { success: true, message: 'Evaluation deleted successfully' };
  }

  /**
   * Approve evaluation
   */
  async approveEvaluation(
    companyId: string,
    evaluationId: string,
    dto: ApproveEvaluationDto,
  ) {
    this.logger.log(`Approving evaluation: ${evaluationId}`);

    // Audit log
    await this.createAuditLog(companyId, dto.approvedBy, 'APPROVED', evaluationId);

    return {
      id: evaluationId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: dto.approvedBy,
      approvedAt: new Date().toISOString(),
      comments: dto.comments,
    };
  }

  /**
   * Reject evaluation
   */
  async rejectEvaluation(
    companyId: string,
    evaluationId: string,
    dto: RejectEvaluationDto,
  ) {
    this.logger.log(`Rejecting evaluation: ${evaluationId}`);

    // Audit log
    await this.createAuditLog(companyId, dto.rejectedBy, 'REJECTED', evaluationId);

    return {
      id: evaluationId,
      approvalStatus: dto.requiresRetraining
        ? ApprovalStatus.NEEDS_RETRAINING
        : ApprovalStatus.REJECTED,
      rejectedBy: dto.rejectedBy,
      rejectedAt: new Date().toISOString(),
      reason: dto.reason,
      requiresRetraining: dto.requiresRetraining,
    };
  }

  /**
   * Compare two models
   */
  async compareModels(
    companyId: string,
    dto: CompareModelsDto,
  ): Promise<ModelComparisonResult> {
    this.logger.log(`Comparing models: ${dto.modelAId} vs ${dto.modelBId}`);

    const metricsA = this.generateMockMetrics(EvaluationType.FINAL_MODEL);
    const metricsB = this.generateMockMetrics(EvaluationType.FINAL_MODEL);

    // Slightly modify metricsB for comparison
    Object.keys(metricsB).forEach((key) => {
      if (typeof metricsB[key] === 'number') {
        metricsB[key] = metricsB[key] * (0.95 + Math.random() * 0.1);
      }
    });

    const comparison: ModelComparisonResult = {
      modelA: {
        id: dto.modelAId,
        name: 'AI Calling Agent v2.0',
        version: '2.0.0',
        metrics: metricsA,
      },
      modelB: {
        id: dto.modelBId,
        name: 'AI Calling Agent v1.5',
        version: '1.5.0',
        metrics: metricsB,
      },
      comparison: {},
      summary: {
        totalMetrics: 0,
        modelABetter: 0,
        modelBBetter: 0,
        equal: 0,
        overallWinner: 'EQUAL',
      },
    };

    // Compare each metric
    const metricsToCompare = dto.metrics || Object.keys(metricsA);
    
    metricsToCompare.forEach((metric) => {
      if (metricsA[metric] !== undefined && metricsB[metric] !== undefined) {
        const valueA = metricsA[metric];
        const valueB = metricsB[metric];
        const difference = valueA - valueB;
        const improvementPercent = valueB > 0 ? (difference / valueB) * 100 : 0;
        const regressionPercent = valueB > valueA ? ((valueB - valueA) / valueB) * 100 : 0;
        
        let better: 'A' | 'B' | 'EQUAL' = 'EQUAL';
        if (Math.abs(difference) > 0.01) {
          better = difference > 0 ? 'A' : 'B';
        }

        comparison.comparison[metric] = {
          modelA: valueA,
          modelB: valueB,
          difference,
          improvementPercent,
          regressionPercent,
          better,
        };

        comparison.summary.totalMetrics++;
        if (better === 'A') comparison.summary.modelABetter++;
        else if (better === 'B') comparison.summary.modelBBetter++;
        else comparison.summary.equal++;
      }
    });

    // Determine overall winner
    if (comparison.summary.modelABetter > comparison.summary.modelBBetter) {
      comparison.summary.overallWinner = 'A';
    } else if (comparison.summary.modelBBetter > comparison.summary.modelABetter) {
      comparison.summary.overallWinner = 'B';
    }

    return comparison;
  }

  /**
   * Generate evaluation report
   */
  async generateReport(companyId: string, evaluationId: string): Promise<EvaluationReport> {
    return this.getEvaluation(companyId, evaluationId);
  }

  /**
   * Get validation rules for company
   */
  async getValidationRules(companyId: string): Promise<ValidationRulesDto> {
    // Return default or company-specific validation rules
    return {
      minimumAccuracy: 85,
      minimumF1: 0.80,
      maximumLoss: 0.3,
      maximumHallucinationRate: 0.15,
      minimumConversationScore: 80,
      minimumResponseScore: 75,
      minimumKnowledgeScore: 85,
    };
  }

  /**
   * Update validation rules
   */
  async updateValidationRules(
    companyId: string,
    rules: ValidationRulesDto,
  ) {
    this.logger.log(`Updating validation rules for company: ${companyId}`);

    // In production, store in database
    return {
      ...rules,
      updatedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private generateMockMetrics(evaluationType: EvaluationType): ModelMetrics {
    const baseMultiplier = evaluationType === EvaluationType.FINAL_MODEL ? 1.1 : 1.0;

    return {
      // Training Metrics
      trainingLoss: 0.25 / baseMultiplier,
      validationLoss: 0.28 / baseMultiplier,
      accuracy: (85 + Math.random() * 10) * baseMultiplier,
      precision: (0.82 + Math.random() * 0.10) * baseMultiplier,
      recall: (0.80 + Math.random() * 0.12) * baseMultiplier,
      f1Score: (0.81 + Math.random() * 0.10) * baseMultiplier,

      // LLM Metrics
      bleu: (0.75 + Math.random() * 0.15) * baseMultiplier,
      rouge: (0.78 + Math.random() * 0.12) * baseMultiplier,
      perplexity: 1.5 / baseMultiplier,
      tokenAccuracy: (0.88 + Math.random() * 0.08) * baseMultiplier,

      // Quality Metrics
      responseQuality: (80 + Math.random() * 15) * baseMultiplier,
      conversationQuality: (85 + Math.random() * 10) * baseMultiplier,
      instructionFollowing: (82 + Math.random() * 12) * baseMultiplier,
      contextRetention: (78 + Math.random() * 15) * baseMultiplier,
      reasoningQuality: (80 + Math.random() * 13) * baseMultiplier,

      // Safety Metrics
      hallucinationRate: 0.12 / baseMultiplier,
      factConsistency: (85 + Math.random() * 10) * baseMultiplier,
      responseRelevance: (88 + Math.random() * 8) * baseMultiplier,
      responseCompleteness: (83 + Math.random() * 12) * baseMultiplier,
      languageQuality: (90 + Math.random() * 7) * baseMultiplier,
      toneConsistency: (87 + Math.random() * 9) * baseMultiplier,

      // AI Calling Agent Specific
      greetingAccuracy: (90 + Math.random() * 8) * baseMultiplier,
      conversationFlow: (85 + Math.random() * 10) * baseMultiplier,
      interruptionHandling: (82 + Math.random() * 12) * baseMultiplier,
      questionAnswering: (86 + Math.random() * 9) * baseMultiplier,
      knowledgeAccuracy: (88 + Math.random() * 8) * baseMultiplier,
      objectionHandling: (81 + Math.random() * 13) * baseMultiplier,
      salesConversationScore: (83 + Math.random() * 11) * baseMultiplier,
      empathyScore: (80 + Math.random() * 14) * baseMultiplier,
      closingScore: (78 + Math.random() * 15) * baseMultiplier,
      callSuccessPrediction: (75 + Math.random() * 18) * baseMultiplier,

      // Performance
      latency: 250 - (baseMultiplier - 1) * 50,
      memoryUsage: 1500 + Math.random() * 500,
    };
  }

  private generateMockBenchmarks(): BenchmarkComparison {
    return {
      currentModel: this.generateMockMetrics(EvaluationType.FINAL_MODEL),
      previousModel: this.generateMockMetrics(EvaluationType.POST_TRAINING),
      baseModel: this.generateMockMetrics(EvaluationType.PRE_TRAINING),
      productionModel: this.generateMockMetrics(EvaluationType.FINAL_MODEL),
      bestModel: this.generateMockMetrics(EvaluationType.FINAL_MODEL),
    };
  }

  private generateValidationSummary(metrics: ModelMetrics): ValidationSummary {
    const passedRules: string[] = [];
    const failedRules: string[] = [];
    const warnings: string[] = [];

    // Check accuracy
    if (metrics.accuracy >= 85) {
      passedRules.push(`Accuracy check passed: ${metrics.accuracy.toFixed(2)}%`);
    } else {
      failedRules.push(`Accuracy below threshold: ${metrics.accuracy.toFixed(2)}% < 85%`);
    }

    // Check F1 score
    if (metrics.f1Score >= 0.80) {
      passedRules.push(`F1 score check passed: ${metrics.f1Score.toFixed(3)}`);
    } else {
      failedRules.push(`F1 score below threshold: ${metrics.f1Score.toFixed(3)} < 0.80`);
    }

    // Check hallucination rate
    if (metrics.hallucinationRate <= 0.15) {
      passedRules.push(`Hallucination rate acceptable: ${(metrics.hallucinationRate * 100).toFixed(2)}%`);
    } else {
      failedRules.push(`Hallucination rate too high: ${(metrics.hallucinationRate * 100).toFixed(2)}% > 15%`);
    }

    // Check conversation quality
    if (metrics.conversationQuality >= 80) {
      passedRules.push(`Conversation quality excellent: ${metrics.conversationQuality.toFixed(2)}%`);
    } else {
      warnings.push(`Conversation quality could be improved: ${metrics.conversationQuality.toFixed(2)}%`);
    }

    // Check latency
    if (metrics.latency <= 300) {
      passedRules.push(`Response latency acceptable: ${metrics.latency}ms`);
    } else {
      warnings.push(`Response latency high: ${metrics.latency}ms`);
    }

    return {
      passed: failedRules.length === 0,
      passedRules,
      failedRules,
      warnings,
      validationDate: new Date().toISOString(),
    };
  }

  private calculateOverallScore(metrics: ModelMetrics): number {
    const weights = {
      accuracy: 0.15,
      f1Score: 0.10,
      conversationQuality: 0.20,
      knowledgeAccuracy: 0.15,
      responseQuality: 0.15,
      salesConversationScore: 0.10,
      objectionHandling: 0.10,
      empathyScore: 0.05,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach((key) => {
      if (metrics[key] !== undefined) {
        const value = metrics[key];
        const weight = weights[key];
        // Normalize to 0-100 scale if needed
        const normalizedValue = value > 1 ? value : value * 100;
        totalScore += normalizedValue * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private generateRecommendations(
    metrics: ModelMetrics,
    validation: ValidationSummary,
  ): string[] {
    const recommendations: string[] = [];

    if (!validation.passed) {
      recommendations.push('Address all failed validation rules before deployment');
    }

    if (metrics.accuracy < 90) {
      recommendations.push('Consider additional training data to improve accuracy');
    }

    if (metrics.hallucinationRate > 0.10) {
      recommendations.push('Implement stronger fact-checking mechanisms');
    }

    if (metrics.latency > 250) {
      recommendations.push('Optimize model for reduced inference latency');
    }

    if (metrics.conversationQuality < 85) {
      recommendations.push('Review conversation flow and improve natural language responses');
    }

    if (recommendations.length === 0) {
      recommendations.push('Model meets all requirements - ready for deployment');
      recommendations.push('Monitor performance in production environment');
      recommendations.push('Collect user feedback for continuous improvement');
    }

    return recommendations;
  }

  private identifyStrengths(metrics: ModelMetrics): string[] {
    const strengths: string[] = [];

    if (metrics.conversationQuality >= 90) {
      strengths.push(`Excellent conversation quality (${metrics.conversationQuality.toFixed(1)}%)`);
    }

    if (metrics.knowledgeAccuracy >= 88) {
      strengths.push(`High knowledge accuracy (${metrics.knowledgeAccuracy.toFixed(1)}%)`);
    }

    if (metrics.greetingAccuracy >= 90) {
      strengths.push(`Consistent greeting performance (${metrics.greetingAccuracy.toFixed(1)}%)`);
    }

    if (metrics.objectionHandling >= 85) {
      strengths.push('Strong objection handling capabilities');
    }

    if (metrics.languageQuality >= 90) {
      strengths.push('Natural and fluent language generation');
    }

    return strengths;
  }

  private identifyWeaknesses(metrics: ModelMetrics): string[] {
    const weaknesses: string[] = [];

    if (metrics.accuracy < 85) {
      weaknesses.push(`Accuracy below target (${metrics.accuracy.toFixed(1)}%)`);
    }

    if (metrics.latency > 300) {
      weaknesses.push(`High response latency (${metrics.latency}ms)`);
    }

    if (metrics.contextRetention < 80) {
      weaknesses.push('Context retention needs improvement');
    }

    if (metrics.closingScore < 80) {
      weaknesses.push('Closing effectiveness could be enhanced');
    }

    return weaknesses;
  }

  private async createAuditLog(
    companyId: string,
    userId: string,
    action: string,
    evaluationId: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          entityType: 'TRAINING_EVALUATION',
          entityId: evaluationId,
          action,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
    }
  }

  private generateId(): string {
    return `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
