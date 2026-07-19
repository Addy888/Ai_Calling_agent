import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class LearningStatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive learning statistics
   */
  async getStatistics(companyId: string, query: any) {
    const { startDate, endDate, category } = query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get recording statistics
    const recordingStats = await this.getRecordingStatistics(companyId, dateFilter);

    // Get pattern statistics
    const patternStats = await this.getPatternStatistics(companyId, dateFilter, category);

    // Get learning progress
    const learningProgress = await this.getLearningProgress(companyId, dateFilter);

    // Get insight statistics
    const insightStats = await this.getInsightStatistics(companyId, dateFilter);

    // Get rule statistics
    const ruleStats = await this.getRuleStatistics(companyId);

    // Get response strategy statistics
    const strategyStats = await this.getStrategyStatistics(companyId);

    return {
      recordingStats,
      patternStats,
      learningProgress,
      insightStats,
      ruleStats,
      strategyStats,
      generatedAt: new Date(),
    };
  }

  /**
   * Get summary statistics
   */
  async getSummary(companyId: string) {
    // Count totals
    const [
      totalRecordings,
      completedRecordings,
      totalPatterns,
      totalInsights,
      totalRules,
      totalStrategies,
      behaviorProfile,
    ] = await Promise.all([
      this.prisma.conversationRecording.count({ where: { companyId } }),
      this.prisma.conversationRecording.count({
        where: { companyId, processingStatus: 'COMPLETED' },
      }),
      this.prisma.conversationPattern.count({ where: { companyId } }),
      this.prisma.learningInsight.count({ where: { companyId } }),
      this.prisma.conversationRule.count({ where: { companyId, isActive: true } }),
      this.prisma.responseStrategy.count({ where: { companyId, isActive: true } }),
      this.prisma.conversationBehaviorProfile.findUnique({ where: { companyId } }),
    ]);

    // Calculate completion rate
    const completionRate = totalRecordings > 0 ? (completedRecordings / totalRecordings) * 100 : 0;

    // Get recent activity
    const recentRecordings = await this.prisma.conversationRecording.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        processingStatus: true,
        createdAt: true,
      },
    });

    // Learning maturity score
    const maturityScore = this.calculateMaturityScore({
      totalRecordings,
      completedRecordings,
      totalPatterns,
      totalInsights,
      totalRules,
      totalStrategies,
      hasBehaviorProfile: !!behaviorProfile,
    });

    return {
      overview: {
        totalRecordings,
        completedRecordings,
        completionRate: Math.round(completionRate),
        totalPatterns,
        totalInsights,
        totalRules,
        totalStrategies,
        hasBehaviorProfile: !!behaviorProfile,
        maturityScore,
      },
      recentActivity: recentRecordings,
      recommendations: this.generateSummaryRecommendations({
        totalRecordings,
        completedRecordings,
        totalPatterns,
        totalInsights,
        maturityScore,
      }),
    };
  }

  /**
   * Get recording statistics
   */
  private async getRecordingStatistics(companyId: string, dateFilter: any) {
    const where: any = { companyId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [total, completed, processing, failed, analysisData] = await Promise.all([
      this.prisma.conversationRecording.count({ where }),
      this.prisma.conversationRecording.count({
        where: { ...where, processingStatus: 'COMPLETED' },
      }),
      this.prisma.conversationRecording.count({
        where: { ...where, processingStatus: 'PROCESSING' },
      }),
      this.prisma.conversationRecording.count({ where: { ...where, processingStatus: 'FAILED' } }),
      this.prisma.conversationAnalysis.aggregate({
        where: { companyId, ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) },
        _avg: {
          totalDuration: true,
          turnCount: true,
          averageSpeakingSpeed: true,
        },
        _sum: {
          agentWordCount: true,
          customerWordCount: true,
        },
      }),
    ]);

    return {
      total,
      completed,
      processing,
      failed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averages: {
        duration: Math.round(analysisData._avg.totalDuration || 0),
        turns: Math.round(analysisData._avg.turnCount || 0),
        speakingSpeed: Math.round(analysisData._avg.averageSpeakingSpeed || 0),
      },
      totals: {
        agentWords: analysisData._sum.agentWordCount || 0,
        customerWords: analysisData._sum.customerWordCount || 0,
      },
    };
  }

  /**
   * Get pattern statistics
   */
  private async getPatternStatistics(companyId: string, dateFilter: any, category?: string) {
    const where: any = { companyId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (category) {
      where.patternType = category;
    }

    const [
      conversationPatterns,
      pausePatterns,
      speechPatterns,
      acknowledgements,
      turnTakings,
      interruptions,
    ] = await Promise.all([
      this.prisma.conversationPattern.count({ where }),
      this.prisma.pausePattern.count({ where }),
      this.prisma.speechPattern.count({ where }),
      this.prisma.acknowledgementPattern.count({ where }),
      this.prisma.turnTakingPattern.count({ where }),
      this.prisma.interruptionEvent.count({ where }),
    ]);

    // Get pause statistics
    const pauseStats = await this.prisma.pausePattern.aggregate({
      where,
      _avg: { duration: true },
      _max: { duration: true },
      _min: { duration: true },
    });

    // Get most common acknowledgements
    const topAcknowledgements = await this.prisma.acknowledgementPattern.findMany({
      where,
      orderBy: { frequency: 'desc' },
      take: 10,
      select: {
        acknowledgementText: true,
        frequency: true,
        language: true,
      },
    });

    return {
      counts: {
        conversationPatterns,
        pausePatterns,
        speechPatterns,
        acknowledgements,
        turnTakings,
        interruptions,
      },
      pauseAnalysis: {
        average: Math.round((pauseStats._avg.duration || 0) * 100) / 100,
        max: Math.round((pauseStats._max.duration || 0) * 100) / 100,
        min: Math.round((pauseStats._min.duration || 0) * 100) / 100,
      },
      topAcknowledgements,
    };
  }

  /**
   * Get learning progress over time
   */
  private async getLearningProgress(companyId: string, dateFilter: any) {
    const where: any = { companyId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Get learning stats by category
    const stats = await this.prisma.learningStat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (stats.length === 0) {
      return {
        trend: 'NO_DATA',
        categories: {},
        recentProgress: [],
      };
    }

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const stat of stats) {
      const category = stat.statType;
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push({
        value: stat.statValue,
        timestamp: stat.createdAt,
      });
    }

    // Calculate trends
    const categoryTrends: Record<string, string> = {};
    for (const [category, values] of Object.entries(byCategory)) {
      categoryTrends[category] = this.calculateTrend(values);
    }

    return {
      trend: this.calculateOverallTrend(stats),
      categories: categoryTrends,
      recentProgress: stats.slice(0, 10).map((s) => ({
        category: s.statType,
        metric: s.statName,
        value: s.statValue,
        timestamp: s.createdAt,
      })),
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: any[]): string {
    if (values.length < 2) return 'STABLE';

    const recent = values.slice(0, Math.ceil(values.length / 3));
    const older = values.slice(Math.floor(values.length * 2 / 3));

    const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v.value, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'IMPROVING';
    if (change < -10) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * Calculate overall trend
   */
  private calculateOverallTrend(stats: any[]): string {
    if (stats.length < 5) return 'INSUFFICIENT_DATA';

    // Group by week
    const weeklyAverages: number[] = [];
    const statsPerWeek: Map<number, number[]> = new Map();

    for (const stat of stats) {
      const weekNumber = Math.floor(
        (stat.createdAt.getTime() - new Date(stat.createdAt).setHours(0, 0, 0, 0)) /
          (7 * 24 * 60 * 60 * 1000),
      );
      if (!statsPerWeek.has(weekNumber)) {
        statsPerWeek.set(weekNumber, []);
      }
      statsPerWeek.get(weekNumber)!.push(stat.statValue);
    }

    for (const values of statsPerWeek.values()) {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      weeklyAverages.push(avg);
    }

    if (weeklyAverages.length < 2) return 'STABLE';

    const trend = this.calculateTrend(
      weeklyAverages.map((value, index) => ({ value, timestamp: new Date() })),
    );
    return trend;
  }

  /**
   * Get insight statistics
   */
  private async getInsightStatistics(companyId: string, dateFilter: any) {
    const where: any = { companyId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [total, applied, byType, byPriority, highConfidence] = await Promise.all([
      this.prisma.learningInsight.count({ where }),
      this.prisma.learningInsight.count({ where: { ...where, isApplied: true } }),
      this.prisma.learningInsight.groupBy({
        by: ['insightType'],
        where,
        _count: true,
      }),
      this.prisma.learningInsight.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.learningInsight.count({
        where: { ...where, confidence: { gte: 80 } },
      }),
    ]);

    const applicationRate = total > 0 ? Math.round((applied / total) * 100) : 0;

    return {
      total,
      applied,
      applicationRate,
      highConfidence,
      byType: byType.map((t) => ({ type: t.insightType, count: t._count })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
    };
  }

  /**
   * Get rule statistics
   */
  private async getRuleStatistics(companyId: string) {
    const [total, active, byType, bySource] = await Promise.all([
      this.prisma.conversationRule.count({ where: { companyId } }),
      this.prisma.conversationRule.count({ where: { companyId, isActive: true } }),
      this.prisma.conversationRule.groupBy({
        by: ['ruleType'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.conversationRule.groupBy({
        by: ['learnedFrom'],
        where: { companyId },
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      byType: byType.map((t) => ({ type: t.ruleType, count: t._count })),
      bySource: bySource.map((s) => ({ source: s.learnedFrom || 'UNKNOWN', count: s._count })),
    };
  }

  /**
   * Get response strategy statistics
   */
  private async getStrategyStatistics(companyId: string) {
    const [total, active, byStrategyType, bySource, avgSuccessRate] = await Promise.all([
      this.prisma.responseStrategy.count({ where: { companyId } }),
      this.prisma.responseStrategy.count({ where: { companyId, isActive: true } }),
      this.prisma.responseStrategy.groupBy({
        by: ['strategyType'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.responseStrategy.groupBy({
        by: ['learnedFrom'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.responseStrategy.aggregate({
        where: { companyId, isActive: true },
        _avg: { successRate: true },
      }),
    ]);

    return {
      total,
      active,
      averageSuccessRate: Math.round(avgSuccessRate._avg.successRate || 0),
      byStrategy: byStrategyType.map((s) => ({ strategy: s.strategyType, count: s._count })),
      bySource: bySource.map((s) => ({ source: s.learnedFrom || 'UNKNOWN', count: s._count })),
    };
  }

  /**
   * Calculate learning maturity score (0-100)
   */
  private calculateMaturityScore(metrics: any): number {
    let score = 0;

    // Recording coverage (30 points)
    if (metrics.completedRecordings >= 50) score += 30;
    else if (metrics.completedRecordings >= 20) score += 20;
    else if (metrics.completedRecordings >= 10) score += 10;
    else score += Math.min(metrics.completedRecordings, 10);

    // Pattern learning (25 points)
    if (metrics.totalPatterns >= 100) score += 25;
    else if (metrics.totalPatterns >= 50) score += 15;
    else score += Math.min(metrics.totalPatterns / 5, 15);

    // Insights generation (20 points)
    if (metrics.totalInsights >= 50) score += 20;
    else if (metrics.totalInsights >= 20) score += 12;
    else score += Math.min(metrics.totalInsights / 2, 12);

    // Active rules (15 points)
    if (metrics.totalRules >= 20) score += 15;
    else score += Math.min(metrics.totalRules, 15);

    // Response strategies (10 points)
    if (metrics.totalStrategies >= 10) score += 10;
    else score += metrics.totalStrategies;

    // Behavior profile (bonus)
    if (metrics.hasBehaviorProfile) score = Math.min(score + 5, 100);

    return Math.round(score);
  }

  /**
   * Generate recommendations based on statistics
   */
  private generateSummaryRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.totalRecordings < 10) {
      recommendations.push('Upload more recordings to improve learning accuracy (target: 10+)');
    }

    if (metrics.completedRecordings < metrics.totalRecordings * 0.8) {
      recommendations.push('Some recordings failed processing - check error logs');
    }

    if (metrics.totalPatterns < 50) {
      recommendations.push('More patterns needed for robust learning (current: ' + metrics.totalPatterns + ')');
    }

    if (metrics.totalInsights < 20) {
      recommendations.push('Generate more insights to improve AI behavior');
    }

    if (metrics.maturityScore < 30) {
      recommendations.push('Learning system is in early stage - upload more recordings');
    } else if (metrics.maturityScore < 60) {
      recommendations.push('Learning system is developing - continue adding recordings');
    } else if (metrics.maturityScore < 80) {
      recommendations.push('Good learning progress - fine-tune patterns and rules');
    } else {
      recommendations.push('Excellent learning maturity - focus on optimization');
    }

    return recommendations;
  }

  /**
   * Record learning stat
   */
  async recordStat(
    companyId: string,
    category: string,
    metric: string,
    value: number,
    metadata?: any,
  ) {
    await this.prisma.learningStat.create({
      data: {
        companyId,
        date: new Date(),
        statType: category,
        statName: metric,
        statValue: value,
        count: 1,
        metadata,
      },
    });
  }
}
