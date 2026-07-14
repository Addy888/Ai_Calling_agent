import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface DecisionAccuracyResult {
  totalDecisions: number;
  correctIntents: number;
  incorrectIntents: number;
  correctEntities: number;
  incorrectEntities: number;
  correctActions: number;
  incorrectActions: number;
  fallbacksUsed: number;
  escalationsTriggered: number;
  intentAccuracy: number;
  entityAccuracy: number;
  actionAccuracy: number;
  overallAccuracy: number;
  issues: any[];
}

@Injectable()
export class DecisionAccuracyService {
  private readonly logger = new Logger(DecisionAccuracyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateDecisionAccuracy(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<DecisionAccuracyResult> {
    this.logger.log(
      `Evaluating decision accuracy for conversation: ${conversationId}`,
    );

    const decisionLogs = await this.prisma.decisionLog.findMany({
      where: {
        conversationId,
        companyId,
      },
      include: {
        intentDetails: true,
        entities: true,
        conversationDecision: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const fallbacks = await this.prisma.fallbackExecution.findMany({
      where: {
        conversationId,
        companyId,
      },
    });

    if (decisionLogs.length === 0) {
      return {
        totalDecisions: 0,
        correctIntents: 0,
        incorrectIntents: 0,
        correctEntities: 0,
        incorrectEntities: 0,
        correctActions: 0,
        incorrectActions: 0,
        fallbacksUsed: fallbacks.length,
        escalationsTriggered: 0,
        intentAccuracy: 0,
        entityAccuracy: 0,
        actionAccuracy: 0,
        overallAccuracy: 0,
        issues: [
          {
            type: 'NO_DECISIONS',
            severity: 'HIGH',
            message: 'No decision logs found for this conversation',
          },
        ],
      };
    }

    const totalDecisions = decisionLogs.length;
    const correctIntents = this.evaluateIntentAccuracy(decisionLogs);
    const incorrectIntents = totalDecisions - correctIntents;
    const entityMetrics = this.evaluateEntityAccuracy(decisionLogs);
    const actionMetrics = this.evaluateActionAccuracy(decisionLogs);
    const fallbacksUsed = fallbacks.length;
    const escalationsTriggered = decisionLogs.filter(
      (d: any) => d.conversationDecision?.escalationRequired,
    ).length;

    const intentAccuracy = (correctIntents / totalDecisions) * 100;
    const entityAccuracy =
      entityMetrics.total > 0
        ? (entityMetrics.correct / entityMetrics.total) * 100
        : 100;
    const actionAccuracy =
      (actionMetrics.correct / totalDecisions) * 100;
    const overallAccuracy = (intentAccuracy + entityAccuracy + actionAccuracy) / 3;

    const issues = this.identifyIssues({
      totalDecisions,
      correctIntents,
      incorrectIntents,
      correctEntities: entityMetrics.correct,
      incorrectEntities: entityMetrics.incorrect,
      correctActions: actionMetrics.correct,
      incorrectActions: actionMetrics.incorrect,
      fallbacksUsed,
      escalationsTriggered,
      intentAccuracy,
      entityAccuracy,
      actionAccuracy,
    });

    return {
      totalDecisions,
      correctIntents,
      incorrectIntents,
      correctEntities: entityMetrics.correct,
      incorrectEntities: entityMetrics.incorrect,
      correctActions: actionMetrics.correct,
      incorrectActions: actionMetrics.incorrect,
      fallbacksUsed,
      escalationsTriggered,
      intentAccuracy,
      entityAccuracy,
      actionAccuracy,
      overallAccuracy,
      issues,
    };
  }

  private evaluateIntentAccuracy(decisionLogs: any[]): number {
    let correctCount = 0;

    decisionLogs.forEach((log) => {
      if (log.intentConfidence >= 0.7) {
        correctCount++;
      }
    });

    return correctCount;
  }

  private evaluateEntityAccuracy(decisionLogs: any[]): {
    correct: number;
    incorrect: number;
    total: number;
  } {
    let correct = 0;
    let incorrect = 0;
    let total = 0;

    decisionLogs.forEach((log) => {
      if (log.entities && log.entities.length > 0) {
        log.entities.forEach((entity: any) => {
          total++;
          if (entity.confidence >= 0.6) {
            correct++;
          } else {
            incorrect++;
          }
        });
      }
    });

    return { correct, incorrect, total };
  }

  private evaluateActionAccuracy(decisionLogs: any[]): {
    correct: number;
    incorrect: number;
  } {
    let correct = 0;
    let incorrect = 0;

    decisionLogs.forEach((log) => {
      if (!log.conversationDecision) {
        incorrect++;
        return;
      }

      if (log.fallbackTriggered) {
        incorrect++;
        return;
      }

      if (log.overallConfidence >= 0.7) {
        correct++;
      } else {
        incorrect++;
      }
    });

    return { correct, incorrect };
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (data.intentAccuracy < 70) {
      issues.push({
        type: 'LOW_INTENT_ACCURACY',
        severity: 'HIGH',
        message: `Intent detection accuracy is low: ${data.intentAccuracy.toFixed(1)}%`,
        accuracy: data.intentAccuracy,
      });
    }

    if (data.entityAccuracy < 70) {
      issues.push({
        type: 'LOW_ENTITY_ACCURACY',
        severity: 'HIGH',
        message: `Entity extraction accuracy is low: ${data.entityAccuracy.toFixed(1)}%`,
        accuracy: data.entityAccuracy,
      });
    }

    if (data.actionAccuracy < 70) {
      issues.push({
        type: 'LOW_ACTION_ACCURACY',
        severity: 'HIGH',
        message: `Decision action accuracy is low: ${data.actionAccuracy.toFixed(1)}%`,
        accuracy: data.actionAccuracy,
      });
    }

    if (data.fallbacksUsed > data.totalDecisions * 0.2) {
      issues.push({
        type: 'HIGH_FALLBACK_USAGE',
        severity: 'MEDIUM',
        message: `High fallback usage: ${data.fallbacksUsed} out of ${data.totalDecisions} decisions`,
        fallbackRate: (data.fallbacksUsed / data.totalDecisions) * 100,
      });
    }

    if (data.escalationsTriggered > 0) {
      issues.push({
        type: 'ESCALATIONS_TRIGGERED',
        severity: 'MEDIUM',
        message: `${data.escalationsTriggered} escalation(s) were triggered`,
        count: data.escalationsTriggered,
      });
    }

    if (data.incorrectIntents > data.correctIntents) {
      issues.push({
        type: 'MORE_INCORRECT_INTENTS',
        severity: 'HIGH',
        message: 'More incorrect than correct intent detections',
      });
    }

    return issues;
  }
}
