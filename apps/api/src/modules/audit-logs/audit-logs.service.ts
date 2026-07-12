import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CreateAuditLogDto, AuditLogFilterDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string | null, data: CreateAuditLogDto) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        ...data,
        companyId,
        userId,
      },
    });

    return {
      success: true,
      data: auditLog,
      message: 'Audit log created successfully',
    };
  }

  async logChange(
    companyId: string,
    userId: string | null,
    entityType: string,
    entityId: string,
    action: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ) {
    const changes = this.calculateChanges(oldValues, newValues);

    return this.create(companyId, userId, {
      entityType,
      entityId,
      action,
      oldValues,
      newValues,
      changes,
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: AuditLogFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
    };

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search } },
        { entityType: { contains: filters.search } },
        { entityId: { contains: filters.search } },
      ];
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.action) {
      where.action = { contains: filters.action };
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(logs, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const log = await this.prisma.auditLog.findFirst({
      where: { id, companyId },
    });

    return {
      success: true,
      data: log,
    };
  }

  async findByEntity(companyId: string, entityType: string, entityId: string, paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          companyId,
          entityType,
          entityId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({
        where: {
          companyId,
          entityType,
          entityId,
        },
      }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(logs, total, page, limit),
    };
  }

  async getStatistics(companyId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, byEntityType, byAction, byUser] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
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

    return {
      success: true,
      data: {
        totalLogs,
        period: { days, startDate },
        byEntityType: byEntityType.map(stat => ({
          entityType: stat.entityType,
          count: stat._count.id,
        })),
        byAction: byAction.map(stat => ({
          action: stat.action,
          count: stat._count.id,
        })),
        topUsers: byUser.map(stat => ({
          userId: stat.userId,
          count: stat._count.id,
        })),
      },
    };
  }

  async cleanup(companyId: string, daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        companyId,
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: `Cleaned up ${result.count} old audit logs`,
    };
  }

  private calculateChanges(oldValues: any, newValues: any): any {
    if (!oldValues || !newValues) {
      return null;
    }

    const changes: any = {};
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (oldValue !== newValue) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}