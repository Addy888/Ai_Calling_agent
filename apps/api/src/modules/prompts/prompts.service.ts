import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CreatePromptDto, UpdatePromptDto, PromptFilterDto, PromptStatus } from './dto/prompt.dto';

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, createPromptDto: CreatePromptDto) {
    const prompt = await this.prisma.prompt.create({
      data: {
        ...createPromptDto,
        companyId,
        createdBy: userId,
      },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return {
      success: true,
      data: prompt,
      message: 'Prompt created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: PromptFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    const search = filters.search || filters.filters?.search;
    const status = filters.status || filters.filters?.status;
    const createdAfter = filters.createdAfter || filters.filters?.createdAfter;
    const createdBefore = filters.createdBefore || filters.filters?.createdBefore;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = new Date(createdAfter);
      if (createdBefore) where.createdAt.lte = new Date(createdBefore);
    }

    const [prompts, total] = await Promise.all([
      this.prisma.prompt.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          _count: { select: { campaigns: true } },
        },
      }),
      this.prisma.prompt.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(prompts, total, page, limit),
    };
  }

  async findOne(id: string, companyId: string) {
    const prompt = await this.prisma.prompt.findFirst({
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

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    return {
      success: true,
      data: prompt,
    };
  }

  async update(id: string, companyId: string, userId: string, updatePromptDto: UpdatePromptDto) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    // Validate temperature if provided
    if (updatePromptDto.temperature !== undefined) {
      if (updatePromptDto.temperature < 0 || updatePromptDto.temperature > 2) {
        throw new BadRequestException('Temperature must be between 0 and 2');
      }
    }

    // Validate maxTokens if provided
    if (updatePromptDto.maxTokens !== undefined) {
      if (updatePromptDto.maxTokens < 1 || updatePromptDto.maxTokens > 32000) {
        throw new BadRequestException('Max tokens must be between 1 and 32000');
      }
    }

    const updatedPrompt = await this.prisma.prompt.update({
      where: { id },
      data: {
        ...updatePromptDto,
        updatedBy: userId,
      },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return {
      success: true,
      data: updatedPrompt,
      message: 'Prompt updated successfully',
    };
  }

  async remove(id: string, companyId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    if (prompt._count.campaigns > 0) {
      throw new ConflictException('Cannot delete prompt that is used in active campaigns');
    }

    await this.prisma.prompt.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Prompt deleted successfully',
    };
  }

  async restore(id: string, companyId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, companyId },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    if (!prompt.deletedAt) {
      throw new BadRequestException('Prompt is not deleted');
    }

    await this.prisma.prompt.update({
      where: { id },
      data: { deletedAt: null },
    });

    return {
      success: true,
      message: 'Prompt restored successfully',
    };
  }

  async duplicate(id: string, companyId: string, userId: string, name: string) {
    const originalPrompt = await this.prisma.prompt.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!originalPrompt) {
      throw new NotFoundException('Prompt not found');
    }

    const duplicatedPrompt = await this.prisma.prompt.create({
      data: {
        name,
        description: `${originalPrompt.description} (Copy)`,
        content: originalPrompt.content,
        version: '1.0.0',
        status: 'DRAFT',
        companyId,
        createdBy: userId,
      },
      include: {
        _count: { select: { campaigns: true } },
      },
    });

    return {
      success: true,
      data: duplicatedPrompt,
      message: 'Prompt duplicated successfully',
    };
  }

  async updateStatus(id: string, companyId: string, userId: string, status: PromptStatus) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    const updatedPrompt = await this.prisma.prompt.update({
      where: { id },
      data: {
        status: status as any,
        updatedBy: userId,
      },
    });

    return {
      success: true,
      data: updatedPrompt,
      message: 'Prompt status updated successfully',
    };
  }
}
