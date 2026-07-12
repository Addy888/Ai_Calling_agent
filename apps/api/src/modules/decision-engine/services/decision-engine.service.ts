import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IntentDetectionService } from './intent-detection.service';
import { EntityExtractionService } from './entity-extraction.service';
import { BusinessRuleEngineService } from './business-rule-engine.service';
import { ConfidenceEngineService } from './confidence-engine.service';
import { LeadQualificationService } from './lead-qualification.service';
import { FallbackEngineService } from './fallback-engine.service';
import { ConversationPlannerService } from './conversation-planner.service';
import { EvaluateDecisionDto, DecisionResultDto } from '../dto/decision.dto';
import { FallbackReason } from '@prisma/client';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intentService: IntentDetectionService,
    private readonly entityService: EntityExtractionService,
    private readonly businessRuleService: BusinessRuleEngineService,
    private readonly confidenceService: ConfidenceEngineService,
    private readonly leadQualificationService: LeadQualificationService,
    private readonly fallbackService: FallbackEngineService,
    private readonly conversationPlannerService: ConversationPlannerService,
  ) {}

  async evaluateDecision(
    companyId: string,
    dto: EvaluateDecisionDto,
  ): Promise<DecisionResultDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Evaluating decision for conversation: ${dto.conversationId}`);

      const intentResult = await this.intentService.detectIntent(companyId, {
        rawInput: dto.rawInput,
        conversationId: dto.conversationId,
        sessionId: dto.sessionId,
        scriptNodeId: dto.scriptNodeId,
        conversationContext: dto.conversationMemory,
        metadata: dto.metadata,
      });

      const entityResult = await this.entityService.extractEntities(companyId, {
        rawInput: dto.rawInput,
        conversationId: dto.conversationId,
        decisionLogId: 'temp',
        previousEntities: dto.conversationMemory?.entities,
        context: dto.customerContext,
        metadata: dto.metadata,
      });

      const entitiesMap: Record<string, any> = {};
      entityResult.entities.forEach((entity) => {
        entitiesMap[entity.entityType] = entity.entityValue;
      });

      const businessRulesResult = await this.businessRuleService.evaluateRules(companyId, {
        conversationId: dto.conversationId,
        context: {
          ...dto.conversationMemory,
          ...dto.customerContext,
          ...dto.campaignContext,
        },
        intent: intentResult.intent,
        entities: entitiesMap,
        metadata: dto.metadata,
      });

      const conversationPlan = await this.conversationPlannerService.planConversation(
        companyId,
        {
          conversationId: dto.conversationId,
          intent: intentResult.intent,
          entities: entitiesMap,
          currentNodeId: dto.scriptNodeId,
          conversationMemory: dto.conversationMemory,
          businessRulesResults: businessRulesResult,
          context: dto.customerContext,
        },
      );

      const decisionLog = await this.createDecisionLog(companyId, dto, {
        intentResult,
        entityResult,
        businessRulesResult,
        conversationPlan,
      });

      await this.intentService.saveIntentDetection(
        companyId,
        dto.conversationId,
        decisionLog.id,
        {
          rawInput: dto.rawInput,
          conversationId: dto.conversationId,
          sessionId: dto.sessionId,
          scriptNodeId: dto.scriptNodeId,
        },
        intentResult,
      );

      await this.entityService.saveEntityExtractions(
        companyId,
        dto.conversationId,
        decisionLog.id,
        entityResult.entities,
      );

      const confidenceScores = await this.confidenceService.calculateAllConfidenceScores(
        companyId,
        dto.conversationId,
        decisionLog.id,
        {
          intentConfidence: intentResult.confidence,
          entityCount: entityResult.totalEntities,
          entityAvgConfidence: entityResult.averageConfidence,
          businessRulesPassed: businessRulesResult.rulesPassed,
          businessRulesTotal: businessRulesResult.totalRules,
          knowledgeRelevance: 0.7,
          conversationLength: dto.conversationMemory?.history?.length || 0,
          responseQuality: 0.75,
        },
      );

      let fallbackExecution = null;
      if (confidenceScores.shouldTriggerFallback) {
        const fallbackReason = this.determineFallbackReason(confidenceScores);

        fallbackExecution = await this.fallbackService.triggerFallback(companyId, {
          conversationId: dto.conversationId,
          decisionLogId: decisionLog.id,
          triggerReason: fallbackReason,
          confidenceScore: confidenceScores.lowestScore,
          threshold: confidenceScores.overall.threshold,
          originalIntent: intentResult.intent,
          recoveryAttempts: dto.conversationMemory?.fallbackAttempts || 1,
          conversationContext: dto.conversationMemory,
          metadata: dto.metadata,
        });
      }

      let leadQualification = null;
      if (dto.contactId) {
        leadQualification = await this.leadQualificationService.qualifyLead(companyId, {
          contactId: dto.contactId,
          conversationId: dto.conversationId,
          decisionLogId: decisionLog.id,
          qualificationFactors: {
            intent: intentResult.intent,
            budget: entitiesMap.BUDGET,
            timeline: entitiesMap.PURCHASE_TIMELINE,
            interest: intentResult.confidence,
            engagement: confidenceScores.conversation.score,
            responseQuality: 0.75,
            informationProvided: Object.keys(entitiesMap),
            conversationLength: dto.conversationMemory?.history?.length || 0,
            previousInteractions: dto.customerContext?.totalInteractions || 0,
          },
          previousQualification: dto.customerContext?.leadStatus,
          metadata: dto.metadata,
        });
      }

      const responsePlan = await this.conversationPlannerService.createResponsePlan(
        intentResult,
        conversationPlan,
        null,
      );

      await this.updateDecisionLog(decisionLog.id, {
        intentConfidence: intentResult.confidence,
        extractedEntities: entityResult.entities,
        businessRules: businessRulesResult.results,
        conversationAction: conversationPlan.action,
        responsePlan,
        leadQualification: leadQualification?.qualification,
        confidenceScores: {
          intent: confidenceScores.intent.score,
          knowledge: confidenceScores.knowledge.score,
          decision: confidenceScores.decision.score,
          conversation: confidenceScores.conversation.score,
          overall: confidenceScores.overall.score,
        },
        overallConfidence: confidenceScores.overall.score,
        fallbackTriggered: confidenceScores.shouldTriggerFallback,
        fallbackReason: fallbackExecution?.fallbackAction,
        executionTime: Date.now() - startTime,
      });

      await this.saveConversationDecision(decisionLog.id, conversationPlan);

      const result: DecisionResultDto = {
        id: decisionLog.id,
        detectedIntent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        extractedEntities: entityResult.entities.map((e) => ({
          entityType: e.entityType,
          entityValue: e.entityValue,
          confidence: e.confidence,
        })),
        businessRules: businessRulesResult.results.map((r) => ({
          ruleId: r.ruleId,
          ruleName: r.ruleName,
          passed: r.evaluationResult,
        })),
        conversationAction: conversationPlan.action,
        responsePlan,
        leadQualification: leadQualification?.qualification || 'INTERESTED' as any,
        confidenceScores: {
          intent: confidenceScores.intent.score,
          knowledge: confidenceScores.knowledge.score,
          decision: confidenceScores.decision.score,
          conversation: confidenceScores.conversation.score,
          overall: confidenceScores.overall.score,
        },
        overallConfidence: confidenceScores.overall.score,
        fallbackTriggered: confidenceScores.shouldTriggerFallback,
        fallbackReason: fallbackExecution?.fallbackAction,
        decisionReason: responsePlan.reason,
        executionTime: Date.now() - startTime,
        createdAt: decisionLog.createdAt,
      };

      this.logger.log(
        `Decision evaluated successfully in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error evaluating decision: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private async createDecisionLog(companyId: string, dto: EvaluateDecisionDto, results: any) {
    return this.prisma.decisionLog.create({
      data: {
        conversationId: dto.conversationId,
        companyId,
        sessionId: dto.sessionId,
        callId: dto.callId,
        contactId: dto.contactId,
        campaignId: dto.campaignId,
        scriptNodeId: dto.scriptNodeId,
        detectedIntent: results.intentResult.intent,
        intentConfidence: results.intentResult.confidence,
        extractedEntities: {},
        businessRules: {},
        conversationAction: results.conversationPlan.action,
        responsePlan: {},
        leadQualification: 'INTERESTED',
        confidenceScores: {},
        overallConfidence: 0,
        fallbackTriggered: false,
        decisionReason: 'Processing...',
        nextAction: results.conversationPlan.action,
      },
    });
  }

  private async updateDecisionLog(decisionLogId: string, data: any) {
    return this.prisma.decisionLog.update({
      where: { id: decisionLogId },
      data: {
        intentConfidence: data.intentConfidence,
        extractedEntities: data.extractedEntities,
        businessRules: data.businessRules,
        conversationAction: data.conversationAction,
        responsePlan: data.responsePlan,
        leadQualification: data.leadQualification,
        confidenceScores: data.confidenceScores,
        overallConfidence: data.overallConfidence,
        fallbackTriggered: data.fallbackTriggered,
        fallbackReason: data.fallbackReason,
        decisionReason: data.responsePlan.reason,
        executionTime: data.executionTime,
      },
    });
  }

  private async saveConversationDecision(decisionLogId: string, plan: any) {
    return this.prisma.conversationDecision.create({
      data: {
        decisionLogId,
        conversationId: plan.conversationId || 'unknown',
        companyId: 'unknown',
        currentNodeId: plan.currentNodeId,
        nextNodeId: plan.nextNodeId,
        action: plan.action,
        actionParameters: plan.actionParameters,
        responseType: 'structured',
        shouldContinue: plan.shouldContinue,
        shouldEndConversation: plan.shouldEndConversation,
        escalationRequired: plan.escalationRequired,
        reasoningSteps: plan.reasoningSteps,
        alternativeActions: plan.alternativeActions,
        metadata: plan.metadata,
      },
    });
  }

  private determineFallbackReason(confidenceScores: any): FallbackReason {
    if (!confidenceScores.intent.isAboveThreshold) {
      return FallbackReason.LOW_INTENT_CONFIDENCE;
    }
    if (!confidenceScores.knowledge.isAboveThreshold) {
      return FallbackReason.LOW_KNOWLEDGE_CONFIDENCE;
    }
    if (!confidenceScores.decision.isAboveThreshold) {
      return FallbackReason.LOW_DECISION_CONFIDENCE;
    }
    if (!confidenceScores.conversation.isAboveThreshold) {
      return FallbackReason.LOW_CONVERSATION_CONFIDENCE;
    }
    return FallbackReason.LOW_OVERALL_CONFIDENCE;
  }

  async getDecisionHistory(
    companyId: string,
    filters: any,
  ): Promise<any> {
    const where: any = { companyId };

    if (filters.conversationId) where.conversationId = filters.conversationId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.intent) where.detectedIntent = filters.intent;
    if (filters.action) where.conversationAction = filters.action;
    if (filters.leadQualification) where.leadQualification = filters.leadQualification;
    if (filters.minConfidence) where.overallConfidence = { gte: filters.minConfidence };
    if (filters.fallbackTriggered !== undefined) where.fallbackTriggered = filters.fallbackTriggered;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [decisions, total] = await Promise.all([
      this.prisma.decisionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          intentDetails: true,
          entities: true,
          conversationDecision: true,
        },
      }),
      this.prisma.decisionLog.count({ where }),
    ]);

    return {
      data: decisions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDecisionMetrics(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const decisions = await this.prisma.decisionLog.findMany({ where });

    const totalDecisions = decisions.length;

    const intentDistribution: Record<string, number> = {};
    const actionDistribution: Record<string, number> = {};
    const leadQualificationDistribution: Record<string, number> = {};

    let totalConfidence = 0;
    let totalExecutionTime = 0;
    let fallbackCount = 0;

    decisions.forEach((decision) => {
      intentDistribution[decision.detectedIntent] =
        (intentDistribution[decision.detectedIntent] || 0) + 1;

      actionDistribution[decision.conversationAction] =
        (actionDistribution[decision.conversationAction] || 0) + 1;

      leadQualificationDistribution[decision.leadQualification] =
        (leadQualificationDistribution[decision.leadQualification] || 0) + 1;

      totalConfidence += decision.overallConfidence;
      totalExecutionTime += decision.executionTime || 0;

      if (decision.fallbackTriggered) fallbackCount++;
    });

    return {
      totalDecisions,
      intentDistribution,
      actionDistribution,
      leadQualificationDistribution,
      averageConfidence: totalDecisions > 0 ? totalConfidence / totalDecisions : 0,
      fallbackRate: totalDecisions > 0 ? (fallbackCount / totalDecisions) * 100 : 0,
      averageExecutionTime: totalDecisions > 0 ? totalExecutionTime / totalDecisions : 0,
      successRate: totalDecisions > 0 ? ((totalDecisions - fallbackCount) / totalDecisions) * 100 : 0,
    };
  }
}
