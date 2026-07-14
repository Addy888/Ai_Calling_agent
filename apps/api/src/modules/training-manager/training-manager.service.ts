import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateDatasetDto,
  UpdateDatasetDto,
  CreateDatasetRecordDto,
  ValidateDatasetDto,
  CreateTrainingJobDto,
  DatasetStatsResponseDto,
  ReadinessScoreResponseDto,
  DatasetType,
  DatasetStatus,
  ValidationType,
  TrainingJobStatus,
} from './dto/training.dto';

@Injectable()
export class TrainingManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async createDataset(companyId: string, userId: string, dto: CreateDatasetDto) {
    const dataset = await this.prisma.trainingDataset.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        datasetType: dto.datasetType,
        category: dto.category,
        version: dto.version || '1.0.0',
        language: dto.language || 'en',
        tags: dto.tags || {},
        metadata: dto.metadata || {},
        status: DatasetStatus.DRAFT,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.prisma.datasetVersion.create({
      data: {
        datasetId: dataset.id,
        companyId,
        version: dataset.version,
        description: 'Initial version',
        status: DatasetStatus.DRAFT,
      },
    });

    return dataset;
  }

  async getDatasets(companyId: string, filters?: {
    datasetType?: DatasetType;
    status?: DatasetStatus;
    category?: string;
  }) {
    const where: any = { companyId };

    if (filters?.datasetType) {
      where.datasetType = filters.datasetType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }

    return this.prisma.trainingDataset.findMany({
      where,
      include: {
        _count: {
          select: {
            records: true,
            versions: true,
            validations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDatasetById(companyId: string, id: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id, companyId },
      include: {
        records: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
        },
        validations: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        coverage: {
          orderBy: { calculatedAt: 'desc' },
        },
        _count: {
          select: {
            records: true,
            versions: true,
            validations: true,
            trainingJobs: true,
          },
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }

  async updateDataset(companyId: string, id: string, userId: string, dto: UpdateDatasetDto) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return this.prisma.trainingDataset.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });
  }

  async deleteDataset(companyId: string, id: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    await this.prisma.trainingDataset.delete({
      where: { id },
    });

    return { message: 'Dataset deleted successfully' };
  }

  async addDatasetRecord(companyId: string, datasetId: string, dto: CreateDatasetRecordDto) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    const record = await this.prisma.trainingDatasetRecord.create({
      data: {
        datasetId,
        companyId,
        recordType: dto.recordType,
        recordData: dto.recordData,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        sourceReference: dto.sourceReference,
        language: dto.language || 'en',
        tags: dto.tags || {},
        metadata: dto.metadata || {},
      },
    });

    await this.prisma.trainingDataset.update({
      where: { id: datasetId },
      data: {
        recordCount: { increment: 1 },
      },
    });

    return record;
  }

  async getDatasetRecords(companyId: string, datasetId: string, page = 1, limit = 50) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.trainingDatasetRecord.findMany({
        where: { datasetId, companyId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.trainingDatasetRecord.count({
        where: { datasetId, companyId },
      }),
    ]);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async validateDataset(companyId: string, datasetId: string, dto: ValidateDatasetDto) {
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
        datasetId,
        companyId,
        validationType: dto.validationType,
        status: 'PENDING',
        totalRecords: dataset.recordCount,
      },
    });

    this.performValidation(validation.id, dataset, dto.validationType);

    return validation;
  }

  private async performValidation(validationId: string, dataset: any, validationType: ValidationType) {
    try {
      await this.prisma.datasetValidation.update({
        where: { id: validationId },
        data: { status: 'RUNNING' },
      });

      const records = dataset.records || [];
      let validRecords = 0;
      let invalidRecords = 0;
      let duplicateRecords = 0;
      const issues: any[] = [];
      const errors: any[] = [];
      const warnings: any[] = [];

      if (validationType === ValidationType.DUPLICATE) {
        const seen = new Set();
        const duplicates = new Set();

        records.forEach((record: any) => {
          const key = JSON.stringify(record.recordData);
          if (seen.has(key)) {
            duplicates.add(record.id);
            duplicateRecords++;
          } else {
            seen.add(key);
          }
        });

        for (const recordId of duplicates) {
          await this.prisma.trainingDatasetRecord.update({
            where: { id: recordId as string },
            data: { isDuplicate: true },
          });
        }
      } else if (validationType === ValidationType.STRUCTURE) {
        records.forEach((record: any) => {
          if (!record.recordData || Object.keys(record.recordData).length === 0) {
            invalidRecords++;
            errors.push({
              recordId: record.id,
              error: 'Empty record data',
            });
          } else {
            validRecords++;
          }
        });
      } else if (validationType === ValidationType.CONTENT) {
        records.forEach((record: any) => {
          const data = record.recordData;
          if (data && typeof data === 'object') {
            const hasContent = Object.values(data).some(v => v && String(v).trim().length > 0);
            if (hasContent) {
              validRecords++;
            } else {
              invalidRecords++;
              errors.push({
                recordId: record.id,
                error: 'No valid content found',
              });
            }
          } else {
            invalidRecords++;
          }
        });
      } else {
        validRecords = records.length;
      }

      const validationScore = records.length > 0 
        ? (validRecords / records.length) * 100 
        : 0;

      await this.prisma.datasetValidation.update({
        where: { id: validationId },
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

      await this.prisma.trainingDataset.update({
        where: { id: dataset.id },
        data: {
          validRecordCount: validRecords,
          invalidRecordCount: invalidRecords,
          duplicateCount: duplicateRecords,
          status: validationScore >= 80 ? DatasetStatus.VALIDATED : DatasetStatus.DRAFT,
          lastValidatedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.datasetValidation.update({
        where: { id: validationId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
    }
  }

  async createTrainingJob(companyId: string, userId: string, dto: CreateTrainingJobDto) {
    if (dto.datasetId) {
      const dataset = await this.prisma.trainingDataset.findFirst({
        where: { id: dto.datasetId, companyId },
      });

      if (!dataset) {
        throw new NotFoundException('Dataset not found');
      }
    }

    return this.prisma.trainingJob.create({
      data: {
        companyId,
        datasetId: dto.datasetId,
        jobName: dto.jobName,
        jobType: dto.jobType,
        configuration: dto.configuration,
        datasets: dto.datasets || {},
        metadata: dto.metadata || {},
        status: TrainingJobStatus.PENDING,
        createdBy: userId,
      },
    });
  }

  async getTrainingJobs(companyId: string) {
    return this.prisma.trainingJob.findMany({
      where: { companyId },
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            datasetType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrainingJobById(companyId: string, id: string) {
    const job = await this.prisma.trainingJob.findFirst({
      where: { id, companyId },
      include: {
        dataset: true,
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Training job not found');
    }

    return job;
  }

  async getDatasetStats(companyId: string): Promise<DatasetStatsResponseDto> {
    const datasets = await this.prisma.trainingDataset.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    const datasetsByType: Record<string, number> = {};
    const datasetsByStatus: Record<string, number> = {};
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;
    let duplicateRecords = 0;

    datasets.forEach((dataset) => {
      datasetsByType[dataset.datasetType] = (datasetsByType[dataset.datasetType] || 0) + 1;
      datasetsByStatus[dataset.status] = (datasetsByStatus[dataset.status] || 0) + 1;
      totalRecords += dataset.recordCount;
      validRecords += dataset.validRecordCount;
      invalidRecords += dataset.invalidRecordCount;
      duplicateRecords += dataset.duplicateCount;
    });

    const validations = await this.prisma.datasetValidation.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        validationScore: { not: null },
      },
    });

    const avgQuality = validations.length > 0
      ? validations.reduce((sum, v) => sum + (v.validationScore || 0), 0) / validations.length
      : 0;

    const coverage = await this.prisma.datasetCoverage.findMany({
      where: { companyId },
    });

    const avgCoverage = coverage.length > 0
      ? coverage.reduce((sum, c) => sum + c.coveragePercentage, 0) / coverage.length
      : 0;

    return {
      totalDatasets: datasets.length,
      datasetsByType,
      datasetsByStatus,
      totalRecords,
      validRecords,
      invalidRecords,
      duplicateRecords,
      averageQuality: Math.round(avgQuality * 100) / 100,
      averageCoverage: Math.round(avgCoverage * 100) / 100,
    };
  }

  async getReadinessScore(companyId: string): Promise<ReadinessScoreResponseDto> {
    const latestVersion = await this.prisma.trainingVersion.findFirst({
      where: { companyId, isCurrent: true },
      include: {
        readinessReport: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestVersion || !latestVersion.readinessReport) {
      const config = await this.prisma.trainingConfiguration.findUnique({
        where: { companyId },
      });

      const readinessThreshold = config?.readinessThreshold || 85.0;

      return {
        overallReadiness: 0,
        knowledgeReadiness: 0,
        conversationReadiness: 0,
        promptReadiness: 0,
        scriptReadiness: 0,
        decisionReadiness: 0,
        evaluationReadiness: 0,
        isReady: false,
        blockers: [
          {
            type: 'NO_TRAINING_VERSION',
            message: 'No training version found. Please create and train a version first.',
            severity: 'critical',
          },
        ],
        warnings: [],
        recommendations: [
          {
            type: 'CREATE_DATASETS',
            message: 'Create training datasets for knowledge, prompts, scripts, and conversations.',
            priority: 'high',
          },
        ],
      };
    }

    const report = latestVersion.readinessReport;

    return {
      overallReadiness: report.overallReadiness,
      knowledgeReadiness: report.knowledgeReadiness,
      conversationReadiness: report.conversationReadiness,
      promptReadiness: report.promptReadiness,
      scriptReadiness: report.scriptReadiness,
      decisionReadiness: report.decisionReadiness,
      evaluationReadiness: report.evaluationReadiness,
      isReady: report.isReady,
      blockers: (report.blockers as any) || [],
      warnings: (report.warnings as any) || [],
      recommendations: (report.recommendations as any) || [],
    };
  }

  async getDatasetVersions(companyId: string, datasetId: string) {
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return this.prisma.datasetVersion.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrainingVersions(companyId: string) {
    return this.prisma.trainingVersion.findMany({
      where: { companyId },
      include: {
        readinessReport: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getValidationReports(companyId: string, datasetId?: string) {
    const where: any = { companyId };
    if (datasetId) {
      where.datasetId = datasetId;
    }

    return this.prisma.datasetValidation.findMany({
      where,
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            datasetType: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }
}
