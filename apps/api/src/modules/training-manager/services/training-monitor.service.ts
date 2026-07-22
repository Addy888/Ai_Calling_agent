import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  MonitorStatus,
  AlertSeverity,
  LogLevel,
  TrainingStatusResponse,
  TrainingProgress,
  TrainingMetrics,
  PerformanceMetrics,
  ResourceUsage,
  CheckpointInfo,
  TrainingAlert,
  TrainingLog,
  TimelineEvent,
} from '../dto/training-monitor.dto';

@Injectable()
export class TrainingMonitorService {
  private readonly logger = new Logger(TrainingMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get training status with mock/placeholder data
   * In production, this will connect to actual training process
   */
  async getTrainingStatus(
    companyId: string,
    sessionId: string,
  ): Promise<TrainingStatusResponse> {
    this.logger.log(`Getting training status for session: ${sessionId}`);

    // Fetch training session from database
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
      include: {
        pipelines: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Generate mock training status
    // In production, this will be replaced with real-time metrics from training process
    const status = this.generateMockTrainingStatus(session);

    return status;
  }

  /**
   * Get training progress
   */
  async getTrainingProgress(
    companyId: string,
    sessionId: string,
  ): Promise<TrainingProgress> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    return this.generateMockProgress(session);
  }

  /**
   * Get training metrics
   */
  async getTrainingMetrics(
    companyId: string,
    sessionId: string,
  ): Promise<TrainingMetrics> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    return this.generateMockMetrics();
  }

  /**
   * Get training logs
   */
  async getTrainingLogs(
    companyId: string,
    sessionId: string,
    level?: LogLevel,
    search?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ logs: TrainingLog[]; total: number }> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Fetch real logs from database
    const where: any = { sessionId };
    if (level) {
      where.logLevel = level;
    }
    if (search) {
      where.message = { contains: search };
    }

    const [logs, total] = await Promise.all([
      this.prisma.trainingSessionLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.trainingSessionLog.count({ where }),
    ]);

    // Transform to DTO format
    const transformedLogs: TrainingLog[] = logs.map((log) => ({
      id: log.id,
      level: log.logLevel as LogLevel,
      message: log.message,
      details: log.details,
      timestamp: log.timestamp.toISOString(),
    }));

    // If no logs, generate mock logs
    if (transformedLogs.length === 0) {
      return {
        logs: this.generateMockLogs(limit),
        total: 100, // Mock total
      };
    }

    return { logs: transformedLogs, total };
  }

  /**
   * Get timeline events
   */
  async getTimeline(
    companyId: string,
    sessionId: string,
  ): Promise<TimelineEvent[]> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    return this.generateMockTimeline(session);
  }

  /**
   * Get active alerts
   */
  async getAlerts(
    companyId: string,
    sessionId: string,
  ): Promise<TrainingAlert[]> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    return this.generateMockAlerts();
  }

  /**
   * Get resource summary
   */
  async getResourceSummary(
    companyId: string,
    sessionId: string,
  ): Promise<ResourceUsage> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    return this.generateMockResources();
  }

  /**
   * Generate mock training status
   * This method will be replaced with real metrics when training engine is integrated
   */
  private generateMockTrainingStatus(session: any): TrainingStatusResponse {
    const isTraining = session.status === 'READY' || session.status === 'QUEUED';
    const status = isTraining ? MonitorStatus.TRAINING : MonitorStatus.IDLE;

    return {
      sessionId: session.id,
      sessionName: session.sessionName,
      status,
      pipelineStatus: session.queueStatus,
      currentStage: 'Fine-Tuning',
      trainingMethod: session.trainingFramework || 'PyTorch',
      baseModel: 'GPT-3.5-Turbo',
      dataset: 'Conversation Dataset v1.0',
      startedTime: session.startedAt?.toISOString() || new Date().toISOString(),
      estimatedCompletion: this.calculateEstimatedCompletion(session.estimatedDurationHours),
      progress: this.generateMockProgress(session),
      metrics: this.generateMockMetrics(),
      performance: this.generateMockPerformance(),
      resources: this.generateMockResources(),
      checkpoint: this.generateMockCheckpoint(),
      alerts: this.generateMockAlerts(),
    };
  }

  /**
   * Generate mock progress data
   */
  private generateMockProgress(session: any): TrainingProgress {
    const totalEpochs = 3;
    const totalSteps = 1000;
    const currentEpoch = Math.floor(Math.random() * totalEpochs) + 1;
    const currentStep = Math.floor(Math.random() * totalSteps);
    const trainingProgress = (currentStep / totalSteps) * 100;

    return {
      currentEpoch,
      totalEpochs,
      currentStep,
      totalSteps,
      trainingProgressPercent: Math.min(trainingProgress, 100),
      validationProgressPercent: Math.min(trainingProgress * 0.9, 100),
      checkpointProgressPercent: Math.min((currentStep % 500) / 500 * 100, 100),
      estimatedCompletionTime: this.calculateEstimatedCompletion(session.estimatedDurationHours),
      estimatedRemainingSeconds: this.calculateRemainingSeconds(session.estimatedDurationHours),
    };
  }

  /**
   * Generate mock metrics
   */
  private generateMockMetrics(): TrainingMetrics {
    return {
      trainingLoss: 0.245 + Math.random() * 0.1,
      validationLoss: 0.289 + Math.random() * 0.1,
      learningRate: 0.0002,
      accuracy: 0.892 + Math.random() * 0.05,
      perplexity: 1.28 + Math.random() * 0.2,
      gradientNorm: 0.5 + Math.random() * 0.3,
      evaluationScore: 0.91 + Math.random() * 0.05,
      bestMetric: 0.945,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Generate mock performance metrics
   */
  private generateMockPerformance(): PerformanceMetrics {
    return {
      tokensPerSecond: 1500 + Math.random() * 500,
      samplesPerSecond: 12 + Math.random() * 4,
      iterationsPerSecond: 3.2 + Math.random() * 0.8,
      processedTokens: 1250000 + Math.floor(Math.random() * 100000),
      processedSamples: 8450 + Math.floor(Math.random() * 500),
      estimatedRemainingTime: '1h 23m',
    };
  }

  /**
   * Generate mock resource usage
   */
  private generateMockResources(): ResourceUsage {
    return {
      gpuUsagePercent: 75 + Math.random() * 20,
      gpuMemoryUsedGB: 18.5 + Math.random() * 5,
      gpuMemoryTotalGB: 24,
      ramUsageGB: 28.3 + Math.random() * 8,
      ramTotalGB: 64,
      cpuUsagePercent: 45 + Math.random() * 25,
      diskUsageGB: 125.7,
      networkUsageMbps: 850 + Math.random() * 200,
      isEstimated: true, // Mark as estimated since we're not reading real hardware
    };
  }

  /**
   * Generate mock checkpoint info
   */
  private generateMockCheckpoint(): CheckpointInfo {
    return {
      latestCheckpoint: 'checkpoint-step-750',
      checkpointProgress: 50,
      checkpointCount: 2,
      bestCheckpoint: 'checkpoint-step-500',
      nextCheckpointETA: '15 minutes',
      lastCheckpointTime: new Date(Date.now() - 300000).toISOString(),
    };
  }

  /**
   * Generate mock alerts
   */
  private generateMockAlerts(): TrainingAlert[] {
    const alerts: TrainingAlert[] = [
      {
        id: '1',
        severity: AlertSeverity.INFO,
        message: 'Training proceeding normally',
        timestamp: new Date().toISOString(),
      },
    ];

    // Randomly add some alerts
    if (Math.random() > 0.7) {
      alerts.push({
        id: '2',
        severity: AlertSeverity.WARNING,
        message: 'Learning rate adjusted due to plateau',
        details: 'Learning rate reduced from 0.0003 to 0.0002',
        timestamp: new Date(Date.now() - 60000).toISOString(),
      });
    }

    return alerts;
  }

  /**
   * Generate mock logs
   */
  private generateMockLogs(limit: number): TrainingLog[] {
    const logMessages = [
      'Epoch 1/3 started',
      'Processing batch 1/100',
      'Training loss: 0.245',
      'Validation loss: 0.289',
      'Checkpoint saved at step 500',
      'Learning rate: 0.0002',
      'Gradient norm: 0.523',
      'GPU memory usage: 18.5 GB / 24 GB',
      'Tokens processed: 125,000',
      'Evaluation score: 0.912',
    ];

    const logs: TrainingLog[] = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      logs.push({
        id: `log-${i}`,
        level: i % 5 === 0 ? LogLevel.WARNING : LogLevel.INFO,
        message: logMessages[i % logMessages.length],
        timestamp: new Date(Date.now() - i * 10000).toISOString(),
      });
    }

    return logs;
  }

  /**
   * Generate mock timeline
   */
  private generateMockTimeline(session: any): TimelineEvent[] {
    const events: TimelineEvent[] = [
      {
        id: '1',
        eventType: 'TRAINING_STARTED',
        message: 'Training session started',
        timestamp: session.startedAt?.toISOString() || new Date().toISOString(),
      },
      {
        id: '2',
        eventType: 'EPOCH_STARTED',
        message: 'Epoch 1/3 started',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        eventType: 'CHECKPOINT_CREATED',
        message: 'Checkpoint saved at step 500',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: '4',
        eventType: 'VALIDATION_STARTED',
        message: 'Validation started',
        timestamp: new Date(Date.now() - 900000).toISOString(),
      },
    ];

    return events;
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(estimatedHours?: number): string {
    if (!estimatedHours) return 'Unknown';

    const completionTime = new Date(Date.now() + estimatedHours * 3600000);
    return completionTime.toISOString();
  }

  /**
   * Calculate remaining seconds
   */
  private calculateRemainingSeconds(estimatedHours?: number): number {
    if (!estimatedHours) return 0;
    return Math.floor(estimatedHours * 3600);
  }

  /**
   * Export training logs
   */
  async exportLogs(
    companyId: string,
    sessionId: string,
    level?: LogLevel,
    search?: string,
    format: string = 'json',
  ): Promise<string> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Fetch all logs without pagination for export
    const where: any = { sessionId };
    if (level) {
      where.logLevel = level;
    }
    if (search) {
      where.message = { contains: search };
    }

    const logs = await this.prisma.trainingSessionLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    // Transform to DTO format
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      level: log.logLevel,
      message: log.message,
      details: log.details,
      timestamp: log.timestamp.toISOString(),
    }));

    // If no real logs, use mock logs
    const finalLogs = transformedLogs.length > 0 ? transformedLogs : this.generateMockLogs(100);

    // Format based on export format
    switch (format) {
      case 'csv':
        return this.formatLogsAsCSV(finalLogs);
      case 'txt':
        return this.formatLogsAsText(finalLogs);
      case 'json':
      default:
        return JSON.stringify(finalLogs, null, 2);
    }
  }

  /**
   * Format logs as CSV
   */
  private formatLogsAsCSV(logs: any[]): string {
    const header = 'ID,Level,Message,Timestamp\n';
    const rows = logs.map(log => 
      `${log.id},"${log.level}","${log.message.replace(/"/g, '""')}","${log.timestamp}"`
    ).join('\n');
    return header + rows;
  }

  /**
   * Format logs as plain text
   */
  private formatLogsAsText(logs: any[]): string {
    return logs.map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message}`
    ).join('\n');
  }
}
