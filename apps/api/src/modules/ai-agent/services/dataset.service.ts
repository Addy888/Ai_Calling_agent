import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  UploadDatasetDto,
  BulkUploadDto,
  ValidationReportDto,
  DatasetQueryDto,
  DatasetDashboardDto,
  CreateDatasetJobDto,
  DatasetJobQueryDto,
  CreateExportDto,
} from '../dto/dataset.dto';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

@Injectable()
export class DatasetService {
  private readonly logger = new Logger(DatasetService.name);
  private readonly datasetRoot = path.join(process.cwd(), 'Ai voice Dataset');

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // UPLOAD & FILE MANAGEMENT
  // ============================================

  async uploadDataset(companyId: string, uploadDto: UploadDatasetDto, uploadedBy?: string) {
    this.logger.log(`Uploading dataset: ${uploadDto.fileName} for company ${companyId}`);

    // Check for duplicate
    const existingRecord = await this.prisma.datasetRecord.findFirst({
      where: {
        companyId,
        fileHash: uploadDto.fileHash,
        deletedAt: null,
      },
    });

    if (existingRecord) {
      throw new BadRequestException('File already exists (duplicate detected)');
    }

    // Create dataset record
    const datasetRecord = await this.prisma.datasetRecord.create({
      data: {
        companyId,
        fileName: uploadDto.fileName,
        originalFileName: uploadDto.fileName,
        fileSize: uploadDto.fileSize,
        filePath: path.join(this.datasetRoot, 'raw_calls', uploadDto.fileName),
        fileHash: uploadDto.fileHash,
        mimeType: uploadDto.mimeType || 'audio/mpeg',
        status: 'UPLOADED',
        uploadProgress: 100,
        uploadedBy,
      },
    });

    // Create validation job
    await this.createJob(companyId, {
      datasetRecordId: datasetRecord.id,
      jobType: 'VALIDATION' as any,
      priority: 10,
    });

    this.logger.log(`Dataset uploaded successfully: ${datasetRecord.id}`);

    return datasetRecord;
  }

  async bulkUpload(companyId: string, bulkDto: BulkUploadDto, uploadedBy?: string) {
    this.logger.log(`Bulk upload started: ${bulkDto.files.length} files`);

    const results = [];
    const errors = [];

    for (const fileDto of bulkDto.files) {
      try {
        const record = await this.uploadDataset(companyId, fileDto, uploadedBy);
        results.push(record);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to upload ${fileDto.fileName}: ${errorMessage}`);
        errors.push({
          fileName: fileDto.fileName,
          error: errorMessage,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  // ============================================
  // DATASET QUERIES
  // ============================================

  async getDatasets(companyId: string, query: DatasetQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { fileName: { contains: query.search } },
        { originalFileName: { contains: query.search } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.processingStage) {
      where.processingStage = query.processingStage;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.datasetRecord.count({ where }),
      this.prisma.datasetRecord.findMany({
        where,
        include: {
          recordings: true,
          transcript: true,
          conversation: true,
          entities: true,
          intents: true,
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

  async getDatasetById(companyId: string, id: string) {
    const dataset = await this.prisma.datasetRecord.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        recordings: true,
        transcript: {
          include: {
            diarization: true,
          },
        },
        conversation: true,
        entities: true,
        intents: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }

  async deleteDataset(companyId: string, id: string) {
    const dataset = await this.getDatasetById(companyId, id);

    await this.prisma.datasetRecord.update({
      where: { id: dataset.id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Dataset deleted: ${id}`);

    return { success: true, message: 'Dataset deleted successfully' };
  }

  // ============================================
  // DASHBOARD & STATISTICS
  // ============================================

  async getDashboard(companyId: string): Promise<DatasetDashboardDto> {
    const [
      totalFiles,
      processed,
      pending,
      failed,
      recordings,
      transcripts,
    ] = await Promise.all([
      this.prisma.datasetRecord.count({
        where: { companyId, deletedAt: null },
      }),
      this.prisma.datasetRecord.count({
        where: { companyId, status: 'COMPLETED', deletedAt: null },
      }),
      this.prisma.datasetRecord.count({
        where: { companyId, status: { in: ['PENDING', 'PROCESSING'] }, deletedAt: null },
      }),
      this.prisma.datasetRecord.count({
        where: { companyId, status: 'FAILED', deletedAt: null },
      }),
      this.prisma.recording.findMany({
        where: {
          datasetRecord: { companyId, deletedAt: null },
        },
        select: {
          duration: true,
          noiseLevel: true,
        },
      }),
      this.prisma.transcript.groupBy({
        by: ['language'],
        where: {
          datasetRecord: { companyId, deletedAt: null },
        },
        _count: true,
      }),
    ]);

    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalNoise = recordings.reduce((sum, r) => sum + (r.noiseLevel || 0), 0);
    const averageNoiseLevel = recordings.length > 0 ? totalNoise / recordings.length : 0;

    const languages = transcripts.map((t) => ({
      language: t.language || 'unknown',
      count: t._count,
    }));

    // Get storage used
    const datasets = await this.prisma.datasetRecord.findMany({
      where: { companyId, deletedAt: null },
      select: { fileSize: true },
    });
    const storageUsed = datasets.reduce((sum, d) => sum + Number(d.fileSize), 0);

    // Get processing statistics
    const jobs = await this.prisma.datasetJob.groupBy({
      by: ['jobType', 'status'],
      where: {
        datasetRecord: { companyId, deletedAt: null },
      },
      _count: true,
    });

    const processingStats = {
      validation: 0,
      transcription: 0,
      diarization: 0,
      conversation: 0,
      entityExtraction: 0,
      intentDetection: 0,
    };

    jobs.forEach((job) => {
      if (job.status === 'COMPLETED') {
        switch (job.jobType) {
          case 'VALIDATION':
            processingStats.validation += job._count;
            break;
          case 'TRANSCRIPTION':
            processingStats.transcription += job._count;
            break;
          case 'DIARIZATION':
            processingStats.diarization += job._count;
            break;
          case 'CONVERSATION_PARSING':
            processingStats.conversation += job._count;
            break;
          case 'ENTITY_EXTRACTION':
            processingStats.entityExtraction += job._count;
            break;
          case 'INTENT_DETECTION':
            processingStats.intentDetection += job._count;
            break;
        }
      }
    });

    return {
      totalFiles,
      processed,
      pending,
      failed,
      languages,
      totalDuration,
      storageUsed,
      averageNoiseLevel,
      processingStats,
    };
  }

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  async createJob(companyId: string, createDto: CreateDatasetJobDto) {
    // Verify dataset belongs to company
    const dataset = await this.prisma.datasetRecord.findFirst({
      where: {
        id: createDto.datasetRecordId,
        companyId,
        deletedAt: null,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    // Check if job already exists
    const existingJob = await this.prisma.datasetJob.findFirst({
      where: {
        datasetRecordId: createDto.datasetRecordId,
        jobType: createDto.jobType,
        status: { in: ['PENDING', 'QUEUED', 'RUNNING'] },
      },
    });

    if (existingJob) {
      return existingJob;
    }

    // Create job
    const job = await this.prisma.datasetJob.create({
      data: {
        datasetRecordId: createDto.datasetRecordId,
        jobType: createDto.jobType,
        priority: createDto.priority || 0,
        status: 'QUEUED',
        metadata: createDto.metadata,
      },
    });

    this.logger.log(`Job created: ${job.jobType} for dataset ${createDto.datasetRecordId}`);

    return job;
  }

  async getJobs(companyId: string, query: DatasetJobQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      datasetRecord: {
        companyId,
        deletedAt: null,
      },
    };

    if (query.datasetRecordId) {
      where.datasetRecordId = query.datasetRecordId;
    }

    if (query.jobType) {
      where.jobType = query.jobType;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, data] = await Promise.all([
      this.prisma.datasetJob.count({ where }),
      this.prisma.datasetJob.findMany({
        where,
        include: {
          datasetRecord: {
            select: {
              id: true,
              fileName: true,
              originalFileName: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
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

  async getJobById(companyId: string, jobId: string) {
    const job = await this.prisma.datasetJob.findFirst({
      where: {
        id: jobId,
        datasetRecord: {
          companyId,
          deletedAt: null,
        },
      },
      include: {
        datasetRecord: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async retryJob(companyId: string, jobId: string) {
    const job = await this.getJobById(companyId, jobId);

    if (job.status === 'RUNNING') {
      throw new BadRequestException('Job is currently running');
    }

    const updatedJob = await this.prisma.datasetJob.update({
      where: { id: job.id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    this.logger.log(`Job retried: ${jobId}`);

    return updatedJob;
  }

  async cancelJob(companyId: string, jobId: string) {
    const job = await this.getJobById(companyId, jobId);

    if (job.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed job');
    }

    const updatedJob = await this.prisma.datasetJob.update({
      where: { id: job.id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Job cancelled: ${jobId}`);

    return updatedJob;
  }

  // ============================================
  // EXPORT MANAGEMENT
  // ============================================

  async createExport(companyId: string, createDto: CreateExportDto, generatedBy?: string) {
    this.logger.log(`Creating export: ${createDto.name} for company ${companyId}`);

    const datasetExport = await this.prisma.datasetExport.create({
      data: {
        companyId,
        name: createDto.name,
        description: createDto.description,
        format: createDto.format,
        filters: createDto.filters,
        status: 'PENDING',
        generatedBy,
        metadata: {
          includePII: createDto.includePII,
          includeTranscripts: createDto.includeTranscripts,
          includeConversations: createDto.includeConversations,
          includeEntities: createDto.includeEntities,
          includeIntents: createDto.includeIntents,
        },
      },
    });

    this.logger.log(`Export created: ${datasetExport.id}`);

    return datasetExport;
  }

  async getExports(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.datasetExport.count({ where: { companyId } }),
      this.prisma.datasetExport.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
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

  async getExportById(companyId: string, id: string) {
    const datasetExport = await this.prisma.datasetExport.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!datasetExport) {
      throw new NotFoundException('Export not found');
    }

    return datasetExport;
  }

  async deleteExport(companyId: string, id: string) {
    const datasetExport = await this.getExportById(companyId, id);

    // Delete file if exists
    if (datasetExport.filePath) {
      try {
        await fs.unlink(datasetExport.filePath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to delete export file: ${errorMessage}`);
      }
    }

    await this.prisma.datasetExport.delete({
      where: { id: datasetExport.id },
    });

    this.logger.log(`Export deleted: ${id}`);

    return { success: true, message: 'Export deleted successfully' };
  }

  // ============================================
  // PROCESSING LOGS
  // ============================================

  async addLog(
    datasetRecordId: string,
    stage: string,
    level: string,
    message: string,
    details?: any,
  ) {
    await this.prisma.processingLog.create({
      data: {
        datasetRecordId,
        stage,
        level,
        message,
        details,
      },
    });
  }

  async getLogs(companyId: string, datasetRecordId: string, page = 1, limit = 50) {
    // Verify dataset belongs to company
    await this.getDatasetById(companyId, datasetRecordId);

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.processingLog.count({ where: { datasetRecordId } }),
      this.prisma.processingLog.findMany({
        where: { datasetRecordId },
        orderBy: { timestamp: 'desc' },
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
}
