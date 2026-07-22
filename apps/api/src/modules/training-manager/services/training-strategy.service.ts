import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateTrainingStrategyDto,
  UpdateTrainingStrategyDto,
  TrainingStrategyStatus,
} from '../dto/training-strategy.dto';

@Injectable()
export class TrainingStrategyService {
  private readonly logger = new Logger(TrainingStrategyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new training strategy
   */
  async createStrategy(
    companyId: string,
    userId: string,
    dto: CreateTrainingStrategyDto,
  ) {
    this.logger.log(`Creating training strategy: ${dto.name}`);

    // Validate referenced entities exist
    await this.validateReferences(companyId, dto);

    const strategy = await this.prisma.trainingStrategy.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        fineTuningConfigId: dto.fineTuningConfigId,
        hyperparameterConfigId: dto.hyperparameterConfigId,
        strategyType: dto.strategyType,
        pipelineType: dto.pipelineType,
        primaryObjective: dto.primaryObjective,
        secondaryObjective: dto.secondaryObjective,
        conversationObjective: dto.conversationObjective,
        instructionObjective: dto.instructionObjective,
        responseQualityObjective: dto.responseQualityObjective,
        knowledgeRetentionObjective: dto.knowledgeRetentionObjective,
        primaryDatasetId: dto.primaryDatasetId,
        secondaryDatasetId: dto.secondaryDatasetId,
        validationDatasetId: dto.validationDatasetId,
        datasetPriority: dto.datasetPriority,
        datasetWeight: dto.datasetWeight,
        datasetMixingRatio: dto.datasetMixingRatio,
        samplingStrategy: dto.samplingStrategy,
        shuffleDataset: dto.shuffleDataset ?? true,
        curriculumOrder: dto.curriculumOrder,
        lossFunction: dto.lossFunction,
        lossFunctionConfig: dto.lossFunctionConfig,
        labelSmoothing: dto.labelSmoothing,
        weightedLoss: dto.weightedLoss ?? false,
        customLossConfig: dto.customLossConfig,
        stageOrder: dto.stageOrder,
        datasetAssignment: dto.datasetAssignment,
        modelAssignment: dto.modelAssignment,
        evaluationBetweenStages: dto.evaluationBetweenStages ?? true,
        checkpointBetweenStages: dto.checkpointBetweenStages ?? true,
        resumeSupport: dto.resumeSupport ?? true,
        evaluationInterval: dto.evaluationInterval ?? 100,
        evaluationFrequency: dto.evaluationFrequency ?? 100,
        automaticBestModelSelection: dto.automaticBestModelSelection ?? true,
        earlyEvaluation: dto.earlyEvaluation ?? false,
        evaluationMetrics: dto.evaluationMetrics,
        retryCount: dto.retryCount ?? 3,
        resumeFromCheckpoint: dto.resumeFromCheckpoint ?? true,
        rollbackStrategy: dto.rollbackStrategy,
        abortPolicy: dto.abortPolicy,
        failureNotificationEnabled: dto.failureNotificationEnabled ?? true,
        failureNotificationConfig: dto.failureNotificationConfig,
        tags: dto.tags,
        metadata: dto.metadata,
        status: TrainingStrategyStatus.DRAFT,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        company: true,
        fineTuningConfig: true,
        hyperparameterConfig: true,
        primaryDataset: true,
        secondaryDataset: true,
        validationDataset: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      strategy.id,
      companyId,
      'CREATED',
      userId,
      null,
      strategy,
    );

    this.logger.log(`Training strategy created successfully: ${strategy.id}`);
    return strategy;
  }

  /**
   * Update an existing training strategy
   */
  async updateStrategy(
    companyId: string,
    strategyId: string,
    userId: string,
    dto: UpdateTrainingStrategyDto,
  ) {
    this.logger.log(`Updating training strategy: ${strategyId}`);

    const existingStrategy = await this.prisma.trainingStrategy.findFirst({
      where: { id: strategyId, companyId },
    });

    if (!existingStrategy) {
      throw new NotFoundException('Training strategy not found');
    }

    // Validate referenced entities if they're being updated
    if (dto.fineTuningConfigId || dto.hyperparameterConfigId || dto.primaryDatasetId || dto.secondaryDatasetId || dto.validationDatasetId) {
      await this.validateReferences(companyId, dto);
    }

    const updatedStrategy = await this.prisma.trainingStrategy.update({
      where: { id: strategyId },
      data: {
        ...dto,
        updatedBy: userId,
      },
      include: {
        company: true,
        fineTuningConfig: true,
        hyperparameterConfig: true,
        primaryDataset: true,
        secondaryDataset: true,
        validationDataset: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      strategyId,
      companyId,
      'UPDATED',
      userId,
      existingStrategy,
      updatedStrategy,
    );

    this.logger.log(`Training strategy updated successfully: ${strategyId}`);
    return updatedStrategy;
  }

  /**
   * Get a training strategy by ID
   */
  async getStrategy(companyId: string, strategyId: string) {
    const strategy = await this.prisma.trainingStrategy.findFirst({
      where: { id: strategyId, companyId },
      include: {
        company: true,
        fineTuningConfig: true,
        hyperparameterConfig: true,
        primaryDataset: true,
        secondaryDataset: true,
        validationDataset: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!strategy) {
      throw new NotFoundException('Training strategy not found');
    }

    return strategy;
  }

  /**
   * List all training strategies for a company
   */
  async listStrategies(
    companyId: string,
    page: number = 1,
    limit: number = 20,
    status?: TrainingStrategyStatus,
    strategyType?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (status) {
      where.status = status;
    }
    if (strategyType) {
      where.strategyType = strategyType;
    }

    const [strategies, total] = await Promise.all([
      this.prisma.trainingStrategy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fineTuningConfig: {
            select: { id: true, name: true },
          },
          hyperparameterConfig: {
            select: { id: true, name: true },
          },
          primaryDataset: {
            select: { id: true, name: true, recordCount: true },
          },
          secondaryDataset: {
            select: { id: true, name: true, recordCount: true },
          },
          validationDataset: {
            select: { id: true, name: true, recordCount: true },
          },
        },
      }),
      this.prisma.trainingStrategy.count({ where }),
    ]);

    return {
      data: strategies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete a training strategy
   */
  async deleteStrategy(companyId: string, strategyId: string, userId: string) {
    const strategy = await this.prisma.trainingStrategy.findFirst({
      where: { id: strategyId, companyId },
    });

    if (!strategy) {
      throw new NotFoundException('Training strategy not found');
    }

    // Create audit log before deletion
    await this.createAuditLog(
      strategyId,
      companyId,
      'DELETED',
      userId,
      strategy,
      null,
    );

    await this.prisma.trainingStrategy.delete({
      where: { id: strategyId },
    });

    this.logger.log(`Training strategy deleted: ${strategyId}`);
    return { message: 'Training strategy deleted successfully' };
  }

  /**
   * Validate a training strategy
   */
  async validateStrategy(companyId: string, strategyId: string, userId: string) {
    const strategy = await this.prisma.trainingStrategy.findFirst({
      where: { id: strategyId, companyId },
      include: {
        fineTuningConfig: true,
        hyperparameterConfig: true,
        primaryDataset: true,
        validationDataset: true,
      },
    });

    if (!strategy) {
      throw new NotFoundException('Training strategy not found');
    }

    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      checks: {
        hasStrategyType: !!strategy.strategyType,
        hasPrimaryObjective: !!strategy.primaryObjective,
        hasPrimaryDataset: !!strategy.primaryDatasetId,
        hasFineTuningConfig: !!strategy.fineTuningConfigId,
        hasHyperparameterConfig: !!strategy.hyperparameterConfigId,
        hasValidationDataset: !!strategy.validationDatasetId,
        hasLossFunction: !!strategy.lossFunction,
        hasEvaluationStrategy: strategy.evaluationInterval > 0,
      },
    };

    // Required field validations
    if (!strategy.strategyType) {
      validationResult.errors.push('Strategy type is required');
      validationResult.isValid = false;
    }

    if (!strategy.primaryObjective) {
      validationResult.errors.push('Primary objective is required');
      validationResult.isValid = false;
    }

    if (!strategy.primaryDatasetId) {
      validationResult.errors.push('Primary dataset must be assigned');
      validationResult.isValid = false;
    }

    if (!strategy.fineTuningConfigId) {
      validationResult.warnings.push(
        'Fine-tuning configuration is not assigned',
      );
    }

    if (!strategy.hyperparameterConfigId) {
      validationResult.warnings.push(
        'Hyperparameter configuration is not assigned',
      );
    }

    if (!strategy.validationDatasetId) {
      validationResult.warnings.push('Validation dataset is not assigned');
    }

    // Multi-stage validation
    if (strategy.pipelineType === 'MULTI_STAGE') {
      if (!strategy.stageOrder) {
        validationResult.errors.push(
          'Stage order is required for multi-stage pipeline',
        );
        validationResult.isValid = false;
      }

      if (!strategy.datasetAssignment) {
        validationResult.warnings.push(
          'Dataset assignment recommended for multi-stage pipeline',
        );
      }
    }

    // Dataset mixing validation
    if (strategy.secondaryDatasetId && !strategy.datasetMixingRatio) {
      validationResult.warnings.push(
        'Dataset mixing ratio not set for secondary dataset',
      );
    }

    // Update strategy with validation result
    const updatedStrategy = await this.prisma.trainingStrategy.update({
      where: { id: strategyId },
      data: {
        validationResult,
        isValidated: validationResult.isValid,
        validatedAt: new Date(),
        status: validationResult.isValid
          ? TrainingStrategyStatus.VALIDATED
          : strategy.status,
        updatedBy: userId,
      },
    });

    // Create audit log
    await this.createAuditLog(
      strategyId,
      companyId,
      'VALIDATED',
      userId,
      strategy,
      updatedStrategy,
    );

    return {
      strategy: updatedStrategy,
      validation: validationResult,
    };
  }

  /**
   * Get strategy statistics
   */
  async getStrategyStatistics(companyId: string) {
    const [total, byStatus, byType, validated] = await Promise.all([
      this.prisma.trainingStrategy.count({ where: { companyId } }),
      this.prisma.trainingStrategy.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.trainingStrategy.groupBy({
        by: ['strategyType'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.trainingStrategy.count({
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
      byType: byType.reduce((acc, item) => {
        acc[item.strategyType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Validate referenced entities exist
   */
  private async validateReferences(companyId: string, dto: any) {
    // Validate fine-tuning config
    if (dto.fineTuningConfigId) {
      const config = await this.prisma.fineTuningConfiguration.findFirst({
        where: { id: dto.fineTuningConfigId, companyId },
      });
      if (!config) {
        throw new BadRequestException('Fine-tuning configuration not found');
      }
    }

    // Validate hyperparameter config
    if (dto.hyperparameterConfigId) {
      const config = await this.prisma.hyperparameterConfiguration.findFirst({
        where: { id: dto.hyperparameterConfigId, companyId },
      });
      if (!config) {
        throw new BadRequestException('Hyperparameter configuration not found');
      }
    }

    // Validate primary dataset
    if (dto.primaryDatasetId) {
      const dataset = await this.prisma.trainingDataset.findFirst({
        where: { id: dto.primaryDatasetId, companyId },
      });
      if (!dataset) {
        throw new BadRequestException('Primary dataset not found');
      }
    }

    // Validate secondary dataset
    if (dto.secondaryDatasetId) {
      const dataset = await this.prisma.trainingDataset.findFirst({
        where: { id: dto.secondaryDatasetId, companyId },
      });
      if (!dataset) {
        throw new BadRequestException('Secondary dataset not found');
      }
    }

    // Validate validation dataset
    if (dto.validationDatasetId) {
      const dataset = await this.prisma.trainingDataset.findFirst({
        where: { id: dto.validationDatasetId, companyId },
      });
      if (!dataset) {
        throw new BadRequestException('Validation dataset not found');
      }
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    strategyId: string,
    companyId: string,
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'VALIDATED' | 'STATUS_CHANGED' | 'DATASET_ASSIGNED' | 'OBJECTIVE_UPDATED' | 'EVALUATION_CONFIGURED',
    userId: string,
    oldValues: any,
    newValues: any,
  ) {
    try {
      await this.prisma.trainingStrategyAuditLog.create({
        data: {
          strategyId,
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
