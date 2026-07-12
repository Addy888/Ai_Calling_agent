import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { 
  CreateReportDto, 
  UpdateReportDto, 
  ReportFilterDto, 
  ExecuteReportDto,
  ReportType,
  ReportFormat 
} from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, data: CreateReportDto) {
    const report = await this.prisma.report.create({
      data: {
        ...data,
        companyId,
        userId,
        createdBy: userId,
      },
    });

    return {
      success: true,
      data: report,
      message: 'Report created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: ReportFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          _count: { select: { executions: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(reports, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        _count: { select: { executions: true } },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return {
      success: true,
      data: report,
    };
  }

  async update(id: string, companyId: string, userId: string, data: UpdateReportDto) {
    const report = await this.prisma.report.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    return {
      success: true,
      data: updatedReport,
      message: 'Report updated successfully',
    };
  }

  async remove(id: string, companyId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Report deleted successfully',
    };
  }

  async execute(id: string, companyId: string, userId: string, params: ExecuteReportDto) {
    const report = await this.prisma.report.findFirst({
      where: { id, companyId, deletedAt: null, isActive: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found or inactive');
    }

    // Create execution record
    const execution = await this.prisma.reportExecution.create({
      data: {
        reportId: id,
        executedBy: userId,
        parameters: params.parameters,
        status: 'RUNNING',
      },
    });

    try {
      // Execute the report
      const result = await this.executeReport(report, params, companyId);
      
      // Update execution with result
      const completedExecution = await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          result,
          completedAt: new Date(),
          recordCount: Array.isArray(result?.data) ? result.data.length : 0,
        },
      });

      // Update report last run
      await this.prisma.report.update({
        where: { id },
        data: { lastRunAt: new Date() },
      });

      return {
        success: true,
        data: {
          execution: completedExecution,
          result,
        },
        message: 'Report executed successfully',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Update execution with error
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage,
        },
      });

      throw new BadRequestException(`Report execution failed: ${errorMessage}`);
    }
  }

  async getExecution(executionId: string, companyId: string) {
    const execution = await this.prisma.reportExecution.findFirst({
      where: {
        id: executionId,
        report: { companyId },
      },
      include: {
        report: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Report execution not found');
    }

    return {
      success: true,
      data: execution,
    };
  }

  async getExecutions(reportId: string, companyId: string, paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.prisma.reportExecution.findMany({
        where: {
          reportId,
          report: { companyId },
        },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          report: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
      this.prisma.reportExecution.count({
        where: {
          reportId,
          report: { companyId },
        },
      }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(executions, total, page, limit),
    };
  }

  private async executeReport(report: any, params: ExecuteReportDto, companyId: string) {
    const mergedParams = { ...report.parameters, ...params.parameters };

    switch (report.type) {
      case ReportType.CAMPAIGN_PERFORMANCE:
        return this.executeCampaignPerformanceReport(companyId, mergedParams);
      case ReportType.CONTACT_ANALYSIS:
        return this.executeContactAnalysisReport(companyId, mergedParams);
      case ReportType.USER_ACTIVITY:
        return this.executeUserActivityReport(companyId, mergedParams);
      case ReportType.KNOWLEDGE_BASE_USAGE:
        return this.executeKnowledgeBaseUsageReport(companyId, mergedParams);
      case ReportType.SYSTEM_HEALTH:
        return this.executeSystemHealthReport(companyId, mergedParams);
      default:
        throw new BadRequestException('Unsupported report type');
    }
  }

  private async executeCampaignPerformanceReport(companyId: string, params: any) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(params.status && { status: params.status }),
        ...(params.startDate && { createdAt: { gte: new Date(params.startDate) } }),
        ...(params.endDate && { createdAt: { lte: new Date(params.endDate) } }),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        script: { select: { name: true, language: true } },
        prompt: { select: { name: true } },
        _count: { select: { contacts: true, calls: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      reportType: 'Campaign Performance',
      generatedAt: new Date(),
      parameters: params,
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        owner: `${campaign.user.firstName} ${campaign.user.lastName}`,
        script: campaign.script?.name || 'Not assigned',
        prompt: campaign.prompt?.name || 'Not assigned',
        totalContacts: campaign._count.contacts,
        totalCalls: campaign._count.calls,
        createdAt: campaign.createdAt,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      })),
      summary: {
        totalCampaigns: campaigns.length,
        totalContacts: campaigns.reduce((sum, c) => sum + c._count.contacts, 0),
        totalCalls: campaigns.reduce((sum, c) => sum + c._count.calls, 0),
      },
    };
  }

  private async executeContactAnalysisReport(companyId: string, params: any) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(params.status && { status: params.status }),
        ...(params.country && { country: params.country }),
        ...(params.campaignId && { campaignId: params.campaignId }),
      },
      include: {
        campaignRef: { select: { name: true } },
        _count: { select: { calls: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byCountry = contacts.reduce((acc, contact) => {
      const country = contact.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = contacts.reduce((acc, contact) => {
      acc[contact.status] = (acc[contact.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      reportType: 'Contact Analysis',
      generatedAt: new Date(),
      parameters: params,
      data: contacts.map(contact => ({
        id: contact.id,
        fullName: contact.fullName,
        phone: contact.phone,
        email: contact.email,
        country: contact.country,
        status: contact.status,
        campaign: contact.campaignRef?.name || 'Not assigned',
        totalCalls: contact._count.calls,
        lastCalledAt: contact.lastCalledAt,
        createdAt: contact.createdAt,
      })),
      summary: {
        totalContacts: contacts.length,
        byCountry,
        byStatus,
        totalCalls: contacts.reduce((sum, c) => sum + c._count.calls, 0),
      },
    };
  }

  private async executeUserActivityReport(companyId: string, params: any) {
    const activities = await this.prisma.activityLog.findMany({
      where: {
        companyId,
        ...(params.userId && { userId: params.userId }),
        ...(params.module && { module: params.module }),
        ...(params.startDate && { createdAt: { gte: new Date(params.startDate) } }),
        ...(params.endDate && { createdAt: { lte: new Date(params.endDate) } }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 1000,
    });

    const byModule = activities.reduce((acc, activity) => {
      acc[activity.module] = (acc[activity.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byUser = activities.reduce((acc, activity) => {
      if (activity.user) {
        const userName = `${activity.user.firstName} ${activity.user.lastName}`;
        acc[userName] = (acc[userName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      reportType: 'User Activity',
      generatedAt: new Date(),
      parameters: params,
      data: activities.map(activity => ({
        id: activity.id,
        user: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System',
        action: activity.action,
        module: activity.module,
        entityType: activity.entityType,
        entityId: activity.entityId,
        ipAddress: activity.ipAddress,
        createdAt: activity.createdAt,
      })),
      summary: {
        totalActivities: activities.length,
        byModule,
        byUser,
      },
    };
  }

  private async executeKnowledgeBaseUsageReport(companyId: string, params: any) {
    const knowledgeBase = await this.prisma.knowledgeBase.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(params.type && { type: params.type }),
        ...(params.category && { category: params.category }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const byType = knowledgeBase.reduce((acc, kb) => {
      acc[kb.type] = (acc[kb.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = knowledgeBase.reduce((acc, kb) => {
      const category = kb.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      reportType: 'Knowledge Base Usage',
      generatedAt: new Date(),
      parameters: params,
      data: knowledgeBase.map(kb => ({
        id: kb.id,
        title: kb.title,
        type: kb.type,
        category: kb.category,
        status: kb.status,
        isActive: kb.isActive,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      })),
      summary: {
        totalItems: knowledgeBase.length,
        byType,
        byCategory,
        activeItems: knowledgeBase.filter(kb => kb.isActive).length,
      },
    };
  }

  private async executeSystemHealthReport(companyId: string, params: any) {
    const health = await this.prisma.systemHealth.findMany({
      orderBy: { checkedAt: 'desc' },
      take: params.limit || 100,
    });

    const byStatus = health.reduce((acc, h) => {
      acc[h.status] = (acc[h.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byComponent = health.reduce((acc, h) => {
      acc[h.component] = (acc[h.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      reportType: 'System Health',
      generatedAt: new Date(),
      parameters: params,
      data: health.map(h => ({
        id: h.id,
        component: h.component,
        status: h.status,
        version: h.version,
        uptime: h.uptime,
        checkedAt: h.checkedAt,
      })),
      summary: {
        totalChecks: health.length,
        byStatus,
        byComponent,
      },
    };
  }
}