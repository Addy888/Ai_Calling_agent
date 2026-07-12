import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FallbackReason, FallbackActionType } from '@prisma/client';
import { TriggerFallbackDto, FallbackExecutionResultDto } from '../dto/fallback.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class FallbackEngineService {
  private readonly logger = new Logger(FallbackEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async triggerFallback(
    companyId: string,
    dto: TriggerFallbackDto,
  ): Promise<FallbackExecutionResultDto> {
    const startTime = Date.now();

    try {
      const config = await this.getConfiguration(companyId);

      if (!config.enableFallback) {
        this.logger.warn('Fallback is disabled for this company');
        return this.createDisabledFallbackResult(dto);
      }

      const recoveryAttempts = dto.recoveryAttempts || 1;

      if (recoveryAttempts > config.maxFallbackAttempts) {
        this.logger.warn(`Max fallback attempts exceeded: ${recoveryAttempts}`);
        return this.createMaxAttemptsResult(dto, recoveryAttempts);
      }

      const fallbackAction = this.selectFallbackAction(
        dto.triggerReason,
        recoveryAttempts,
        dto.conversationContext,
      );

      const actionParameters = this.generateActionParameters(
        fallbackAction,
        dto.triggerReason,
        dto.conversationContext,
      );

      const wasSuccessful = this.evaluateFallbackSuccess(
        fallbackAction,
        dto.confidenceScore,
        dto.threshold,
      );

      const result = await this.saveFallbackExecution(companyId, dto, {
        fallbackAction,
        actionParameters,
        wasSuccessful,
        recoveryAttempts,
      });

      this.logger.log(
        `Fallback executed: ${fallbackAction} (attempt ${recoveryAttempts}) in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error triggering fallback: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private selectFallbackAction(
    reason: FallbackReason,
    recoveryAttempts: number,
    context?: Record<string, any>,
  ): FallbackActionType {
    const strategies: Record<FallbackReason, FallbackActionType[]> = {
      [FallbackReason.LOW_INTENT_CONFIDENCE]: [
        FallbackActionType.CLARIFY,
        FallbackActionType.REPEAT,
        FallbackActionType.ASK_SIMPLER_QUESTION,
      ],
      [FallbackReason.LOW_KNOWLEDGE_CONFIDENCE]: [
        FallbackActionType.USE_SCRIPT_DEFAULT,
        FallbackActionType.ASK_SIMPLER_QUESTION,
        FallbackActionType.ESCALATION_PLACEHOLDER,
      ],
      [FallbackReason.LOW_DECISION_CONFIDENCE]: [
        FallbackActionType.CLARIFY,
        FallbackActionType.USE_SCRIPT_DEFAULT,
        FallbackActionType.ASK_SIMPLER_QUESTION,
      ],
      [FallbackReason.LOW_CONVERSATION_CONFIDENCE]: [
        FallbackActionType.REPEAT,
        FallbackActionType.CLARIFY,
        FallbackActionType.SAFE_EXIT,
      ],
      [FallbackReason.LOW_OVERALL_CONFIDENCE]: [
        FallbackActionType.USE_SCRIPT_DEFAULT,
        FallbackActionType.CLARIFY,
        FallbackActionType.SAFE_EXIT,
      ],
      [FallbackReason.MISSING_REQUIRED_ENTITY]: [
        FallbackActionType.CLARIFY,
        FallbackActionType.REPEAT,
        FallbackActionType.SKIP_QUESTION,
      ],
      [FallbackReason.BUSINESS_RULE_VIOLATION]: [
        FallbackActionType.USE_SCRIPT_DEFAULT,
        FallbackActionType.SAFE_EXIT,
        FallbackActionType.ESCALATION_PLACEHOLDER,
      ],
      [FallbackReason.UNEXPECTED_INPUT]: [
        FallbackActionType.CLARIFY,
        FallbackActionType.REPEAT,
        FallbackActionType.USE_SCRIPT_DEFAULT,
      ],
    };

    const actionSequence = strategies[reason] || [
      FallbackActionType.CLARIFY,
      FallbackActionType.USE_SCRIPT_DEFAULT,
      FallbackActionType.SAFE_EXIT,
    ];

    const actionIndex = Math.min(recoveryAttempts - 1, actionSequence.length - 1);
    return actionSequence[actionIndex];
  }

  private generateActionParameters(
    action: FallbackActionType,
    reason: FallbackReason,
    context?: Record<string, any>,
  ): Record<string, any> {
    const parameters: Record<string, any> = {
      action,
      reason,
      timestamp: new Date().toISOString(),
    };

    switch (action) {
      case FallbackActionType.REPEAT:
        parameters.message = 'Could you please repeat that?';
        parameters.repeatLastQuestion = true;
        break;

      case FallbackActionType.CLARIFY:
        parameters.message = 'I want to make sure I understand correctly. Could you clarify?';
        parameters.requestClarification = true;
        break;

      case FallbackActionType.USE_SCRIPT_DEFAULT:
        parameters.useDefaultScript = true;
        parameters.fallbackToScript = true;
        break;

      case FallbackActionType.ASK_SIMPLER_QUESTION:
        parameters.simplifyQuestion = true;
        parameters.breakDownQuestion = true;
        break;

      case FallbackActionType.SKIP_QUESTION:
        parameters.skipCurrentQuestion = true;
        parameters.moveToNext = true;
        break;

      case FallbackActionType.SAFE_EXIT:
        parameters.gracefulExit = true;
        parameters.scheduleCallback = true;
        break;

      case FallbackActionType.ESCALATION_PLACEHOLDER:
        parameters.escalate = true;
        parameters.transferToHuman = true;
        break;
    }

    return parameters;
  }

  private evaluateFallbackSuccess(
    action: FallbackActionType,
    confidenceScore: number,
    threshold: number,
  ): boolean {
    const successByAction: Record<FallbackActionType, boolean> = {
      [FallbackActionType.REPEAT]: confidenceScore >= threshold * 0.9,
      [FallbackActionType.CLARIFY]: confidenceScore >= threshold * 0.85,
      [FallbackActionType.USE_SCRIPT_DEFAULT]: true,
      [FallbackActionType.ASK_SIMPLER_QUESTION]: confidenceScore >= threshold * 0.8,
      [FallbackActionType.SKIP_QUESTION]: true,
      [FallbackActionType.SAFE_EXIT]: true,
      [FallbackActionType.ESCALATION_PLACEHOLDER]: true,
    };

    return successByAction[action] || false;
  }

  private createDisabledFallbackResult(dto: TriggerFallbackDto): FallbackExecutionResultDto {
    return {
      id: 'fallback-disabled',
      triggerReason: dto.triggerReason,
      fallbackAction: FallbackActionType.USE_SCRIPT_DEFAULT,
      actionParameters: { disabled: true },
      wasSuccessful: false,
      recoveryAttempts: dto.recoveryAttempts || 1,
      confidenceScore: dto.confidenceScore,
      threshold: dto.threshold,
      originalIntent: dto.originalIntent,
      createdAt: new Date(),
    };
  }

  private createMaxAttemptsResult(
    dto: TriggerFallbackDto,
    recoveryAttempts: number,
  ): FallbackExecutionResultDto {
    return {
      id: 'max-attempts-exceeded',
      triggerReason: dto.triggerReason,
      fallbackAction: FallbackActionType.SAFE_EXIT,
      actionParameters: { maxAttemptsExceeded: true },
      wasSuccessful: false,
      recoveryAttempts,
      confidenceScore: dto.confidenceScore,
      threshold: dto.threshold,
      originalIntent: dto.originalIntent,
      createdAt: new Date(),
    };
  }

  private async saveFallbackExecution(
    companyId: string,
    dto: TriggerFallbackDto,
    result: any,
  ): Promise<FallbackExecutionResultDto> {
    try {
      const execution = await this.prisma.fallbackExecution.create({
        data: {
          conversationId: dto.conversationId,
          companyId,
          decisionLogId: dto.decisionLogId,
          triggerReason: dto.triggerReason,
          confidenceScore: dto.confidenceScore,
          threshold: dto.threshold,
          originalIntent: dto.originalIntent,
          fallbackAction: result.fallbackAction,
          actionParameters: result.actionParameters,
          wasSuccessful: result.wasSuccessful,
          recoveryAttempts: result.recoveryAttempts,
          metadata: dto.metadata,
        },
      });

      return {
        id: execution.id,
        triggerReason: execution.triggerReason,
        fallbackAction: execution.fallbackAction,
        actionParameters: execution.actionParameters as Record<string, any>,
        wasSuccessful: execution.wasSuccessful,
        recoveryAttempts: execution.recoveryAttempts,
        confidenceScore: execution.confidenceScore,
        threshold: execution.threshold,
        originalIntent: execution.originalIntent,
        metadata: execution.metadata as Record<string, any>,
        createdAt: execution.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error saving fallback execution: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
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

  async getFallbackStatistics(
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

    const fallbacks = await this.prisma.fallbackExecution.findMany({
      where,
    });

    const totalFallbacks = fallbacks.length;
    const successfulFallbacks = fallbacks.filter((f) => f.wasSuccessful).length;
    const failedFallbacks = totalFallbacks - successfulFallbacks;

    const reasonDistribution: Record<string, number> = {};
    const actionDistribution: Record<string, number> = {};

    fallbacks.forEach((f) => {
      reasonDistribution[f.triggerReason] = (reasonDistribution[f.triggerReason] || 0) + 1;
      actionDistribution[f.fallbackAction] = (actionDistribution[f.fallbackAction] || 0) + 1;
    });

    const averageRecoveryAttempts =
      fallbacks.reduce((sum, f) => sum + f.recoveryAttempts, 0) / (totalFallbacks || 1);

    const averageConfidence =
      fallbacks.reduce((sum, f) => sum + f.confidenceScore, 0) / (totalFallbacks || 1);

    return {
      totalFallbacks,
      successfulFallbacks,
      failedFallbacks,
      successRate: totalFallbacks > 0 ? (successfulFallbacks / totalFallbacks) * 100 : 0,
      reasonDistribution,
      actionDistribution,
      averageRecoveryAttempts,
      averageConfidence,
    };
  }
}
