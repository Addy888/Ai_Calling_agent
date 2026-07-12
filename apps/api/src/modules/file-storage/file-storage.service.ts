import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { 
  CreateFileStorageDto, 
  UpdateFileStorageDto, 
  FileStorageFilterDto, 
  FileCategory 
} from './dto/file-storage.dto';

@Injectable()
export class FileStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string | null, data: CreateFileStorageDto) {
    const file = await this.prisma.fileStorage.create({
      data: {
        ...data,
        fileName: `${Date.now()}_${data.originalName}`,
        fileSize: BigInt(data.fileSize),
        companyId,
        userId,
        uploadedBy: userId,
      },
    });

    return {
      success: true,
      data: {
        ...file,
        fileSize: Number(file.fileSize),
      },
      message: 'File record created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: FileStorageFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { originalName: { contains: filters.search } },
        { fileName: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.fileType) {
      where.fileType = { contains: filters.fileType };
    }

    if (filters.mimeType) {
      where.mimeType = { contains: filters.mimeType };
    }

    if (filters.publicOnly) {
      where.isPublic = true;
    }

    if (filters.uploadedBy) {
      where.uploadedBy = filters.uploadedBy;
    }

    if (filters.minSize || filters.maxSize) {
      where.fileSize = {};
      if (filters.minSize) where.fileSize.gte = BigInt(filters.minSize);
      if (filters.maxSize) where.fileSize.lte = BigInt(filters.maxSize);
    }

    const [files, total] = await Promise.all([
      this.prisma.fileStorage.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.fileStorage.count({ where }),
    ]);

    // Convert BigInt to number for JSON serialization
    const serializedFiles = files.map(file => ({
      ...file,
      fileSize: Number(file.fileSize),
    }));

    return {
      success: true,
      data: createPaginatedResponse(serializedFiles, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const file = await this.prisma.fileStorage.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return {
      success: true,
      data: {
        ...file,
        fileSize: Number(file.fileSize),
      },
    };
  }

  async update(id: string, companyId: string, data: UpdateFileStorageDto) {
    const file = await this.prisma.fileStorage.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const updatedFile = await this.prisma.fileStorage.update({
      where: { id },
      data,
    });

    return {
      success: true,
      data: {
        ...updatedFile,
        fileSize: Number(updatedFile.fileSize),
      },
      message: 'File updated successfully',
    };
  }

  async remove(id: string, companyId: string) {
    const file = await this.prisma.fileStorage.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.prisma.fileStorage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  async incrementDownloadCount(id: string, companyId: string) {
    const file = await this.prisma.fileStorage.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const updatedFile = await this.prisma.fileStorage.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    return {
      success: true,
      data: {
        ...updatedFile,
        fileSize: Number(updatedFile.fileSize),
      },
    };
  }

  async getStorageStatistics(companyId: string) {
    const [totalFiles, totalSize, byCategory, byFileType] = await Promise.all([
      this.prisma.fileStorage.count({
        where: { companyId, deletedAt: null },
      }),
      this.prisma.fileStorage.aggregate({
        where: { companyId, deletedAt: null },
        _sum: { fileSize: true },
      }),
      this.prisma.fileStorage.groupBy({
        by: ['category'],
        where: { companyId, deletedAt: null },
        _sum: { fileSize: true },
        _count: { id: true },
      }),
      this.prisma.fileStorage.groupBy({
        by: ['fileType'],
        where: { companyId, deletedAt: null },
        _sum: { fileSize: true },
        _count: { id: true },
        orderBy: { _sum: { fileSize: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      success: true,
      data: {
        totalFiles,
        totalSize: Number(totalSize._sum.fileSize || 0),
        byCategory: byCategory.map(cat => ({
          category: cat.category || 'Uncategorized',
          files: cat._count.id,
          size: Number(cat._sum.fileSize || 0),
        })),
        byFileType: byFileType.map(type => ({
          fileType: type.fileType,
          files: type._count.id,
          size: Number(type._sum.fileSize || 0),
        })),
      },
    };
  }

  async getRecentUploads(companyId: string, limit = 10) {
    const files = await this.prisma.fileStorage.findMany({
      where: { companyId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: files.map(file => ({
        ...file,
        fileSize: Number(file.fileSize),
      })),
    };
  }

  async cleanup(companyId: string, daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.fileStorage.deleteMany({
      where: {
        companyId,
        deletedAt: { lt: cutoffDate },
      },
    });

    return {
      success: true,
      data: { deleted: result.count },
      message: `Cleaned up ${result.count} old deleted files`,
    };
  }
}