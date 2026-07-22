import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  SelectBaseModelDto,
  UpdateModelSelectionDto,
  CompareModelsDto,
  ModelRecommendationRequestDto,
  ModelComparisonResponseDto,
  ModelComparisonItem,
  ModelRecommendationResponseDto,
  SelectedModelResponseDto,
  AvailableModelsResponseDto,
} from '../dto/model-selection.dto';

@Injectable()
export class ModelSelectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all available base models for selection
   */
  async getAvailableModels(companyId: string): Promise<AvailableModelsResponseDto> {
    const models = await this.prisma.modelRegistry.findMany({
      where: {
        companyId,
        status: {
          in: ['REGISTERED', 'READY'],
        },
      },
      include: {
        baseModel: {
          select: {
            id: true,
            name: true,
            provider: true,
            family: true,
            version: true,
            parameters: true,
            contextLength: true,
            languages: true,
            quantizationSupport: true,
            minimumVram: true,
            recommendedVram: true,
            license: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const activeCount = models.filter(m => m.isActive).length;

    return {
      total: models.length,
      activeCount,
      models: models.map(m => ({
        id: m.id,
        registryName: m.registryName,
        provider: m.provider,
        family: m.family,
        versionString: m.versionString,
        status: m.status,
        isActive: m.isActive,
        description: m.description,
        baseModel: m.baseModel,
      })),
    };
  }

  /**
   * Select a base model for training
   */
  async selectBaseModel(
    companyId: string,
    userId: string,
    dto: SelectBaseModelDto,
  ): Promise<SelectedModelResponseDto> {
    // Validate model exists and is active
    const model = await this.prisma.modelRegistry.findFirst({
      where: {
        id: dto.modelRegistryId,
        companyId,
      },
      include: {
        baseModel: true,
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found in registry');
    }

    if (!model.isActive) {
      throw new BadRequestException('Model is not active');
    }

    if (model.status === 'ARCHIVED' || model.status === 'DEPRECATED') {
      throw new BadRequestException('Model is archived or deprecated and cannot be selected');
    }

    // Check if there's already a selection for this training config
    const trainingConfigId = dto.trainingConfigId || `default_${companyId}`;
    
    const existingSelection = await this.prisma.trainingModelSelection.findFirst({
      where: {
        companyId,
        trainingConfigId,
      },
    });

    let selection;

    if (existingSelection) {
      // Deactivate existing selection
      await this.prisma.trainingModelSelection.update({
        where: { id: existingSelection.id },
        data: { isSelected: false },
      });
    }

    // Create new selection
    selection = await this.prisma.trainingModelSelection.create({
      data: {
        companyId,
        trainingConfigId,
        datasetId: dto.datasetId,
        modelRegistryId: dto.modelRegistryId,
        selectionReason: dto.selectionReason,
        isSelected: true,
        metadata: dto.metadata || {},
        selectedBy: userId,
      },
      include: {
        modelRegistry: {
          include: {
            baseModel: true,
          },
        },
        dataset: {
          select: {
            id: true,
            name: true,
            datasetType: true,
            recordCount: true,
            language: true,
            category: true,
          },
        },
      },
    });

    // Log the selection in audit logs
    await this.prisma.modelAuditLog.create({
      data: {
        modelId: dto.modelRegistryId,
        companyId,
        action: 'MODEL_SELECTED',
        userId,
        userName: userId,
        details: {
          selectionId: selection.id,
          trainingConfigId,
          datasetId: dto.datasetId,
          reason: dto.selectionReason,
        },
        status: 'SUCCESS',
      },
    });

    return this.formatSelectionResponse(selection);
  }

  /**
   * Update existing model selection
   */
  async updateSelection(
    companyId: string,
    selectionId: string,
    userId: string,
    dto: UpdateModelSelectionDto,
  ): Promise<SelectedModelResponseDto> {
    const selection = await this.prisma.trainingModelSelection.findFirst({
      where: {
        id: selectionId,
        companyId,
      },
    });

    if (!selection) {
      throw new NotFoundException('Model selection not found');
    }

    // If changing model, validate new model
    if (dto.modelRegistryId && dto.modelRegistryId !== selection.modelRegistryId) {
      const newModel = await this.prisma.modelRegistry.findFirst({
        where: {
          id: dto.modelRegistryId,
          companyId,
          isActive: true,
        },
      });

      if (!newModel) {
        throw new NotFoundException('New model not found or not active');
      }

      // Log the change
      await this.prisma.modelAuditLog.create({
        data: {
          modelId: dto.modelRegistryId,
          companyId,
          action: 'SELECTION_CHANGED',
          userId,
          userName: userId,
          details: {
            selectionId,
            oldModelId: selection.modelRegistryId,
            newModelId: dto.modelRegistryId,
            reason: dto.selectionReason,
          },
          status: 'SUCCESS',
        },
      });
    }

    const updated = await this.prisma.trainingModelSelection.update({
      where: { id: selectionId },
      data: {
        modelRegistryId: dto.modelRegistryId,
        selectionReason: dto.selectionReason,
        confidence: dto.confidence,
        advantages: dto.advantages,
        limitations: dto.limitations,
        metadata: dto.metadata,
      },
      include: {
        modelRegistry: {
          include: {
            baseModel: true,
          },
        },
        dataset: {
          select: {
            id: true,
            name: true,
            datasetType: true,
            recordCount: true,
            language: true,
            category: true,
          },
        },
      },
    });

    return this.formatSelectionResponse(updated);
  }

  /**
   * Remove model selection
   */
  async removeSelection(companyId: string, selectionId: string, userId: string): Promise<{ message: string }> {
    const selection = await this.prisma.trainingModelSelection.findFirst({
      where: {
        id: selectionId,
        companyId,
      },
    });

    if (!selection) {
      throw new NotFoundException('Model selection not found');
    }

    // Log the removal
    await this.prisma.modelAuditLog.create({
      data: {
        modelId: selection.modelRegistryId,
        companyId,
        action: 'SELECTION_REMOVED',
        userId,
        userName: userId,
        details: {
          selectionId,
          trainingConfigId: selection.trainingConfigId,
        },
        status: 'SUCCESS',
      },
    });

    await this.prisma.trainingModelSelection.delete({
      where: { id: selectionId },
    });

    return { message: 'Model selection removed successfully' };
  }

  /**
   * Get current selected model
   */
  async getSelectedModel(companyId: string, trainingConfigId?: string): Promise<SelectedModelResponseDto | null> {
    const configId = trainingConfigId || `default_${companyId}`;

    const selection = await this.prisma.trainingModelSelection.findFirst({
      where: {
        companyId,
        trainingConfigId: configId,
        isSelected: true,
      },
      include: {
        modelRegistry: {
          include: {
            baseModel: true,
          },
        },
        dataset: {
          select: {
            id: true,
            name: true,
            datasetType: true,
            recordCount: true,
            language: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!selection) {
      return null;
    }

    return this.formatSelectionResponse(selection);
  }

  /**
   * Compare multiple models
   */
  async compareModels(companyId: string, dto: CompareModelsDto): Promise<ModelComparisonResponseDto> {
    if (dto.modelIds.length < 2) {
      throw new BadRequestException('At least 2 models required for comparison');
    }

    if (dto.modelIds.length > 5) {
      throw new BadRequestException('Maximum 5 models can be compared at once');
    }

    const models = await this.prisma.modelRegistry.findMany({
      where: {
        id: { in: dto.modelIds },
        companyId,
      },
      include: {
        baseModel: true,
      },
    });

    if (models.length !== dto.modelIds.length) {
      throw new NotFoundException('One or more models not found');
    }

    const comparisonItems: ModelComparisonItem[] = models.map(model => {
      const baseModel = model.baseModel;
      const languages = baseModel?.languages as string[] || [];
      const quantization = baseModel?.quantizationSupport as string[] || [];

      return {
        id: model.id,
        name: model.registryName,
        provider: model.provider,
        family: model.family,
        version: model.versionString,
        parameters: baseModel?.parameters || 'Unknown',
        contextLength: baseModel?.contextLength || 0,
        languages,
        minimumVram: baseModel?.minimumVram || 0,
        recommendedVram: baseModel?.recommendedVram || 0,
        license: baseModel?.license || 'Unknown',
        status: model.status,
        isActive: model.isActive,
        quantizationSupport: quantization,
        advantages: this.generateAdvantages(model, baseModel),
        limitations: this.generateLimitations(model, baseModel),
      };
    });

    // Determine recommended model and best models for various criteria
    const summary = this.generateComparisonSummary(comparisonItems);
    const recommendedModelId = this.determineRecommendedModel(comparisonItems);

    return {
      models: comparisonItems,
      recommendedModelId,
      summary,
    };
  }

  /**
   * Get recommended model based on dataset
   */
  async getRecommendedModel(
    companyId: string,
    dto: ModelRecommendationRequestDto,
  ): Promise<ModelRecommendationResponseDto> {
    let datasetAnalysis = null;

    // Analyze dataset if provided
    if (dto.datasetId) {
      const dataset = await this.prisma.trainingDataset.findFirst({
        where: {
          id: dto.datasetId,
          companyId,
        },
      });

      if (!dataset) {
        throw new NotFoundException('Dataset not found');
      }

      datasetAnalysis = {
        datasetId: dataset.id,
        datasetName: dataset.name,
        recordCount: dataset.recordCount,
        language: dataset.language,
        category: dataset.category || 'general',
      };
    }

    // Get all available models
    const models = await this.prisma.modelRegistry.findMany({
      where: {
        companyId,
        isActive: true,
        status: {
          in: ['REGISTERED', 'READY'],
        },
      },
      include: {
        baseModel: true,
      },
    });

    if (models.length === 0) {
      throw new NotFoundException('No active models available for selection');
    }

    // Score and rank models based on various factors
    const scoredModels = models.map(model => {
      let score = 0;
      const reasons: string[] = [];
      const advantages: string[] = [];
      const limitations: string[] = [];

      const baseModel = model.baseModel;

      // Base score for active and ready models
      if (model.status === 'READY') {
        score += 20;
        reasons.push('Model is ready for training');
      }

      // Context length scoring
      if (baseModel?.contextLength) {
        if (baseModel.contextLength >= 32000) {
          score += 15;
          advantages.push('Large context window (32k+ tokens)');
        } else if (baseModel.contextLength >= 8000) {
          score += 10;
          advantages.push('Good context window (8k+ tokens)');
        } else {
          limitations.push('Limited context window');
        }
      }

      // Language support
      if (datasetAnalysis && baseModel?.languages) {
        const languages = baseModel.languages as string[] || [];
        if (languages.includes(datasetAnalysis.language) || languages.includes('multilingual')) {
          score += 15;
          advantages.push(`Supports ${datasetAnalysis.language} language`);
        }
      }

      // VRAM requirements (lower is better for accessibility)
      if (baseModel?.minimumVram) {
        if (baseModel.minimumVram <= 8) {
          score += 10;
          advantages.push('Low VRAM requirements (<=8GB)');
        } else if (baseModel.minimumVram <= 16) {
          score += 5;
          advantages.push('Moderate VRAM requirements (<=16GB)');
        } else {
          limitations.push('High VRAM requirements (>16GB)');
        }
      }

      // Quantization support
      if (baseModel?.quantizationSupport) {
        const quantSupport = baseModel.quantizationSupport as string[] || [];
        if (quantSupport.length > 0) {
          score += 10;
          advantages.push('Supports model quantization');
        }
      }

      // Dataset size consideration
      if (datasetAnalysis) {
        if (datasetAnalysis.recordCount >= 10000) {
          // Prefer larger models for large datasets
          if (baseModel?.parameters && baseModel.parameters.includes('13B')) {
            score += 10;
            advantages.push('Good size for large dataset');
          }
        } else if (datasetAnalysis.recordCount >= 1000) {
          // Medium datasets
          if (baseModel?.parameters && baseModel.parameters.includes('7B')) {
            score += 10;
            advantages.push('Optimal size for medium dataset');
          }
        } else {
          // Small datasets - prefer smaller models
          if (baseModel?.parameters && (baseModel.parameters.includes('3B') || baseModel.parameters.includes('7B'))) {
            score += 10;
            advantages.push('Right size for small dataset');
          }
        }
      }

      // License consideration
      if (baseModel?.license) {
        if (baseModel.license.toLowerCase().includes('apache') || 
            baseModel.license.toLowerCase().includes('mit')) {
          score += 5;
          advantages.push('Permissive license');
        }
      }

      // Latest models get bonus
      if (model.isLatest) {
        score += 5;
        advantages.push('Latest version');
      }

      return {
        model,
        baseModel,
        score,
        reasons,
        advantages,
        limitations,
      };
    });

    // Sort by score
    scoredModels.sort((a, b) => b.score - a.score);

    const recommended = scoredModels[0];

    if (!recommended) {
      throw new NotFoundException('Could not determine recommended model');
    }

    const confidenceScore = Math.min(recommended.score / 100, 1.0);

    return {
      recommendedModelId: recommended.model.id,
      model: {
        id: recommended.model.id,
        name: recommended.model.registryName,
        provider: recommended.model.provider,
        family: recommended.model.family,
        version: recommended.model.versionString,
        parameters: recommended.baseModel?.parameters || 'Unknown',
        contextLength: recommended.baseModel?.contextLength || 0,
        languages: (recommended.baseModel?.languages as string[]) || [],
        license: recommended.baseModel?.license || 'Unknown',
      },
      reason: recommended.reasons.join('; '),
      confidenceScore,
      advantages: recommended.advantages,
      limitations: recommended.limitations,
      datasetAnalysis,
    };
  }

  /**
   * Get model selection audit logs
   */
  async getSelectionAuditLogs(companyId: string, modelId?: string) {
    const where: any = {
      companyId,
      action: {
        in: ['MODEL_SELECTED', 'SELECTION_CHANGED', 'SELECTION_REMOVED'],
      },
    };

    if (modelId) {
      where.modelId = modelId;
    }

    return this.prisma.modelAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Private helper methods

  private formatSelectionResponse(selection: any): SelectedModelResponseDto {
    return {
      id: selection.id,
      companyId: selection.companyId,
      trainingConfigId: selection.trainingConfigId,
      datasetId: selection.datasetId,
      modelRegistryId: selection.modelRegistryId,
      selectionReason: selection.selectionReason,
      isSelected: selection.isSelected,
      confidence: selection.confidence,
      advantages: selection.advantages,
      limitations: selection.limitations,
      recommendationScore: selection.recommendationScore,
      selectedBy: selection.selectedBy,
      createdAt: selection.createdAt,
      updatedAt: selection.updatedAt,
      modelRegistry: {
        id: selection.modelRegistry.id,
        registryName: selection.modelRegistry.registryName,
        provider: selection.modelRegistry.provider,
        family: selection.modelRegistry.family,
        versionString: selection.modelRegistry.versionString,
        status: selection.modelRegistry.status,
        isActive: selection.modelRegistry.isActive,
        description: selection.modelRegistry.description,
        baseModel: selection.modelRegistry.baseModel,
      },
      dataset: selection.dataset,
    };
  }

  private generateAdvantages(model: any, baseModel: any): string[] {
    const advantages: string[] = [];

    if (model.status === 'READY') {
      advantages.push('Ready for immediate use');
    }

    if (baseModel?.contextLength >= 32000) {
      advantages.push('Excellent context window');
    }

    if (baseModel?.minimumVram && baseModel.minimumVram <= 8) {
      advantages.push('Low hardware requirements');
    }

    const quantSupport = baseModel?.quantizationSupport as string[] || [];
    if (quantSupport.length > 0) {
      advantages.push('Supports quantization for efficiency');
    }

    const languages = baseModel?.languages as string[] || [];
    if (languages.includes('multilingual') || languages.length > 5) {
      advantages.push('Extensive language support');
    }

    return advantages;
  }

  private generateLimitations(model: any, baseModel: any): string[] {
    const limitations: string[] = [];

    if (model.status === 'REGISTERED' && model.status !== 'READY') {
      limitations.push('Model requires setup before use');
    }

    if (baseModel?.contextLength && baseModel.contextLength < 4096) {
      limitations.push('Limited context window');
    }

    if (baseModel?.minimumVram && baseModel.minimumVram > 24) {
      limitations.push('High VRAM requirements');
    }

    if (!baseModel?.quantizationSupport || (baseModel.quantizationSupport as any[]).length === 0) {
      limitations.push('No quantization support');
    }

    return limitations;
  }

  private generateComparisonSummary(models: ModelComparisonItem[]) {
    let bestForDataSize = models[0].id;
    let bestForLanguages = models[0].id;
    let bestForVRAM = models[0].id;
    let mostBalanced = models[0].id;

    let maxLangs = models[0].languages.length;
    let minVRAM = models[0].minimumVram;
    let maxContext = models[0].contextLength;

    models.forEach(model => {
      // Best for languages
      if (model.languages.length > maxLangs) {
        maxLangs = model.languages.length;
        bestForLanguages = model.id;
      }

      // Best for VRAM (lowest)
      if (model.minimumVram < minVRAM) {
        minVRAM = model.minimumVram;
        bestForVRAM = model.id;
      }

      // Best for data size (largest context)
      if (model.contextLength > maxContext) {
        maxContext = model.contextLength;
        bestForDataSize = model.id;
      }
    });

    // Most balanced: good context, reasonable VRAM, multiple languages
    models.forEach(model => {
      const balanceScore = 
        (model.contextLength / 10000) + 
        (model.languages.length * 2) - 
        (model.minimumVram / 4);
      
      const currentBestScore = 
        (models.find(m => m.id === mostBalanced)?.contextLength || 0) / 10000 +
        ((models.find(m => m.id === mostBalanced)?.languages.length || 0) * 2) -
        ((models.find(m => m.id === mostBalanced)?.minimumVram || 0) / 4);

      if (balanceScore > currentBestScore) {
        mostBalanced = model.id;
      }
    });

    return {
      bestForDataSize,
      bestForLanguages,
      bestForVRAM,
      mostBalanced,
    };
  }

  private determineRecommendedModel(models: ModelComparisonItem[]): string {
    // Score each model based on multiple factors
    const scoredModels = models.map(model => {
      let score = 0;

      // Status
      if (model.status === 'READY' && model.isActive) score += 20;

      // Context length
      if (model.contextLength >= 32000) score += 15;
      else if (model.contextLength >= 8000) score += 10;

      // Language support
      score += Math.min(model.languages.length * 2, 15);

      // VRAM efficiency (lower is better)
      if (model.minimumVram <= 8) score += 15;
      else if (model.minimumVram <= 16) score += 10;
      else if (model.minimumVram <= 24) score += 5;

      // Quantization
      if (model.quantizationSupport.length > 0) score += 10;

      return { id: model.id, score };
    });

    scoredModels.sort((a, b) => b.score - a.score);
    return scoredModels[0].id;
  }
}
