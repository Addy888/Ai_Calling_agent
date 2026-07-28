/**
 * Performance Monitor Service
 * Tracks and analyzes performance metrics for the AI conversation engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface PerformanceMetrics {
  sttLatency: number;
  knowledgeLatency?: number;
  llmFirstTokenLatency: number;
  llmTotalLatency: number;
  ttsLatency: number;
  totalLatency: number;
  timestamp: Date;
}

interface MetricsAggregation {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private sessionMetrics = new Map<string, PerformanceMetrics[]>();

  constructor(private readonly prisma: PrismaService) {}

  async recordMetrics(sessionId: string, metrics: Omit<PerformanceMetrics, 'timestamp'>) {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    // Store in memory
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, []);
    }
    this.sessionMetrics.get(sessionId)!.push(fullMetrics);

    // Check performance targets
    this.checkPerformanceTargets(sessionId, fullMetrics);

    // Log if slow
    if (fullMetrics.totalLatency > 1500) {
      this.logger.warn(
        `Slow response detected for session ${sessionId}: ${fullMetrics.totalLatency}ms`,
      );
    }
  }

  private checkPerformanceTargets(sessionId: string, metrics: PerformanceMetrics) {
    const targets = {
      sttLatency: 300,
      llmFirstTokenLatency: 700,
      totalLatency: 1500,
    };

    const violations: string[] = [];

    if (metrics.sttLatency > targets.sttLatency) {
      violations.push(`STT: ${metrics.sttLatency}ms > ${targets.sttLatency}ms`);
    }

    if (metrics.llmFirstTokenLatency > targets.llmFirstTokenLatency) {
      violations.push(`LLM First Token: ${metrics.llmFirstTokenLatency}ms > ${targets.llmFirstTokenLatency}ms`);
    }

    if (metrics.totalLatency > targets.totalLatency) {
      violations.push(`Total: ${metrics.totalLatency}ms > ${targets.totalLatency}ms`);
    }

    if (violations.length > 0) {
      this.logger.warn(`Performance target violations [${sessionId}]: ${violations.join(', ')}`);
    }
  }

  getSessionMetrics(sessionId: string): {
    success: boolean;
    sessionId: string;
    metrics: PerformanceMetrics[];
    aggregated: {
      stt: MetricsAggregation;
      llmFirstToken: MetricsAggregation;
      llmTotal: MetricsAggregation;
      tts: MetricsAggregation;
      total: MetricsAggregation;
    };
  } {
    const metrics = this.sessionMetrics.get(sessionId) || [];

    return {
      success: true,
      sessionId,
      metrics,
      aggregated: {
        stt: this.aggregateMetrics(metrics.map(m => m.sttLatency)),
        llmFirstToken: this.aggregateMetrics(metrics.map(m => m.llmFirstTokenLatency)),
        llmTotal: this.aggregateMetrics(metrics.map(m => m.llmTotalLatency)),
        tts: this.aggregateMetrics(metrics.map(m => m.ttsLatency)),
        total: this.aggregateMetrics(metrics.map(m => m.totalLatency)),
      },
    };
  }

  getGlobalMetrics(): {
    success: boolean;
    totalSessions: number;
    aggregated: {
      stt: MetricsAggregation;
      llmFirstToken: MetricsAggregation;
      llmTotal: MetricsAggregation;
      tts: MetricsAggregation;
      total: MetricsAggregation;
    };
  } {
    const allMetrics: PerformanceMetrics[] = [];
    this.sessionMetrics.forEach(metrics => allMetrics.push(...metrics));

    return {
      success: true,
      totalSessions: this.sessionMetrics.size,
      aggregated: {
        stt: this.aggregateMetrics(allMetrics.map(m => m.sttLatency)),
        llmFirstToken: this.aggregateMetrics(allMetrics.map(m => m.llmFirstTokenLatency)),
        llmTotal: this.aggregateMetrics(allMetrics.map(m => m.llmTotalLatency)),
        tts: this.aggregateMetrics(allMetrics.map(m => m.ttsLatency)),
        total: this.aggregateMetrics(allMetrics.map(m => m.totalLatency)),
      },
    };
  }

  private aggregateMetrics(values: number[]): MetricsAggregation {
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  async getAnalytics(params: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
  }) {
    // Query database for historical analytics
    const where: any = {};

    if (params.startDate) {
      where.createdAt = { gte: new Date(params.startDate) };
    }

    if (params.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(params.endDate) };
    }

    if (params.campaignId) {
      where.campaignId = params.campaignId;
    }

    const sessions = await this.prisma.conversationSession.findMany({
      where,
      select: {
        id: true,
        sessionId: true,
        campaignId: true,
        turnCount: true,
        avgSttLatency: true,
        avgLlmLatency: true,
        avgTtsLatency: true,
        avgTotalLatency: true,
        intent: true,
        leadScore: true,
        emotion: true,
        createdAt: true,
      },
    });

    return {
      totalSessions: sessions.length,
      sessions,
    };
  }

  async getPerformanceAnalytics(params: {
    startDate?: string;
    endDate?: string;
  }) {
    const analytics = await this.getAnalytics(params);

    return {
      totalSessions: analytics.totalSessions,
      performanceMetrics: {
        avgSttLatency: this.calculateAverage(analytics.sessions.map(s => s.avgSttLatency)),
        avgLlmLatency: this.calculateAverage(analytics.sessions.map(s => s.avgLlmLatency)),
        avgTtsLatency: this.calculateAverage(analytics.sessions.map(s => s.avgTtsLatency)),
        avgTotalLatency: this.calculateAverage(analytics.sessions.map(s => s.avgTotalLatency)),
      },
    };
  }

  private calculateAverage(values: (number | null)[]): number {
    const filtered = values.filter(v => v !== null) as number[];
    if (filtered.length === 0) return 0;
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
  }

  clearSessionMetrics(sessionId: string) {
    this.sessionMetrics.delete(sessionId);
  }
}
