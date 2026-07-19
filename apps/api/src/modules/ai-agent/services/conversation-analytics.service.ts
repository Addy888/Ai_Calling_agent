import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  AnalyticsPeriodDto,
  DashboardStatsDto,
  IntentDistributionDto,
  ObjectionDistributionDto,
  LeadDistributionDto,
  ConversationTrendDto,
} from '../dto/conversation-intelligence.dto';

@Injectable()
export class ConversationAnalyticsService {
  private readonly logger = new Logger(ConversationAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================

  async getDashboardStats(companyId: string): Promise<DashboardStatsDto> {
    this.logger.log(`Fetching dashboard stats for company: ${companyId}`);

    const [
      totalConversations,
      successfulConversations,
      qualifiedLeads,
      avgScores,
      avgDuration,
      topIntent,
      topObjection,
      topResponse,
    ] = await Promise.all([
      // Total conversations
      this.prisma.datasetConversationAnalysis.count({
        where: { companyId },
      }),

      // Successful conversations (score >= 65)
      this.prisma.datasetConversationAnalysis.count({
        where: {
          companyId,
          conversationScore: { gte: 65 },
        },
      }),

      // Qualified leads
      this.prisma.analysisLeadScore.count({
        where: {
          analysis: { companyId },
          leadCategory: { in: ['HOT_LEAD', 'WARM_LEAD', 'QUALIFIED'] },
        },
      }),

      // Average scores
      this.prisma.datasetConversationAnalysis.aggregate({
        where: { companyId },
        _avg: {
          conversationScore: true,
        },
      }),

      // Average call duration (from dataset records)
      this.getAverageCallDuration(companyId),

      // Most common intent
      this.getMostCommonIntent(companyId),

      // Most common objection
      this.getMostCommonObjection(companyId),

      // Top performing response
      this.getTopPerformingResponse(companyId),
    ]);

    // Calculate quality score (percentage of good+ conversations)
    const conversationQualityScore = totalConversations > 0
      ? (successfulConversations / totalConversations) * 100
      : 0;

    return {
      totalConversations,
      successfulConversations,
      qualifiedLeads,
      averageConversationScore: avgScores._avg.conversationScore || 0,
      averageCallDuration: avgDuration,
      mostCommonIntent: topIntent,
      mostCommonObjection: topObjection,
      topPerformingResponse: topResponse,
      conversationQualityScore: Math.round(conversationQualityScore * 100) / 100,
    };
  }

  private async getAverageCallDuration(companyId: string): Promise<number> {
    const recordings = await this.prisma.recording.findMany({
      where: {
        datasetRecord: { companyId },
      },
      select: { duration: true },
    });

    if (recordings.length === 0) return 0;

    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
    return Math.round(totalDuration / recordings.length);
  }

  private async getMostCommonIntent(companyId: string): Promise<string> {
    const intents = await this.prisma.analysisIntent.groupBy({
      by: ['intentType'],
      where: {
        analysis: { companyId },
      },
      _count: { intentType: true },
      orderBy: {
        _count: { intentType: 'desc' },
      },
      take: 1,
    });

    return intents[0]?.intentType || 'UNKNOWN';
  }

  private async getMostCommonObjection(companyId: string): Promise<string> {
    const objections = await this.prisma.analysisObjection.groupBy({
      by: ['objectionType'],
      where: {
        analysis: { companyId },
      },
      _count: { objectionType: true },
      orderBy: {
        _count: { objectionType: 'desc' },
      },
      take: 1,
    });

    return objections[0]?.objectionType || 'NONE';
  }

  private async getTopPerformingResponse(companyId: string): Promise<string> {
    const responses = await this.prisma.analysisResponseScore.findMany({
      where: {
        analysis: { companyId },
      },
      orderBy: {
        effectivenessScore: 'desc',
      },
      take: 1,
    });

    return responses[0]?.responseType || 'NONE';
  }

  // ============================================
  // INTENT DISTRIBUTION
  // ============================================

  async getIntentDistribution(companyId: string): Promise<IntentDistributionDto[]> {
    const intents = await this.prisma.analysisIntent.groupBy({
      by: ['intentType'],
      where: {
        analysis: { companyId },
      },
      _count: { intentType: true },
      _avg: { confidence: true },
    });

    const total = intents.reduce((sum, i) => sum + i._count.intentType, 0);

    return intents.map((intent) => ({
      intentType: intent.intentType,
      count: intent._count.intentType,
      percentage: total > 0 ? (intent._count.intentType / total) * 100 : 0,
      averageConfidence: intent._avg.confidence || 0,
    }));
  }

  // ============================================
  // OBJECTION DISTRIBUTION
  // ============================================

  async getObjectionDistribution(companyId: string): Promise<ObjectionDistributionDto[]> {
    const objections = await this.prisma.analysisObjection.groupBy({
      by: ['objectionType'],
      where: {
        analysis: { companyId },
      },
      _count: { objectionType: true },
      _avg: { resolutionScore: true },
    });

    const results: ObjectionDistributionDto[] = [];

    for (const objection of objections) {
      const resolvedCount = await this.prisma.analysisObjection.count({
        where: {
          analysis: { companyId },
          objectionType: objection.objectionType,
          wasResolved: true,
        },
      });

      results.push({
        objectionType: objection.objectionType,
        count: objection._count.objectionType,
        resolvedCount,
        resolutionRate: objection._count.objectionType > 0
          ? (resolvedCount / objection._count.objectionType) * 100
          : 0,
        averageResolutionScore: objection._avg.resolutionScore || 0,
      });
    }

    return results;
  }

  // ============================================
  // LEAD DISTRIBUTION
  // ============================================

  async getLeadDistribution(companyId: string): Promise<LeadDistributionDto[]> {
    const leads = await this.prisma.analysisLeadScore.groupBy({
      by: ['leadCategory'],
      where: {
        analysis: { companyId },
      },
      _count: { leadCategory: true },
      _avg: { score: true },
    });

    const total = leads.reduce((sum, l) => sum + l._count.leadCategory, 0);

    return leads.map((lead) => ({
      leadCategory: lead.leadCategory,
      count: lead._count.leadCategory,
      percentage: total > 0 ? (lead._count.leadCategory / total) * 100 : 0,
      averageScore: lead._avg.score || 0,
    }));
  }

  // ============================================
  // CONVERSATION TRENDS
  // ============================================

  async getConversationTrends(
    companyId: string,
    periodDto: AnalyticsPeriodDto,
  ): Promise<ConversationTrendDto[]> {
    const { startDate, endDate, period = 'week' } = periodDto;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analyses = await this.prisma.datasetConversationAnalysis.findMany({
      where: {
        companyId,
        analyzedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        leadScore: true,
      },
      orderBy: {
        analyzedAt: 'asc',
      },
    });

    // Group by period
    const grouped = this.groupByPeriod(analyses, period);

    return grouped.map((group) => {
      const successCount = group.items.filter((a: any) => a.conversationScore >= 65).length;
      const qualifiedCount = group.items.filter(
        (a: any) => a.leadScore && ['HOT_LEAD', 'WARM_LEAD', 'QUALIFIED'].includes(a.leadScore.leadCategory),
      ).length;

      const avgScore = group.items.length > 0
        ? group.items.reduce((sum: number, a: any) => sum + (a.conversationScore || 0), 0) / group.items.length
        : 0;

      const successRate = group.items.length > 0
        ? (successCount / group.items.length) * 100
        : 0;

      return {
        date: group.date,
        totalConversations: group.items.length,
        averageScore: Math.round(avgScore * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        qualifiedLeadsCount: qualifiedCount,
      };
    });
  }

  private groupByPeriod(analyses: any[], period: string): Array<{ date: string; items: any[] }> {
    const groups: Map<string, any[]> = new Map();

    for (const analysis of analyses) {
      const date = new Date(analysis.analyzedAt);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(analysis);
    }

    return Array.from(groups.entries())
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ============================================
  // SUCCESS RATE
  // ============================================

  async getSuccessRate(companyId: string): Promise<number> {
    const [total, successful] = await Promise.all([
      this.prisma.datasetConversationAnalysis.count({
        where: { companyId },
      }),
      this.prisma.datasetConversationAnalysis.count({
        where: {
          companyId,
          conversationScore: { gte: 65 },
        },
      }),
    ]);

    return total > 0 ? (successful / total) * 100 : 0;
  }

  // ============================================
  // QUALITY SCORE DISTRIBUTION
  // ============================================

  async getQualityDistribution(companyId: string) {
    const analyses = await this.prisma.datasetConversationAnalysis.findMany({
      where: { companyId },
      select: { overallQuality: true },
    });

    const distribution: { [key: string]: number } = {
      EXCELLENT: 0,
      GOOD: 0,
      AVERAGE: 0,
      POOR: 0,
      VERY_POOR: 0,
    };

    analyses.forEach((analysis) => {
      const quality = analysis.overallQuality || 'AVERAGE';
      distribution[quality] = (distribution[quality] || 0) + 1;
    });

    return Object.entries(distribution).map(([quality, count]) => ({
      quality,
      count,
      percentage: analyses.length > 0 ? (count / analyses.length) * 100 : 0,
    }));
  }

  // ============================================
  // EMOTION DISTRIBUTION
  // ============================================

  async getEmotionDistribution(companyId: string) {
    const emotions = await this.prisma.analysisEmotion.groupBy({
      by: ['emotionType'],
      where: {
        analysis: { companyId },
      },
      _count: { emotionType: true },
      _avg: { intensity: true },
    });

    const total = emotions.reduce((sum, e) => sum + e._count.emotionType, 0);

    return emotions.map((emotion) => ({
      emotionType: emotion.emotionType,
      count: emotion._count.emotionType,
      percentage: total > 0 ? (emotion._count.emotionType / total) * 100 : 0,
      averageIntensity: emotion._avg.intensity || 0,
    }));
  }

  // ============================================
  // RESPONSE EFFECTIVENESS
  // ============================================

  async getBestResponses(companyId: string, responseType?: string) {
    const where: any = {
      analysis: { companyId },
    };

    if (responseType) {
      where.responseType = responseType;
    }

    const responses = await this.prisma.analysisResponseScore.findMany({
      where,
      orderBy: {
        effectivenessScore: 'desc',
      },
      take: 10,
    });

    return responses;
  }
}
