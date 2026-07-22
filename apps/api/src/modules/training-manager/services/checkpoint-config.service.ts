import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateCheckpointConfigDto,
  UpdateCheckpointConfigDto,
  CheckpointConfigStatus,
} from '../dto/checkpoint-config.dto';

@Injectable()
export class CheckpointConfigService {
  private readonly logger = new Logger(CheckpointConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new checkpoint configuration
   */
  async createConfiguration(
    companyId: string,
    userId: string,
    dto: CreateCheckpointConfigDto,
  ) {
    this.logger.log(`Creating checkpoint configuration: ${dto.name}`);

    const configuration = await this.prisma.checkpointConfiguration.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        trainingPipelineId: dto.trainingPipelineId,
        trainingStrategyId: dto.trainingStrategyId,
        saveStrategy: dto.saveStrategy,
        saveIntervalSteps: dto.saveIntervalSteps ?? 500,
        saveIntervalEpochs: dto.saveIntervalEpochs ?? 1,
        maxCheckpoints: dto.maxCheckpoints ?? 3,
        autoCleanup: dto.autoCleanup ?? true,
        overwritePolicy: dto.overwritePolicy,
        retentionDays: dto.retentionDays ?? 30,
        storageLimitGB: dto.storageLimitGB,
        enableArchiving: dto.enableArchiving ?? false,
        archivePolicy: dto.archivePolicy,
        recoveryStrategy: dto.recoveryStrategy,
        maxRetryCount: dto.maxRetryCount ?? 3,
        retryDelaySeconds: dto.retryDelaySeconds ?? 60,
        failureThreshold: dto.failureThreshold ?? 5,
        resumeAfterCrash: dto.resumeAfterCrash ?? true,
        autoRecovery: dto.autoRecovery ?? true,
        manualRecovery: dto.manualRecovery ?? true,
        enableVersioning: dto.enableVersioning ?? true,
        trackParentCheckpoint: dto.trackParentCheckpoint ?? true,
        enableVersionHistory: dto.enableVersionHistory ?? true,
        enableRollback: dto.enableRollback ?? true,
        storageType: dto.storageType,
        storagePath: dto.storagePath,
        storageConfig: dto.storageConfig,
        enableCompression: dto.enableCompression ?? false,
        enableEncryption: dto.enableEncryption ?? false,
        version: dto.version || '1.0.0',
        tags: dto.tags,
        metadata: dto.metadata,
        status: CheckpointConfigStatus.DRAFT,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Create audit log
    await this.createAuditLog(
      configuration.id,
      companyId,
      'CREATED',
      userId,
      null,
      configuration,
    );

    this.logger.log(`Checkpoint configuration created successfully: ${configuration.id}`);
    return configuration;
  }

  /**
   * Update an existing checkpoint configuration
   */
  async updateConfiguration(
    companyId: string,
    configurationId: string,
    userId: string,
    dto: UpdateCheckpointConfigDto,
  ) {
    this.logger.log(`Updating checkpoint configuration: ${configurationId}`);

    const existingConfig = await this.prisma.checkpointConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!existingConfig) {
      throw new NotFoundException('Checkpoint configuration not found');
    }

    const updatedConfig = await this.prisma.checkpointConfiguration.update({
      where: { id: configurationId },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    // Create audit log
    await this.createAuditLog(
      configurationId,
      companyId,
      'UPDATED',
      userId,
      existingConfig,
      updatedConfig,
    );

    this.logger.log(`Checkpoint configuration updated successfully: ${configurationId}`);
    return updatedConfig;
  }

  /**
   * Get a checkpoint configuration by ID
   */
  async getConfiguration(companyId: string, configurationId: string) {
    const configuration = await this.prisma.checkpointConfiguration.findFirst({
      where: { id: configurationId, companyId },
      include: {
        company: {
          select: { id: true, name: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!configuration) {
      throw new NotFoundException('Checkpoint configuration not found');
    }

    return configuration;
  }

  /**
   * List all checkpoint configurations for a company
   */
  async listConfigurations(
    companyId: string,
    page: number = 1,
    limit: number = 20,
    status?: CheckpointConfigStatus,
    saveStrategy?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (status) {
      where.status = status;
    }
    if (saveStrategy) {
      where.saveStrategy = saveStrategy;
    }

    const [configurations, total] = await Promise.all([
      this.prisma.checkpointConfiguration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          saveStrategy: true,
          recoveryStrategy: true,
          maxCheckpoints: true,
          retentionDays: true,
          status: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.checkpointConfiguration.count({ where }),
    ]);

    return {
      data: configurations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete a checkpoint configuration
   */
  async deleteConfiguration(
    companyId: string,
    configurationId: string,
    userId: string,
  ) {
    const configuration = await this.prisma.checkpointConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!configuration) {
      throw new NotFoundException('Checkpoint configuration not found');
    }

    // Create audit log before deletion
    await this.createAuditLog(
      configurationId,
      companyId,
      'DELETED',
      userId,
      configuration,
      null,
    );

    await this.prisma.checkpointConfiguration.delete({
      where: { id: configurationId },
    });

    this.logger.log(`Checkpoint configuration deleted: ${configurationId}`);
    return { message: 'Checkpoint configuration deleted successfully' };
  }

  /**
   * Validate a checkpoint configuration
   */
  async validateConfiguration(
    companyId: string,
    configurationId: string,
    userId: string,
  ) {
    const configuration = await this.prisma.checkpointConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!configuration) {
      throw new NotFoundException('Checkpoint configuration not found');
    }

    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      checks: {
        hasSaveStrategy: !!configuration.saveStrategy,
        hasRecoveryStrategy: !!configuration.recoveryStrategy,
        hasStorageType: !!configuration.storageType,
        hasMaxCheckpoints: configuration.maxCheckpoints > 0,
        hasRetentionDays: configuration.retentionDays > 0,
        hasRetryCount: configuration.maxRetryCount >= 0,
      },
    };

    // Required field validations
    if (!configuration.saveStrategy) {
      validationResult.errors.push('Save strategy is required');
      validationResult.isValid = false;
    }

    if (!configuration.recoveryStrategy) {
      validationResult.errors.push('Recovery strategy is required');
      validationResult.isValid = false;
    }

    if (!configuration.storageType) {
      validationResult.errors.push('Storage type is required');
      validationResult.isValid = false;
    }

    // Policy validations
    if (configuration.maxCheckpoints <= 0) {
      validationResult.errors.push('Maximum checkpoints must be greater than 0');
      validationResult.isValid = false;
    }

    if (configuration.saveStrategy === 'SAVE_EVERY_N_STEPS') {
      if (!configuration.saveIntervalSteps || configuration.saveIntervalSteps <= 0) {
        validationResult.errors.push(
          'Save interval steps must be greater than 0 for SAVE_EVERY_N_STEPS strategy',
        );
        validationResult.isValid = false;
      }
    }

    if (configuration.saveStrategy === 'SAVE_EVERY_EPOCH') {
      if (!configuration.saveIntervalEpochs || configuration.saveIntervalEpochs <= 0) {
        validationResult.errors.push(
          'Save interval epochs must be greater than 0 for SAVE_EVERY_EPOCH strategy',
        );
        validationResult.isValid = false;
      }
    }

    // Storage warnings
    if (configuration.storageType === 'CLOUD_STORAGE' || configuration.storageType === 'OBJECT_STORAGE') {
      validationResult.warnings.push(
        'Cloud/Object storage configuration placeholder only - no actual integration',
      );
    }

    if (!configuration.storagePath) {
      validationResult.warnings.push('Storage path is not configured');
    }

    if (configuration.storageLimitGB && configuration.storageLimitGB < 10) {
      validationResult.warnings.push(
        'Storage limit is very low - may cause checkpoint failures',
      );
    }

    // Update configuration with validation result
    const updatedConfiguration = await this.prisma.checkpointConfiguration.update({
      where: { id: configurationId },
      data: {
        validationResult,
        isValidated: validationResult.isValid,
        validatedAt: new Date(),
        status: validationResult.isValid
          ? CheckpointConfigStatus.VALIDATED
          : configuration.status,
        updatedBy: userId,
      },
    });

    // Create audit log
    await this.createAuditLog(
      configurationId,
      companyId,
      'VALIDATED',
      userId,
      configuration,
      updatedConfiguration,
    );

    return {
      configuration: updatedConfiguration,
      validation: validationResult,
    };
  }

  /**
   * Get configuration statistics
   */
  async getStatistics(companyId: string) {
    const [total, byStatus, bySaveStrategy, byRecoveryStrategy, validated] =
      await Promise.all([
        this.prisma.checkpointConfiguration.count({ where: { companyId } }),
        this.prisma.checkpointConfiguration.groupBy({
          by: ['status'],
          where: { companyId },
          _count: true,
        }),
        this.prisma.checkpointConfiguration.groupBy({
          by: ['saveStrategy'],
          where: { companyId },
          _count: true,
        }),
        this.prisma.checkpointConfiguration.groupBy({
          by: ['recoveryStrategy'],
          where: { companyId },
          _count: true,
        }),
        this.prisma.checkpointConfiguration.count({
          where: { companyId, isValidated: true },
        }),
      ]);

    return {
      total,
      validated,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySaveStrategy: bySaveStrategy.reduce((acc, item) => {
        acc[item.saveStrategy] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byRecoveryStrategy: byRecoveryStrategy.reduce((acc, item) => {
        acc[item.recoveryStrategy] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    configurationId: string,
    companyId: string,
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'VALIDATED' | 'STATUS_CHANGED' | 'RECOVERY_POLICY_UPDATED' | 'STORAGE_UPDATED' | 'RETENTION_UPDATED',
    userId: string,
    oldValues: any,
    newValues: any,
  ) {
    try {
      await this.prisma.checkpointConfigAuditLog.create({
        data: {
          configurationId,
          companyId,
          action,
          performedBy: userId,
          oldValues: oldValues || undefined,
          newValues: newValues || undefined,
          changes: this.calculateChanges(oldValues, newValues),
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(oldValues: any, newValues: any) {
    if (!oldValues || !newValues) return undefined;

    const changes: Record<string, any> = {};
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      if (
        key !== 'updatedAt' &&
        key !== 'createdAt' &&
        JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
      ) {
        changes[key] = {
          old: oldValues[key],
          new: newValues[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
  }
}
