import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { 
  CreateSystemHealthDto, 
  SystemHealthFilterDto, 
  SystemStatus, 
  SystemComponent 
} from './dto/system-health.dto';
import * as os from 'os';
import * as process from 'process';

@Injectable()
export class SystemHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSystemHealthDto) {
    const health = await this.prisma.systemHealth.create({
      data,
    });

    return {
      success: true,
      data: health,
      message: 'System health record created successfully',
    };
  }

  async findAll(paginationDto: PaginationDto, filters: SystemHealthFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.component) {
      where.component = filters.component;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.checkedAfter || filters.checkedBefore) {
      where.checkedAt = {};
      if (filters.checkedAfter) where.checkedAt.gte = new Date(filters.checkedAfter);
      if (filters.checkedBefore) where.checkedAt.lte = new Date(filters.checkedBefore);
    }

    const [records, total] = await Promise.all([
      this.prisma.systemHealth.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { checkedAt: 'desc' },
      }),
      this.prisma.systemHealth.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(records, total, page, limit),
    };
  }

  async findOne(id: string) {
    const health = await this.prisma.systemHealth.findUnique({
      where: { id },
    });

    return {
      success: true,
      data: health,
    };
  }

  async getLatestStatus() {
    const components = Object.values(SystemComponent);
    const latest = await Promise.all(
      components.map(async (component) => {
        const record = await this.prisma.systemHealth.findFirst({
          where: { component },
          orderBy: { checkedAt: 'desc' },
        });
        return { component, record };
      })
    );

    const status = latest.reduce((acc, { component, record }) => {
      acc[component] = record;
      return acc;
    }, {} as Record<string, any>);

    return {
      success: true,
      data: status,
    };
  }

  async getOverallHealth() {
    const latest = await this.getLatestStatus();
    const components = Object.values(latest.data);
    
    const counts = components.reduce((acc, component) => {
      if (component?.status) {
        acc[component.status] = (acc[component.status] || 0) + 1;
      } else {
        acc['UNKNOWN'] = (acc['UNKNOWN'] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    let overallStatus = SystemStatus.HEALTHY;
    if (counts[SystemStatus.CRITICAL] > 0 || counts[SystemStatus.DOWN] > 0) {
      overallStatus = SystemStatus.CRITICAL;
    } else if (counts[SystemStatus.WARNING] > 0) {
      overallStatus = SystemStatus.WARNING;
    }

    return {
      success: true,
      data: {
        overallStatus,
        components: latest.data,
        summary: {
          total: components.length,
          healthy: counts[SystemStatus.HEALTHY] || 0,
          warning: counts[SystemStatus.WARNING] || 0,
          critical: counts[SystemStatus.CRITICAL] || 0,
          down: counts[SystemStatus.DOWN] || 0,
          unknown: counts['UNKNOWN'] || 0,
        },
      },
    };
  }

  async checkSystemHealth() {
    const checks = await Promise.all([
      this.checkApiHealth(),
      this.checkDatabaseHealth(),
      this.checkStorageHealth(),
    ]);

    return {
      success: true,
      data: checks,
      message: 'System health check completed',
    };
  }

  private async checkApiHealth() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      const memory = {
        used: memoryUsage.heapUsed,
        free: memoryUsage.heapTotal - memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      };

      const cpu = {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      };

      let status = SystemStatus.HEALTHY;
      if (memory.percentage > 90 || cpu.loadAverage[0] > cpu.cores * 2) {
        status = SystemStatus.CRITICAL;
      } else if (memory.percentage > 75 || cpu.loadAverage[0] > cpu.cores) {
        status = SystemStatus.WARNING;
      }

      const health = await this.create({
        component: SystemComponent.API,
        status,
        version: process.version,
        uptime: Math.floor(uptime),
        memory,
        cpu,
      });

      return health.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return this.create({
        component: SystemComponent.API,
        status: SystemStatus.CRITICAL,
        errors: {
          count: 1,
          lastError: errorMessage,
          lastErrorAt: new Date(),
        },
      });
    }
  }

  private async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - start;

      let status = SystemStatus.HEALTHY;
      if (queryTime > 1000) {
        status = SystemStatus.CRITICAL;
      } else if (queryTime > 500) {
        status = SystemStatus.WARNING;
      }

      const health = await this.create({
        component: SystemComponent.DATABASE,
        status,
        database: {
          connections: 1, // This would need to be queried from the DB
          maxConnections: 100, // This would need to be queried from the DB
          queryTime,
        },
      });

      return health.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return this.create({
        component: SystemComponent.DATABASE,
        status: SystemStatus.DOWN,
        errors: {
          count: 1,
          lastError: errorMessage,
          lastErrorAt: new Date(),
        },
      });
    }
  }

  private async checkStorageHealth() {
    try {
      // Check available disk space
      const stats = await import('fs').then(fs => 
        new Promise((resolve, reject) => {
          fs.default.stat(process.cwd(), (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
          });
        })
      );

      // This is a simplified check - in production, you'd use proper disk space APIs
      const disk = {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0,
      };

      const health = await this.create({
        component: SystemComponent.STORAGE,
        status: SystemStatus.HEALTHY,
        disk,
      });

      return health.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return this.create({
        component: SystemComponent.STORAGE,
        status: SystemStatus.WARNING,
        errors: {
          count: 1,
          lastError: errorMessage,
          lastErrorAt: new Date(),
        },
      });
    }
  }

  async getHealthHistory(component?: SystemComponent, hours = 24) {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const where: any = {
      checkedAt: { gte: startTime },
    };

    if (component) {
      where.component = component;
    }

    const records = await this.prisma.systemHealth.findMany({
      where,
      orderBy: { checkedAt: 'asc' },
    });

    return {
      success: true,
      data: records,
    };
  }

  async getHealthStatistics(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalChecks, byStatus, byComponent] = await Promise.all([
      this.prisma.systemHealth.count({
        where: { checkedAt: { gte: startDate } },
      }),
      this.prisma.systemHealth.groupBy({
        by: ['status'],
        where: { checkedAt: { gte: startDate } },
        _count: { id: true },
      }),
      this.prisma.systemHealth.groupBy({
        by: ['component'],
        where: { checkedAt: { gte: startDate } },
        _count: { id: true },
      }),
    ]);

    const statusStats = byStatus.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const componentStats = byComponent.reduce((acc, stat) => {
      acc[stat.component] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        period: { days, startDate },
        totalChecks,
        byStatus: statusStats,
        byComponent: componentStats,
      },
    };
  }

  async cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemHealth.deleteMany({
      where: {
        checkedAt: { lt: cutoffDate },
      },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: `Cleaned up ${result.count} old health records`,
    };
  }
}