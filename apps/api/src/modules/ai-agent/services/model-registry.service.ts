import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateModelRegistryDto,
  UpdateModelRegistryDto,
  ModelRegistryQueryDto,
  CreateModelVersionDto,
  ActivateModelDto,
  ArchiveModelDto,
  ModelRegistryStatusEnum,
  ModelHistoryEventEnum,
} from '../dto/model-registry.dto';
import { ModelRegistryStatus, ModelHistoryEvent } from '@prisma/client';

@Injectable()
export class ModelRegistryService {
  private readonly logger = new Logger(ModelRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // MODEL REGISTRATION
  // ============================================

  async registerModel(
    companyId: string,
    dto: CreateModelRegistryDto,
    userId?: string,
  ) {
    const versionString = `${dto.majorVersion || 1}.${dto.minorVersion || 0}.${dto.patchVersion || 0}`;

    // Check if model with same name and version exists
    const existing = await this.prisma.modelRegistry.findFirst({
      where: {
        companyId,
        registryName: dto.registryName,
        versionString,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Model ${dto.registryName} version ${versionString} already exists`,
      );
    }

    // Verify base model exists if provided
    if (dto.baseModelId) {
      const baseModel = await this.prisma.aIModel.findUnique({
        where: { id: dto.baseModelId },
      });
      if (!baseModel) {
        throw new NotFoundException('Base model not found');
      }
    }

    // Verify parent model if provided
    if (dto.parentModelId) {
      const parentModel = await this.prisma.modelRegistry.findFirst({
        where: { id: dto.parentModelId, companyId },
      });
      if (!parentModel) {
        throw new NotFoundException('Parent model not found');
      }
    }

    const model = await this.prisma.modelRegistry.create({
      data: {
        companyId,
        registryName: dto.registryName,
        baseModelId: dto.baseModelId,
        provider: dto.provider,
        family: dto.family,
        majorVersion: dto.majorVersion || 1,
        minorVersion: dto.minorVersion || 0,
        patchVersion: dto.patchVersion || 0,
        versionString,
        description: dto.description,
        tags: dto.tags || [],
        parentModelId: dto.parentModelId,
        fineTunedFrom: dto.fineTunedFrom,
        metadata: dto.metadata || {},
        createdBy: userId,
        status: ModelRegistryStatus.REGISTERED,
      },
      include: {
        baseModel: true,
        parentModel: true,
      },
    });

    // Create history entry
    await this.createHistory(
      model.id,
      companyId,
      ModelHistoryEvent.CREATED,
      null,
      model,
      userId,
      'Model registered',
    );

    // Create audit log
    await this.createAuditLog(
      model.id,
      companyId,
      'REGISTER_MODEL',
      userId,
      { registryName: dto.registryName, versionString },
      'SUCCESS',
    );

    this.logger.log(`Model registered: ${model.registryName} v${versionString}`);

    return model;
  }

  // ============================================
  // MODEL QUERIES
  // ============================================

  async listModels(companyId: string, query: ModelRegistryQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.search) {
      where.OR = [
        { registryName: { contains: query.search } },
        { provider: { contains: query.search } },
        { family: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.family) {
      where.family = query.family;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isLatest !== undefined) {
      where.isLatest = query.isLatest;
    }

    if (query.tag) {
      where.tags = {
        path: '$',
        array_contains: [query.tag],
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.modelRegistry.count({ where }),
      this.prisma.modelRegistry.findMany({
        where,
        include: {
          baseModel: {
            select: {
              id: true,
              name: true,
              provider: true,
              family: true,
            },
          },
          parentModel: {
            select: {
              id: true,
              registryName: true,
              versionString: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getModel(companyId: string, modelId: string) {
    const model = await this.prisma.modelRegistry.findFirst({
      where: { id: modelId, companyId },
      include: {
        baseModel: true,
        parentModel: {
          select: {
            id: true,
            registryName: true,
            versionString: true,
            status: true,
          },
        },
        childModels: {
          select: {
            id: true,
            registryName: true,
            versionString: true,
            status: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    return model;
  }

  // ============================================
  // MODEL UPDATES
  // ============================================

  async updateModel(
    companyId: string,
    modelId: string,
    dto: UpdateModelRegistryDto,
    userId?: string,
  ) {
    const existing = await this.getModel(companyId, modelId);

    const previousValue = {
      registryName: existing.registryName,
      description: existing.description,
      status: existing.status,
      tags: existing.tags,
      metadata: existing.metadata,
    };

    const updated = await this.prisma.modelRegistry.update({
      where: { id: modelId },
      data: {
        ...dto,
        updatedBy: userId,
      },
      include: {
        baseModel: true,
        parentModel: true,
      },
    });

    const newValue = {
      registryName: updated.registryName,
      description: updated.description,
      status: updated.status,
      tags: updated.tags,
      metadata: updated.metadata,
    };

    // Create history entry
    await this.createHistory(
      modelId,
      companyId,
      ModelHistoryEvent.UPDATED,
      previousValue,
      newValue,
      userId,
      'Model updated',
    );

    // Create audit log
    await this.createAuditLog(
      modelId,
      companyId,
      'UPDATE_MODEL',
      userId,
      { changes: dto },
      'SUCCESS',
    );

    this.logger.log(`Model updated: ${updated.registryName}`);

    return updated;
  }

  // ============================================
  // MODEL ACTIVATION
  // ============================================

  async activateModel(
    companyId: string,
    modelId: string,
    dto: ActivateModelDto,
    userId?: string,
  ) {
    const model = await this.getModel(companyId, modelId);

    if (model.isActive) {
      throw new BadRequestException('Model is already active');
    }

    // Deactivate other active models with same name
    await this.prisma.modelRegistry.updateMany({
      where: {
        companyId,
        registryName: model.registryName,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedBy: userId,
      },
    });

    const updated = await this.prisma.modelRegistry.update({
      where: { id: modelId },
      data: {
        isActive: true,
        updatedBy: userId,
      },
    });

    // Create history entry
    await this.createHistory(
      modelId,
      companyId,
      ModelHistoryEvent.ACTIVATED,
      { isActive: false },
      { isActive: true },
      userId,
      dto.reason || 'Model activated',
    );

    // Create audit log
    await this.createAuditLog(
      modelId,
      companyId,
      'ACTIVATE_MODEL',
      userId,
      { reason: dto.reason },
      'SUCCESS',
    );

    this.logger.log(`Model activated: ${updated.registryName} v${updated.versionString}`);

    return updated;
  }

  async deactivateModel(
    companyId: string,
    modelId: string,
    userId?: string,
  ) {
    const model = await this.getModel(companyId, modelId);

    if (!model.isActive) {
      throw new BadRequestException('Model is already inactive');
    }

    const updated = await this.prisma.modelRegistry.update({
      where: { id: modelId },
      data: {
        isActive: false,
        updatedBy: userId,
      },
    });

    // Create history entry
    await this.createHistory(
      modelId,
      companyId,
      ModelHistoryEvent.DEACTIVATED,
      { isActive: true },
      { isActive: false },
      userId,
      'Model deactivated',
    );

    // Create audit log
    await this.createAuditLog(
      modelId,
      companyId,
      'DEACTIVATE_MODEL',
      userId,
      {},
      'SUCCESS',
    );

    this.logger.log(`Model deactivated: ${updated.registryName}`);

    return updated;
  }

  // ============================================
  // MODEL ARCHIVAL
  // ============================================

  async archiveModel(
    companyId: string,
    modelId: string,
    dto: ArchiveModelDto,
    userId?: string,
  ) {
    const model = await this.getModel(companyId, modelId);

    if (model.status === ModelRegistryStatus.ARCHIVED) {
      throw new BadRequestException('Model is already archived');
    }

    const previousStatus = model.status;

    const updated = await this.prisma.modelRegistry.update({
      where: { id: modelId },
      data: {
        status: ModelRegistryStatus.ARCHIVED,
        isActive: false,
        updatedBy: userId,
      },
    });

    // Create history entry
    await this.createHistory(
      modelId,
      companyId,
      ModelHistoryEvent.ARCHIVED,
      { status: previousStatus, isActive: model.isActive },
      { status: ModelRegistryStatus.ARCHIVED, isActive: false },
      userId,
      dto.reason || 'Model archived',
    );

    // Create audit log
    await this.createAuditLog(
      modelId,
      companyId,
      'ARCHIVE_MODEL',
      userId,
      { reason: dto.reason },
      'SUCCESS',
    );

    this.logger.log(`Model archived: ${updated.registryName}`);

    return updated;
  }

  async restoreModel(
    companyId: string,
    modelId: string,
    userId?: string,
  ) {
    const model = await this.getModel(companyId, modelId);

    if (model.status !== ModelRegistryStatus.ARCHIVED) {
      throw new BadRequestException('Only archived models can be restored');
    }

    const updated = await this.prisma.modelRegistry.update({
      where: { id: modelId },
      data: {
        status: ModelRegistryStatus.REGISTERED,
        updatedBy: userId,
      },
    });

    // Create history entry
    await this.createHistory(
      modelId,
      companyId,
      ModelHistoryEvent.RESTORED,
      { status: ModelRegistryStatus.ARCHIVED },
      { status: ModelRegistryStatus.REGISTERED },
      userId,
      'Model restored from archive',
    );

    // Create audit log
    await this.createAuditLog(
      modelId,
      companyId,
      'RESTORE_MODEL',
      userId,
      {},
      'SUCCESS',
    );

    this.logger.log(`Model restored: ${updated.registryName}`);

    return updated;
  }

  // ============================================
  // VERSION MANAGEMENT
  // ============================================

  async createVersion(
    companyId: string,
    modelId: string,
    dto: CreateModelVersionDto,
    userId?: string,
  ) {
    const parentModel = await this.getModel(companyId, modelId);

    let majorVersion = parentModel.majorVersion;
    let minorVersion = parentModel.minorVersion;
    let patchVersion = parentModel.patchVersion;

    switch (dto.versionType) {
      case 'major':
        majorVersion += 1;
        minorVersion = 0;
        patchVersion = 0;
        break;
      case 'minor':
        minorVersion += 1;
        patchVersion = 0;
        break;
      case 'patch':
        patchVersion += 1;
        break;
    }

    const versionString = `${majorVersion}.${minorVersion}.${patchVersion}`;

    // Mark parent model as not latest
    await this.prisma.modelRegistry.update({
      where: { id: modelId },
      data: { isLatest: false },
    });

    const newVersion = await this.prisma.modelRegistry.create({
      data: {
        companyId,
        registryName: parentModel.registryName,
        baseModelId: parentModel.baseModelId,
        provider: parentModel.provider,
        family: parentModel.family,
        majorVersion,
        minorVersion,
        patchVersion,
        versionString,
        description: dto.description || parentModel.description,
        tags: dto.tags || parentModel.tags,
        parentModelId: modelId,
        fineTunedFrom: parentModel.fineTunedFrom,
        metadata: dto.metadata || parentModel.metadata,
        createdBy: userId,
        status: ModelRegistryStatus.REGISTERED,
        isLatest: true,
      },
      include: {
        baseModel: true,
        parentModel: true,
      },
    });

    // Create history entry
    await this.createHistory(
      newVersion.id,
      companyId,
      ModelHistoryEvent.VERSION_CREATED,
      null,
      newVersion,
      userId,
      `New ${dto.versionType} version created`,
    );

    // Create audit log
    await this.createAuditLog(
      newVersion.id,
      companyId,
      'CREATE_VERSION',
      userId,
      { versionType: dto.versionType, parentModelId: modelId },
      'SUCCESS',
    );

    this.logger.log(
      `New version created: ${newVersion.registryName} v${versionString}`,
    );

    return newVersion;
  }

  async getVersionHistory(companyId: string, modelId: string) {
    const model = await this.getModel(companyId, modelId);

    // Get all versions in the family
    const versions = await this.prisma.modelRegistry.findMany({
      where: {
        companyId,
        OR: [
          { id: modelId },
          { parentModelId: modelId },
          { id: model.parentModelId || undefined },
          { parentModelId: model.parentModelId || undefined },
        ],
      },
      orderBy: [
        { majorVersion: 'desc' },
        { minorVersion: 'desc' },
        { patchVersion: 'desc' },
      ],
      include: {
        parentModel: {
          select: {
            id: true,
            versionString: true,
          },
        },
      },
    });

    return versions;
  }

  // ============================================
  // MODEL HISTORY
  // ============================================

  async getModelHistory(companyId: string, modelId: string) {
    await this.getModel(companyId, modelId);

    const history = await this.prisma.modelRegistryHistory.findMany({
      where: { modelId, companyId },
      orderBy: { createdAt: 'desc' },
    });

    return history;
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(companyId: string) {
    const [total, active, registered, ready, training, archived] = await Promise.all([
      this.prisma.modelRegistry.count({ where: { companyId } }),
      this.prisma.modelRegistry.count({ where: { companyId, isActive: true } }),
      this.prisma.modelRegistry.count({
        where: { companyId, status: ModelRegistryStatus.REGISTERED },
      }),
      this.prisma.modelRegistry.count({
        where: { companyId, status: ModelRegistryStatus.READY },
      }),
      this.prisma.modelRegistry.count({
        where: { companyId, status: ModelRegistryStatus.TRAINING },
      }),
      this.prisma.modelRegistry.count({
        where: { companyId, status: ModelRegistryStatus.ARCHIVED },
      }),
    ]);

    const providers = await this.prisma.modelRegistry.groupBy({
      by: ['provider'],
      where: { companyId },
      _count: { id: true },
    });

    const families = await this.prisma.modelRegistry.groupBy({
      by: ['family'],
      where: { companyId },
      _count: { id: true },
    });

    return {
      total,
      active,
      registered,
      ready,
      training,
      archived,
      providers: providers.map((p) => ({ name: p.provider, count: p._count.id })),
      families: families.map((f) => ({ name: f.family, count: f._count.id })),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async createHistory(
    modelId: string,
    companyId: string,
    eventType: ModelHistoryEvent,
    previousValue: any,
    newValue: any,
    changedBy?: string,
    reason?: string,
  ) {
    return this.prisma.modelRegistryHistory.create({
      data: {
        modelId,
        companyId,
        eventType,
        previousValue,
        newValue,
        changedBy,
        reason,
      },
    });
  }

  private async createAuditLog(
    modelId: string,
    companyId: string,
    action: string,
    userId?: string,
    details?: any,
    status: string = 'SUCCESS',
    errorMessage?: string,
  ) {
    return this.prisma.modelAuditLog.create({
      data: {
        modelId,
        companyId,
        action,
        userId,
        details,
        status,
        errorMessage,
      },
    });
  }
}
