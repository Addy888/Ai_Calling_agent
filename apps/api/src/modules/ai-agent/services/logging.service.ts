import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

@Injectable()
export class RuntimeLoggingService {
  private readonly logger = new Logger(RuntimeLoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    companyId: string,
    level: LogLevel,
    logType: string,
    message: string,
    data?: any,
    agentId?: string,
    sessionId?: string,
    stackTrace?: string,
  ) {
    try {
      await this.prisma.runtimeLog.create({
        data: {
          companyId,
          agentId,
          sessionId,
          logLevel: level,
          logType,
          message,
          data,
          stackTrace,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write runtime log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async debug(
    companyId: string,
    logType: string,
    message: string,
    data?: any,
    agentId?: string,
    sessionId?: string,
  ) {
    await this.log(companyId, LogLevel.DEBUG, logType, message, data, agentId, sessionId);
  }

  async info(
    companyId: string,
    logType: string,
    message: string,
    data?: any,
    agentId?: string,
    sessionId?: string,
  ) {
    await this.log(companyId, LogLevel.INFO, logType, message, data, agentId, sessionId);
  }

  async warn(
    companyId: string,
    logType: string,
    message: string,
    data?: any,
    agentId?: string,
    sessionId?: string,
  ) {
    await this.log(companyId, LogLevel.WARN, logType, message, data, agentId, sessionId);
  }

  async error(
    companyId: string,
    logType: string,
    message: string,
    error?: Error,
    data?: any,
    agentId?: string,
    sessionId?: string,
  ) {
    await this.log(
      companyId,
      LogLevel.ERROR,
      logType,
      message,
      data,
      agentId,
      sessionId,
      error?.stack,
    );
  }

  async fatal(
    companyId: string,
    logType: string,
    message: string,
    error?: Error,
    data?: any,
    agentId?: string,
    sessionId?: string,
  ) {
    await this.log(
      companyId,
      LogLevel.FATAL,
      logType,
      message,
      data,
      agentId,
      sessionId,
      error?.stack,
    );
  }

  async getLogs(
    companyId: string,
    filters?: {
      agentId?: string;
      sessionId?: string;
      logLevel?: LogLevel;
      logType?: string;
      limit?: number;
    },
  ) {
    const where: any = { companyId };

    if (filters?.agentId) where.agentId = filters.agentId;
    if (filters?.sessionId) where.sessionId = filters.sessionId;
    if (filters?.logLevel) where.logLevel = filters.logLevel;
    if (filters?.logType) where.logType = filters.logType;

    const logs = await this.prisma.runtimeLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
    });

    return logs;
  }

  async getAgentLogs(agentId: string, companyId: string, limit = 100) {
    return this.getLogs(companyId, { agentId, limit });
  }

  async getSessionLogs(sessionId: string, companyId: string, limit = 100) {
    return this.getLogs(companyId, { sessionId, limit });
  }

  async getErrorLogs(companyId: string, limit = 100) {
    return this.getLogs(companyId, { logLevel: LogLevel.ERROR, limit });
  }

  async clearOldLogs(companyId: string, daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.runtimeLog.deleteMany({
      where: {
        companyId,
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleared ${result.count} old logs for company ${companyId}`);

    return result;
  }
}
