import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CreateActivityLogDto, ActivityLogFilterDto } from './dto/activity-log.dto';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    companyId: string;
    userId?: string;
    action: string;
    module: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: any;
  }) {
    const log = await this.prisma.activityLog.create({
      data,
    });

    return log;
  }

  async createFromDto(companyId: string, userId: string | null, data: CreateActivityLogDto) {
    const activityLog = await this.prisma.activityLog.create({
      data: {
        ...data,
        companyId,
        userId,
      },
    });

    return {
      success: true,
      data: activityLog,
      message: 'Activity log created successfully',
    };
  }

  async findAll(paginationDto: PaginationDto, companyId: string, filters?: ActivityLogFilterDto) {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
    };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.module) {
      where.module = filters.module;
    }

    if (filters?.action) {
      where.action = { contains: filters.action };
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters?.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters?.createdAfter || filters?.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    if (search || filters?.search) {
      const searchTerm = search || filters?.search;
      where.OR = [
        { action: { contains: searchTerm } },
        { module: { contains: searchTerm } },
        { entityType: { contains: searchTerm } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
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
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(logs, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const log = await this.prisma.activityLog.findFirst({
      where: { id, companyId },
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
    });

    return {
      success: true,
      data: log,
    };
  }

  async findByModule(companyId: string, module: string, paginationDto: PaginationDto) {
    return this.findAll(paginationDto, companyId, { module });
  }

  async findByUser(companyId: string, userId: string, paginationDto: PaginationDto) {
    return this.findAll(paginationDto, companyId, { userId });
  }

  async getStatistics(companyId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, byModule, byAction, byUser] = await Promise.all([
      this.prisma.activityLog.count({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.activityLog.groupBy({
        by: ['module'],
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.activityLog.groupBy({
        by: ['action'],
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          companyId,
          userId: { not: null },
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Get user details for top users
    const userIds = byUser.map(u => u.userId).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, any>);

    const topUsers = byUser.map(stat => ({
      user: userMap[stat.userId as string] || { firstName: 'Unknown', lastName: 'User' },
      count: stat._count.id,
    }));

    return {
      success: true,
      data: {
        totalLogs,
        period: { days, startDate },
        byModule: byModule.map(stat => ({
          module: stat.module,
          count: stat._count.id,
        })),
        byAction: byAction.map(stat => ({
          action: stat.action,
          count: stat._count.id,
        })),
        topUsers,
      },
    };
  }

  async getRecentActivity(companyId: string, limit = 20) {
    const logs = await this.prisma.activityLog.findMany({
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
      data: logs,
    };
  }

  async cleanup(companyId: string, daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        companyId,
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: `Cleaned up ${result.count} old activity logs`,
    };
  }

  // Enhanced utility methods for logging various activities
  async logLogin(companyId: string, userId: string, ipAddress?: string, userAgent?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: 'User logged in',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  async logLogout(companyId: string, userId: string, ipAddress?: string, userAgent?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: 'User logged out',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  async logCreate(companyId: string, userId: string, module: string, entityType: string, entityId: string, details?: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: `Created ${entityType}`,
      module,
      entityType,
      entityId,
      details,
      ipAddress,
      sessionId,
    });
  }

  async logUpdate(companyId: string, userId: string, module: string, entityType: string, entityId: string, details?: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: `Updated ${entityType}`,
      module,
      entityType,
      entityId,
      details,
      ipAddress,
      sessionId,
    });
  }

  async logDelete(companyId: string, userId: string, module: string, entityType: string, entityId: string, details?: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: `Deleted ${entityType}`,
      module,
      entityType,
      entityId,
      details,
      ipAddress,
      sessionId,
    });
  }

  async logImport(companyId: string, userId: string, module: string, details?: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: `Import ${module}`,
      module,
      entityType: 'import',
      details,
      ipAddress,
      sessionId,
    });
  }

  async logExport(companyId: string, userId: string, module: string, details?: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: `Export ${module}`,
      module,
      entityType: 'export',
      details,
      ipAddress,
      sessionId,
    });
  }

  async logFileUpload(companyId: string, userId: string, fileName: string, fileSize: number, details?: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: 'File uploaded',
      module: 'files',
      entityType: 'file',
      details: { fileName, fileSize, ...details },
      ipAddress,
      sessionId,
    });
  }

  async logSettingsChange(companyId: string, userId: string, settingKey: string, oldValue: any, newValue: any, ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: 'Settings changed',
      module: 'settings',
      entityType: 'setting',
      entityId: settingKey,
      details: { settingKey, oldValue, newValue },
      ipAddress,
      sessionId,
    });
  }

  async logRoleChange(companyId: string, userId: string, targetUserId: string, oldRoles: string[], newRoles: string[], ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: 'Role changed',
      module: 'users',
      entityType: 'user_role',
      entityId: targetUserId,
      details: { targetUserId, oldRoles, newRoles },
      ipAddress,
      sessionId,
    });
  }

  async logPermissionChange(companyId: string, userId: string, roleId: string, permission: string, action: 'granted' | 'revoked', ipAddress?: string, sessionId?: string) {
    return this.create({
      companyId,
      userId,
      action: `Permission ${action}`,
      module: 'roles',
      entityType: 'role_permission',
      entityId: roleId,
      details: { roleId, permission, action },
      ipAddress,
      sessionId,
    });
  }
}
