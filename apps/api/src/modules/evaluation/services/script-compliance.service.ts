import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ScriptComplianceResult {
  correctScriptUsed: boolean;
  correctBranchFollowed: boolean;
  missingSteps: any[];
  invalidSteps: any[];
  ruleViolations: any[];
  complianceScore: number;
  issues: any[];
}

@Injectable()
export class ScriptComplianceService {
  private readonly logger = new Logger(ScriptComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateScriptCompliance(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<ScriptComplianceResult> {
    this.logger.log(
      `Evaluating script compliance for conversation: ${conversationId}`,
    );

    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        timeline: true,
        stateTransitions: true,
      },
    });

    if (!session) {
      throw new Error('Conversation session not found');
    }

    const scriptExecution = session.scriptId
      ? await this.prisma.scriptExecution.findFirst({
          where: {
            versionId: session.scriptId,
            contactId: session.contactId || undefined,
            status: 'COMPLETED',
          },
          include: {
            version: {
              include: {
                nodes: true,
                branches: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        })
      : null;

    if (!session.scriptId || !scriptExecution) {
      return {
        correctScriptUsed: false,
        correctBranchFollowed: false,
        missingSteps: [],
        invalidSteps: [],
        ruleViolations: [
          {
            type: 'NO_SCRIPT',
            message: 'No script was associated with this conversation',
            severity: 'HIGH',
          },
        ],
        complianceScore: 0,
        issues: [
          {
            type: 'NO_SCRIPT',
            message: 'Conversation executed without a script',
            severity: 'HIGH',
          },
        ],
      };
    }

    const correctScriptUsed = this.verifyCorrectScript(
      session,
      scriptExecution,
    );
    const correctBranchFollowed = this.verifyBranchFollowed(
      session,
      scriptExecution,
    );
    const missingSteps = this.identifyMissingSteps(session, scriptExecution);
    const invalidSteps = this.identifyInvalidSteps(session, scriptExecution);
    const ruleViolations = this.identifyRuleViolations(
      session,
      scriptExecution,
    );

    const complianceScore = this.calculateComplianceScore({
      correctScriptUsed,
      correctBranchFollowed,
      missingSteps,
      invalidSteps,
      ruleViolations,
    });

    const issues = this.identifyIssues({
      correctScriptUsed,
      correctBranchFollowed,
      missingSteps,
      invalidSteps,
      ruleViolations,
    });

    return {
      correctScriptUsed,
      correctBranchFollowed,
      missingSteps,
      invalidSteps,
      ruleViolations,
      complianceScore,
      issues,
    };
  }

  private verifyCorrectScript(session: any, scriptExecution: any): boolean {
    if (!session.scriptId || !scriptExecution) {
      return false;
    }

    return session.scriptId === scriptExecution.versionId;
  }

  private verifyBranchFollowed(session: any, scriptExecution: any): boolean {
    if (!scriptExecution?.history) {
      return false;
    }

    const executionHistory = scriptExecution.history as any;
    const expectedNodes = scriptExecution.version.nodes;

    if (!Array.isArray(executionHistory.nodeSequence)) {
      return false;
    }

    const nodeSequence = executionHistory.nodeSequence;
    const validBranches = scriptExecution.version.branches;

    for (let i = 0; i < nodeSequence.length - 1; i++) {
      const fromNodeId = nodeSequence[i];
      const toNodeId = nodeSequence[i + 1];

      const branchExists = validBranches.some(
        (branch: any) =>
          branch.fromNodeId === fromNodeId && branch.toNodeId === toNodeId,
      );

      if (!branchExists) {
        return false;
      }
    }

    return true;
  }

  private identifyMissingSteps(session: any, scriptExecution: any): any[] {
    const missingSteps = [];

    if (!scriptExecution?.version?.nodes) {
      return missingSteps;
    }

    const requiredNodes = scriptExecution.version.nodes.filter(
      (node: any) =>
        node.config?.required === true || node.type === 'REQUIRED',
    );

    const executionHistory = scriptExecution.history as any;
    const executedNodeIds = Array.isArray(executionHistory?.nodeSequence)
      ? executionHistory.nodeSequence
      : [];

    requiredNodes.forEach((node: any) => {
      if (!executedNodeIds.includes(node.nodeId)) {
        missingSteps.push({
          nodeId: node.nodeId,
          nodeName: node.name,
          nodeType: node.type,
          reason: 'Required node was not executed',
        });
      }
    });

    return missingSteps;
  }

  private identifyInvalidSteps(session: any, scriptExecution: any): any[] {
    const invalidSteps = [];

    if (!scriptExecution?.history) {
      return invalidSteps;
    }

    const executionHistory = scriptExecution.history as any;
    const validNodeIds = scriptExecution.version.nodes.map(
      (node: any) => node.nodeId,
    );
    const executedNodeIds = Array.isArray(executionHistory?.nodeSequence)
      ? executionHistory.nodeSequence
      : [];

    executedNodeIds.forEach((nodeId: string, index: number) => {
      if (!validNodeIds.includes(nodeId)) {
        invalidSteps.push({
          nodeId,
          position: index,
          reason: 'Node is not part of the script definition',
        });
      }
    });

    return invalidSteps;
  }

  private identifyRuleViolations(session: any, scriptExecution: any): any[] {
    const violations = [];

    if (!scriptExecution?.version?.nodes) {
      return violations;
    }

    const entryNodes = scriptExecution.version.nodes.filter(
      (node: any) => node.isEntryPoint,
    );
    const executionHistory = scriptExecution.history as any;
    const executedNodeIds = Array.isArray(executionHistory?.nodeSequence)
      ? executionHistory.nodeSequence
      : [];

    if (entryNodes.length > 0 && executedNodeIds.length > 0) {
      const firstNode = executedNodeIds[0];
      const isValidEntry = entryNodes.some(
        (node: any) => node.nodeId === firstNode,
      );

      if (!isValidEntry) {
        violations.push({
          type: 'INVALID_ENTRY_POINT',
          message: 'Conversation did not start from a valid entry point',
          severity: 'HIGH',
          nodeId: firstNode,
        });
      }
    }

    const exitNodes = scriptExecution.version.nodes.filter(
      (node: any) => node.isExitPoint,
    );

    if (
      session.currentState === 'COMPLETED' &&
      exitNodes.length > 0 &&
      executedNodeIds.length > 0
    ) {
      const lastNode = executedNodeIds[executedNodeIds.length - 1];
      const isValidExit = exitNodes.some(
        (node: any) => node.nodeId === lastNode,
      );

      if (!isValidExit) {
        violations.push({
          type: 'INVALID_EXIT_POINT',
          message: 'Conversation did not end at a valid exit point',
          severity: 'MEDIUM',
          nodeId: lastNode,
        });
      }
    }

    scriptExecution.version.nodes.forEach((node: any) => {
      if (node.config?.maxExecutions) {
        const executionCount = executedNodeIds.filter(
          (id: string) => id === node.nodeId,
        ).length;

        if (executionCount > node.config.maxExecutions) {
          violations.push({
            type: 'MAX_EXECUTIONS_EXCEEDED',
            message: `Node ${node.name} was executed ${executionCount} times, exceeding max of ${node.config.maxExecutions}`,
            severity: 'MEDIUM',
            nodeId: node.nodeId,
            nodeName: node.name,
          });
        }
      }
    });

    return violations;
  }

  private calculateComplianceScore(data: any): number {
    let score = 100;

    if (!data.correctScriptUsed) {
      score -= 30;
    }

    if (!data.correctBranchFollowed) {
      score -= 25;
    }

    score -= data.missingSteps.length * 10;
    score -= data.invalidSteps.length * 10;

    data.ruleViolations.forEach((violation: any) => {
      if (violation.severity === 'HIGH') {
        score -= 15;
      } else if (violation.severity === 'MEDIUM') {
        score -= 10;
      } else {
        score -= 5;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (!data.correctScriptUsed) {
      issues.push({
        type: 'INCORRECT_SCRIPT',
        severity: 'HIGH',
        message: 'Incorrect script was used for this conversation',
      });
    }

    if (!data.correctBranchFollowed) {
      issues.push({
        type: 'INVALID_BRANCH',
        severity: 'HIGH',
        message: 'Conversation followed an invalid branch path',
      });
    }

    if (data.missingSteps.length > 0) {
      issues.push({
        type: 'MISSING_STEPS',
        severity: 'MEDIUM',
        message: `${data.missingSteps.length} required step(s) were skipped`,
        steps: data.missingSteps,
      });
    }

    if (data.invalidSteps.length > 0) {
      issues.push({
        type: 'INVALID_STEPS',
        severity: 'HIGH',
        message: `${data.invalidSteps.length} invalid step(s) were executed`,
        steps: data.invalidSteps,
      });
    }

    if (data.ruleViolations.length > 0) {
      issues.push({
        type: 'RULE_VIOLATIONS',
        severity: 'HIGH',
        message: `${data.ruleViolations.length} rule violation(s) detected`,
        violations: data.ruleViolations,
      });
    }

    return issues;
  }
}
