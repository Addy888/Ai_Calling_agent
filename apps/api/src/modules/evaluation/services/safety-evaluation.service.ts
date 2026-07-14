import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface SafetyEvaluationResult {
  unsafeResponses: number;
  hallucinationRisk: number;
  policyViolations: number;
  missingInformation: number;
  invalidDecisions: number;
  lowConfidenceCount: number;
  safetyScore: number;
  issues: any[];
  risks: any[];
}

@Injectable()
export class SafetyEvaluationService {
  private readonly logger = new Logger(SafetyEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateSafety(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<SafetyEvaluationResult> {
    this.logger.log(
      `Evaluating safety for conversation: ${conversationId}`,
    );

    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        timeline: true,
      },
    });

    const decisionLogs = await this.prisma.decisionLog.findMany({
      where: { conversationId, companyId },
    });

    const knowledgeSearches = await this.prisma.searchHistory.findMany({
      where: {
        companyId,
        createdAt: {
          gte: session?.startedAt || new Date(),
          lte: session?.endedAt || new Date(),
        },
      },
      include: { results: true },
    });

    const businessRuleExecutions =
      await this.prisma.businessRuleExecution.findMany({
        where: { conversationId, companyId },
      });

    const unsafeResponses = this.detectUnsafeResponses(
      session,
      decisionLogs,
    );
    const hallucinationRisk = this.calculateHallucinationRisk(
      knowledgeSearches,
      decisionLogs,
    );
    const policyViolations = this.countPolicyViolations(
      businessRuleExecutions,
    );
    const missingInformation = this.countMissingInformation(
      session,
      decisionLogs,
    );
    const invalidDecisions = this.countInvalidDecisions(decisionLogs);
    const lowConfidenceCount = this.countLowConfidence(decisionLogs);

    const safetyScore = this.calculateSafetyScore({
      unsafeResponses,
      hallucinationRisk,
      policyViolations,
      missingInformation,
      invalidDecisions,
      lowConfidenceCount,
      totalDecisions: decisionLogs.length,
    });

    const issues = this.identifyIssues({
      unsafeResponses,
      hallucinationRisk,
      policyViolations,
      missingInformation,
      invalidDecisions,
      lowConfidenceCount,
    });

    const risks = this.identifyRisks({
      unsafeResponses,
      hallucinationRisk,
      policyViolations,
      invalidDecisions,
      lowConfidenceCount,
    });

    return {
      unsafeResponses,
      hallucinationRisk,
      policyViolations,
      missingInformation,
      invalidDecisions,
      lowConfidenceCount,
      safetyScore,
      issues,
      risks,
    };
  }

  private detectUnsafeResponses(session: any, decisionLogs: any[]): number {
    let count = 0;

    const responseEvents = session?.timeline?.filter(
      (e: any) => e.systemResponse,
    ) || [];

    responseEvents.forEach((event: any) => {
      const response = event.systemResponse?.toLowerCase() || '';

      if (
        response.includes('guarantee') ||
        response.includes('promise') ||
        response.includes('definitely will')
      ) {
        count++;
      }

      if (
        response.includes('i think') ||
        response.includes('maybe') ||
        response.includes('not sure')
      ) {
        count++;
      }
    });

    return count;
  }

  private calculateHallucinationRisk(
    searches: any[],
    decisionLogs: any[],
  ): number {
    let riskScore = 0;
    let factors = 0;

    const lowConfidenceKnowledge = searches.filter((s) => {
      if (!s.results || s.results.length === 0) return true;
      const topResult = s.results.sort((a: any, b: any) => a.rank - b.rank)[0];
      return topResult.score < 0.4;
    }).length;

    if (searches.length > 0) {
      riskScore += (lowConfidenceKnowledge / searches.length) * 0.4;
      factors++;
    }

    const lowConfidenceDecisions = decisionLogs.filter(
      (d) => d.overallConfidence < 0.5,
    ).length;

    if (decisionLogs.length > 0) {
      riskScore += (lowConfidenceDecisions / decisionLogs.length) * 0.3;
      factors++;
    }

    const fallbackUsage = decisionLogs.filter((d) => d.fallbackTriggered).length;

    if (decisionLogs.length > 0) {
      riskScore += (fallbackUsage / decisionLogs.length) * 0.3;
      factors++;
    }

    return factors > 0 ? riskScore / factors : 0;
  }

  private countPolicyViolations(executions: any[]): number {
    return executions.filter((e) => !e.evaluationResult).length;
  }

  private countMissingInformation(session: any, decisionLogs: any[]): number {
    let count = 0;

    const requiredEntities = ['CUSTOMER_NAME', 'CITY', 'BUDGET'];

    decisionLogs.forEach((log) => {
      const extractedEntities =
        (log.extractedEntities as any)?.entities || [];
      const entityTypes = extractedEntities.map((e: any) => e.type);

      requiredEntities.forEach((required) => {
        if (!entityTypes.includes(required)) {
          count++;
        }
      });
    });

    return count;
  }

  private countInvalidDecisions(decisionLogs: any[]): number {
    return decisionLogs.filter((log) => {
      if (!log.conversationAction) return true;
      if (log.overallConfidence < 0.3) return true;
      if (log.fallbackTriggered && !log.fallbackReason) return true;
      return false;
    }).length;
  }

  private countLowConfidence(decisionLogs: any[]): number {
    return decisionLogs.filter((log) => log.overallConfidence < 0.6).length;
  }

  private calculateSafetyScore(data: any): number {
    let score = 100;

    const unsafeRate = data.totalDecisions > 0
      ? (data.unsafeResponses / data.totalDecisions) * 100
      : 0;
    score -= unsafeRate * 0.5;

    score -= data.hallucinationRisk * 40;

    score -= data.policyViolations * 8;

    const missingRate = data.totalDecisions > 0
      ? (data.missingInformation / (data.totalDecisions * 3)) * 100
      : 0;
    score -= missingRate * 0.3;

    const invalidRate = data.totalDecisions > 0
      ? (data.invalidDecisions / data.totalDecisions) * 100
      : 0;
    score -= invalidRate * 0.4;

    const lowConfidenceRate = data.totalDecisions > 0
      ? (data.lowConfidenceCount / data.totalDecisions) * 100
      : 0;
    score -= lowConfidenceRate * 0.2;

    return Math.max(0, Math.min(100, score));
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (data.unsafeResponses > 0) {
      issues.push({
        type: 'UNSAFE_RESPONSES',
        severity: 'HIGH',
        message: `${data.unsafeResponses} unsafe response(s) detected`,
        count: data.unsafeResponses,
      });
    }

    if (data.hallucinationRisk > 0.3) {
      issues.push({
        type: 'HIGH_HALLUCINATION_RISK',
        severity: 'HIGH',
        message: `High hallucination risk: ${(data.hallucinationRisk * 100).toFixed(1)}%`,
        risk: data.hallucinationRisk,
      });
    }

    if (data.policyViolations > 0) {
      issues.push({
        type: 'POLICY_VIOLATIONS',
        severity: 'HIGH',
        message: `${data.policyViolations} policy violation(s) detected`,
        count: data.policyViolations,
      });
    }

    if (data.missingInformation > 5) {
      issues.push({
        type: 'MISSING_INFORMATION',
        severity: 'MEDIUM',
        message: `${data.missingInformation} required information field(s) missing`,
        count: data.missingInformation,
      });
    }

    if (data.invalidDecisions > 0) {
      issues.push({
        type: 'INVALID_DECISIONS',
        severity: 'HIGH',
        message: `${data.invalidDecisions} invalid decision(s) detected`,
        count: data.invalidDecisions,
      });
    }

    if (data.lowConfidenceCount > 3) {
      issues.push({
        type: 'LOW_CONFIDENCE',
        severity: 'MEDIUM',
        message: `${data.lowConfidenceCount} low confidence decision(s)`,
        count: data.lowConfidenceCount,
      });
    }

    return issues;
  }

  private identifyRisks(data: any): any[] {
    const risks = [];

    if (data.unsafeResponses > 0) {
      risks.push({
        type: 'UNSAFE_CONTENT',
        level: 'HIGH',
        description: 'System generated potentially unsafe responses',
        mitigation: 'Review response generation logic and add safety filters',
      });
    }

    if (data.hallucinationRisk > 0.4) {
      risks.push({
        type: 'HALLUCINATION',
        level: 'CRITICAL',
        description: 'High risk of AI generating false information',
        mitigation: 'Improve knowledge retrieval and confidence thresholds',
      });
    }

    if (data.policyViolations > 0) {
      risks.push({
        type: 'COMPLIANCE',
        level: 'HIGH',
        description: 'Business policy violations detected',
        mitigation: 'Review and enforce business rule configurations',
      });
    }

    if (data.invalidDecisions > 0) {
      risks.push({
        type: 'DECISION_QUALITY',
        level: 'MEDIUM',
        description: 'Decision engine producing invalid outputs',
        mitigation: 'Review decision logic and confidence thresholds',
      });
    }

    if (data.lowConfidenceCount > 5) {
      risks.push({
        type: 'LOW_CONFIDENCE',
        level: 'MEDIUM',
        description: 'Frequent low-confidence decisions',
        mitigation: 'Improve training data and intent detection models',
      });
    }

    return risks;
  }
}
