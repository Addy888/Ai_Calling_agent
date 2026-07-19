import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class RuleLearningService {
  constructor(private prisma: PrismaService) {}

  async getRules(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.ruleType) where.ruleType = query.ruleType;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.minSuccessRate) where.successRate = { gte: query.minSuccessRate };

    return await this.prisma.conversationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { successRate: 'desc' }],
      take: query.limit || 50,
    });
  }

  async createRule(dto: any, companyId: string, createdBy: string) {
    return await this.prisma.conversationRule.create({
      data: {
        companyId,
        ruleType: dto.ruleType,
        name: dto.name,
        description: dto.description,
        condition: dto.condition,
        action: dto.action,
        priority: dto.priority || 0,
        confidenceThreshold: dto.confidenceThreshold || 0.7,
        isActive: dto.isActive !== false,
        createdBy,
      },
    });
  }

  async updateRule(ruleId: string, dto: any, companyId: string, updatedBy: string) {
    const rule = await this.prisma.conversationRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
    }

    return await this.prisma.conversationRule.update({
      where: { id: ruleId },
      data: {
        ...dto,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  async deleteRule(ruleId: string, companyId: string) {
    const rule = await this.prisma.conversationRule.findFirst({
      where: { id: ruleId, companyId },
    });

    if (!rule) {
      throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.conversationRule.delete({
      where: { id: ruleId },
    });

    return { status: 'deleted', message: 'Rule deleted successfully' };
  }
}
