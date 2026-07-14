import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadCategory } from '../dto/evaluation.dto';

interface LeadQualityResult {
  leadCategory: LeadCategory;
  expectedCategory?: LeadCategory;
  qualificationAccuracy: number;
  categoryConfidence: number;
  qualificationFactors: any;
  missingInformation: any[];
  contradictions: any[];
  overallScore: number;
  issues: any[];
}

@Injectable()
export class LeadQualityService {
  private readonly logger = new Logger(LeadQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateLeadQuality(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<LeadQualityResult> {
    this.logger.log(
      `Evaluating lead quality for conversation: ${conversationId}`,
    );

    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        summary: true,
      },
    });

    if (!session) {
      throw new Error('Conversation session not found');
    }

    const leadDecisions = await this.prisma.leadDecision.findMany({
      where: {
        conversationId,
        companyId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const latestLeadDecision = leadDecisions[0];

    if (!latestLeadDecision) {
      return {
        leadCategory: LeadCategory.COLD,
        qualificationAccuracy: 0,
        categoryConfidence: 0,
        qualificationFactors: {},
        missingInformation: [],
        contradictions: [],
        overallScore: 0,
        issues: [
          {
            type: 'NO_LEAD_DECISION',
            severity: 'HIGH',
            message: 'No lead qualification decision was made',
          },
        ],
      };
    }

    const leadCategory = this.mapLeadQualification(
      latestLeadDecision.qualification,
    );
    const qualificationFactors = latestLeadDecision.qualificationFactors || {};
    const categoryConfidence = latestLeadDecision.confidenceScore;

    const missingInformation = this.identifyMissingInformation(
      session,
      qualificationFactors,
    );

    const contradictions = this.identifyContradictions(
      session,
      leadDecisions,
    );

    const qualificationAccuracy = this.calculateQualificationAccuracy(
      leadCategory,
      qualificationFactors,
      categoryConfidence,
      missingInformation,
      contradictions,
    );

    const overallScore = this.calculateOverallScore(
      qualificationAccuracy,
      categoryConfidence,
      missingInformation,
      contradictions,
    );

    const issues = this.identifyIssues({
      leadCategory,
      qualificationAccuracy,
      categoryConfidence,
      missingInformation,
      contradictions,
    });

    return {
      leadCategory,
      qualificationAccuracy,
      categoryConfidence,
      qualificationFactors,
      missingInformation,
      contradictions,
      overallScore,
      issues,
    };
  }

  private mapLeadQualification(qualification: string): LeadCategory {
    const mapping: Record<string, LeadCategory> = {
      HOT_LEAD: LeadCategory.HOT,
      WARM_LEAD: LeadCategory.WARM,
      COLD_LEAD: LeadCategory.COLD,
      INTERESTED: LeadCategory.INTERESTED,
      NOT_INTERESTED: LeadCategory.NOT_INTERESTED,
      CALL_BACK: LeadCategory.CALLBACK,
      WRONG_NUMBER: LeadCategory.WRONG_NUMBER,
      DO_NOT_CALL: LeadCategory.DO_NOT_CALL,
    };

    return mapping[qualification] || LeadCategory.COLD;
  }

  private identifyMissingInformation(
    session: any,
    qualificationFactors: any,
  ): any[] {
    const missing = [];

    const requiredFields = [
      'customerName',
      'city',
      'budget',
      'propertyType',
      'timeline',
    ];

    requiredFields.forEach((field) => {
      if (!qualificationFactors[field] && !session.summary?.[field]) {
        missing.push({
          field,
          importance: 'HIGH',
          reason: 'Required for accurate lead qualification',
        });
      }
    });

    if (!qualificationFactors.interestLevel) {
      missing.push({
        field: 'interestLevel',
        importance: 'HIGH',
        reason: 'Critical for determining lead category',
      });
    }

    if (!qualificationFactors.responseQuality) {
      missing.push({
        field: 'responseQuality',
        importance: 'MEDIUM',
        reason: 'Helps assess genuine interest',
      });
    }

    return missing;
  }

  private identifyContradictions(
    session: any,
    leadDecisions: any[],
  ): any[] {
    const contradictions = [];

    if (leadDecisions.length > 1) {
      for (let i = 0; i < leadDecisions.length - 1; i++) {
        const current = leadDecisions[i];
        const previous = leadDecisions[i + 1];

        if (
          this.isContradictoryChange(
            previous.qualification,
            current.qualification,
          )
        ) {
          contradictions.push({
            type: 'QUALIFICATION_CHANGE',
            from: previous.qualification,
            to: current.qualification,
            timeDiff: new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime(),
            reason: 'Unexpected qualification change',
          });
        }
      }
    }

    if (session.summary) {
      const summary = session.summary;
      if (
        summary.leadStatus === 'INTERESTED' &&
        leadDecisions[0]?.qualification === 'NOT_INTERESTED'
      ) {
        contradictions.push({
          type: 'STATUS_MISMATCH',
          summaryStatus: summary.leadStatus,
          decidedQualification: leadDecisions[0].qualification,
          reason: 'Summary status contradicts lead qualification',
        });
      }
    }

    return contradictions;
  }

  private isContradictoryChange(from: string, to: string): boolean {
    const contradictoryPairs = [
      ['HOT_LEAD', 'NOT_INTERESTED'],
      ['INTERESTED', 'NOT_INTERESTED'],
      ['HOT_LEAD', 'COLD_LEAD'],
      ['INTERESTED', 'DO_NOT_CALL'],
    ];

    return contradictoryPairs.some(
      ([a, b]) => (from === a && to === b) || (from === b && to === a),
    );
  }

  private calculateQualificationAccuracy(
    leadCategory: LeadCategory,
    qualificationFactors: any,
    categoryConfidence: number,
    missingInformation: any[],
    contradictions: any[],
  ): number {
    let accuracy = categoryConfidence * 100;

    const missingCritical = missingInformation.filter(
      (m) => m.importance === 'HIGH',
    ).length;
    accuracy -= missingCritical * 10;

    accuracy -= contradictions.length * 15;

    const factorCount = Object.keys(qualificationFactors).length;
    if (factorCount < 3) {
      accuracy -= (3 - factorCount) * 10;
    }

    return Math.max(0, Math.min(100, accuracy));
  }

  private calculateOverallScore(
    qualificationAccuracy: number,
    categoryConfidence: number,
    missingInformation: any[],
    contradictions: any[],
  ): number {
    let score = qualificationAccuracy;

    if (categoryConfidence < 0.6) {
      score -= 15;
    }

    score -= missingInformation.length * 5;
    score -= contradictions.length * 10;

    return Math.max(0, Math.min(100, score));
  }

  private identifyIssues(data: any): any[] {
    const issues = [];

    if (data.qualificationAccuracy < 70) {
      issues.push({
        type: 'LOW_QUALIFICATION_ACCURACY',
        severity: 'HIGH',
        message: `Lead qualification accuracy is low: ${data.qualificationAccuracy.toFixed(1)}%`,
        accuracy: data.qualificationAccuracy,
      });
    }

    if (data.categoryConfidence < 0.7) {
      issues.push({
        type: 'LOW_CONFIDENCE',
        severity: 'HIGH',
        message: `Lead category confidence is low: ${(data.categoryConfidence * 100).toFixed(1)}%`,
        confidence: data.categoryConfidence,
      });
    }

    if (data.missingInformation.length > 0) {
      const criticalMissing = data.missingInformation.filter(
        (m: any) => m.importance === 'HIGH',
      ).length;

      if (criticalMissing > 0) {
        issues.push({
          type: 'MISSING_CRITICAL_INFO',
          severity: 'HIGH',
          message: `${criticalMissing} critical information field(s) missing`,
          fields: data.missingInformation,
        });
      } else {
        issues.push({
          type: 'MISSING_INFORMATION',
          severity: 'MEDIUM',
          message: `${data.missingInformation.length} information field(s) missing`,
          fields: data.missingInformation,
        });
      }
    }

    if (data.contradictions.length > 0) {
      issues.push({
        type: 'CONTRADICTIONS_FOUND',
        severity: 'HIGH',
        message: `${data.contradictions.length} contradiction(s) detected in lead qualification`,
        contradictions: data.contradictions,
      });
    }

    if (
      data.leadCategory === LeadCategory.WRONG_NUMBER ||
      data.leadCategory === LeadCategory.DO_NOT_CALL
    ) {
      issues.push({
        type: 'INVALID_LEAD',
        severity: 'MEDIUM',
        message: 'Lead was qualified as invalid contact',
        category: data.leadCategory,
      });
    }

    return issues;
  }
}
