import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { 
  CreateAnalyticsDto, 
  AnalyticsFilterDto, 
  DashboardStatsDto, 
  ChartDataDto,
  DateRangeType,
  AnalyticsMetric,
  AnalyticsCategory 
} from './dto/analytics.dto';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAnalytic(companyId: string, data: CreateAnalyticsDto) {
    const analytic = await this.prisma.analytics.create({
      data: {
        ...data,
        companyId,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    return {
      success: true,
      data: analytic,
      message: 'Analytics data created successfully',
    };
  }

  async getDashboardStats(companyId: string, filters: DashboardStatsDto) {
    const { startDate, endDate } = this.getDateRange(filters.dateRange);
    
    // Get current period stats
    const [
      totalCompanies,
      totalUsers,
      totalCampaigns,
      totalContacts,
      totalScripts,
      totalPrompts,
      totalKnowledgeBase,
      totalVoiceProfiles,
    ] = await Promise.all([
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { companyId, deletedAt: null } }),
      this.prisma.campaign.count({ where: { companyId, deletedAt: null } }),
      this.prisma.contact.count({ where: { companyId, deletedAt: null } }),
      this.prisma.script.count({ where: { companyId, deletedAt: null } }),
      this.prisma.prompt.count({ where: { companyId, deletedAt: null } }),
      this.prisma.knowledgeBase.count({ where: { companyId, deletedAt: null } }),
      this.prisma.voiceProfile.count({ where: { companyId, deletedAt: null } }),
    ]);

    let growthData = {};
    if (filters.includeGrowth) {
      const previousPeriod = this.getPreviousPeriod(filters.dateRange);
      growthData = await this.calculateGrowthRates(companyId, startDate, endDate, previousPeriod);
    }

    return {
      success: true,
      data: {
        overview: {
          totalCompanies: { value: totalCompanies, growth: growthData['companies'] || 0 },
          totalUsers: { value: totalUsers, growth: growthData['users'] || 0 },
          totalCampaigns: { value: totalCampaigns, growth: growthData['campaigns'] || 0 },
          totalContacts: { value: totalContacts, growth: growthData['contacts'] || 0 },
          totalScripts: { value: totalScripts, growth: growthData['scripts'] || 0 },
          totalPrompts: { value: totalPrompts, growth: growthData['prompts'] || 0 },
          totalKnowledgeBase: { value: totalKnowledgeBase, growth: growthData['knowledgeBase'] || 0 },
          totalVoiceProfiles: { value: totalVoiceProfiles, growth: growthData['voiceProfiles'] || 0 },
        },
        period: {
          startDate,
          endDate,
          range: filters.dateRange,
        },
      },
    };
  }

  async getDashboardStatsWithCalls(companyId: string, filters: DashboardStatsDto) {
    const { startDate, endDate } = this.getDateRange(filters.dateRange);
    
    // Get current period stats including call metrics
    const [
      totalCompanies,
      totalUsers,
      totalCampaigns,
      totalContacts,
      totalScripts,
      totalPrompts,
      totalKnowledgeBase,
      totalVoiceProfiles,
      totalCalls,
      activeCalls,
      completedCalls,
      failedCalls,
      callStats,
    ] = await Promise.all([
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { companyId, deletedAt: null } }),
      this.prisma.campaign.count({ where: { companyId, deletedAt: null } }),
      this.prisma.contact.count({ where: { companyId, deletedAt: null } }),
      this.prisma.script.count({ where: { companyId, deletedAt: null } }),
      this.prisma.prompt.count({ where: { companyId, deletedAt: null } }),
      this.prisma.knowledgeBase.count({ where: { companyId, deletedAt: null } }),
      this.prisma.voiceProfile.count({ where: { companyId, deletedAt: null } }),
      this.prisma.call.count({ 
        where: { 
          campaign: { companyId }, 
          deletedAt: null 
        } 
      }),
      this.prisma.call.count({ 
        where: { 
          campaign: { companyId }, 
          status: 'IN_PROGRESS', 
          deletedAt: null 
        } 
      }),
      this.prisma.call.count({ 
        where: { 
          campaign: { companyId }, 
          status: 'COMPLETED', 
          deletedAt: null 
        } 
      }),
      this.prisma.call.count({ 
        where: { 
          campaign: { companyId }, 
          status: { in: ['FAILED', 'CANCELLED'] }, 
          deletedAt: null 
        } 
      }),
      this.prisma.call.aggregate({
        where: { 
          campaign: { companyId }, 
          deletedAt: null,
          duration: { not: null }
        },
        _avg: { duration: true },
      }),
    ]);

    let growthData = {};
    if (filters.includeGrowth) {
      const previousPeriod = this.getPreviousPeriod(filters.dateRange);
      growthData = await this.calculateGrowthRates(companyId, startDate, endDate, previousPeriod);
    }

    // Calculate average duration in seconds
    const averageDuration = callStats._avg.duration || 0;

    return {
      success: true,
      data: {
        totalCalls,
        activeCalls,
        completedCalls,
        failedCalls,
        averageDuration: Math.round(averageDuration),
        growth: growthData['calls'] || 0,
        overview: {
          totalCompanies: { value: totalCompanies, growth: growthData['companies'] || 0 },
          totalUsers: { value: totalUsers, growth: growthData['users'] || 0 },
          totalCampaigns: { value: totalCampaigns, growth: growthData['campaigns'] || 0 },
          totalContacts: { value: totalContacts, growth: growthData['contacts'] || 0 },
          totalScripts: { value: totalScripts, growth: growthData['scripts'] || 0 },
          totalPrompts: { value: totalPrompts, growth: growthData['prompts'] || 0 },
          totalKnowledgeBase: { value: totalKnowledgeBase, growth: growthData['knowledgeBase'] || 0 },
          totalVoiceProfiles: { value: totalVoiceProfiles, growth: growthData['voiceProfiles'] || 0 },
        },
        period: {
          startDate,
          endDate,
          range: filters.dateRange,
        },
      },
    };
  }

  async getChartData(companyId: string, params: ChartDataDto) {
    const { startDate, endDate } = params.dateRange === DateRangeType.CUSTOM 
      ? { startDate: new Date(params.startDate), endDate: new Date(params.endDate) }
      : this.getDateRange(params.dateRange);

    let data = [];

    switch (params.metric) {
      case AnalyticsMetric.CONTACT_GROWTH:
        data = await this.getContactGrowthChart(companyId, startDate, endDate);
        break;
      case AnalyticsMetric.CAMPAIGN_PERFORMANCE:
        data = await this.getCampaignPerformanceChart(companyId, startDate, endDate);
        break;
      case AnalyticsMetric.USER_ACTIVITY:
        data = await this.getUserActivityChart(companyId, startDate, endDate);
        break;
      default:
        data = await this.getGenericChart(companyId, params.metric, startDate, endDate);
    }

    return {
      success: true,
      data: {
        chart: data,
        metric: params.metric,
        period: { startDate, endDate },
      },
    };
  }

  async getRecentActivity(companyId: string, limit = 10) {
    const activities = await this.prisma.activityLog.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: activities,
    };
  }

  async getTopCampaigns(companyId: string, limit = 5) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { companyId, deletedAt: null },
      include: {
        _count: {
          select: { contacts: true, calls: true },
        },
      },
      orderBy: [
        { contacts: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return {
      success: true,
      data: campaigns,
    };
  }

  async getCampaignStats(companyId: string) {
    const stats = await this.prisma.campaign.groupBy({
      by: ['status'],
      where: { companyId, deletedAt: null },
      _count: { id: true },
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: statusStats,
    };
  }

  async getContactStats(companyId: string) {
    const [totalContacts, byStatus, byCountry] = await Promise.all([
      this.prisma.contact.count({ where: { companyId, deletedAt: null } }),
      this.prisma.contact.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.contact.groupBy({
        by: ['country'],
        where: { companyId, deletedAt: null, country: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      success: true,
      data: {
        total: totalContacts,
        byStatus: byStatus.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        byCountry: byCountry.map(stat => ({
          country: stat.country,
          count: stat._count.id,
        })),
      },
    };
  }

  async getStorageStats(companyId: string) {
    const storage = await this.prisma.fileStorage.aggregate({
      where: { companyId, deletedAt: null },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const byCategory = await this.prisma.fileStorage.groupBy({
      by: ['category'],
      where: { companyId, deletedAt: null },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    return {
      success: true,
      data: {
        totalFiles: storage._count.id || 0,
        totalSize: storage._sum.fileSize || 0,
        byCategory: byCategory.map(cat => ({
          category: cat.category || 'Uncategorized',
          files: cat._count.id,
          size: cat._sum.fileSize || 0,
        })),
      },
    };
  }

  private getDateRange(range: DateRangeType): { startDate: Date; endDate: Date } {
    const now = new Date();
    
    switch (range) {
      case DateRangeType.TODAY:
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(now),
        };
      case DateRangeType.YESTERDAY:
        const yesterday = subDays(now, 1);
        return {
          startDate: startOfDay(yesterday),
          endDate: endOfDay(yesterday),
        };
      case DateRangeType.LAST_7_DAYS:
        return {
          startDate: startOfDay(subDays(now, 7)),
          endDate: endOfDay(now),
        };
      case DateRangeType.LAST_30_DAYS:
        return {
          startDate: startOfDay(subDays(now, 30)),
          endDate: endOfDay(now),
        };
      case DateRangeType.LAST_90_DAYS:
        return {
          startDate: startOfDay(subDays(now, 90)),
          endDate: endOfDay(now),
        };
      case DateRangeType.THIS_MONTH:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      case DateRangeType.LAST_MONTH:
        const lastMonth = subMonths(now, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
        };
      case DateRangeType.THIS_YEAR:
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
        };
      default:
        return {
          startDate: startOfDay(subDays(now, 30)),
          endDate: endOfDay(now),
        };
    }
  }

  private getPreviousPeriod(range: DateRangeType): { startDate: Date; endDate: Date } {
    const current = this.getDateRange(range);
    const diffDays = Math.ceil((current.endDate.getTime() - current.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      startDate: subDays(current.startDate, diffDays),
      endDate: subDays(current.endDate, diffDays),
    };
  }

  private async calculateGrowthRates(companyId: string, currentStart: Date, currentEnd: Date, previousPeriod: { startDate: Date; endDate: Date }) {
    const [currentCounts, previousCounts] = await Promise.all([
      this.getCountsForPeriod(companyId, currentStart, currentEnd),
      this.getCountsForPeriod(companyId, previousPeriod.startDate, previousPeriod.endDate),
    ]);

    const growth = {};
    Object.keys(currentCounts).forEach(key => {
      const current = currentCounts[key];
      const previous = previousCounts[key] || 0;
      growth[key] = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    });

    return growth;
  }

  private async getCountsForPeriod(companyId: string, startDate: Date, endDate: Date) {
    const [campaigns, contacts, scripts, prompts, knowledgeBase, voiceProfiles, calls] = await Promise.all([
      this.prisma.campaign.count({
        where: { 
          companyId, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.contact.count({
        where: { 
          companyId, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.script.count({
        where: { 
          companyId, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.prompt.count({
        where: { 
          companyId, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.knowledgeBase.count({
        where: { 
          companyId, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.voiceProfile.count({
        where: { 
          companyId, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.call.count({
        where: { 
          campaign: { companyId }, 
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
    ]);

    return {
      campaigns,
      contacts,
      scripts,
      prompts,
      knowledgeBase,
      voiceProfiles,
      calls,
    };
  }

  private async getContactGrowthChart(companyId: string, startDate: Date, endDate: Date) {
    const contacts = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM contacts 
      WHERE company_id = ${companyId}
        AND deleted_at IS NULL
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    return contacts;
  }

  private async getCampaignPerformanceChart(companyId: string, startDate: Date, endDate: Date) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        _count: {
          select: { contacts: true, calls: true },
        },
      },
    });

    return campaigns.map(campaign => ({
      name: campaign.name,
      contacts: campaign._count.contacts,
      calls: campaign._count.calls,
      status: campaign.status,
    }));
  }

  private async getUserActivityChart(companyId: string, startDate: Date, endDate: Date) {
    const activity = await this.prisma.$queryRaw<Array<{ date: Date; activities: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activities
      FROM activity_logs 
      WHERE company_id = ${companyId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    return activity;
  }

  private async getGenericChart(companyId: string, metric: AnalyticsMetric, startDate: Date, endDate: Date) {
    const data = await this.prisma.analytics.findMany({
      where: {
        companyId,
        metric,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return data.map(d => ({
      date: d.date,
      value: d.value,
      dimension1: d.dimension1,
      dimension2: d.dimension2,
      dimension3: d.dimension3,
    }));
  }
}