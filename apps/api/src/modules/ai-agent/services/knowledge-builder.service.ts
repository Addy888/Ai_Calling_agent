import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateKnowledgeItemDto,
  UpdateKnowledgeItemDto,
  KnowledgeQueryDto,
  QuestionLibraryQueryDto,
} from '../dto/conversation-intelligence.dto';

@Injectable()
export class KnowledgeBuilderService {
  private readonly logger = new Logger(KnowledgeBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // KNOWLEDGE ITEM MANAGEMENT
  // ============================================

  async createKnowledgeItem(companyId: string, dto: CreateKnowledgeItemDto, createdBy?: string) {
    this.logger.log(`Creating knowledge item for company: ${companyId}`);

    const knowledgeItem = await this.prisma.knowledgeItem.create({
      data: {
        companyId,
        category: dto.category,
        question: dto.question,
        answer: dto.answer,
        context: dto.context,
        intent: dto.intent,
        confidence: dto.confidence,
        sourceType: dto.sourceType || 'MANUAL',
        sourceId: dto.sourceId,
        tags: dto.tags || [],
        usageCount: 0,
        isActive: true,
        createdBy,
      },
    });

    return knowledgeItem;
  }

  async updateKnowledgeItem(companyId: string, id: string, dto: UpdateKnowledgeItemDto) {
    const knowledgeItem = await this.prisma.knowledgeItem.findFirst({
      where: { id, companyId },
    });

    if (!knowledgeItem) {
      throw new NotFoundException('Knowledge item not found');
    }

    return this.prisma.knowledgeItem.update({
      where: { id },
      data: dto,
    });
  }

  async deleteKnowledgeItem(companyId: string, id: string) {
    const knowledgeItem = await this.prisma.knowledgeItem.findFirst({
      where: { id, companyId },
    });

    if (!knowledgeItem) {
      throw new NotFoundException('Knowledge item not found');
    }

    await this.prisma.knowledgeItem.delete({
      where: { id },
    });

    return { success: true, message: 'Knowledge item deleted successfully' };
  }

  async getKnowledgeItem(companyId: string, id: string) {
    const knowledgeItem = await this.prisma.knowledgeItem.findFirst({
      where: { id, companyId },
    });

    if (!knowledgeItem) {
      throw new NotFoundException('Knowledge item not found');
    }

    // Increment usage count
    await this.prisma.knowledgeItem.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return knowledgeItem;
  }

  async listKnowledgeItems(companyId: string, query: KnowledgeQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.search) {
      where.OR = [
        { question: { contains: query.search } },
        { answer: { contains: query.search } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.intent) {
      where.intent = query.intent;
    }

    if (query.minConfidence !== undefined) {
      where.confidence = { gte: query.minConfidence };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, data] = await Promise.all([
      this.prisma.knowledgeItem.count({ where }),
      this.prisma.knowledgeItem.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' },
          { confidence: 'desc' },
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

  async searchKnowledge(companyId: string, searchQuery: string, limit = 10) {
    const knowledgeItems = await this.prisma.knowledgeItem.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { question: { contains: searchQuery } },
          { answer: { contains: searchQuery } },
          { context: { contains: searchQuery } },
        ],
      },
      orderBy: [
        { usageCount: 'desc' },
        { confidence: 'desc' },
      ],
      take: limit,
    });

    return knowledgeItems;
  }

  // ============================================
  // QUESTION LIBRARY
  // ============================================

  async listQuestions(companyId: string, query: QuestionLibraryQueryDto) {
    const { page = 1, limit = 20, sortBy = 'frequency', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.search) {
      where.question = { contains: query.search };
    }

    if (query.questionType) {
      where.questionType = query.questionType;
    }

    if (query.askedBy) {
      where.askedBy = query.askedBy;
    }

    const [total, data] = await Promise.all([
      this.prisma.questionLibrary.count({ where }),
      this.prisma.questionLibrary.findMany({
        where,
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

  async getFrequentQuestions(companyId: string, limit = 20) {
    const questions = await this.prisma.questionLibrary.findMany({
      where: { companyId },
      orderBy: { frequency: 'desc' },
      take: limit,
    });

    return questions;
  }

  async getQuestionsByType(companyId: string, questionType: string, limit = 20) {
    const questions = await this.prisma.questionLibrary.findMany({
      where: {
        companyId,
        questionType,
      },
      orderBy: { frequency: 'desc' },
      take: limit,
    });

    return questions;
  }

  // ============================================
  // KNOWLEDGE STATISTICS
  // ============================================

  async getKnowledgeStats(companyId: string) {
    const [
      totalItems,
      activeItems,
      categories,
      avgConfidence,
      mostUsed,
      recentlyAdded,
    ] = await Promise.all([
      this.prisma.knowledgeItem.count({ where: { companyId } }),
      this.prisma.knowledgeItem.count({ where: { companyId, isActive: true } }),
      this.getKnowledgeCategories(companyId),
      this.getAverageConfidence(companyId),
      this.getMostUsedKnowledge(companyId, 5),
      this.getRecentlyAdded(companyId, 5),
    ]);

    return {
      totalItems,
      activeItems,
      categories,
      averageConfidence: avgConfidence,
      mostUsed,
      recentlyAdded,
    };
  }

  private async getKnowledgeCategories(companyId: string) {
    const categories = await this.prisma.knowledgeItem.groupBy({
      by: ['category'],
      where: { companyId, isActive: true },
      _count: { category: true },
    });

    return categories.map((cat) => ({
      category: cat.category,
      count: cat._count.category,
    }));
  }

  private async getAverageConfidence(companyId: string): Promise<number> {
    const result = await this.prisma.knowledgeItem.aggregate({
      where: { companyId, isActive: true },
      _avg: { confidence: true },
    });

    return result._avg.confidence || 0;
  }

  private async getMostUsedKnowledge(companyId: string, limit: number) {
    return this.prisma.knowledgeItem.findMany({
      where: { companyId, isActive: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
      select: {
        id: true,
        question: true,
        category: true,
        usageCount: true,
        confidence: true,
      },
    });
  }

  private async getRecentlyAdded(companyId: string, limit: number) {
    return this.prisma.knowledgeItem.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        question: true,
        category: true,
        confidence: true,
        createdAt: true,
      },
    });
  }

  // ============================================
  // QUESTION LIBRARY STATISTICS
  // ============================================

  async getQuestionStats(companyId: string) {
    const [
      totalQuestions,
      customerQuestions,
      agentQuestions,
      questionTypes,
      topQuestions,
    ] = await Promise.all([
      this.prisma.questionLibrary.count({ where: { companyId } }),
      this.prisma.questionLibrary.count({ where: { companyId, askedBy: 'CUSTOMER' } }),
      this.prisma.questionLibrary.count({ where: { companyId, askedBy: 'AGENT' } }),
      this.getQuestionTypeDistribution(companyId),
      this.getFrequentQuestions(companyId, 10),
    ]);

    return {
      totalQuestions,
      customerQuestions,
      agentQuestions,
      questionTypes,
      topQuestions,
    };
  }

  private async getQuestionTypeDistribution(companyId: string) {
    const types = await this.prisma.questionLibrary.groupBy({
      by: ['questionType'],
      where: { companyId },
      _count: { questionType: true },
      _sum: { frequency: true },
    });

    return types.map((type) => ({
      questionType: type.questionType,
      uniqueQuestions: type._count.questionType,
      totalAsked: type._sum.frequency || 0,
    }));
  }
}
