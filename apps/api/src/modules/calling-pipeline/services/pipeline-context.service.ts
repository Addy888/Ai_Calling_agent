import { Injectable, Logger } from '@nestjs/common';

/**
 * Pipeline Context Service
 * Maintains global context and statistics for the calling pipeline
 */
@Injectable()
export class PipelineContextService {
  private readonly logger = new Logger(PipelineContextService.name);

  // Daily statistics
  private dailyStats = {
    date: new Date().toDateString(),
    total: 0,
    successful: 0,
    failed: 0,
    busy: 0,
    noAnswer: 0,
    totalDuration: 0,
  };

  constructor() {
    this.logger.log('Pipeline Context initialized');
    this.resetDailyStatsIfNeeded();
  }

  /**
   * Record a completed call
   */
  recordCall(params: {
    status: 'successful' | 'failed' | 'busy' | 'no_answer';
    duration?: number;
  }): void {
    this.resetDailyStatsIfNeeded();

    this.dailyStats.total++;

    switch (params.status) {
      case 'successful':
        this.dailyStats.successful++;
        break;
      case 'failed':
        this.dailyStats.failed++;
        break;
      case 'busy':
        this.dailyStats.busy++;
        break;
      case 'no_answer':
        this.dailyStats.noAnswer++;
        break;
    }

    if (params.duration) {
      this.dailyStats.totalDuration += params.duration;
    }
  }

  /**
   * Get today's statistics
   */
  getTodayStats(): {
    total: number;
    successful: number;
    failed: number;
    busy: number;
    noAnswer: number;
    averageDuration: number;
  } {
    this.resetDailyStatsIfNeeded();

    return {
      total: this.dailyStats.total,
      successful: this.dailyStats.successful,
      failed: this.dailyStats.failed,
      busy: this.dailyStats.busy,
      noAnswer: this.dailyStats.noAnswer,
      averageDuration:
        this.dailyStats.successful > 0
          ? this.dailyStats.totalDuration / this.dailyStats.successful
          : 0,
    };
  }

  /**
   * Reset daily stats if it's a new day
   */
  private resetDailyStatsIfNeeded(): void {
    const today = new Date().toDateString();

    if (this.dailyStats.date !== today) {
      this.logger.log(`Resetting daily stats for new day: ${today}`);
      this.dailyStats = {
        date: today,
        total: 0,
        successful: 0,
        failed: 0,
        busy: 0,
        noAnswer: 0,
        totalDuration: 0,
      };
    }
  }

  /**
   * Get current context
   */
  getContext(): Record<string, any> {
    return {
      today: this.getTodayStats(),
      timestamp: new Date(),
    };
  }
}
