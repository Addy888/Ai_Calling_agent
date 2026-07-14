import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface BusinessRuleEvaluationResult {
  companyPolicyScore: number;
  campaignRuleScore: number;
  promptRuleScore: number;
  scriptRuleScore: number;
  knowledgeRuleScore: number;
  permissionRuleScore: number;
  violations: any[];
  overallScore: number;
  issues: any[];
}

@Injectable()
export class BusinessRuleEvaluationService {
  private readonly logger = new Logger(BusinessRuleEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateBusinessRules(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<BusinessRuleEvaluationResult> {
    this.logger.log(
      `Evaluating business rules for conversation: ${conversationId}`,
    );

    const ruleExecutions = await this.prisma.businessRuleExecution.findMany({
      where: {
        conversationId,
        companyId,
      },
      include: {
        rule: true,
      },
    });

    const companyPolicyScore = this.evaluateCompanyPolicies(ruleExecutions);
    const campaignRuleScore = this.evaluateCampaignRules(ruleExecutions);
    const promptRuleScore = this.evaluatePromptRules(ruleExecutions);
    const scriptRuleScore = this.evaluateScriptRules(ruleExecutions);
    const knowledgeRuleScore = this.evaluateKnowledgeRules(ruleExecutions);
    const permissionRuleScore = this.evaluatePermissionRules(ruleExecutions);

    const violations = this.identifyViolations(ruleExecutions);

    const overallScore =
      (companyPolicyScore +
        campaignRuleScore +
        promptRuleScore +
        scriptRuleScore +
        knowledgeRuleScore +
        permissionRuleScore) /
      6;

    const issues = this.identifyIssues({
      companyPolicyScore,
      campaignRuleScore,
      promptRuleScore,
      scriptRuleScore,
      knowledgeRuleScore,
      permissionRuleScore,
      violations,
    });

    return {
      companyPolicyScore,
      campaignRuleScore,
      promptRuleScore,
      scriptRuleScore,
      knowledgeRuleScore,
      permissionRuleScore,
      violations,
      overallScore,
      issues,
    };
  }

  private evaluateCompanyPolicies(executions: any[]): number {
    const policyExecutions = executions.filter(
      (e) => e.rule.ruleType === 'COMPANY_POLICY',
    );

    if (policyExecutions.length === 0) {
      return 100;
    }

    const passed = policyExecutions.filter((e) => e.evaluationResult).length;
    return (passed / policyExecutions.length) * 100;
  }

  private evaluateCampaignRules(executions: any[]): number {
    const campaignExecutions = executions.filter(
      (e) => e.rule.ruleType === 'CAMPAIGN_RULE',
    );

    if (campaignExecutions.length === 0) {
      return 100;
    }

    const passed = campaignExecutions.filter((e) => e.evaluationResult).length;
    return (passed / campaignExecutions.length) * 100;
  }

  private evaluatePromptRules(executions: any[]): number {
    const promptExecutions = executions.filter(
      (e) => e.rule.ruleType === 'SALES_RULE',
    );

    if (promptExecutions.length === 0) {
      return 100;
    }

    const passed = promptExecutions.filter((e) => e.evaluationResult).length;
    return (passed / promptExecutions.length) * 100;
  }

  private evaluateScriptRules(executions: any[]): number {
    const scriptExecutions = executions.filter(
      (e) => e.rule.ruleType === 'SCRIPT_RULE',
    );

    if (scriptExecutions.length === 0) {
      return 100;
    }

    const passed = scriptExecutions.filter((e) => e.evaluationResult).length;
    return (passed / scriptExecutions.length) * 100;
  }

  private evaluateKnowledgeRules(executions: any[]): number {
    const knowledgeExecutions = executions.filter(
      (e) => e.rule.ruleType === 'KNOWLEDGE_RULE',
    );

    if (knowledgeExecutions.length === 0) {
      return 100;
    }

    const passed = knowledgeExecutions.filter((e) => e.evaluationResult).length;
    return (passed / knowledgeExecutions.length) * 100;
  }

  private evaluatePermissionRules(executions: any[]): number {
    const permissionExecutions = executions.filter(
      (e) => e.rule.ruleType === 'LEAD_QUALIFICATION' || e.rule.ruleType === 'LANGUAGE_RULE',
    );

    if (permissionExecutions.length === 0) {
      return 100;
    }

    const passed = permissionExecutions.filter((e) => e.evaluationResult).length;
    return (passed / permissionExecutions.length) * 100;
  }

  private identifyViolations(executions: any[]): any[] {
    const violations = [];

    const failed = executions.filter((e) => !e.evaluationResult);

    failed.forEach((execution) => {
      violations.push({
        ruleId: execution.ruleId,
        ruleName: execution.rule.name,
        ruleType: execution.rule.ruleType,
        category: execution.rule.category,
        priority: execution.rule.priority,
        conditionsMet: execution.conditionsMet,
        timestamp: execution.createdAt,
        description: execution.rule.description,
      });
    });

    return violations;
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (data.companyPolicyScore < 100) {
      issues.push({
        type: 'COMPANY_POLICY_VIOLATION',
        severity: 'HIGH',
        message: `Company policy violations detected: ${(100 - data.companyPolicyScore).toFixed(1)}% failure rate`,
        score: data.companyPolicyScore,
      });
    }

    if (data.campaignRuleScore < 100) {
      issues.push({
        type: 'CAMPAIGN_RULE_VIOLATION',
        severity: 'HIGH',
        message: `Campaign rule violations detected: ${(100 - data.campaignRuleScore).toFixed(1)}% failure rate`,
        score: data.campaignRuleScore,
      });
    }

    if (data.scriptRuleScore < 100) {
      issues.push({
        type: 'SCRIPT_RULE_VIOLATION',
        severity: 'MEDIUM',
        message: `Script rule violations detected: ${(100 - data.scriptRuleScore).toFixed(1)}% failure rate`,
        score: data.scriptRuleScore,
      });
    }

    if (data.violations.length > 0) {
      const highPriority = data.violations.filter((v: any) => v.priority >= 8);
      if (highPriority.length > 0) {
        issues.push({
          type: 'HIGH_PRIORITY_VIOLATIONS',
          severity: 'HIGH',
          message: `${highPriority.length} high-priority rule violation(s)`,
          violations: highPriority,
        });
      }
    }

    return issues;
  }
}
