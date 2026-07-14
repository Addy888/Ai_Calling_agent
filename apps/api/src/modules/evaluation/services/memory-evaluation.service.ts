import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface MemoryEvaluationResult {
  contextRetentionScore: number;
  previousAnswersScore: number;
  sessionMemoryScore: number;
  continuityScore: number;
  missingContext: any[];
  contextErrors: any[];
  overallScore: number;
  issues: any[];
}

@Injectable()
export class MemoryEvaluationService {
  private readonly logger = new Logger(MemoryEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateMemoryUsage(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<MemoryEvaluationResult> {
    this.logger.log(
      `Evaluating memory usage for conversation: ${conversationId}`,
    );

    const conversationMemory =
      await this.prisma.conversationMemory.findUnique({
        where: { sessionId },
        include: {
          customerMemory: true,
          history: true,
          snapshots: true,
        },
      });

    const sessionMemory = await this.prisma.sessionMemory.findUnique({
      where: { sessionId },
    });

    if (!conversationMemory) {
      return {
        contextRetentionScore: 0,
        previousAnswersScore: 0,
        sessionMemoryScore: 0,
        continuityScore: 0,
        missingContext: [],
        contextErrors: [],
        overallScore: 0,
        issues: [
          {
            type: 'NO_MEMORY',
            severity: 'HIGH',
            message: 'No conversation memory found',
          },
        ],
      };
    }

    const contextRetentionScore =
      this.evaluateContextRetention(conversationMemory);
    const previousAnswersScore =
      this.evaluatePreviousAnswers(conversationMemory);
    const sessionMemoryScore = this.evaluateSessionMemory(sessionMemory);
    const continuityScore = this.evaluateContinuity(conversationMemory);

    const missingContext = this.identifyMissingContext(
      conversationMemory,
      sessionMemory,
    );
    const contextErrors = this.identifyContextErrors(conversationMemory);

    const overallScore =
      (contextRetentionScore +
        previousAnswersScore +
        sessionMemoryScore +
        continuityScore) /
      4;

    const issues = this.identifyIssues({
      contextRetentionScore,
      previousAnswersScore,
      sessionMemoryScore,
      continuityScore,
      missingContext,
      contextErrors,
    });

    return {
      contextRetentionScore,
      previousAnswersScore,
      sessionMemoryScore,
      continuityScore,
      missingContext,
      contextErrors,
      overallScore,
      issues,
    };
  }

  private evaluateContextRetention(memory: any): number {
    let score = 100;

    if (!memory.conversationState) {
      score -= 30;
    }

    if (!memory.currentIntent) {
      score -= 20;
    }

    if (memory.snapshots && memory.snapshots.length > 0) {
      const recentSnapshots = memory.snapshots.filter((s: any) => {
        const age =
          Date.now() - new Date(s.timestamp).getTime();
        return age < 300000;
      });

      if (recentSnapshots.length === 0 && memory.isActive) {
        score -= 15;
      }
    } else if (memory.isActive) {
      score -= 25;
    }

    return Math.max(0, Math.min(100, score));
  }

  private evaluatePreviousAnswers(memory: any): number {
    let score = 100;

    if (!memory.customerMemory) {
      return 50;
    }

    const customerMemory = memory.customerMemory;
    const expectedFields = [
      'customerName',
      'phoneNumber',
      'city',
      'preferredLanguage',
    ];

    const missingFields = expectedFields.filter(
      (field) => !customerMemory[field],
    );
    score -= missingFields.length * 15;

    if (!customerMemory.previousSummary && customerMemory.totalInteractions > 1) {
      score -= 20;
    }

    if (
      customerMemory.interests &&
      Object.keys(customerMemory.interests).length === 0
    ) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private evaluateSessionMemory(sessionMemory: any): number {
    if (!sessionMemory) {
      return 50;
    }

    let score = 100;

    const progressFields = [
      'greetingCompleted',
      'qualificationCompleted',
      'closingCompleted',
    ];

    const completedCount = progressFields.filter(
      (field) => sessionMemory[field],
    ).length;

    if (completedCount === 0 && sessionMemory.conversationFinished) {
      score -= 30;
    }

    if (!sessionMemory.currentStep) {
      score -= 20;
    }

    if (
      !sessionMemory.collectedData ||
      Object.keys(sessionMemory.collectedData).length === 0
    ) {
      score -= 20;
    }

    if (
      !sessionMemory.conversationFlow ||
      Array.isArray(sessionMemory.conversationFlow) &&
        sessionMemory.conversationFlow.length === 0
    ) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private evaluateContinuity(memory: any): number {
    let score = 100;

    if (!memory.history || memory.history.length === 0) {
      score -= 20;
    }

    const timeSinceLastActivity =
      Date.now() - new Date(memory.lastActivityTime).getTime();

    if (memory.isActive && timeSinceLastActivity > 300000) {
      score -= 25;
    }

    if (memory.snapshots && memory.snapshots.length > 0) {
      const snapshotGaps = [];
      for (let i = 1; i < memory.snapshots.length; i++) {
        const gap =
          new Date(memory.snapshots[i].timestamp).getTime() -
          new Date(memory.snapshots[i - 1].timestamp).getTime();
        if (gap > 120000) {
          snapshotGaps.push(gap);
        }
      }

      if (snapshotGaps.length > 2) {
        score -= snapshotGaps.length * 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private identifyMissingContext(
    conversationMemory: any,
    sessionMemory: any,
  ): any[] {
    const missing = [];

    if (!conversationMemory.currentIntent) {
      missing.push({
        type: 'CURRENT_INTENT',
        severity: 'MEDIUM',
        message: 'Current intent not tracked',
      });
    }

    if (!conversationMemory.currentNodeId) {
      missing.push({
        type: 'CURRENT_NODE',
        severity: 'LOW',
        message: 'Current script node not tracked',
      });
    }

    if (sessionMemory && !sessionMemory.currentStep) {
      missing.push({
        type: 'CURRENT_STEP',
        severity: 'MEDIUM',
        message: 'Current conversation step not tracked',
      });
    }

    if (
      conversationMemory.customerMemory &&
      !conversationMemory.customerMemory.customerName
    ) {
      missing.push({
        type: 'CUSTOMER_NAME',
        severity: 'HIGH',
        message: 'Customer name not captured',
      });
    }

    if (
      conversationMemory.customerMemory &&
      !conversationMemory.customerMemory.city
    ) {
      missing.push({
        type: 'CUSTOMER_LOCATION',
        severity: 'MEDIUM',
        message: 'Customer location not captured',
      });
    }

    return missing;
  }

  private identifyContextErrors(memory: any): any[] {
    const errors = [];

    if (memory.isActive && !memory.sessionStartTime) {
      errors.push({
        type: 'MISSING_START_TIME',
        severity: 'HIGH',
        message: 'Session start time is missing for active conversation',
      });
    }

    if (!memory.isActive && !memory.sessionEndTime) {
      errors.push({
        type: 'MISSING_END_TIME',
        severity: 'MEDIUM',
        message: 'Session end time is missing for completed conversation',
      });
    }

    if (memory.customerMemory) {
      const cm = memory.customerMemory;
      if (cm.totalInteractions < 1) {
        errors.push({
          type: 'INVALID_INTERACTION_COUNT',
          severity: 'LOW',
          message: 'Total interactions count is invalid',
          value: cm.totalInteractions,
        });
      }

      if (cm.leadStatus && cm.qualification) {
        const statusMismatch = this.checkStatusMismatch(
          cm.leadStatus,
          cm.qualification,
        );
        if (statusMismatch) {
          errors.push({
            type: 'STATUS_QUALIFICATION_MISMATCH',
            severity: 'MEDIUM',
            message: 'Lead status and qualification are inconsistent',
            leadStatus: cm.leadStatus,
            qualification: cm.qualification,
          });
        }
      }
    }

    return errors;
  }

  private checkStatusMismatch(leadStatus: string, qualification: any): boolean {
    const validCombinations: Record<string, string[]> = {
      INTERESTED: ['interested', 'hot', 'warm'],
      NOT_INTERESTED: ['not_interested', 'cold'],
      CALL_BACK_LATER: ['callback', 'warm'],
    };

    const qualString = JSON.stringify(qualification).toLowerCase();
    const validValues = validCombinations[leadStatus] || [];

    return !validValues.some((val) => qualString.includes(val));
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (data.contextRetentionScore < 70) {
      issues.push({
        type: 'POOR_CONTEXT_RETENTION',
        severity: 'HIGH',
        message: 'Context retention is insufficient',
        score: data.contextRetentionScore,
      });
    }

    if (data.previousAnswersScore < 70) {
      issues.push({
        type: 'POOR_ANSWER_TRACKING',
        severity: 'HIGH',
        message: 'Previous answers not properly tracked',
        score: data.previousAnswersScore,
      });
    }

    if (data.sessionMemoryScore < 70) {
      issues.push({
        type: 'POOR_SESSION_MEMORY',
        severity: 'MEDIUM',
        message: 'Session memory is incomplete',
        score: data.sessionMemoryScore,
      });
    }

    if (data.continuityScore < 70) {
      issues.push({
        type: 'POOR_CONTINUITY',
        severity: 'MEDIUM',
        message: 'Conversation continuity is weak',
        score: data.continuityScore,
      });
    }

    if (data.missingContext.length > 0) {
      const criticalMissing = data.missingContext.filter(
        (m: any) => m.severity === 'HIGH',
      ).length;

      if (criticalMissing > 0) {
        issues.push({
          type: 'CRITICAL_CONTEXT_MISSING',
          severity: 'HIGH',
          message: `${criticalMissing} critical context element(s) missing`,
          missing: data.missingContext,
        });
      }
    }

    if (data.contextErrors.length > 0) {
      issues.push({
        type: 'CONTEXT_ERRORS',
        severity: 'MEDIUM',
        message: `${data.contextErrors.length} context error(s) detected`,
        errors: data.contextErrors,
      });
    }

    return issues;
  }
}
