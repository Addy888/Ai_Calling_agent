import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateTrainingSessionDto,
  CreatePipelineDto,
  UpdateSessionDto,
  UpdatePipelineDto,
  QueuePipelineDto,
  TrainingSessionResponseDto,
  TrainingPipelineResponseDto,
  PipelineSummaryDto,
  ResourceEstimationDto,
  CheckpointPlanDto,
  PipelineValidationDto,
  TrainingSessionStatus,
  TrainingQueueStatus,
  TrainingPipelineStage,
  TrainingPipelineStatus,
} from '../dto/pipeline.dto';

@Injectable()
export class TrainingPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new training session
   */
  async createSession(
    companyId: string,
    userId: string,
    dto: CreateTrainingSessionDto,
  ): Promise<TrainingSessionResponseDto> {
    // Validate dataset exists
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: dto.datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Validate model exists
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: dto.modelRegistryId, companyId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // Generate session identifier
    const sessionIdentifier = this.generateSessionIdentifier();

    // Estimate resources
    const resourceEstimation = await this.estimateResources(
      companyId,
      dto.datasetId,
      dto.modelRegistryId,
    );

    // Generate checkpoint plan
    const checkpointPlan = this.generateCheckpointPlan(
      dto.checkpointInterval || 500,
      dto.maxCheckpoints || 3,
      resourceEstimation.estimatedCheckpointSizeGB,
    );

    // Create session
    const session = await this.prisma.trainingSession.create({
      data: {
        companyId,
        workspaceId: dto.workspaceId,
        sessionName: dto.sessionName,
        sessionIdentifier,
        datasetId: dto.datasetId,
        datasetVersion: dto.datasetVersion,
        modelRegistryId: dto.modelRegistryId,
        modelVersion: dto.modelVersion,
        trainingConfigurationId: dto.trainingConfigurationId,
        status: TrainingSessionStatus.PENDING,
        queueStatus: TrainingQueueStatus.PENDING,
        trainingFramework: dto.trainingFramework || 'PyTorch',
        checkpointInterval: dto.checkpointInterval || 500,
        maxCheckpoints: dto.maxCheckpoints || 3,
        priority: dto.priority || 0,
        estimatedGpuMemoryGB: resourceEstimation.estimatedGpuMemoryGB,
        estimatedRamGB: resourceEstimation.estimatedRamGB,
        estimatedDiskGB: resourceEstimation.estimatedDiskGB,
        estimatedCpuCores: resourceEstimation.estimatedCpuCores,
        estimatedDurationHours: resourceEstimation.estimatedDurationHours,
        estimatedCheckpointSizeGB: resourceEstimation.estimatedCheckpointSizeGB,
        description: dto.description,
        createdBy: userId,
      },
    });

    // Log session creation
    await this.prisma.trainingSessionLog.create({
      data: {
        sessionId: session.id,
        logLevel: 'INFO',
        logType: 'SESSION_CREATED',
        message: `Training session created: ${session.sessionName}`,
        details: { sessionId: session.id, status: session.status },
      },
    });

    return this.formatSessionResponse(session, resourceEstimation, checkpointPlan);
  }

  /**
   * Create a new training pipeline
   */
  async createPipeline(
    companyId: string,
    userId: string,
    dto: CreatePipelineDto,
  ): Promise<TrainingPipelineResponseDto> {
    // Validate session exists
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: dto.trainingSessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    // Generate pipeline identifier
    const pipelineIdentifier = this.generatePipelineIdentifier();

    // Validate pipeline components
    const validation = await this.validatePipeline(
      companyId,
      session.datasetId,
      session.modelRegistryId,
      session.trainingConfigurationId,
    );

    // Estimate resources
    const resourceEstimation = await this.estimateResources(
      companyId,
      session.datasetId,
      session.modelRegistryId,
    );

    // Generate checkpoint plan
    const checkpointPlan = this.generateCheckpointPlan(
      session.checkpointInterval,
      session.maxCheckpoints,
      resourceEstimation.estimatedCheckpointSizeGB,
    );

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
        queueStatus: TrainingQueueStatus.PENDING,
        datasetId: session.datasetId,
        modelRegistryId: session.modelRegistryId,
        trainingConfigurationId: session.trainingConfigurationId,
        datasetValid: validation.datasetValid,
        modelValid: validation.modelValid,
        configurationValid: validation.configurationValid,
        compatibilityValid: validation.compatibilityValid,
        readinessValid: validation.readinessValid,
        workspaceValid: validation.workspaceValid,
        validationPassed: validation.validationPassed,
        resourceEstimation: resourceEstimation as any,
        checkpointPlan: checkpointPlan as any,
        createdBy: userId,
      },
    });

    // Log stage
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId: pipeline.id,
        stage: TrainingPipelineStage.PENDING,
        status: 'PENDING',
        message: 'Pipeline created',
      },
    });

    return this.formatPipelineResponse(pipeline, validation, resourceEstimation, checkpointPlan);
  }

  /**
   * Get session by ID
   */
  async getSessionById(companyId: string, sessionId: string): Promise<TrainingSessionResponseDto> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
      include: {
        pipelines: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    const resourceEstimation: ResourceEstimationDto = {
      estimatedGpuMemoryGB: session.estimatedGpuMemoryGB || 0,
      estimatedRamGB: session.estimatedRamGB || 0,
      estimatedDiskGB: session.estimatedDiskGB || 0,
      estimatedCpuCores: session.estimatedCpuCores || 0,
      estimatedDurationHours: session.estimatedDurationHours || 0,
      estimatedCheckpointSizeGB: session.estimatedCheckpointSizeGB || 0,
    };

    const checkpointPlan = this.generateCheckpointPlan(
      session.checkpointInterval,
      session.maxCheckpoints,
      session.estimatedCheckpointSizeGB || 0,
    );

    return this.formatSessionResponse(session, resourceEstimation, checkpointPlan);
  }

  /**
   * Get pipeline by ID
   */
  async getPipelineById(companyId: string, pipelineId: string): Promise<TrainingPipelineResponseDto> {
    const pipeline = await this.prisma.trainingPipeline.findFirst({
      where: { id: pipelineId, companyId },
    });

    if (!pipeline) {
      throw new NotFoundException('Training pipeline not found');
    }

    const validation: PipelineValidationDto = {
      datasetValid: pipeline.datasetValid,
      modelValid: pipeline.modelValid,
      configurationValid: pipeline.configurationValid,
      compatibilityValid: pipeline.compatibilityValid,
      readinessValid: pipeline.readinessValid,
      workspaceValid: pipeline.workspaceValid,
      validationPassed: pipeline.validationPassed,
      errorMessage: pipeline.errorMessage,
    };

    const resourceEstimation = pipeline.resourceEstimation as any as ResourceEstimationDto;
    const checkpointPlan = pipeline.checkpointPlan as any as CheckpointPlanDto;

    return this.formatPipelineResponse(pipeline, validation, resourceEstimation, checkpointPlan);
  }

  /**
   * Update session
   */
  async updateSession(
    companyId: string,
    sessionId: string,
    userId: string,
    dto: UpdateSessionDto,
  ): Promise<TrainingSessionResponseDto> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    const updated = await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    // Log update
    await this.prisma.trainingSessionLog.create({
      data: {
        sessionId: updated.id,
        logLevel: 'INFO',
        logType: 'SESSION_UPDATED',
        message: 'Training session updated',
        details: JSON.parse(JSON.stringify(dto)),
      },
    });

    const resourceEstimation: ResourceEstimationDto = {
      estimatedGpuMemoryGB: updated.estimatedGpuMemoryGB || 0,
      estimatedRamGB: updated.estimatedRamGB || 0,
      estimatedDiskGB: updated.estimatedDiskGB || 0,
      estimatedCpuCores: updated.estimatedCpuCores || 0,
      estimatedDurationHours: updated.estimatedDurationHours || 0,
      estimatedCheckpointSizeGB: updated.estimatedCheckpointSizeGB || 0,
    };

    const checkpointPlan = this.generateCheckpointPlan(
      updated.checkpointInterval,
      updated.maxCheckpoints,
      updated.estimatedCheckpointSizeGB || 0,
    );

    return this.formatSessionResponse(updated, resourceEstimation, checkpointPlan);
  }

  /**
   * Prepare pipeline (validate and queue)
   */
  async preparePipeline(
    companyId: string,
    pipelineId: string,
    userId: string,
  ): Promise<TrainingPipelineResponseDto> {
    const pipeline = await this.prisma.trainingPipeline.findFirst({
      where: { id: pipelineId, companyId },
    });

    if (!pipeline) {
      throw new NotFoundException('Training pipeline not found');
    }

    // Update pipeline status
    const updated = await this.prisma.trainingPipeline.update({
      where: { id: pipelineId },
      data: {
        pipelineStage: TrainingPipelineStage.PREPARED,
        pipelineStatus: TrainingPipelineStatus.PREPARED,
        preparedAt: new Date(),
        updatedBy: userId,
      },
    });

    // Log stage
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId: updated.id,
        stage: TrainingPipelineStage.PREPARED,
        status: 'COMPLETED',
        message: 'Pipeline prepared and ready',
        completedAt: new Date(),
      },
    });

    const validation: PipelineValidationDto = {
      datasetValid: updated.datasetValid,
      modelValid: updated.modelValid,
      configurationValid: updated.configurationValid,
      compatibilityValid: updated.compatibilityValid,
      readinessValid: updated.readinessValid,
      workspaceValid: updated.workspaceValid,
      validationPassed: updated.validationPassed,
      errorMessage: updated.errorMessage,
    };

    const resourceEstimation = updated.resourceEstimation as any as ResourceEstimationDto;
    const checkpointPlan = updated.checkpointPlan as any as CheckpointPlanDto;

    return this.formatPipelineResponse(updated, validation, resourceEstimation, checkpointPlan);
  }

  /**
   * Queue pipeline
   */
  async queuePipeline(
    companyId: string,
    dto: QueuePipelineDto,
    userId: string,
  ): Promise<TrainingPipelineResponseDto> {
    const pipeline = await this.prisma.trainingPipeline.findFirst({
      where: { id: dto.pipelineId, companyId },
    });

    if (!pipeline) {
      throw new NotFoundException('Training pipeline not found');
    }

    const updated = await this.prisma.trainingPipeline.update({
      where: { id: dto.pipelineId },
      data: {
        pipelineStage: TrainingPipelineStage.QUEUED,
        queueStatus: TrainingQueueStatus.QUEUED,
        queuePosition: dto.queuePosition,
        queuedAt: new Date(),
        updatedBy: userId,
      },
    });

    // Log stage
    await this.prisma.pipelineStageLog.create({
      data: {
        pipelineId: updated.id,
        stage: TrainingPipelineStage.QUEUED,
        status: 'COMPLETED',
        message: 'Pipeline added to queue',
        completedAt: new Date(),
      },
    });

    const validation: PipelineValidationDto = {
      datasetValid: updated.datasetValid,
      modelValid: updated.modelValid,
      configurationValid: updated.configurationValid,
      compatibilityValid: updated.compatibilityValid,
      readinessValid: updated.readinessValid,
      workspaceValid: updated.workspaceValid,
      validationPassed: updated.validationPassed,
      errorMessage: updated.errorMessage,
    };

    const resourceEstimation = updated.resourceEstimation as any as ResourceEstimationDto;
    const checkpointPlan = updated.checkpointPlan as any as CheckpointPlanDto;

    return this.formatPipelineResponse(updated, validation, resourceEstimation, checkpointPlan);
  }

  /**
   * Delete session
   */
  async deleteSession(companyId: string, sessionId: string): Promise<{ message: string }> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    await this.prisma.trainingSession.delete({
      where: { id: sessionId },
    });

    return { message: 'Training session deleted successfully' };
  }

  /**
   * Delete pipeline
   */
  async deletePipeline(companyId: string, pipelineId: string): Promise<{ message: string }> {
    const pipeline = await this.prisma.trainingPipeline.findFirst({
      where: { id: pipelineId, companyId },
    });

    if (!pipeline) {
      throw new NotFoundException('Training pipeline not found');
    }

    await this.prisma.trainingPipeline.delete({
      where: { id: pipelineId },
    });

    return { message: 'Training pipeline deleted successfully' };
  }

  /**
   * Get pipeline summary
   */
  async getPipelineSummary(companyId: string): Promise<PipelineSummaryDto> {
    const pipelines = await this.prisma.trainingPipeline.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalPipelines = pipelines.length;
    const pendingPipelines = pipelines.filter(p => p.pipelineStatus === 'PENDING').length;
    const queuedPipelines = pipelines.filter(p => p.pipelineStatus === 'QUEUED').length;
    const preparedPipelines = pipelines.filter(p => p.pipelineStatus === 'PREPARED').length;
    const completedPipelines = pipelines.filter(p => p.pipelineStatus === 'COMPLETED').length;
    const failedPipelines = pipelines.filter(p => p.pipelineStatus === 'FAILED').length;

    const recentPipelines = pipelines.slice(0, 10).map(p => {
      const validation: PipelineValidationDto = {
        datasetValid: p.datasetValid,
        modelValid: p.modelValid,
        configurationValid: p.configurationValid,
        compatibilityValid: p.compatibilityValid,
        readinessValid: p.readinessValid,
        workspaceValid: p.workspaceValid,
        validationPassed: p.validationPassed,
        errorMessage: p.errorMessage,
      };

      const resourceEstimation = p.resourceEstimation as any as ResourceEstimationDto;
      const checkpointPlan = p.checkpointPlan as any as CheckpointPlanDto;

      return this.formatPipelineResponse(p, validation, resourceEstimation, checkpointPlan);
    });

    return {
      totalPipelines,
      pendingPipelines,
      queuedPipelines,
      preparedPipelines,
      completedPipelines,
      failedPipelines,
      recentPipelines,
    };
  }

  /**
   * Estimate resources for training
   */
  private async estimateResources(
    companyId: string,
    datasetId: string,
    modelRegistryId: string,
  ): Promise<ResourceEstimationDto> {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: modelRegistryId, companyId },
      include: { baseModel: true },
    });

    const minimumVRAM = model?.baseModel?.minimumVram || 8;
    const recommendedVRAM = model?.baseModel?.recommendedVram || 16;
    const datasetSize = dataset?.recordCount || 1000;

    // Estimate GPU memory (model + optimizer + gradients + batch)
    const estimatedGpuMemoryGB = recommendedVRAM * 1.5;

    // Estimate RAM (50% of GPU memory, minimum 16GB)
    const estimatedRamGB = Math.max(16, recommendedVRAM * 0.5);

    // Estimate disk space (model + dataset + checkpoints)
    const modelSizeGB = recommendedVRAM * 0.8;
    const datasetSizeGB = (datasetSize * 500 * 4) / 1024 / 1024 / 1024;
    const checkpointSizeGB = modelSizeGB * 0.8;
    const estimatedDiskGB = modelSizeGB + datasetSizeGB + (checkpointSizeGB * 3);

    // Estimate CPU cores (minimum 4, recommended 8)
    const estimatedCpuCores = 8;

    // Estimate duration (conservative estimate based on dataset size)
    const samplesPerHour = 1000;
    const estimatedDurationHours = Math.max(1, datasetSize / samplesPerHour);

    // Checkpoint size
    const estimatedCheckpointSizeGB = checkpointSizeGB;

    return {
      estimatedGpuMemoryGB: Math.round(estimatedGpuMemoryGB * 100) / 100,
      estimatedRamGB: Math.round(estimatedRamGB * 100) / 100,
      estimatedDiskGB: Math.round(estimatedDiskGB * 100) / 100,
      estimatedCpuCores,
      estimatedDurationHours: Math.round(estimatedDurationHours * 100) / 100,
      estimatedCheckpointSizeGB: Math.round(estimatedCheckpointSizeGB * 100) / 100,
    };
  }

  /**
   * Generate checkpoint plan
   */
  private generateCheckpointPlan(
    interval: number,
    maxCheckpoints: number,
    checkpointSizeGB: number,
  ): CheckpointPlanDto {
    return {
      interval,
      maxCheckpoints,
      naming: 'step',
      retentionPolicy: 'KEEP_BEST',
      autoCleanup: true,
      estimatedCheckpointSizeGB: checkpointSizeGB,
      totalStorageGB: Math.round(checkpointSizeGB * maxCheckpoints * 100) / 100,
    };
  }

  /**
   * Validate pipeline components
   */
  private async validatePipeline(
    companyId: string,
    datasetId: string,
    modelRegistryId: string,
    trainingConfigurationId?: string,
  ): Promise<PipelineValidationDto> {
    // Check dataset
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });
    const datasetValid = !!dataset && dataset.status === 'VALIDATED';

    // Check model
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: modelRegistryId, companyId },
    });
    const modelValid = !!model && model.isActive;

    // Check configuration
    const configurationValid = !!trainingConfigurationId;

    // Check compatibility
    const compatReport = await this.prisma.compatibilityReport.findFirst({
      where: {
        companyId,
        datasetId,
        modelRegistryId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });
    const compatibilityValid = !!compatReport && compatReport.overallScore >= 75;

    // Check readiness
    const readinessReport = await this.prisma.trainingReadinessReport.findFirst({
      where: {
        companyId,
        datasetId,
        modelRegistryId,
      },
      orderBy: { createdAt: 'desc' },
    });
    const readinessValid = !!readinessReport && readinessReport.overallScore >= 85;

    // Workspace valid (default to true for now)
    const workspaceValid = true;

    const validationPassed = datasetValid && modelValid && configurationValid && 
                              compatibilityValid && readinessValid && workspaceValid;

    let errorMessage: string | undefined;
    if (!validationPassed) {
      const errors: string[] = [];
      if (!datasetValid) errors.push('Dataset not validated');
      if (!modelValid) errors.push('Model not active');
      if (!configurationValid) errors.push('Configuration missing');
      if (!compatibilityValid) errors.push('Compatibility check failed');
      if (!readinessValid) errors.push('Readiness check failed');
      errorMessage = errors.join('; ');
    }

    return {
      datasetValid,
      modelValid,
      configurationValid,
      compatibilityValid,
      readinessValid,
      workspaceValid,
      validationPassed,
      errorMessage,
    };
  }

  /**
   * Generate session identifier
   */
  private generateSessionIdentifier(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Generate pipeline identifier
   */
  private generatePipelineIdentifier(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `pipeline-${timestamp}-${random}`;
  }

  /**
   * Format session response
   */
  private formatSessionResponse(
    session: any,
    resourceEstimation: ResourceEstimationDto,
    checkpointPlan: CheckpointPlanDto,
  ): TrainingSessionResponseDto {
    return {
      id: session.id,
      companyId: session.companyId,
      workspaceId: session.workspaceId,
      sessionName: session.sessionName,
      sessionIdentifier: session.sessionIdentifier,
      datasetId: session.datasetId,
      datasetVersion: session.datasetVersion,
      modelRegistryId: session.modelRegistryId,
      modelVersion: session.modelVersion,
      status: session.status,
      queueStatus: session.queueStatus,
      trainingFramework: session.trainingFramework,
      checkpointInterval: session.checkpointInterval,
      maxCheckpoints: session.maxCheckpoints,
      priority: session.priority,
      resourceEstimation,
      checkpointPlan,
      description: session.description,
      createdBy: session.createdBy,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      pipelines: session.pipelines?.map((p: any) => ({
        id: p.id,
        pipelineName: p.pipelineName,
        pipelineStatus: p.pipelineStatus,
      })),
    };
  }

  /**
   * Format pipeline response
   */
  private formatPipelineResponse(
    pipeline: any,
    validation: PipelineValidationDto,
    resourceEstimation: ResourceEstimationDto | null,
    checkpointPlan: CheckpointPlanDto | null,
  ): TrainingPipelineResponseDto {
    return {
      id: pipeline.id,
      companyId: pipeline.companyId,
      trainingSessionId: pipeline.trainingSessionId,
      pipelineName: pipeline.pipelineName,
      pipelineIdentifier: pipeline.pipelineIdentifier,
      pipelineStage: pipeline.pipelineStage,
      pipelineStatus: pipeline.pipelineStatus,
      queueStatus: pipeline.queueStatus,
      queuePosition: pipeline.queuePosition,
      datasetId: pipeline.datasetId,
      modelRegistryId: pipeline.modelRegistryId,
      validation,
      resourceEstimation,
      checkpointPlan,
      retryCount: pipeline.retryCount,
      maxRetries: pipeline.maxRetries,
      errorMessage: pipeline.errorMessage,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }
}
