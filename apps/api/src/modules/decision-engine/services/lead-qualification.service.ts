import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadQualificationLevel, IntentType } from '@prisma/client';
import { QualifyLeadDto, LeadQualificationResultDto } from '../dto/lead-qualification.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class LeadQualificationService {
  private readonly logger = new Logger(LeadQualificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async qualifyLead(
    companyId: string,
    dto: QualifyLeadDto,
  ): Promise<LeadQualificationResultDto> {
    const startTime = Date.now();

    try {
      const { score, qualification } = this.calculateLeadScore(
        dto.qualificationFactors,
        dto.customWeights,
      );

      const qualificationRules = this.evaluateQualificationRules(
        dto.qualificationFactors,
        score,
      );

      const confidenceScore = this.calculateQualificationConfidence(
        dto.qualificationFactors,
        qualificationRules,
      );

      const { recommendedAction, followUpDate } = this.getRecommendations(
        qualification,
        dto.qualificationFactors,
      );

      await this.saveLeadDecision(companyId, dto, qualification, score, confidenceScore, {
        qualificationRules,
        recommendedAction,
        followUpDate,
      });

      this.logger.log(
        `Lead qualified: ${qualification} with score ${score.toFixed(2)} in ${Date.now() - startTime}ms`,
      );

      return {
        qualification,
        score,
        qualificationFactors: dto.qualificationFactors,
        qualificationRules,
        previousQualification: dto.previousQualification,
        confidenceScore,
        recommendedAction,
        followUpDate,
        metadata: {
          qualificationTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      this.logger.error(`Error qualifying lead: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private calculateLeadScore(
    factors: any,
    customWeights?: Record<string, number>,
  ): { score: number; qualification: LeadQualificationLevel } {
    const weights = customWeights || {
      intent: 0.25,
      budget: 0.2,
      timeline: 0.15,
      interest: 0.15,
      engagement: 0.1,
      responseQuality: 0.1,
      informationProvided: 0.05,
    };

    let totalScore = 0;

    if (factors.intent) {
      const intentScore = this.scoreIntent(factors.intent);
      totalScore += intentScore * weights.intent;
    }

    if (factors.budget) {
      const budgetScore = this.scoreBudget(factors.budget);
      totalScore += budgetScore * weights.budget;
    }

    if (factors.timeline) {
      const timelineScore = this.scoreTimeline(factors.timeline);
      totalScore += timelineScore * weights.timeline;
    }

    if (factors.interest !== undefined) {
      totalScore += factors.interest * weights.interest;
    }

    if (factors.engagement !== undefined) {
      totalScore += factors.engagement * weights.engagement;
    }

    if (factors.responseQuality !== undefined) {
      totalScore += factors.responseQuality * weights.responseQuality;
    }

    if (factors.informationProvided) {
      const infoScore = Math.min(factors.informationProvided.length / 5, 1);
      totalScore += infoScore * weights.informationProvided;
    }

    const normalizedScore = Math.min(totalScore * 100, 100);

    const qualification = this.determineQualification(normalizedScore, factors);

    return { score: normalizedScore, qualification };
  }

  private scoreIntent(intent: string): number {
    const intentScores: Record<string, number> = {
      [IntentType.INTERESTED]: 1.0,
      [IntentType.NEED_PRICING]: 0.9,
      [IntentType.NEED_DETAILS]: 0.8,
      [IntentType.NEED_LOCATION]: 0.7,
      [IntentType.CALL_BACK_LATER]: 0.5,
      [IntentType.BUSY]: 0.3,
      [IntentType.NOT_INTERESTED]: 0.1,
      [IntentType.WRONG_NUMBER]: 0,
    };

    return intentScores[intent] || 0.5;
  }

  private scoreBudget(budget: string): number {
    const budgetLower = budget.toLowerCase();

    if (budgetLower.includes('crore') || budgetLower.includes('cr')) {
      return 1.0;
    }

    if (budgetLower.includes('lakh')) {
      const match = budgetLower.match(/(\d+)/);
      if (match) {
        const amount = parseInt(match[1]);
        if (amount >= 50) return 0.9;
        if (amount >= 30) return 0.7;
        if (amount >= 20) return 0.6;
        return 0.5;
      }
    }

    return 0.5;
  }

  private scoreTimeline(timeline: string): number {
    const timelineScores: Record<string, number> = {
      immediate: 1.0,
      '1-3 months': 0.9,
      '3-6 months': 0.7,
      '6-12 months': 0.5,
      flexible: 0.3,
    };

    return timelineScores[timeline] || 0.5;
  }

  private determineQualification(
    score: number,
    factors: any,
  ): LeadQualificationLevel {
    if (factors.intent === IntentType.WRONG_NUMBER) {
      return LeadQualificationLevel.WRONG_NUMBER;
    }

    if (factors.intent === IntentType.NOT_INTERESTED) {
      return LeadQualificationLevel.NOT_INTERESTED;
    }

    if (factors.intent === IntentType.BUSY) {
      return LeadQualificationLevel.BUSY;
    }

    if (factors.intent === IntentType.CALL_BACK_LATER) {
      return LeadQualificationLevel.CALL_BACK;
    }

    if (score >= 80) {
      return LeadQualificationLevel.HOT_LEAD;
    } else if (score >= 60) {
      return LeadQualificationLevel.WARM_LEAD;
    } else if (score >= 40) {
      return LeadQualificationLevel.COLD_LEAD;
    } else if (score >= 20) {
      return LeadQualificationLevel.INTERESTED;
    } else {
      return LeadQualificationLevel.NOT_INTERESTED;
    }
  }

  private evaluateQualificationRules(
    factors: any,
    score: number,
  ): Array<{ ruleId: string; ruleName: string; passed: boolean; impact: number }> {
    const rules = [];

    rules.push({
      ruleId: 'rule-intent-positive',
      ruleName: 'Positive Intent',
      passed: [IntentType.INTERESTED, IntentType.NEED_PRICING, IntentType.NEED_DETAILS].includes(
        factors.intent,
      ),
      impact: 25,
    });

    rules.push({
      ruleId: 'rule-budget-defined',
      ruleName: 'Budget Defined',
      passed: !!factors.budget,
      impact: 20,
    });

    rules.push({
      ruleId: 'rule-timeline-urgent',
      ruleName: 'Urgent Timeline',
      passed: factors.timeline === 'immediate' || factors.timeline === '1-3 months',
      impact: 15,
    });

    rules.push({
      ruleId: 'rule-high-engagement',
      ruleName: 'High Engagement',
      passed: factors.engagement >= 0.7,
      impact: 10,
    });

    rules.push({
      ruleId: 'rule-information-provided',
      ruleName: 'Complete Information',
      passed: factors.informationProvided?.length >= 3,
      impact: 10,
    });

    return rules;
  }

  private calculateQualificationConfidence(
    factors: any,
    rules: Array<{ passed: boolean; impact: number }>,
  ): number {
    const passedRules = rules.filter((r) => r.passed).length;
    const totalRules = rules.length;
    const ruleConfidence = passedRules / totalRules;

    const dataCompleteness = this.calculateDataCompleteness(factors);

    return (ruleConfidence * 0.6 + dataCompleteness * 0.4);
  }

  private calculateDataCompleteness(factors: any): number {
    const requiredFields = ['intent', 'budget', 'timeline', 'interest', 'engagement'];
    const providedFields = requiredFields.filter((field) => factors[field] !== undefined).length;
    return providedFields / requiredFields.length;
  }

  private getRecommendations(
    qualification: LeadQualificationLevel,
    factors: any,
  ): { recommendedAction: string; followUpDate?: Date } {
    let recommendedAction = '';
    let followUpDate: Date | undefined;

    switch (qualification) {
      case LeadQualificationLevel.HOT_LEAD:
        recommendedAction = 'Immediate follow-up with detailed proposal';
        followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        break;

      case LeadQualificationLevel.WARM_LEAD:
        recommendedAction = 'Follow-up within 3 days with more information';
        followUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        break;

      case LeadQualificationLevel.COLD_LEAD:
        recommendedAction = 'Follow-up in 1 week with general updates';
        followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        break;

      case LeadQualificationLevel.INTERESTED:
        recommendedAction = 'Nurture with periodic updates';
        followUpDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        break;

      case LeadQualificationLevel.CALL_BACK:
        recommendedAction = 'Schedule callback as per customer preference';
        followUpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        break;

      case LeadQualificationLevel.BUSY:
        recommendedAction = 'Retry after 2-3 days';
        followUpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        break;

      case LeadQualificationLevel.NOT_INTERESTED:
        recommendedAction = 'Mark as not interested, no follow-up';
        break;

      case LeadQualificationLevel.WRONG_NUMBER:
        recommendedAction = 'Mark as wrong number, remove from campaign';
        break;

      default:
        recommendedAction = 'Review and categorize manually';
    }

    return { recommendedAction, followUpDate };
  }

  private async saveLeadDecision(
    companyId: string,
    dto: QualifyLeadDto,
    qualification: LeadQualificationLevel,
    score: number,
    confidenceScore: number,
    details: any,
  ): Promise<void> {
    try {
      await this.prisma.leadDecision.create({
        data: {
          companyId,
          contactId: dto.contactId,
          conversationId: dto.conversationId,
          decisionLogId: dto.decisionLogId,
          qualification,
          score,
          qualificationFactors: dto.qualificationFactors,
          qualificationRules: details.qualificationRules,
          previousQualification: dto.previousQualification,
          confidenceScore,
          recommendedAction: details.recommendedAction,
          followUpDate: details.followUpDate,
          metadata: dto.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Error saving lead decision: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  async getLeadStatistics(
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

    const leads = await this.prisma.leadDecision.groupBy({
      by: ['qualification'],
      where,
      _count: { id: true },
      _avg: { score: true, confidenceScore: true },
    });

    const total = leads.reduce((sum, l) => sum + l._count.id, 0);

    const qualificationDistribution: Record<string, number> = {};
    leads.forEach((lead) => {
      qualificationDistribution[lead.qualification] = lead._count.id;
    });

    const hotLeadsCount =
      leads.find((l) => l.qualification === LeadQualificationLevel.HOT_LEAD)?._count.id || 0;
    const warmLeadsCount =
      leads.find((l) => l.qualification === LeadQualificationLevel.WARM_LEAD)?._count.id || 0;
    const coldLeadsCount =
      leads.find((l) => l.qualification === LeadQualificationLevel.COLD_LEAD)?._count.id || 0;

    const averageScore =
      leads.reduce((sum, l) => sum + (l._avg.score || 0) * l._count.id, 0) / (total || 1);

    const averageConfidence =
      leads.reduce((sum, l) => sum + (l._avg.confidenceScore || 0) * l._count.id, 0) / (total || 1);

    return {
      totalLeads: total,
      qualificationDistribution,
      averageScore,
      hotLeadsCount,
      warmLeadsCount,
      coldLeadsCount,
      conversionRate: total > 0 ? (hotLeadsCount / total) * 100 : 0,
      averageConfidence,
    };
  }
}
