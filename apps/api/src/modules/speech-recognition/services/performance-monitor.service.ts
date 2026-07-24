import { Injectable, Logger } from '@nestjs/common';

/**
 * Performance Monitor Service
 * 
 * Tracks and reports performance metrics for the STT engine:
 * - Latency measurements
 * - Throughput statistics
 * - Error rates
 * - Resource utilization
 */
@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);

  // Latency tracking
  private readonly latencyMeasurements = new Map<string, number[]>();
  
  // Session metrics
  private readonly sessionMetrics = new Map<string, SessionMetrics>();
  
  // Global counters
  private totalTranscriptions = 0;
  private totalErrors = 0;
  private totalAudioProcessed = 0; // in bytes

  /**
   * Start latency measurement for an operation
   */
  startLatencyMeasurement(operationId: string): void {
    this.sessionMetrics.set(operationId, {
      startTime: Date.now(),
      operationType: 'transcription',
      sessionId: operationId,
    });
  }

  /**
   * End latency measurement and record result
   */
  endLatencyMeasurement(operationId: string, operationType: string = 'transcription'): number {
    const metrics = this.sessionMetrics.get(operationId);
    if (!metrics) {
      this.logger.warn(`No metrics found for operation: ${operationId}`);
      return 0;
    }

    const latencyMs = Date.now() - metrics.startTime;
    
    // Record latency
    if (!this.latencyMeasurements.has(operationType)) {
      this.latencyMeasurements.set(operationType, []);
    }
    
    const measurements = this.latencyMeasurements.get(operationType)!;
    measurements.push(latencyMs);
    
    // Keep only last 1000 measurements
    if (measurements.length > 1000) {
      measurements.shift();
    }

    this.sessionMetrics.delete(operationId);

    return latencyMs;
  }

  /**
   * Record successful transcription
   */
  recordTranscription(audioBytes: number): void {
    this.totalTranscriptions++;
    this.totalAudioProcessed += audioBytes;
  }

  /**
   * Record transcription error
   */
  recordError(errorType: string): void {
    this.totalErrors++;
    this.logger.warn(`STT Error recorded: ${errorType}`);
  }

  /**
   * Get latency statistics for an operation type
   */
  getLatencyStats(operationType: string = 'transcription'): LatencyStats {
    const measurements = this.latencyMeasurements.get(operationType) || [];
    
    if (measurements.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      mean: sum / count,
      median: sorted[Math.floor(count / 2)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get overall performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const transcriptionLatency = this.getLatencyStats('transcription');
    const vadLatency = this.getLatencyStats('vad');
    const noiseReductionLatency = this.getLatencyStats('noise-reduction');

    const errorRate = this.totalTranscriptions > 0
      ? this.totalErrors / this.totalTranscriptions
      : 0;

    const avgAudioSize = this.totalTranscriptions > 0
      ? this.totalAudioProcessed / this.totalTranscriptions
      : 0;

    return {
      transcription: {
        total: this.totalTranscriptions,
        errors: this.totalErrors,
        errorRate,
        latency: transcriptionLatency,
      },
      vad: {
        latency: vadLatency,
      },
      noiseReduction: {
        latency: noiseReductionLatency,
      },
      audio: {
        totalBytesProcessed: this.totalAudioProcessed,
        averageChunkSize: avgAudioSize,
      },
      activeOperations: this.sessionMetrics.size,
    };
  }

  /**
   * Get throughput statistics
   */
  getThroughputStats(windowSeconds: number = 60): ThroughputStats {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Count operations in the time window
    let operationsInWindow = 0;
    
    for (const [, metrics] of this.sessionMetrics) {
      if (now - metrics.startTime <= windowMs) {
        operationsInWindow++;
      }
    }

    return {
      windowSeconds,
      operationsPerSecond: operationsInWindow / windowSeconds,
      activeOperations: this.sessionMetrics.size,
      totalOperations: this.totalTranscriptions,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.latencyMeasurements.clear();
    this.sessionMetrics.clear();
    this.totalTranscriptions = 0;
    this.totalErrors = 0;
    this.totalAudioProcessed = 0;
    
    this.logger.log('Performance metrics reset');
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const metrics = this.getPerformanceMetrics();
    const throughput = this.getThroughputStats();

    this.logger.log('═══════════════════════════════════════════════');
    this.logger.log('STT Performance Summary');
    this.logger.log('═══════════════════════════════════════════════');
    this.logger.log(`Total Transcriptions: ${metrics.transcription.total}`);
    this.logger.log(`Error Rate: ${(metrics.transcription.errorRate * 100).toFixed(2)}%`);
    this.logger.log(`Throughput: ${throughput.operationsPerSecond.toFixed(2)} ops/sec`);
    this.logger.log('───────────────────────────────────────────────');
    this.logger.log('Latency (ms):');
    this.logger.log(`  Mean: ${metrics.transcription.latency.mean.toFixed(1)}ms`);
    this.logger.log(`  Median: ${metrics.transcription.latency.median.toFixed(1)}ms`);
    this.logger.log(`  P95: ${metrics.transcription.latency.p95.toFixed(1)}ms`);
    this.logger.log(`  P99: ${metrics.transcription.latency.p99.toFixed(1)}ms`);
    this.logger.log('───────────────────────────────────────────────');
    this.logger.log(`Audio Processed: ${(metrics.audio.totalBytesProcessed / 1024 / 1024).toFixed(2)} MB`);
    this.logger.log(`Active Operations: ${metrics.activeOperations}`);
    this.logger.log('═══════════════════════════════════════════════');
  }
}

/**
 * Session Metrics Interface
 */
interface SessionMetrics {
  startTime: number;
  operationType: string;
  sessionId: string;
}

/**
 * Latency Statistics Interface
 */
export interface LatencyStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Performance Metrics Interface
 */
export interface PerformanceMetrics {
  transcription: {
    total: number;
    errors: number;
    errorRate: number;
    latency: LatencyStats;
  };
  vad: {
    latency: LatencyStats;
  };
  noiseReduction: {
    latency: LatencyStats;
  };
  audio: {
    totalBytesProcessed: number;
    averageChunkSize: number;
  };
  activeOperations: number;
}

/**
 * Throughput Statistics Interface
 */
export interface ThroughputStats {
  windowSeconds: number;
  operationsPerSecond: number;
  activeOperations: number;
  totalOperations: number;
}
