import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateFineTuningConfigDto,
  UpdateFineTuningConfigDto,
  FineTuningConfigResponseDto,
  FineTuningConfigListResponseDto,
  FineTuningConfigValidationResultDto,
  FineTuningMethod,
  FineTuningConfigStatus,
  PrecisionType,
} from '../dto/fine-tuning-config.dto';

@Injectable()
export class FineTuningConfigService {
  private readonly logger = new Logger(FineTuningConfigService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new fine-tuning configuration
   */
  async createConfiguration(
    companyId: string,
    userId: string,
    dto: CreateFineTuningConfigDto,
  ): Promise<FineTuningConfigResponseDto> {
    this.logger.log(`Creating fine-tuning configuration for company: ${companyId}`);

    // Validate base model if provided
    if (dto.baseModelId) {
      const modelExists = await this.prisma.modelRegistry.findFirst({
        where: {
          id: dto.baseModelId,
          companyId,
        },
      });

      if (!modelExists) {
        throw new NotFoundException(`Base model with ID ${dto.baseModelId} not found`);
      }
    }

    // Validate dataset if provided
    if (dto.datasetId) {
      const datasetExists = await this.prisma.trainingDataset.findFirst({
        where: {
          id: dto.datasetId,
          companyId,
        },
      });

      if (!datasetExists) {
        throw new NotFoundException(`Dataset with ID ${dto.datasetId} not found`);
      }
    }

    // Validate method-specific configuration
    this.validateMethodConfiguration(dto.trainingMethod, dto);

    const configuration = await this.prisma.fineTuningConfiguration.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        trainingMethod: dto.trainingMethod,
        baseModelId: dto.baseModelId,
        datasetId: dto.datasetId,
        configurationVersion: dto.configurationVersion || '1.0.0',
        precision: dto.precision || PrecisionType.FP32,
        loraConfig: dto.loraConfig as any,
        qloraConfig: dto.qloraConfig as any,
        peftConfig: dto.peftConfig as any,
        status: FineTuningConfigStatus.DRAFT,
        tags: dto.tags as any,
        metadata: dto.metadata as any,
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

    this.logger.log(`Fine-tuning configuration created: ${configuration.id}`);

    return this.mapToResponseDto(configuration);
  }

  /**
   * Update an existing fine-tuning configuration
   */
  async updateConfiguration(
    configurationId: string,
    companyId: string,
    userId: string,
    dto: UpdateFineTuningConfigDto,
  ): Promise<FineTuningConfigResponseDto> {
    this.logger.log(`Updating fine-tuning configuration: ${configurationId}`);

    const existing = await this.prisma.fineTuningConfiguration.findFirst({
      where: {
        id: configurationId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    // Validate base model if being changed
    if (dto.baseModelId && dto.baseModelId !== existing.baseModelId) {
      const modelExists = await this.prisma.modelRegistry.findFirst({
        where: {
          id: dto.baseModelId,
          companyId,
        },
      });

      if (!modelExists) {
        throw new NotFoundException(`Base model with ID ${dto.baseModelId} not found`);
      }
    }

    // Validate dataset if being changed
    if (dto.datasetId && dto.datasetId !== existing.datasetId) {
      const datasetExists = await this.prisma.trainingDataset.findFirst({
        where: {
          id: dto.datasetId,
          companyId,
        },
      });

      if (!datasetExists) {
        throw new NotFoundException(`Dataset with ID ${dto.datasetId} not found`);
      }
    }

    // Validate method-specific configuration if method is being updated
    if (dto.trainingMethod) {
      this.validateMethodConfiguration(dto.trainingMethod, dto as any);
    }

    const updated = await this.prisma.fineTuningConfiguration.update({
      where: { id: configurationId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.trainingMethod && { trainingMethod: dto.trainingMethod }),
        ...(dto.baseModelId !== undefined && { baseModelId: dto.baseModelId }),
        ...(dto.datasetId !== undefined && { datasetId: dto.datasetId }),
        ...(dto.configurationVersion && { configurationVersion: dto.configurationVersion }),
        ...(dto.precision && { precision: dto.precision }),
        ...(dto.loraConfig !== undefined && { loraConfig: dto.loraConfig as any }),
        ...(dto.qloraConfig !== undefined && { qloraConfig: dto.qloraConfig as any }),
        ...(dto.peftConfig !== undefined && { peftConfig: dto.peftConfig as any }),
        ...(dto.status && { status: dto.status }),
        ...(dto.tags !== undefined && { tags: dto.tags as any }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as any }),
        updatedBy: userId,
      },
    });

    // Create audit log
    await this.createAuditLog(
      configurationId,
      companyId,
      'UPDATED',
      userId,
      existing,
      updated,
    );

    this.logger.log(`Fine-tuning configuration updated: ${configurationId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Get a single configuration by ID
   */
  async getConfiguration(
    configurationId: string,
    companyId: string,
  ): Promise<FineTuningConfigResponseDto> {
    const configuration = await this.prisma.fineTuningConfiguration.findFirst({
      where: {
        id: configurationId,
        companyId,
      },
      include: {
        baseModel: true,
        dataset: true,
      },
    });

    if (!configuration) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    return this.mapToResponseDto(configuration);
  }

  /**
   * List all configurations with pagination
   */
  async listConfigurations(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      trainingMethod?: FineTuningMethod;
      status?: FineTuningConfigStatus;
      baseModelId?: string;
      datasetId?: string;
      search?: string;
    },
  ): Promise<FineTuningConfigListResponseDto> {
    const skip = (page - 1) * pageSize;

    const where: any = { companyId };

    if (filters?.trainingMethod) {
      where.trainingMethod = filters.trainingMethod;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.baseModelId) {
      where.baseModelId = filters.baseModelId;
    }

    if (filters?.datasetId) {
      where.datasetId = filters.datasetId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [configurations, total] = await Promise.all([
      this.prisma.fineTuningConfiguration.findMany({
        where,
        include: {
          baseModel: true,
          dataset: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.fineTuningConfiguration.count({ where }),
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
   * Delete a configuration
   */
  async deleteConfiguration(
    configurationId: string,
    companyId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Deleting fine-tuning configuration: ${configurationId}`);

    const existing = await this.prisma.fineTuningConfiguration.findFirst({
      where: {
        id: configurationId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    // Create audit log before deletion
    await this.createAuditLog(
      configurationId,
      companyId,
      'DELETED',
      userId,
      existing,
      null,
    );

    await this.prisma.fineTuningConfiguration.delete({
      where: { id: configurationId },
    });

    this.logger.log(`Fine-tuning configuration deleted: ${configurationId}`);
  }

  /**
   * Validate a configuration
   */
  async validateConfiguration(
    configurationId: string,
    companyId: string,
    userId: string,
  ): Promise<FineTuningConfigValidationResultDto> {
    this.logger.log(`Validating fine-tuning configuration: ${configurationId}`);

    const configuration = await this.prisma.fineTuningConfiguration.findFirst({
      where: {
        id: configurationId,
        companyId,
      },
      include: {
        baseModel: true,
        dataset: true,
      },
    });

    if (!configuration) {
      throw new NotFoundException(`Configuration with ID ${configurationId} not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check required fields
    const requiredFieldsCompleted = this.checkRequiredFields(configuration, errors);

    // Check base model
    const baseModelReady = this.checkBaseModel(configuration, errors, warnings);

    // Check dataset
    const datasetReady = await this.checkDataset(configuration, errors, warnings);

    // Check compatibility
    const compatibilityPassed = this.checkCompatibility(
      configuration,
      errors,
      warnings,
      recommendations,
    );

    // Check training readiness
    const trainingReadinessPassed = this.checkTrainingReadiness(
      configuration,
      errors,
      warnings,
      recommendations,
    );

    const isValid =
      requiredFieldsCompleted &&
      baseModelReady &&
      datasetReady &&
      compatibilityPassed &&
      trainingReadinessPassed &&
      errors.length === 0;

    const validationResult = {
      configurationId,
      isValid,
      baseModelReady,
      datasetReady,
      compatibilityPassed,
      trainingReadinessPassed,
      requiredFieldsCompleted,
      errors,
      warnings,
      recommendations,
      validatedAt: new Date(),
      metadata: {},
    };

    // Update configuration with validation result
    await this.prisma.fineTuningConfiguration.update({
      where: { id: configurationId },
      data: {
        isValidated: isValid,
        validatedAt: new Date(),
        validationResult: validationResult as any,
        status: isValid ? FineTuningConfigStatus.VALIDATED : FineTuningConfigStatus.DRAFT,
      },
    });

    // Create audit log
    await this.createAuditLog(
      configurationId,
      companyId,
      'VALIDATED',
      userId,
      null,
      { validationResult },
    );

    this.logger.log(
      `Fine-tuning configuration validation completed: ${configurationId}, isValid: ${isValid}`,
    );

    return validationResult;
  }

  /**
   * Validate method-specific configuration
   */
  private validateMethodConfiguration(
    method: FineTuningMethod,
    dto: CreateFineTuningConfigDto | UpdateFineTuningConfigDto,
  ): void {
    if (method === FineTuningMethod.LORA) {
      if (!dto.loraConfig) {
        throw new BadRequestException('LoRA configuration is required for LoRA fine-tuning');
      }
    }

    if (method === FineTuningMethod.QLORA) {
      if (!dto.qloraConfig) {
        throw new BadRequestException('QLoRA configuration is required for QLoRA fine-tuning');
      }
      if (!dto.loraConfig) {
        throw new BadRequestException(
          'LoRA configuration is also required for QLoRA fine-tuning',
        );
      }
    }

    if (
      [
        FineTuningMethod.LORA,
        FineTuningMethod.QLORA,
        FineTuningMethod.ADAPTER_BASED,
      ].includes(method as any)
    ) {
      if (!dto.peftConfig) {
        throw new BadRequestException(
          `PEFT configuration is required for ${method} fine-tuning`,
        );
      }
    }
  }

  /**
   * Check required fields
   */
  private checkRequiredFields(configuration: any, errors: string[]): boolean {
    let allFieldsPresent = true;

    if (!configuration.name) {
      errors.push('Configuration name is required');
      allFieldsPresent = false;
    }

    if (!configuration.trainingMethod) {
      errors.push('Training method is required');
      allFieldsPresent = false;
    }

    if (!configuration.baseModelId) {
      errors.push('Base model selection is required');
      allFieldsPresent = false;
    }

    if (!configuration.datasetId) {
      errors.push('Dataset selection is required');
      allFieldsPresent = false;
    }

    // Method-specific checks
    if (configuration.trainingMethod === 'LORA' && !configuration.loraConfig) {
      errors.push('LoRA configuration is required for LoRA training method');
      allFieldsPresent = false;
    }

    if (configuration.trainingMethod === 'QLORA') {
      if (!configuration.qloraConfig) {
        errors.push('QLoRA configuration is required for QLoRA training method');
        allFieldsPresent = false;
      }
      if (!configuration.loraConfig) {
        errors.push('LoRA configuration is also required for QLoRA training method');
        allFieldsPresent = false;
      }
    }

    return allFieldsPresent;
  }

  /**
   * Check base model
   */
  private checkBaseModel(configuration: any, errors: string[], warnings: string[]): boolean {
    if (!configuration.baseModel) {
      errors.push('Base model not found or not accessible');
      return false;
    }

    if (configuration.baseModel.status !== 'READY') {
      errors.push(`Base model status is ${configuration.baseModel.status}, expected READY`);
      return false;
    }

    if (!configuration.baseModel.isActive) {
      warnings.push('Base model is not currently active');
    }

    return true;
  }

  /**
   * Check dataset
   */
  private async checkDataset(
    configuration: any,
    errors: string[],
    warnings: string[],
  ): Promise<boolean> {
    if (!configuration.dataset) {
      errors.push('Dataset not found or not accessible');
      return false;
    }

    if (configuration.dataset.status !== 'PUBLISHED' && configuration.dataset.status !== 'VALIDATED') {
      errors.push(
        `Dataset status is ${configuration.dataset.status}, expected PUBLISHED or VALIDATED`,
      );
      return false;
    }

    if (configuration.dataset.recordCount === 0) {
      errors.push('Dataset has no records');
      return false;
    }

    if (configuration.dataset.validRecordCount === 0) {
      errors.push('Dataset has no valid records');
      return false;
    }

    if (configuration.dataset.validRecordCount < 100) {
      warnings.push(
        `Dataset has only ${configuration.dataset.validRecordCount} valid records. Recommended minimum is 100 for quality fine-tuning.`,
      );
    }

    return true;
  }

  /**
   * Check compatibility
   */
  private checkCompatibility(
    configuration: any,
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): boolean {
    let compatible = true;

    // Check precision compatibility with method
    if (configuration.trainingMethod === 'QLORA') {
      if (configuration.precision !== 'INT4' && configuration.precision !== 'INT8') {
        warnings.push(
          'QLoRA typically uses INT4 or INT8 precision for optimal performance',
        );
      }
    }

    if (configuration.trainingMethod === 'FULL_FINE_TUNING') {
      if (configuration.precision === 'INT4' || configuration.precision === 'INT8') {
        warnings.push(
          'Full fine-tuning with quantized precision may impact model quality',
        );
      }
    }

    // Check LoRA configuration compatibility
    if (configuration.loraConfig) {
      const loraConfig = configuration.loraConfig as any;
      
      if (loraConfig.r && loraConfig.alpha) {
        const ratio = loraConfig.alpha / loraConfig.r;
        if (ratio < 0.5 || ratio > 4) {
          recommendations.push(
            `LoRA alpha/rank ratio is ${ratio.toFixed(2)}. Recommended range is 0.5-4 for stable training.`,
          );
        }
      }

      if (loraConfig.dropout && (loraConfig.dropout < 0.05 || loraConfig.dropout > 0.3)) {
        recommendations.push(
          'LoRA dropout is outside typical range (0.05-0.3). Consider adjusting for better generalization.',
        );
      }
    }

    return compatible;
  }

  /**
   * Check training readiness
   */
  private checkTrainingReadiness(
    configuration: any,
    errors: string[],
    warnings: string[],
    recommendations: string[],
  ): boolean {
    let ready = true;

    // Check if configuration has all necessary components
    if (configuration.status === 'ARCHIVED' || configuration.status === 'DEPRECATED') {
      errors.push(
        `Configuration status is ${configuration.status} and cannot be used for training`,
      );
      ready = false;
    }

    // Add recommendations based on configuration
    if (configuration.trainingMethod === 'SUPERVISED_FINE_TUNING') {
      recommendations.push(
        'Ensure your dataset contains high-quality input-output pairs for supervised learning',
      );
    }

    if (configuration.trainingMethod === 'CONVERSATION_FINE_TUNING') {
      recommendations.push(
        'Verify that conversation turns are properly formatted in your dataset',
      );
    }

    // Resource recommendations
    if (configuration.trainingMethod === 'FULL_FINE_TUNING') {
      recommendations.push(
        'Full fine-tuning requires significant computational resources. Consider using LoRA or QLoRA for faster training.',
      );
    }

    if (configuration.trainingMethod === 'QLORA') {
      recommendations.push(
        'QLoRA provides memory-efficient training. Ensure you have proper GPU support for quantization.',
      );
    }

    return ready;
  }

  /**
   * Create audit log entry
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
      await this.prisma.fineTuningConfigAuditLog.create({
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
   * Calculate changes between old and new values
   */
  private calculateChanges(oldValues: any, newValues: any): Record<string, any> {
    if (!oldValues || !newValues) {
      return {};
    }

    const changes: Record<string, any> = {};

    for (const key of Object.keys(newValues)) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = {
          old: oldValues[key],
          new: newValues[key],
        };
      }
    }

    return changes;
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponseDto(configuration: any): FineTuningConfigResponseDto {
    return {
      id: configuration.id,
      companyId: configuration.companyId,
      name: configuration.name,
      description: configuration.description,
      trainingMethod: configuration.trainingMethod,
      baseModelId: configuration.baseModelId,
      datasetId: configuration.datasetId,
      configurationVersion: configuration.configurationVersion,
      precision: configuration.precision,
      loraConfig: configuration.loraConfig,
      qloraConfig: configuration.qloraConfig,
      peftConfig: configuration.peftConfig,
      status: configuration.status,
      tags: configuration.tags,
      validationResult: configuration.validationResult,
      isValidated: configuration.isValidated,
      validatedAt: configuration.validatedAt,
      metadata: configuration.metadata,
      createdBy: configuration.createdBy,
      updatedBy: configuration.updatedBy,
      createdAt: configuration.createdAt,
      updatedAt: configuration.updatedAt,
    };
  }
}
