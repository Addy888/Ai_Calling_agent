import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateTrainingDatasetDto,
  UpdateTrainingDatasetDto,
  GenerateDatasetDto,
  ValidateDatasetDto,
  ExportDatasetDto,
  DatasetQueryDto,
  PreviewDatasetDto,
  DatasetTypeDto,
  DatasetFormatDto,
} from '../dto/training-dataset.dto';

@Injectable()
export class TrainingDatasetService {
  private readonly logger = new Logger(TrainingDatasetService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // DATASET MANAGEMENT
  // ============================================

  async createDataset(companyId: string, dto: CreateTrainingDatasetDto) {
    this.logger.log(`Creating training dataset: ${dto.name}`);

    const dataset = await this.prisma.trainingDataset.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        datasetType: dto.datasetType,
        category: dto.category,
        language: dto.language || 'en',
        tags: dto.tags || [],
        status: 'DRAFT',
        version: '1.0.0',
        metadata: { sourceFilters: dto.sourceFilters },
      },
    });

    return dataset;
  }

  async updateDataset(companyId: string, datasetId: string, dto: UpdateTrainingDatasetDto) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return this.prisma.trainingDataset.update({
      where: { id: datasetId },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        tags: dto.tags,
        isActive: dto.isActive,
        updatedAt: new Date(),
      },
    });
  }

  async getDataset(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }

  async listDatasets(companyId: string, query: DatasetQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    if (query.datasetType) {
      where.datasetType = query.datasetType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.language) {
      where.language = query.language;
    }

    const [total, data] = await Promise.all([
      this.prisma.trainingDataset.count({ where }),
      this.prisma.trainingDataset.findMany({
        where,
        include: {
          _count: {
            select: { records: true, validations: true },
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

  async deleteDataset(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    await this.prisma.trainingDataset.delete({
      where: { id: datasetId },
    });

    return { success: true, message: 'Dataset deleted successfully' };
  }

  // ============================================
  // DATASET PREVIEW
  // ============================================

  async previewDataset(companyId: string, datasetId: string, query: PreviewDatasetDto) {
    const { page = 1, limit = 10, validOnly = true } = query;
    const skip = (page - 1) * limit;

    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    const where: any = { datasetId, companyId };

    if (query.recordType) {
      where.recordType = query.recordType;
    }

    if (validOnly) {
      where.isValid = true;
      where.isDuplicate = false;
    }

    const [total, records] = await Promise.all([
      this.prisma.trainingDatasetRecord.count({ where }),
      this.prisma.trainingDatasetRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      dataset,
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // DATASET VALIDATION
  // ============================================

  async validateDataset(companyId: string, datasetId: string, dto: ValidateDatasetDto) {
    this.logger.log(`Validating dataset: ${datasetId}`);

    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
      include: {
        records: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    const validation = await this.prisma.datasetValidation.create({
      data: {
        companyId,
        datasetId,
        validationType: 'COMPREHENSIVE',
        status: 'RUNNING',
        totalRecords: dataset.recordCount,
      },
    });

    try {
      const issues: any = {
        missingValues: [],
        duplicates: [],
        emptyConversations: [],
        invalidJSON: [],
        languageIssues: [],
      };

      const errors: string[] = [];
      const warnings: string[] = [];
      let validRecords = 0;
      let invalidRecords = 0;
      let duplicateRecords = 0;

      // Validate each record
      for (const record of dataset.records) {
        let isValid = true;

        // Check for missing values
        if (!record.recordData || Object.keys(record.recordData).length === 0) {
          issues.missingValues.push(record.id);
          isValid = false;
        }

        // Check for duplicates
        if (record.isDuplicate) {
          issues.duplicates.push(record.id);
          duplicateRecords++;
        }

        // Validate based on dataset type
        if (dataset.datasetType === 'CONVERSATION') {
          const data = record.recordData as any;
          if (!data.messages || data.messages.length === 0) {
            issues.emptyConversations.push(record.id);
            isValid = false;
          }
        }

        if (isValid) {
          validRecords++;
        } else {
          invalidRecords++;
        }
      }

      // Calculate validation score
      const validationScore = dataset.recordCount > 0
        ? (validRecords / dataset.recordCount) * 100
        : 0;

      // Update validation
      await this.prisma.datasetValidation.update({
        where: { id: validation.id },
        data: {
          status: 'COMPLETED',
          validRecords,
          invalidRecords,
          duplicateRecords,
          issues,
          errors,
          warnings,
          validationScore,
          completedAt: new Date(),
        },
      });

      // Update dataset
      await this.prisma.trainingDataset.update({
        where: { id: datasetId },
        data: {
          validRecordCount: validRecords,
          invalidRecordCount: invalidRecords,
          duplicateCount: duplicateRecords,
          lastValidatedAt: new Date(),
          status: validationScore >= 80 ? 'VALIDATED' : 'DRAFT',
        },
      });

      return {
        validationId: validation.id,
        validationScore,
        totalRecords: dataset.recordCount,
        validRecords,
        invalidRecords,
        duplicateRecords,
        issues,
        errors,
        warnings,
      };
    } catch (error) {
      await this.prisma.datasetValidation.update({
        where: { id: validation.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  // ============================================
  // DATASET STATISTICS
  // ============================================

  async getDatasetStatistics(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
      include: {
        records: {
          select: {
            recordType: true,
            language: true,
            isValid: true,
            isDuplicate: true,
            quality: true,
          },
        },
        validations: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
        coverage: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Calculate statistics
    const languageDistribution: Record<string, number> = {};
    const recordTypeDistribution: Record<string, number> = {};
    const qualityDistribution: Record<string, number> = {};

    for (const record of dataset.records) {
      // Language distribution
      languageDistribution[record.language] = (languageDistribution[record.language] || 0) + 1;

      // Record type distribution
      recordTypeDistribution[record.recordType] =
        (recordTypeDistribution[record.recordType] || 0) + 1;

      // Quality distribution
      if (record.quality) {
        qualityDistribution[record.quality] = (qualityDistribution[record.quality] || 0) + 1;
      }
    }

    const latestValidation = dataset.validations[0];
    const trainingReadiness = this.calculateTrainingReadiness(dataset, latestValidation);

    return {
      dataset: {
        id: dataset.id,
        name: dataset.name,
        type: dataset.datasetType,
        version: dataset.version,
        status: dataset.status,
      },
      counts: {
        total: dataset.recordCount,
        valid: dataset.validRecordCount,
        invalid: dataset.invalidRecordCount,
        duplicates: dataset.duplicateCount,
      },
      distributions: {
        language: languageDistribution,
        recordType: recordTypeDistribution,
        quality: qualityDistribution,
      },
      validation: latestValidation
        ? {
            score: latestValidation.validationScore,
            completedAt: latestValidation.completedAt,
          }
        : null,
      trainingReadiness,
      coverage: dataset.coverage.map((c) => ({
        type: c.coverageType,
        category: c.category,
        percentage: c.coveragePercentage,
      })),
    };
  }

  private calculateTrainingReadiness(dataset: any, validation: any): number {
    let readiness = 0;

    // Data quality (40%)
    if (validation && validation.validationScore) {
      readiness += (validation.validationScore / 100) * 40;
    }

    // Sample size (30%)
    const minSamples = 100;
    const optimalSamples = 1000;
    if (dataset.validRecordCount >= optimalSamples) {
      readiness += 30;
    } else if (dataset.validRecordCount >= minSamples) {
      readiness += (dataset.validRecordCount / optimalSamples) * 30;
    }

    // Validation status (20%)
    if (dataset.status === 'VALIDATED' || dataset.status === 'PUBLISHED') {
      readiness += 20;
    } else if (dataset.lastValidatedAt) {
      readiness += 10;
    }

    // Duplicate percentage (10%)
    const duplicatePercentage =
      dataset.recordCount > 0 ? (dataset.duplicateCount / dataset.recordCount) * 100 : 0;
    if (duplicatePercentage < 5) {
      readiness += 10;
    } else if (duplicatePercentage < 10) {
      readiness += 5;
    }

    return Math.round(readiness);
  }

  // ============================================
  // TRAINING CONFIGURATION
  // ============================================

  async saveTrainingConfiguration(companyId: string, datasetId: string, config: any) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Update dataset metadata with training configuration
    await this.prisma.trainingDataset.update({
      where: { id: datasetId },
      data: {
        metadata: {
          ...(dataset.metadata as any),
          trainingConfiguration: config,
        },
      },
    });

    return { success: true, message: 'Training configuration saved' };
  }

  async getTrainingConfiguration(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    const metadata = dataset.metadata as any;
    return metadata?.trainingConfiguration || {};
  }
}
