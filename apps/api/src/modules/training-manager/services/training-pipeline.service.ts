import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateTrainingPipelineDto,
  UpdateTrainingPipelineDto,
  PrepareTrainingSessionDto,
  EstimateResourcesDto,
  GenerateCheckpointPlanDto,
  QueuePipelineDto,
  ResourceEstimationDto,
  CheckpointPlanDto,
  RetryPolicyDto,
  TrainingPipelineStage,
  TrainingPipelineStatus,
  TrainingQueueStatus,
  PipelineValidationResponseDto,
  PipelineSummaryResponseDto,
  TrainingSessionResponseDto,
} from '../dto/training-pipeline.dto';

@Injectable()
export class TrainingPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create audit log for pipeline operations
   */
  private async createAuditLog(
    companyId: string,
    userId: string,
    action: string,
    entityId: string,
    details?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          entityType: 'TRAINING_PIPELINE',
          entityId,
          action,
          newValues: details,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Create a new training pipeline
   */
  async createPipeline(
    companyId: string,
    userId: string,
    dto: CreateTrainingPipelineDto,
  ) {
    // Validate training session exists
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: dto.trainingSessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Validate dataset exists
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: dto.datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Validate model registry exists
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: dto.modelRegistryId, companyId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // Generate unique pipeline identifier
    const pipelineIdentifier = `pipeline-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create pipeline
    const pipeline = await this.prisma.trainingPipeline.create({
      data: {
        companyId,
        workspaceId: dto.workspaceId,
        trainingSessionId: dto.trainingSessionId,
        pipelineName: dto.pipelineName,
        pipelineIdentifier,
        pipelineStage: TrainingPipelineStage.PENDING,
        pipelineStatus: TrainingPipelineStatus.PENDING,
        datasetId: dto.datasetId,
        modelRegistryId: dto.modelRegistryId,
        trainingConfigurationId: dto.trainingConfigurationId,
        executionProvider: dto.executionProvider,
        storageProvider: dto.storageProvider,
        queueStatus: TrainingQueueStatus.PENDING,
        metadata: dto.metadata || {},
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        session: true,
        stages: true,
      },
    });

    // Create initial stage log
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId: pipeline.id,
        stage: TrainingPipelineStage.PENDING,
        status: 'PENDING',
        message: 'Pipeline created',
      },
    });

    // Create session log
    await this.prisma.trainingSessionLog.create({
      data: {
        sessionId: dto.trainingSessionId,
        logLevel: 'INFO',
        logType: 'PIPELINE_CREATED',
        message: `Pipeline ${dto.pipelineName} created`,
        details: { pipelineId: pipeline.id },
      },
    });

    // Create audit log
    await this.createAuditLog(
      companyId,
      userId,
      'PIPELINE_CREATED',
      pipeline.id,
      {
        pipelineName: dto.pipelineName,
        trainingSessionId: dto.trainingSessionId,
        datasetId: dto.datasetId,
        modelRegistryId: dto.modelRegistryId,
      },
    );

    return pipeline;
  }

  /**
   * Get pipeline by ID
   */
  async getPipelineById(companyId: string, pipelineId: string) {
    const pipeline = await this.prisma.trainingPipeline.findFirst({
      where: { id: pipelineId, companyId },
      include: {
        session: true,
        stages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return pipeline;
  }

  /**
   * Get all pipelines
   */
  async getPipelines(companyId: string, filters?: {
    sessionId?: string;
    status?: TrainingPipelineStatus;
    stage?: TrainingPipelineStage;
  }) {
    const where: any = { companyId };

    if (filters?.sessionId) {
      where.trainingSessionId = filters.sessionId;
    }

    if (filters?.status) {
      where.pipelineStatus = filters.status;
    }

    if (filters?.stage) {
      where.pipelineStage = filters.stage;
    }

    return this.prisma.trainingPipeline.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            sessionName: true,
            sessionIdentifier: true,
            status: true,
          },
        },
        stages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update pipeline
   */
  async updatePipeline(
    companyId: string,
    pipelineId: string,
    userId: string,
    dto: UpdateTrainingPipelineDto,
  ) {
    const pipeline = await this.getPipelineById(companyId, pipelineId);

    const updatedPipeline = await this.prisma.trainingPipeline.update({
      where: { id: pipelineId },
      data: {
        ...dto,
        resourceEstimation: dto.resourceEstimation ? JSON.parse(JSON.stringify(dto.resourceEstimation)) : undefined,
        checkpointPlan: dto.checkpointPlan ? JSON.parse(JSON.stringify(dto.checkpointPlan)) : undefined,
        retryPolicy: dto.retryPolicy ? JSON.parse(JSON.stringify(dto.retryPolicy)) : undefined,
        updatedBy: userId,
      },
      include: {
        session: true,
        stages: true,
      },
    });

    // Create audit log
    await this.createAuditLog(
      companyId,
      userId,
      'PIPELINE_UPDATED',
      pipelineId,
      dto,
    );

    return updatedPipeline;
  }

  /**
   * Delete pipeline
   */
  async deletePipeline(companyId: string, pipelineId: string, userId?: string) {
    const pipeline = await this.getPipelineById(companyId, pipelineId);

    await this.prisma.trainingPipeline.delete({
      where: { id: pipelineId },
    });

    // Create audit log if userId provided
    if (userId) {
      await this.createAuditLog(
        companyId,
        userId,
        'PIPELINE_DELETED',
        pipelineId,
        {
          pipelineName: pipeline.pipelineName,
          pipelineIdentifier: pipeline.pipelineIdentifier,
        },
      );
    }

    return { message: 'Pipeline deleted successfully' };
  }

  /**
   * Cancel pipeline
   */
  async cancelPipeline(companyId: string, pipelineId: string, userId: string) {
    const pipeline = await this.getPipelineById(companyId, pipelineId);

    // Update pipeline
    await this.prisma.trainingPipeline.update({
      where: { id: pipelineId },
      data: {
        pipelineStatus: TrainingPipelineStatus.CANCELLED,
        pipelineStage: TrainingPipelineStage.CANCELLED,
        queueStatus: TrainingQueueStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        updatedBy: userId,
      },
    });

    // Update session
    await this.prisma.trainingSession.update({
      where: { id: pipeline.trainingSessionId },
      data: {
        status: 'CANCELLED',
        queueStatus: TrainingQueueStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    });

    // Create stage log
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId,
        stage: TrainingPipelineStage.CANCELLED,
        status: 'COMPLETED',
        message: 'Pipeline cancelled by user',
      },
    });

    // Create audit log
    await this.createAuditLog(
      companyId,
      userId,
      'PIPELINE_CANCELLED',
      pipelineId,
      {
        pipelineName: pipeline.pipelineName,
        cancelledBy: userId,
      },
    );

    return this.getPipelineById(companyId, pipelineId);
  }

  /**
   * Validate pipeline
   */
  async validatePipeline(
    companyId: string,
    pipelineId: string,
  ): Promise<PipelineValidationResponseDto> {
    const pipeline = await this.getPipelineById(companyId, pipelineId);

    const errors: string[] = [];
    const warnings: string[] = [];
    const blockers: Array<{ type: string; message: string; severity: string }> = [];

    // Validate dataset
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: pipeline.datasetId, companyId },
    });

    const datasetValid = !!dataset && dataset.status === 'VALIDATED';
    if (!datasetValid) {
      errors.push('Dataset not found or not validated');
      blockers.push({
        type: 'DATASET_INVALID',
        message: 'Dataset must be validated before training',
        severity: 'critical',
      });
    }

    // Validate model
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: pipeline.modelRegistryId, companyId },
    });

    const modelValid = !!model && (model.status === 'READY' || model.status === 'TRAINING');
    if (!modelValid) {
      errors.push('Model not found or not active');
      blockers.push({
        type: 'MODEL_INVALID',
        message: 'Model must be active and available',
        severity: 'critical',
      });
    }

    // Validate configuration
    let configurationValid = true;
    if (pipeline.trainingConfigurationId) {
      const config = await this.prisma.trainingConfiguration.findFirst({
        where: { id: pipeline.trainingConfigurationId, companyId },
      });
      configurationValid = !!config;
      if (!configurationValid) {
        warnings.push('Training configuration not found');
      }
    }

    // Check compatibility
    let compatibilityValid = true;
    if (dataset && model) {
      // Basic compatibility checks
      const modelMetadata = model.metadata as any;
      if (dataset.language && modelMetadata?.supportedLanguages) {
        const languages = modelMetadata.supportedLanguages as string[];
        if (!languages.includes(dataset.language)) {
          compatibilityValid = false;
          errors.push('Dataset language not supported by model');
        }
      }
    }

    // Check readiness
    const readinessValid = datasetValid && modelValid && configurationValid && compatibilityValid;

    // Check workspace
    const workspaceValid = !!pipeline.workspaceId;
    if (!workspaceValid) {
      warnings.push('No workspace assigned to pipeline');
    }

    const overallValid = readinessValid && !blockers.length;

    // Update pipeline validation status
    await this.prisma.trainingPipeline.update({
      where: { id: pipelineId },
      data: {
        datasetValid,
        modelValid,
        configurationValid,
        compatibilityValid,
        readinessValid,
        workspaceValid,
        validationPassed: overallValid,
        pipelineStatus: overallValid
          ? TrainingPipelineStatus.VALID
          : TrainingPipelineStatus.INVALID,
        pipelineStage: overallValid
          ? TrainingPipelineStage.VALIDATED
          : TrainingPipelineStage.PENDING,
        validatedAt: new Date(),
      },
    });

    // Create stage log
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId,
        stage: TrainingPipelineStage.VALIDATED,
        status: overallValid ? 'COMPLETED' : 'FAILED',
        message: overallValid ? 'Validation passed' : 'Validation failed',
        details: { errors, warnings, blockers },
      },
    });

    return {
      datasetValid,
      modelValid,
      configurationValid,
      compatibilityValid,
      readinessValid,
      workspaceValid,
      overallValid,
      errors,
      warnings,
      blockers,
    };
  }

  /**
   * Estimate resources for training
   */
  async estimateResources(
    companyId: string,
    dto: EstimateResourcesDto,
  ): Promise<ResourceEstimationDto> {
    // Validate dataset
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: dto.datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Validate model
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: dto.modelRegistryId, companyId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // Get training configuration
    let config: any = {};
    if (dto.trainingConfigurationId) {
      const trainingConfig = await this.prisma.trainingConfiguration.findFirst({
        where: { id: dto.trainingConfigurationId, companyId },
      });
      if (trainingConfig) {
        config = trainingConfig;
      }
    }

    // Estimation logic
    const batchSize = dto.batchSize || config.batchSize || 16;
    const epochs = dto.epochs || config.epochs || 3;
    const recordCount = dataset.recordCount || 1000;

    // Estimate GPU memory based on model size
    const modelMetadata = model.metadata as any;
    const modelSizeGB = (modelMetadata?.sizeInBytes || 1000000000) / (1024 * 1024 * 1024);
    const gpuMemoryGB = Math.ceil(modelSizeGB * 4); // 4x model size for training

    // Estimate RAM (2x GPU memory)
    const ramGB = Math.ceil(gpuMemoryGB * 2);

    // Estimate disk space
    const diskSpaceGB = Math.ceil(modelSizeGB * 10 + recordCount * 0.001);

    // Estimate CPU cores
    const cpuCores = Math.max(4, Math.ceil(batchSize / 4));

    // Estimate checkpoint storage
    const checkpointStorageGB = Math.ceil(modelSizeGB * 5);

    // Estimate duration (rough estimate)
    const stepsPerEpoch = Math.ceil(recordCount / batchSize);
    const totalSteps = stepsPerEpoch * epochs;
    const secondsPerStep = 0.5; // Rough estimate
    const durationHours = (totalSteps * secondsPerStep) / 3600;

    return {
      gpuMemoryGB,
      ramGB,
      diskSpaceGB,
      cpuCores,
      checkpointStorageGB,
      durationHours: Math.ceil(durationHours * 100) / 100,
      metadata: {
        batchSize,
        epochs,
        recordCount,
        totalSteps,
        stepsPerEpoch,
      },
    };
  }

  /**
   * Generate checkpoint plan
   */
  async generateCheckpointPlan(
    dto: GenerateCheckpointPlanDto,
  ): Promise<CheckpointPlanDto> {
    const { durationHours, totalSteps, intervalPreference, storageConstraintGB } = dto;

    // Default: checkpoint every 500 steps
    let checkpointInterval = 500;

    // Adjust based on total steps
    if (totalSteps < 1000) {
      checkpointInterval = Math.ceil(totalSteps / 3);
    } else if (totalSteps > 10000) {
      checkpointInterval = 1000;
    }

    // Adjust based on interval preference
    if (intervalPreference === 'frequent') {
      checkpointInterval = Math.ceil(checkpointInterval / 2);
    } else if (intervalPreference === 'sparse') {
      checkpointInterval = checkpointInterval * 2;
    }

    // Calculate max checkpoints based on storage
    let maxCheckpoints = 3;
    if (storageConstraintGB) {
      const estimatedCheckpointSize = storageConstraintGB / 10;
      maxCheckpoints = Math.max(2, Math.min(5, Math.floor(storageConstraintGB / estimatedCheckpointSize)));
    }

    return {
      checkpointInterval,
      maxCheckpoints,
      checkpointNaming: 'step',
      retentionPolicy: 'KEEP_BEST',
      autoCleanup: true,
      pathPattern: 'checkpoints/step-{step}',
    };
  }

  /**
   * Prepare training session
   */
  async prepareTrainingSession(
    companyId: string,
    userId: string,
    dto: PrepareTrainingSessionDto,
  ) {
    // Get training session
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: dto.trainingSessionId, companyId },
      include: {
        pipelines: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Check if pipeline already exists for this session
    let pipeline = session.pipelines[0];

    if (!pipeline) {
      // Create new pipeline
      const createDto: CreateTrainingPipelineDto = {
        trainingSessionId: session.id,
        pipelineName: `${session.sessionName} - Pipeline`,
        datasetId: session.datasetId,
        modelRegistryId: session.modelRegistryId,
        trainingConfigurationId: session.trainingConfigurationId,
        workspaceId: session.workspaceId,
      };

      pipeline = await this.createPipeline(companyId, userId, createDto);
    }

    // Validate pipeline if not skipped
    if (!dto.skipValidation) {
      await this.validatePipeline(companyId, pipeline.id);
      // Refresh pipeline
      pipeline = await this.getPipelineById(companyId, pipeline.id);

      if (!pipeline.validationPassed) {
        throw new BadRequestException('Pipeline validation failed');
      }
    }

    // Auto-estimate resources if requested
    if (dto.autoEstimateResources) {
      const resourceEstimation = await this.estimateResources(companyId, {
        datasetId: session.datasetId,
        modelRegistryId: session.modelRegistryId,
        trainingConfigurationId: session.trainingConfigurationId,
      });

      await this.prisma.trainingPipeline.update({
        where: { id: pipeline.id },
        data: {
          resourceEstimation: JSON.parse(JSON.stringify(resourceEstimation)),
          pipelineStatus: TrainingPipelineStatus.PREPARING,
        },
      });

      // Update session with estimates
      await this.prisma.trainingSession.update({
        where: { id: session.id },
        data: {
          estimatedGpuMemoryGB: resourceEstimation.gpuMemoryGB,
          estimatedRamGB: resourceEstimation.ramGB,
          estimatedDiskGB: resourceEstimation.diskSpaceGB,
          estimatedCpuCores: resourceEstimation.cpuCores,
          estimatedDurationHours: resourceEstimation.durationHours,
          estimatedCheckpointSizeGB: resourceEstimation.checkpointStorageGB,
        },
      });
    }

    // Auto-generate checkpoint plan if requested
    if (dto.autoGenerateCheckpointPlan) {
      const totalSteps = session.estimatedDurationHours
        ? Math.ceil(session.estimatedDurationHours * 3600 / 0.5)
        : 10000;

      const checkpointPlan = await this.generateCheckpointPlan({
        durationHours: session.estimatedDurationHours || 10,
        totalSteps,
      });

      await this.prisma.trainingPipeline.update({
        where: { id: pipeline.id },
        data: {
          checkpointPlan: JSON.parse(JSON.stringify(checkpointPlan)),
        },
      });

      // Update session with checkpoint config
      await this.prisma.trainingSession.update({
        where: { id: session.id },
        data: {
          checkpointInterval: checkpointPlan.checkpointInterval,
          maxCheckpoints: checkpointPlan.maxCheckpoints,
          checkpointNaming: checkpointPlan.checkpointNaming,
          checkpointRetentionPolicy: checkpointPlan.retentionPolicy,
          autoCheckpointCleanup: checkpointPlan.autoCleanup,
        },
      });
    }

    // Mark pipeline as prepared
    await this.prisma.trainingPipeline.update({
      where: { id: pipeline.id },
      data: {
        pipelineStatus: TrainingPipelineStatus.PREPARED,
        pipelineStage: TrainingPipelineStage.PREPARED,
        preparedAt: new Date(),
      },
    });

    // Update session status
    await this.prisma.trainingSession.update({
      where: { id: session.id },
      data: {
        status: 'PREPARED',
      },
    });

    // Create stage log
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId: pipeline.id,
        stage: TrainingPipelineStage.PREPARED,
        status: 'COMPLETED',
        message: 'Pipeline prepared and ready for training',
      },
    });

    // Create session log
    await this.prisma.trainingSessionLog.create({
      data: {
        sessionId: session.id,
        logLevel: 'INFO',
        logType: 'PIPELINE_PREPARED',
        message: 'Training pipeline prepared successfully',
        details: { pipelineId: pipeline.id },
      },
    });

    // Create audit log
    await this.createAuditLog(
      companyId,
      userId,
      'PIPELINE_PREPARED',
      pipeline.id,
      {
        sessionId: session.id,
        autoEstimateResources: dto.autoEstimateResources,
        autoGenerateCheckpointPlan: dto.autoGenerateCheckpointPlan,
      },
    );

    return this.getPipelineById(companyId, pipeline.id);
  }

  /**
   * Queue pipeline for execution
   */
  async queuePipeline(companyId: string, userId: string, dto: QueuePipelineDto) {
    const pipeline = await this.getPipelineById(companyId, dto.pipelineId);

    if (pipeline.pipelineStatus !== TrainingPipelineStatus.PREPARED) {
      throw new BadRequestException('Pipeline must be prepared before queueing');
    }

    // Get current queue position
    const queueCount = await this.prisma.trainingPipeline.count({
      where: {
        companyId,
        queueStatus: TrainingQueueStatus.QUEUED,
      },
    });

    // Update pipeline
    await this.prisma.trainingPipeline.update({
      where: { id: dto.pipelineId },
      data: {
        queueStatus: TrainingQueueStatus.QUEUED,
        pipelineStatus: TrainingPipelineStatus.QUEUED,
        pipelineStage: TrainingPipelineStage.QUEUED,
        queuePosition: queueCount + 1,
        queuedAt: new Date(),
        updatedBy: userId,
      },
    });

    // Update session
    await this.prisma.trainingSession.update({
      where: { id: pipeline.trainingSessionId },
      data: {
        status: 'QUEUED',
        queueStatus: TrainingQueueStatus.QUEUED,
      },
    });

    // Create stage log
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId: dto.pipelineId,
        stage: TrainingPipelineStage.QUEUED,
        status: 'COMPLETED',
        message: `Pipeline queued at position ${queueCount + 1}`,
      },
    });

    // Create audit log
    await this.createAuditLog(
      companyId,
      userId,
      'PIPELINE_QUEUED',
      dto.pipelineId,
      {
        queuePosition: queueCount + 1,
        priority: dto.priority,
        dependencies: dto.dependencies,
      },
    );

    return this.getPipelineById(companyId, dto.pipelineId);
  }

  /**
   * Get pipeline summary
   */
  async getPipelineSummary(
    companyId: string,
    pipelineId: string,
  ): Promise<PipelineSummaryResponseDto> {
    const pipeline = await this.getPipelineById(companyId, pipelineId);

    const timeline = pipeline.stages.map((stage) => ({
      stage: stage.stage as TrainingPipelineStage,
      status: stage.status,
      timestamp: stage.createdAt,
      duration: stage.duration,
      message: stage.message,
    }));

    return {
      id: pipeline.id,
      pipelineName: pipeline.pipelineName,
      pipelineIdentifier: pipeline.pipelineIdentifier,
      pipelineStage: pipeline.pipelineStage as TrainingPipelineStage,
      pipelineStatus: pipeline.pipelineStatus as TrainingPipelineStatus,
      queueStatus: pipeline.queueStatus as TrainingQueueStatus,
      queuePosition: pipeline.queuePosition,
      validationPassed: pipeline.validationPassed,
      resourceEstimation: pipeline.resourceEstimation as any,
      checkpointPlan: pipeline.checkpointPlan as any,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
      timeline,
    };
  }

  /**
   * Get training session with pipelines
   */
  async getTrainingSession(
    companyId: string,
    sessionId: string,
  ): Promise<TrainingSessionResponseDto> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
      include: {
        pipelines: {
          include: {
            stages: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    const pipelines = await Promise.all(
      session.pipelines.map((p) => this.getPipelineSummary(companyId, p.id)),
    );

    return {
      id: session.id,
      sessionName: session.sessionName,
      sessionIdentifier: session.sessionIdentifier,
      status: session.status,
      queueStatus: session.queueStatus as TrainingQueueStatus,
      datasetId: session.datasetId,
      datasetVersion: session.datasetVersion,
      modelRegistryId: session.modelRegistryId,
      modelVersion: session.modelVersion,
      trainingConfigurationId: session.trainingConfigurationId,
      description: session.description,
      createdBy: session.createdBy,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      pipelines,
    };
  }
}
