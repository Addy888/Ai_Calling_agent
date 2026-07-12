import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RuleType } from '@prisma/client';
import {
  CreateBusinessRuleDto,
  UpdateBusinessRuleDto,
  EvaluateBusinessRulesDto,
  BusinessRuleEvaluationResultDto,
  BusinessRuleEvaluationSummaryDto,
} from '../dto/business-rule.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class BusinessRuleEngineService {
  private readonly logger = new Logger(BusinessRuleEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRule(companyId: string, userId: string, dto: CreateBusinessRuleDto) {
    return this.prisma.businessRule.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        ruleType: dto.ruleType,
        category: dto.category,
        conditions: dto.conditions,
        actions: dto.actions,
        priority: dto.priority || 0,
        isActive: dto.isActive ?? true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        metadata: dto.metadata,
        createdBy: userId,
      },
    });
  }

  async updateRule(companyId: string, ruleId: string, userId: string, dto: UpdateBusinessRuleDto) {
    const rule = await this.prisma.businessRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new NotFoundException('Business rule not found');
    }

    return this.prisma.businessRule.update({
      where: { id: ruleId },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        updatedBy: userId,
      },
    });
  }

  async deleteRule(companyId: string, ruleId: string) {
    const rule = await this.prisma.businessRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new NotFoundException('Business rule not found');
    }

    return this.prisma.businessRule.delete({
      where: { id: ruleId },
    });
  }

  async getRules(companyId: string, ruleType?: RuleType, category?: string) {
    const where: any = { companyId, isActive: true };

    if (ruleType) where.ruleType = ruleType;
    if (category) where.category = category;

    return this.prisma.businessRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getRule(companyId: string, ruleId: string) {
    const rule = await this.prisma.businessRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new NotFoundException('Business rule not found');
    }

    return rule;
  }

  async evaluateRules(
    companyId: string,
    dto: EvaluateBusinessRulesDto,
  ): Promise<BusinessRuleEvaluationSummaryDto> {
    const startTime = Date.now();

    try {
      const rules = await this.prisma.businessRule.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { validFrom: null, validUntil: null },
            {
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
            {
              validFrom: { lte: new Date() },
              validUntil: null,
            },
            {
              validFrom: null,
              validUntil: { gte: new Date() },
            },
          ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      const results: BusinessRuleEvaluationResultDto[] = [];
      let rulesPassed = 0;
      let rulesFailed = 0;

      for (const rule of rules) {
        const ruleStartTime = Date.now();

        const evaluationResult = this.evaluateRule(rule, dto.context, dto.intent, dto.entities);

        const result: BusinessRuleEvaluationResultDto = {
          ruleId: rule.id,
          ruleName: rule.name,
          evaluationResult: evaluationResult.passed,
          conditionsMet: evaluationResult.conditionsMet,
          actionsExecuted: evaluationResult.actionsExecuted,
          executionTime: Date.now() - ruleStartTime,
          metadata: evaluationResult.metadata,
        };

        results.push(result);

        if (evaluationResult.passed) {
          rulesPassed++;

          if (dto.decisionLogId) {
            await this.saveRuleExecution(
              companyId,
              dto.conversationId,
              rule.id,
              dto.decisionLogId,
              result,
            );
          }
        } else {
          rulesFailed++;
        }
      }

      return {
        totalRules: rules.length,
        rulesPassed,
        rulesFailed,
        results,
        totalExecutionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Error evaluating rules: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private evaluateRule(
    rule: any,
    context: Record<string, any>,
    intent?: string,
    entities?: Record<string, any>,
  ): {
    passed: boolean;
    conditionsMet: Record<string, any>;
    actionsExecuted: Record<string, any>;
    metadata?: Record<string, any>;
  } {
    const conditions = rule.conditions as Record<string, any>;
    const actions = rule.actions as Record<string, any>;
    const conditionsMet: Record<string, any> = {};
    const actionsExecuted: Record<string, any> = {};

    let passed = true;

    if (conditions.intent && intent) {
      const intentMatch = Array.isArray(conditions.intent)
        ? conditions.intent.includes(intent)
        : conditions.intent === intent;
      conditionsMet.intent = intentMatch;
      if (!intentMatch) passed = false;
    }

    if (conditions.entities && entities) {
      for (const [entityKey, entityCondition] of Object.entries(conditions.entities)) {
        const entityValue = entities[entityKey];
        const entityMet = this.checkEntityCondition(entityValue, entityCondition);
        conditionsMet[`entity_${entityKey}`] = entityMet;
        if (!entityMet) passed = false;
      }
    }

    if (conditions.context) {
      for (const [contextKey, contextCondition] of Object.entries(conditions.context)) {
        const contextValue = context[contextKey];
        const contextMet = this.checkContextCondition(contextValue, contextCondition);
        conditionsMet[`context_${contextKey}`] = contextMet;
        if (!contextMet) passed = false;
      }
    }

    if (conditions.time) {
      const timeMet = this.checkTimeCondition(conditions.time);
      conditionsMet.time = timeMet;
      if (!timeMet) passed = false;
    }

    if (passed && actions) {
      if (actions.setVariable) {
        actionsExecuted.setVariable = actions.setVariable;
      }
      if (actions.triggerAction) {
        actionsExecuted.triggerAction = actions.triggerAction;
      }
      if (actions.updateScore) {
        actionsExecuted.updateScore = actions.updateScore;
      }
      if (actions.sendNotification) {
        actionsExecuted.sendNotification = actions.sendNotification;
      }
    }

    return {
      passed,
      conditionsMet,
      actionsExecuted,
      metadata: {
        ruleType: rule.ruleType,
        category: rule.category,
        priority: rule.priority,
      },
    };
  }

  private checkEntityCondition(value: any, condition: any): boolean {
    if (condition === null || condition === undefined) return true;

    if (typeof condition === 'object') {
      if (condition.required && !value) return false;
      if (condition.equals && value !== condition.equals) return false;
      if (condition.contains && !value?.includes(condition.contains)) return false;
      if (condition.min && value < condition.min) return false;
      if (condition.max && value > condition.max) return false;
      if (condition.in && !condition.in.includes(value)) return false;
    } else {
      if (value !== condition) return false;
    }

    return true;
  }

  private checkContextCondition(value: any, condition: any): boolean {
    if (condition === null || condition === undefined) return true;

    if (typeof condition === 'object') {
      if (condition.equals !== undefined && value !== condition.equals) return false;
      if (condition.notEquals !== undefined && value === condition.notEquals) return false;
      if (condition.greaterThan !== undefined && value <= condition.greaterThan) return false;
      if (condition.lessThan !== undefined && value >= condition.lessThan) return false;
      if (condition.in && !condition.in.includes(value)) return false;
      if (condition.notIn && condition.notIn.includes(value)) return false;
    } else {
      if (value !== condition) return false;
    }

    return true;
  }

  private checkTimeCondition(condition: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    if (condition.businessHoursOnly) {
      if (currentHour < 9 || currentHour >= 18) return false;
    }

    if (condition.weekdaysOnly) {
      if (currentDay === 0 || currentDay === 6) return false;
    }

    if (condition.hours) {
      const { start, end } = condition.hours;
      if (currentHour < start || currentHour >= end) return false;
    }

    if (condition.days && !condition.days.includes(currentDay)) {
      return false;
    }

    return true;
  }

  private async saveRuleExecution(
    companyId: string,
    conversationId: string,
    ruleId: string,
    decisionLogId: string,
    result: BusinessRuleEvaluationResultDto,
  ): Promise<void> {
    try {
      await this.prisma.businessRuleExecution.create({
        data: {
          ruleId,
          conversationId,
          companyId,
          decisionLogId,
          evaluationResult: result.evaluationResult,
          conditionsMet: result.conditionsMet,
          actionsExecuted: result.actionsExecuted,
          executionTime: result.executionTime,
          metadata: result.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Error saving rule execution: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }
}
