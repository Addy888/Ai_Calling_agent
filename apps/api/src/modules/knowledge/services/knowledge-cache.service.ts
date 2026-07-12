import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class KnowledgeCacheService {
  constructor(private prisma: PrismaService) {}

  async get(companyId: string, cacheKey: string): Promise<string | null> {
    const cache = await this.prisma.knowledgeCache.findUnique({
      where: {
        companyId_cacheKey: {
          companyId,
          cacheKey,
        },
      },
    });

    if (!cache) {
      return null;
    }

    if (cache.expiresAt && cache.expiresAt < new Date()) {
      await this.delete(companyId, cacheKey);
      return null;
    }

    await this.prisma.knowledgeCache.update({
      where: {
        companyId_cacheKey: {
          companyId,
          cacheKey,
        },
      },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    return cache.cacheValue;
  }

  async set(
    companyId: string,
    cacheKey: string,
    cacheValue: string,
    cacheType: string,
    ttlSeconds?: number,
    metadata?: any,
  ): Promise<void> {
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000)
      : null;

    await this.prisma.knowledgeCache.upsert({
      where: {
        companyId_cacheKey: {
          companyId,
          cacheKey,
        },
      },
      create: {
        companyId,
        cacheKey,
        cacheValue,
        cacheType,
        expiresAt,
        metadata,
        accessCount: 0,
      },
      update: {
        cacheValue,
        expiresAt,
        metadata,
        updatedAt: new Date(),
      },
    });
  }

  async delete(companyId: string, cacheKey: string): Promise<void> {
    await this.prisma.knowledgeCache.deleteMany({
      where: {
        companyId,
        cacheKey,
      },
    });
  }

  async invalidate(companyId: string, cacheType?: string): Promise<number> {
    const where: any = { companyId };
    if (cacheType) {
      where.cacheType = cacheType;
    }

    const result = await this.prisma.knowledgeCache.deleteMany({ where });
    return result.count;
  }

  async cleanExpired(): Promise<number> {
    const result = await this.prisma.knowledgeCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  async getFrequentlyAccessed(
    companyId: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.prisma.knowledgeCache.findMany({
      where: { companyId },
      orderBy: { accessCount: 'desc' },
      take: limit,
    });
  }

  async getRecentlyAccessed(
    companyId: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.prisma.knowledgeCache.findMany({
      where: { companyId },
      orderBy: { lastAccessedAt: 'desc' },
      take: limit,
    });
  }

  async getCacheStats(companyId: string): Promise<any> {
    const total = await this.prisma.knowledgeCache.count({
      where: { companyId },
    });

    const byType = await this.prisma.knowledgeCache.groupBy({
      by: ['cacheType'],
      where: { companyId },
      _count: true,
    });

    const expired = await this.prisma.knowledgeCache.count({
      where: {
        companyId,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      total,
      expired,
      byType: byType.map((t) => ({
        type: t.cacheType,
        count: t._count,
      })),
    };
  }
}
