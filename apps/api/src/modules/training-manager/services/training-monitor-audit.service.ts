import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Training Monitor Audit Service
 * 
 * Tracks all monitoring activities for compliance and analytics
 */
@Injectable()
export class TrainingMonitorAuditService {
  private readonly logger = new Logger(TrainingMonitorAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log training monitor opened event
   */
  async logMonitorOpened(
    companyId: string,
    userId: string,
    sessionId: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          entityType: 'TRAINING_MONITOR',
          entityId: sessionId,
          action: 'MONITOR_OPENED',
          newValues: {
            sessionId,
            timestamp: new Date().toISOString(),
            ...metadata,
          },
          metadata: {
            source: 'training-monitor',
            category: 'monitoring',
          },
        },
      });

      this.logger.log(
        `Training monitor opened for session ${sessionId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error('Error logging monitor opened event:', error);
    }
  }

  /**
   * Log training session viewed event
   */
  async logSessionViewed(
    companyId: string,
    userId: string,
    sessionId: string,
    viewDuration?: number,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          entityType: 'TRAINING_SESSION',
          entityId: sessionId,
          action: 'SESSION_VIEWED',
          newValues: {
            sessionId,
            viewDuration,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            source: 'training-monitor',
            category: 'monitoring',
          },
        },
      });
    } catch (error) {
      this.logger.error('Error logging session viewed event:', error);
    }
  }

  /**
   * Log logs exported event
   */
  async logLogsExported(
    companyId: string,
    userId: string,
    sessionId: string,
    format: string,
    logCount: number,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          entityType: 'TRAINING_LOGS',
          entityId: sessionId,
          action: 'LOGS_EXPORTED',
          newValues: {
            sessionId,
            format,
            logCount,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            source: 'training-monitor',
            category: 'export',
          },
        },
      });

      this.logger.log(
        `Training logs exported for session ${sessionId} by user ${userId} (${format}, ${logCount} logs)`,
      );
    } catch (error) {
      this.logger.error('Error logging logs exported event:', error);
    }
  }

  /**
   * Log monitoring alert triggered
   */
  async logAlertTriggered(
    companyId: string,
    sessionId: string,
    severity: string,
    message: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          entityType: 'TRAINING_ALERT',
          entityId: sessionId,
          action: 'ALERT_TRIGGERED',
          newValues: {
            sessionId,
            severity,
            message,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            source: 'training-monitor',
            category: 'alert',
          },
        },
      });
    } catch (error) {
      this.logger.error('Error logging alert triggered event:', error);
    }
  }

  /**
   * Log monitoring error
   */
  async logMonitoringError(
    companyId: string,
    sessionId: string,
    errorMessage: string,
    errorDetails?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          entityType: 'TRAINING_MONITOR',
          entityId: sessionId,
          action: 'MONITORING_ERROR',
          newValues: {
            sessionId,
            errorMessage,
            errorDetails,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            source: 'training-monitor',
            category: 'error',
          },
        },
      });
    } catch (error) {
      this.logger.error('Error logging monitoring error event:', error);
    }
  }

  /**
   * Get monitoring activity logs
   */
  async getMonitoringActivityLogs(
    companyId: string,
    sessionId?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    try {
      const where: any = {
        companyId,
        entityType: {
          in: ['TRAINING_MONITOR', 'TRAINING_SESSION', 'TRAINING_LOGS', 'TRAINING_ALERT'],
        },
      };

      if (sessionId) {
        where.entityId = sessionId;
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error fetching monitoring activity logs:', error);
      throw error;
    }
  }
}
