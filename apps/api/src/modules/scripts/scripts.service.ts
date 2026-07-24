import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CreateScriptDto, UpdateScriptDto, ScriptFilterDto } from './dto/script.dto';

@Injectable()
export class ScriptService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, createScriptDto: CreateScriptDto) {
    const script = await this.prisma.script.create({
      data: {
        ...createScriptDto,
        companyId,
        createdBy: userId,
      },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return {
      success: true,
      data: script,
      message: 'Script created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: ScriptFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    // Merge flat and nested filters parameters
    const search = filters.search || filters.filters?.search;
    const language = filters.language || filters.filters?.language;
    const isActive = filters.isActive !== undefined ? filters.isActive : filters.filters?.isActive;
    const status = filters.status || filters.filters?.status;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (language) {
      where.language = language;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (status) {
      where.status = status;
    }

    const [scripts, total] = await Promise.all([
      this.prisma.script.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          _count: { select: { campaigns: true } },
        },
      }),
      this.prisma.script.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(scripts, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const script = await this.prisma.script.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { campaigns: true } },
      },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    return {
      success: true,
      data: script,
    };
  }

  async update(id: string, companyId: string, userId: string, updateScriptDto: UpdateScriptDto) {
    const script = await this.prisma.script.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    const updatedScript = await this.prisma.script.update({
      where: { id },
      data: {
        ...updateScriptDto,
        updatedBy: userId,
      },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return {
      success: true,
      data: updatedScript,
      message: 'Script updated successfully',
    };
  }

  async remove(id: string, companyId: string) {
    const script = await this.prisma.script.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    if (script._count.campaigns > 0) {
      throw new ConflictException('Cannot delete script that is used in active campaigns');
    }

    await this.prisma.script.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Script deleted successfully',
    };
  }

  async restore(id: string, companyId: string) {
    const script = await this.prisma.script.findFirst({
      where: { id, companyId },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    if (!script.deletedAt) {
      throw new ConflictException('Script is not deleted');
    }

    await this.prisma.script.update({
      where: { id },
      data: { deletedAt: null },
    });

    return {
      success: true,
      message: 'Script restored successfully',
    };
  }

  async duplicate(id: string, companyId: string, userId: string, name: string) {
    const originalScript = await this.prisma.script.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!originalScript) {
      throw new NotFoundException('Script not found');
    }

    const duplicatedScript = await this.prisma.script.create({
      data: {
        name,
        description: `${originalScript.description} (Copy)`,
        content: originalScript.content,
        language: originalScript.language,
        version: '1.0.0',
        companyId,
        createdBy: userId,
      },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return {
      success: true,
      data: duplicatedScript,
      message: 'Script duplicated successfully',
    };
  }

  async getVersionHistory(id: string, companyId: string) {
    const script = await this.prisma.script.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    // For now, return current version only
    // In future phases, implement proper version history table
    return {
      success: true,
      data: [
        {
          version: script.version,
          content: script.content,
          updatedAt: script.updatedAt,
          updatedBy: script.updatedBy,
        },
      ],
    };
  }

  async preview(id: string, companyId: string, sampleData?: any) {
    const script = await this.prisma.script.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    // Replace placeholders with sample data
    const defaultSampleData = {
      firstName: 'John',
      lastName: 'Doe',
      agentName: 'Sarah',
      companyName: 'AI Calling Agent',
      phone: '+1234567890',
    };

    const previewData = { ...defaultSampleData, ...sampleData };
    let previewContent = script.content;

    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      previewContent = previewContent.replace(regex, String(value));
    });

    return {
      success: true,
      data: {
        original: script.content,
        preview: previewContent,
        sampleData: previewData,
      },
    };
  }
}
