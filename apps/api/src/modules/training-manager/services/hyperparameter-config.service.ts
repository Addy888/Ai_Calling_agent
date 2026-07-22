import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateHyperparameterConfigDto,
  UpdateHyperparameterConfigDto,
  HyperparameterConfigResponseDto,
  HyperparameterConfigListResponseDto,
  ResourceEstimationDto,
  ValidationResultDto,
  TrainingProfile,
  OptimizerType,
  LRSchedulerType,
  HyperparameterConfigStatus,
  ApplyPresetDto,
} from '../dto/hyperparameter-config.dto';
import { PrecisionType } from '../dto/fine-tuning-config.dto';

@Injectable()
export class HyperparameterConfigService {
  private readonly logger = new Logger(HyperparameterConfigService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get preset configurations
   */
  private getPresetConfig(preset: TrainingProfile): Partial<CreateHyperparameterConfigDto> {
    const presets: Record<TrainingProfile, Partial<CreateHyperparameterConfigDto>> = {
      [TrainingProfile.FAST_TRAINING]: {
        epochs: 1,
        batchSize: 16,
        gradientAccumulationSteps: 1,
        learningRate: 0.0003,
        weightDecay: 0.0,
        warmupSteps: 50,
        maxSequenceLength: 256,
        optimizer: OptimizerType.ADAMW,
        scheduler: LRSchedulerType.LINEAR,
        precision: 'FP16',
        gradientCheckpointing: false,
        flashAttention: true,
        mixedPrecision: true,
        saveEveryNSteps: 1000,
        maximumCheckpoints: 1,
        loggingFrequency: 50,
        evaluationFrequency: 500,
      },
      [TrainingProfile.BALANCED]: {
        epochs: 3,
        batchSize: 8,
        gradientAccumulationSteps: 2,
        learningRate: 0.0002,
        weightDecay: 0.01,
        warmupSteps: 100,
        maxSequenceLength: 512,
        optimizer: OptimizerType.ADAMW,
        scheduler: LRSchedulerType.COSINE,
        precision: 'FP32',
        gradientCheckpointing: true,
        flashAttention: false,
        mixedPrecision: false,
        saveEveryNSteps: 500,
        maximumCheckpoints: 3,
        loggingFrequency: 10,
        evaluationFrequency: 100,
      },
      [TrainingProfile.HIGH_ACCURACY]: {
        epochs: 10,
        batchSize: 4,
        gradientAccumulationSteps: 4,
        learningRate: 0.00005,
        weightDecay: 0.01,
        warmupSteps: 500,
        maxSequenceLength: 1024,
        optimizer: OptimizerType.ADAMW,
        scheduler: LRSchedulerType.COSINE_WITH_RESTARTS,
        precision: 'FP32',
        gradientCheckpointing: true,
        flashAttention: false,
        mixedPrecision: false,
        earlyStoppingEnabled: true,
        earlyStoppingPatience: 5,
        saveEveryNSteps: 250,
        maximumCheckpoints: 5,
        saveBestModelOnly: true,
        loggingFrequency: 5,
        evaluationFrequency: 50,
      },
      [TrainingProfile.LOW_MEMORY]: {
        epochs: 3,
        batchSize: 2,
        gradientAccumulationSteps: 8,
        learningRate: 0.0001,
        weightDecay: 0.01,
        warmupSteps: 100,
        maxSequenceLength: 256,
        optimizer: OptimizerType.ADAFACTOR,
        scheduler: LRSchedulerType.LINEAR,
        precision: 'INT8',
        gradientCheckpointing: true,
        flashAttention: true,
        cpuOffloading: true,
        mixedPrecision: true,
        activationCheckpointing: true,
        saveEveryNSteps: 500,
        maximumCheckpoints: 2,
        loggingFrequency: 20,
        evaluationFrequency: 200,
      },
      [TrainingProfile.PRODUCTION]: {
        epochs: 5,
        batchSize: 8,
        gradientAccumulationSteps: 2,
        learningRate: 0.0001,
        weightDecay: 0.01,
        warmupSteps: 200,
        maxSequenceLength: 512,
        optimizer: OptimizerType.ADAMW,
        scheduler: LRSchedulerType.COSINE,
        precision: 'BF16',
        gradientCheckpointing: true,
        flashAttention: true,
        mixedPrecision: true,
        earlyStoppingEnabled: true,
        earlyStoppingPatience: 3,
        saveEveryNSteps: 500,
        maximumCheckpoints: 3,
        saveBestModelOnly: false,
        saveLastCheckpoint: true,
        loggingFrequency: 10,
        evaluationFrequency: 100,
        tensorboardEnabled: true,
      },
      [TrainingProfile.CUSTOM]: {},
    };

    return presets[preset] || {};
  }

  /**
   * Create a new hyperparameter configuration
   */
  async createConfiguration(
    companyId: string,
    userId: string,
    dto: CreateHyperparameterConfigDto,
  ): Promise<HyperparameterConfigResponseDto> {
    this.logger.log(`Creating hyperparameter configuration for company: ${companyId}`);

    // Validate fine-tuning config if provided
    if (dto.fineTuningConfigId) {
      const ftConfig = await this.prisma.fineTuningConfiguration.findFirst({
        where: { id: dto.fineTuningConfigId, companyId },
      });
      if (!ftConfig) {
        throw new NotFoundException(
          `Fine-tuning configuration with ID ${dto.fineTuningConfigId} not found`,
        );
      }
    }

    // Apply preset if specified
    let configData = { ...dto };
    if (dto.trainingProfile && dto.trainingProfile !== TrainingProfile.CUSTOM) {
      const presetData = this.getPresetConfig(dto.trainingProfile);
      configData = { ...presetData, ...dto, preset: dto.trainingProfile };
    }

    const configuration = await this.prisma.hyperparameterConfiguration.create({
      data: {
        companyId,
        fineTuningConfigId: configData.fineTuningConfigId,
        name: configData.name,
        description: configData.description,
        trainingProfile: configData.trainingProfile || TrainingProfile.BALANCED,
        epochs: configData.epochs || 3,
        batchSize: configData.batchSize || 8,
        microBatchSize: configData.microBatchSize,
        gradientAccumulationSteps: configData.gradientAccumulationSteps || 1,
        learningRate: configData.learningRate || 0.0002,
        weightDecay: configData.weightDecay || 0.01,
        warmupRatio: configData.warmupRatio,
        warmupSteps: configData.warmupSteps,
        maxSteps: configData.maxSteps,
        maxSequenceLength: configData.maxSequenceLength || 512,
        randomSeed: configData.randomSeed || 42,
        gradientClipping: configData.gradientClipping || 1.0,
        optimizer: configData.optimizer || OptimizerType.ADAMW,
        optimizerConfig: configData.optimizerConfig as any,
        scheduler: configData.scheduler || LRSchedulerType.LINEAR,
        schedulerConfig: configData.schedulerConfig as any,
        precision: (configData.precision as PrecisionType) || PrecisionType.FP32,
        gradientCheckpointing: configData.gradientCheckpointing || false,
        flashAttention: configData.flashAttention || false,
        cpuOffloading: configData.cpuOffloading || false,
        mixedPrecision: configData.mixedPrecision || false,
        activationCheckpointing: configData.activationCheckpointing || false,
        earlyStoppingEnabled: configData.earlyStoppingEnabled || false,
        earlyStoppingPatience: configData.earlyStoppingPatience,
        earlyStoppingMinDelta: configData.earlyStoppingMinDelta,
        restoreBestModel: configData.restoreBestModel !== undefined ? configData.restoreBestModel : true,
        saveEveryNSteps: configData.saveEveryNSteps,
        maximumCheckpoints: configData.maximumCheckpoints || 3,
        saveBestModelOnly: configData.saveBestModelOnly || false,
        saveLastCheckpoint: configData.saveLastCheckpoint !== undefined ? configData.saveLastCheckpoint : true,
        autoCleanup: configData.autoCleanup !== undefined ? configData.autoCleanup : true,
        loggingFrequency: configData.loggingFrequency || 10,
        evaluationFrequency: configData.evaluationFrequency || 100,
        checkpointFrequency: configData.checkpointFrequency || 500,
        tensorboardEnabled: configData.tensorboardEnabled || false,
        csvLogging: configData.csvLogging !== undefined ? configData.csvLogging : true,
        jsonLogging: configData.jsonLogging !== undefined ? configData.jsonLogging : true,
        loggingConfig: configData.loggingConfig as any,
        preset: configData.preset,
        status: HyperparameterConfigStatus.DRAFT,
        version: configData.version || '1.0.0',
        tags: configData.tags as any,
        metadata: configData.metadata as any,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Calculate resource estimates
    const estimates = this.estimateResources(configuration);
    await this.prisma.hyperparameterConfiguration.update({
      where: { id: configuration.id },
      data: {
        estimatedTrainingTime: estimates.estimatedTrainingTime,
        estimatedGpuMemory: estimates.estimatedGpuMemory,
        estimatedRamUsage: estimates.estimatedRamUsage,
        estimatedCheckpointSize: estimates.estimatedCheckpointSize,
        estimatedStorageRequired: estimates.estimatedStorageRequired,
      },
    });

    await this.createAuditLog(configuration.id, companyId, 'CREATED', userId, null, configuration);

    this.logger.log(`Hyperparameter configuration created: ${configuration.id}`);
    return this.mapToResponseDto({ ...configuration, ...estimates });
  }

  /**
   * Update configuration
   */
  async updateConfiguration(
    configurationId: string,
    companyId: string,
    userId: string,
    dto: UpdateHyperparameterConfigDto,
  ): Promise<HyperparameterConfigResponseDto> {
    const existing = await this.prisma.hyperparameterConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    // Build update data object with proper typing
    const updateData: any = {
      updatedBy: userId,
    };

    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.fineTuningConfigId !== undefined) updateData.fineTuningConfigId = dto.fineTuningConfigId;
    if (dto.trainingProfile) updateData.trainingProfile = dto.trainingProfile;
    if (dto.epochs !== undefined) updateData.epochs = dto.epochs;
    if (dto.batchSize !== undefined) updateData.batchSize = dto.batchSize;
    if (dto.microBatchSize !== undefined) updateData.microBatchSize = dto.microBatchSize;
    if (dto.gradientAccumulationSteps !== undefined) updateData.gradientAccumulationSteps = dto.gradientAccumulationSteps;
    if (dto.learningRate !== undefined) updateData.learningRate = dto.learningRate;
    if (dto.weightDecay !== undefined) updateData.weightDecay = dto.weightDecay;
    if (dto.warmupRatio !== undefined) updateData.warmupRatio = dto.warmupRatio;
    if (dto.warmupSteps !== undefined) updateData.warmupSteps = dto.warmupSteps;
    if (dto.maxSteps !== undefined) updateData.maxSteps = dto.maxSteps;
    if (dto.maxSequenceLength !== undefined) updateData.maxSequenceLength = dto.maxSequenceLength;
    if (dto.randomSeed !== undefined) updateData.randomSeed = dto.randomSeed;
    if (dto.gradientClipping !== undefined) updateData.gradientClipping = dto.gradientClipping;
    if (dto.optimizer) updateData.optimizer = dto.optimizer;
    if (dto.optimizerConfig !== undefined) updateData.optimizerConfig = dto.optimizerConfig;
    if (dto.scheduler) updateData.scheduler = dto.scheduler;
    if (dto.schedulerConfig !== undefined) updateData.schedulerConfig = dto.schedulerConfig;
    if (dto.precision) updateData.precision = dto.precision;
    if (dto.gradientCheckpointing !== undefined) updateData.gradientCheckpointing = dto.gradientCheckpointing;
    if (dto.flashAttention !== undefined) updateData.flashAttention = dto.flashAttention;
    if (dto.cpuOffloading !== undefined) updateData.cpuOffloading = dto.cpuOffloading;
    if (dto.mixedPrecision !== undefined) updateData.mixedPrecision = dto.mixedPrecision;
    if (dto.activationCheckpointing !== undefined) updateData.activationCheckpointing = dto.activationCheckpointing;
    if (dto.earlyStoppingEnabled !== undefined) updateData.earlyStoppingEnabled = dto.earlyStoppingEnabled;
    if (dto.earlyStoppingPatience !== undefined) updateData.earlyStoppingPatience = dto.earlyStoppingPatience;
    if (dto.earlyStoppingMinDelta !== undefined) updateData.earlyStoppingMinDelta = dto.earlyStoppingMinDelta;
    if (dto.restoreBestModel !== undefined) updateData.restoreBestModel = dto.restoreBestModel;
    if (dto.saveEveryNSteps !== undefined) updateData.saveEveryNSteps = dto.saveEveryNSteps;
    if (dto.maximumCheckpoints !== undefined) updateData.maximumCheckpoints = dto.maximumCheckpoints;
    if (dto.saveBestModelOnly !== undefined) updateData.saveBestModelOnly = dto.saveBestModelOnly;
    if (dto.saveLastCheckpoint !== undefined) updateData.saveLastCheckpoint = dto.saveLastCheckpoint;
    if (dto.autoCleanup !== undefined) updateData.autoCleanup = dto.autoCleanup;
    if (dto.loggingFrequency !== undefined) updateData.loggingFrequency = dto.loggingFrequency;
    if (dto.evaluationFrequency !== undefined) updateData.evaluationFrequency = dto.evaluationFrequency;
    if (dto.checkpointFrequency !== undefined) updateData.checkpointFrequency = dto.checkpointFrequency;
    if (dto.tensorboardEnabled !== undefined) updateData.tensorboardEnabled = dto.tensorboardEnabled;
    if (dto.csvLogging !== undefined) updateData.csvLogging = dto.csvLogging;
    if (dto.jsonLogging !== undefined) updateData.jsonLogging = dto.jsonLogging;
    if (dto.loggingConfig !== undefined) updateData.loggingConfig = dto.loggingConfig;
    if (dto.status) updateData.status = dto.status;
    if (dto.preset !== undefined) updateData.preset = dto.preset;
    if (dto.version) updateData.version = dto.version;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    const updated = await this.prisma.hyperparameterConfiguration.update({
      where: { id: configurationId },
      data: updateData,
    });

    // Recalculate estimates
    const estimates = this.estimateResources(updated);
    await this.prisma.hyperparameterConfiguration.update({
      where: { id: configurationId },
      data: { ...estimates },
    });

    await this.createAuditLog(configurationId, companyId, 'UPDATED', userId, existing, updated);
    return this.mapToResponseDto({ ...updated, ...estimates });
  }

  /**
   * Get configuration by ID
   */
  async getConfiguration(configurationId: string, companyId: string): Promise<HyperparameterConfigResponseDto> {
    const configuration = await this.prisma.hyperparameterConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!configuration) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    return this.mapToResponseDto(configuration);
  }

  /**
   * List configurations with pagination and filters
   */
  async listConfigurations(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      trainingProfile?: TrainingProfile;
      status?: HyperparameterConfigStatus;
      fineTuningConfigId?: string;
      search?: string;
    },
  ): Promise<HyperparameterConfigListResponseDto> {
    const skip = (page - 1) * pageSize;
    const where: any = { companyId };

    if (filters?.trainingProfile) where.trainingProfile = filters.trainingProfile;
    if (filters?.status) where.status = filters.status;
    if (filters?.fineTuningConfigId) where.fineTuningConfigId = filters.fineTuningConfigId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [configurations, total] = await Promise.all([
      this.prisma.hyperparameterConfiguration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.hyperparameterConfiguration.count({ where }),
    ]);

    return {
      configurations: configurations.map((c) => this.mapToResponseDto(c)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(configurationId: string, companyId: string, userId: string): Promise<void> {
    const existing = await this.prisma.hyperparameterConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    await this.createAuditLog(configurationId, companyId, 'DELETED', userId, existing, null);
    await this.prisma.hyperparameterConfiguration.delete({ where: { id: configurationId } });
  }

  /**
   * Apply preset to configuration
   */
  async applyPreset(
    configurationId: string,
    companyId: string,
    userId: string,
    presetDto: ApplyPresetDto,
  ): Promise<HyperparameterConfigResponseDto> {
    const configuration = await this.prisma.hyperparameterConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!configuration) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    const presetData = this.getPresetConfig(presetDto.preset);
    const updateData: any = {
      ...presetData,
      trainingProfile: presetDto.preset,
      preset: presetDto.preset,
      updatedBy: userId,
    };

    const updated = await this.prisma.hyperparameterConfiguration.update({
      where: { id: configurationId },
      data: updateData,
    });

    const estimates = this.estimateResources(updated);
    await this.prisma.hyperparameterConfiguration.update({
      where: { id: configurationId },
      data: estimates as any,
    });

    await this.createAuditLog(configurationId, companyId, 'PRESET_APPLIED', userId, configuration, updated);
    return this.mapToResponseDto({ ...updated, ...estimates });
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(
    configurationId: string,
    companyId: string,
    userId: string,
  ): Promise<ValidationResultDto> {
    const configuration = await this.prisma.hyperparameterConfiguration.findFirst({
      where: { id: configurationId, companyId },
    });

    if (!configuration) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Learning rate validation
    const learningRateValid = this.validateLearningRate(configuration, errors, warnings);

    // Epoch range validation
    const epochRangeValid = this.validateEpochRange(configuration, errors, warnings);

    // Batch size validation
    const batchSizeValid = this.validateBatchSize(configuration, errors, warnings);

    // Sequence length validation
    const sequenceLengthValid = this.validateSequenceLength(configuration, errors, warnings);

    // Optimizer compatibility
    const optimizerCompatible = this.validateOptimizer(configuration, warnings, recommendations);

    // Scheduler compatibility
    const schedulerCompatible = this.validateScheduler(configuration, warnings, recommendations);

    // Precision compatibility
    const precisionCompatible = this.validatePrecision(configuration, warnings, recommendations);

    const isValid =
      learningRateValid &&
      epochRangeValid &&
      batchSizeValid &&
      sequenceLengthValid &&
      optimizerCompatible &&
      schedulerCompatible &&
      precisionCompatible &&
      errors.length === 0;

    const validationResult = {
      configurationId,
      isValid,
      learningRateValid,
      epochRangeValid,
      batchSizeValid,
      sequenceLengthValid,
      optimizerCompatible,
      schedulerCompatible,
      precisionCompatible,
      errors,
      warnings,
      recommendations,
      validatedAt: new Date(),
    };

    await this.prisma.hyperparameterConfiguration.update({
      where: { id: configurationId },
      data: {
        isValidated: isValid,
        validatedAt: new Date(),
        validationResult: validationResult as any,
        status: isValid ? HyperparameterConfigStatus.VALIDATED : HyperparameterConfigStatus.DRAFT,
      },
    });

    await this.createAuditLog(configurationId, companyId, 'VALIDATED', userId, null, { validationResult });
    return validationResult;
  }

  /**
   * Estimate training resources
   */
  private estimateResources(config: any): ResourceEstimationDto {
    // Simple estimation formulas (no actual hardware detection)
    const epochs = config.epochs || 3;
    const batchSize = config.batchSize || 8;
    const seqLength = config.maxSequenceLength || 512;
    const gradAccumSteps = config.gradientAccumulationSteps || 1;

    // Estimate based on common patterns
    const samplesPerEpoch = 10000; // Assumed average dataset size
    const stepsPerEpoch = Math.ceil(samplesPerEpoch / (batchSize * gradAccumSteps));
    const totalSteps = stepsPerEpoch * epochs;

    // Training time estimation (seconds per step varies by model size)
    const secondsPerStep = 0.5; // Average estimate
    const estimatedTrainingTime = Math.round(totalSteps * secondsPerStep);

    // GPU memory estimation (GB) - rough formula
    const baseMemory = 2;
    const batchMemory = (batchSize * seqLength * 0.000001); // Simplified
    const precisionMultiplier = config.precision === 'FP16' || config.precision === 'BF16' ? 0.5 : 1;
    const estimatedGpuMemory = Math.round((baseMemory + batchMemory) * precisionMultiplier * 100) / 100;

    // RAM estimation
    const estimatedRamUsage = Math.round(estimatedGpuMemory * 1.5 * 100) / 100;

    // Checkpoint size estimation (GB)
    const modelSizeGB = 1.5; // Assumed average model size
    const estimatedCheckpointSize = Math.round(modelSizeGB * 100) / 100;

    // Storage requirement (checkpoints * max checkpoints)
    const maxCheckpoints = config.maximumCheckpoints || 3;
    const estimatedStorageRequired = Math.round(estimatedCheckpointSize * maxCheckpoints * 100) / 100;

    return {
      estimatedTrainingTime,
      estimatedGpuMemory,
      estimatedRamUsage,
      estimatedCheckpointSize,
      estimatedStorageRequired,
      method: 'formula-based-estimation',
      details: {
        totalSteps,
        stepsPerEpoch,
        samplesPerEpoch,
        secondsPerStep,
      },
    };
  }

  /**
   * Validation methods
   */
  private validateLearningRate(config: any, errors: string[], warnings: string[]): boolean {
    const lr = config.learningRate;
    if (lr <= 0) {
      errors.push('Learning rate must be positive');
      return false;
    }
    if (lr > 0.01) {
      warnings.push('Learning rate is very high and may cause training instability');
    }
    if (lr < 0.00001) {
      warnings.push('Learning rate is very low and may result in slow convergence');
    }
    return true;
  }

  private validateEpochRange(config: any, errors: string[], warnings: string[]): boolean {
    const epochs = config.epochs;
    if (epochs < 1) {
      errors.push('Epochs must be at least 1');
      return false;
    }
    if (epochs > 50) {
      warnings.push('Training for more than 50 epochs may lead to overfitting');
    }
    return true;
  }

  private validateBatchSize(config: any, errors: string[], warnings: string[]): boolean {
    const batchSize = config.batchSize;
    if (batchSize < 1) {
      errors.push('Batch size must be at least 1');
      return false;
    }
    if (batchSize > 128) {
      warnings.push('Very large batch size may require significant memory');
    }
    return true;
  }

  private validateSequenceLength(config: any, errors: string[], warnings: string[]): boolean {
    const seqLen = config.maxSequenceLength;
    if (seqLen < 1) {
      errors.push('Sequence length must be at least 1');
      return false;
    }
    if (seqLen > 4096) {
      warnings.push('Very long sequences require significant memory');
    }
    return true;
  }

  private validateOptimizer(config: any, warnings: string[], recommendations: string[]): boolean {
    if (config.optimizer === 'ADAFACTOR' && config.precision === 'FP32') {
      recommendations.push('Adafactor works best with mixed precision training');
    }
    if (config.optimizer === 'SGD' && !config.gradientClipping) {
      recommendations.push('Consider enabling gradient clipping with SGD optimizer');
    }
    return true;
  }

  private validateScheduler(config: any, warnings: string[], recommendations: string[]): boolean {
    if (config.scheduler === 'REDUCE_ON_PLATEAU' && !config.earlyStoppingEnabled) {
      recommendations.push('Consider enabling early stopping with ReduceOnPlateau scheduler');
    }
    if (config.scheduler !== 'CONSTANT' && !config.warmupSteps && !config.warmupRatio) {
      recommendations.push('Consider adding warmup steps for better training stability');
    }
    return true;
  }

  private validatePrecision(config: any, warnings: string[], recommendations: string[]): boolean {
    if ((config.precision === 'INT8' || config.precision === 'INT4') && !config.gradientCheckpointing) {
      recommendations.push('Enable gradient checkpointing to reduce memory usage with quantized precision');
    }
    if (config.precision === 'FP16' && !config.mixedPrecision) {
      recommendations.push('Enable mixed precision for better FP16 training stability');
    }
    return true;
  }

  /**
   * Create audit log
   */
  private async createAuditLog(
    configurationId: string,
    companyId: string,
    action: string,
    performedBy: string,
    oldValues: any,
    newValues: any,
  ): Promise<void> {
    try {
      await this.prisma.hyperparameterConfigAuditLog.create({
        data: {
          configurationId,
          companyId,
          action: action as any,
          performedBy,
          oldValues: oldValues as any,
          newValues: newValues as any,
          changes: this.calculateChanges(oldValues, newValues) as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate changes
   */
  private calculateChanges(oldValues: any, newValues: any): Record<string, any> {
    if (!oldValues || !newValues) return {};
    const changes: Record<string, any> = {};
    for (const key of Object.keys(newValues)) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = { old: oldValues[key], new: newValues[key] };
      }
    }
    return changes;
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(config: any): HyperparameterConfigResponseDto {
    return {
      id: config.id,
      companyId: config.companyId,
      fineTuningConfigId: config.fineTuningConfigId,
      name: config.name,
      description: config.description,
      trainingProfile: config.trainingProfile,
      epochs: config.epochs,
      batchSize: config.batchSize,
      microBatchSize: config.microBatchSize,
      gradientAccumulationSteps: config.gradientAccumulationSteps,
      learningRate: config.learningRate,
      weightDecay: config.weightDecay,
      warmupRatio: config.warmupRatio,
      warmupSteps: config.warmupSteps,
      maxSteps: config.maxSteps,
      maxSequenceLength: config.maxSequenceLength,
      randomSeed: config.randomSeed,
      gradientClipping: config.gradientClipping,
      optimizer: config.optimizer,
      optimizerConfig: config.optimizerConfig,
      scheduler: config.scheduler,
      schedulerConfig: config.schedulerConfig,
      precision: config.precision,
      gradientCheckpointing: config.gradientCheckpointing,
      flashAttention: config.flashAttention,
      cpuOffloading: config.cpuOffloading,
      mixedPrecision: config.mixedPrecision,
      activationCheckpointing: config.activationCheckpointing,
      earlyStoppingEnabled: config.earlyStoppingEnabled,
      earlyStoppingPatience: config.earlyStoppingPatience,
      earlyStoppingMinDelta: config.earlyStoppingMinDelta,
      restoreBestModel: config.restoreBestModel,
      saveEveryNSteps: config.saveEveryNSteps,
      maximumCheckpoints: config.maximumCheckpoints,
      saveBestModelOnly: config.saveBestModelOnly,
      saveLastCheckpoint: config.saveLastCheckpoint,
      autoCleanup: config.autoCleanup,
      loggingFrequency: config.loggingFrequency,
      evaluationFrequency: config.evaluationFrequency,
      checkpointFrequency: config.checkpointFrequency,
      tensorboardEnabled: config.tensorboardEnabled,
      csvLogging: config.csvLogging,
      jsonLogging: config.jsonLogging,
      loggingConfig: config.loggingConfig,
      estimatedTrainingTime: config.estimatedTrainingTime,
      estimatedGpuMemory: config.estimatedGpuMemory,
      estimatedRamUsage: config.estimatedRamUsage,
      estimatedCheckpointSize: config.estimatedCheckpointSize,
      estimatedStorageRequired: config.estimatedStorageRequired,
      preset: config.preset,
      status: config.status,
      version: config.version,
      tags: config.tags,
      validationResult: config.validationResult,
      isValidated: config.isValidated,
      validatedAt: config.validatedAt,
      metadata: config.metadata,
      createdBy: config.createdBy,
      updatedBy: config.updatedBy,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
