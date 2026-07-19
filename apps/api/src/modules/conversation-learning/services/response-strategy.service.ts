import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ResponseStrategyService {
  constructor(private prisma: PrismaService) {}

  async getStrategies(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.triggerIntent) where.triggerIntent = query.triggerIntent;
    if (query.strategyType) where.strategyType = query.strategyType;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return await this.prisma.responseStrategy.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { successRate: 'desc' }],
      take: query.limit || 50,
    });
  }

  async createStrategy(dto: any, companyId: string, createdBy: string) {
    return await this.prisma.responseStrategy.create({
      data: {
        companyId,
        triggerIntent: dto.triggerIntent,
        strategyType: dto.strategyType,
        strategyName: dto.strategyName,
        description: dto.description,
        responseTemplate: dto.responseTemplate,
        pauseBefore: dto.pauseBefore || 0,
        pauseAfter: dto.pauseAfter || 0,
        speakingSpeed: dto.speakingSpeed || 1.0,
        emotionalTone: dto.emotionalTone,
        languageStyle: dto.languageStyle,
        isActive: dto.isActive !== false,
        priority: dto.priority || 0,
        createdBy,
      },
    });
  }

  async updateStrategy(strategyId: string, dto: any, companyId: string, updatedBy: string) {
    const strategy = await this.prisma.responseStrategy.findFirst({
      where: { id: strategyId, companyId },
    });

    if (!strategy) {
      throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
    }

    return await this.prisma.responseStrategy.update({
      where: { id: strategyId },
      data: {
        ...dto,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  async deleteStrategy(strategyId: string, companyId: string) {
    const strategy = await this.prisma.responseStrategy.findFirst({
      where: { id: strategyId, companyId },
    });

    if (!strategy) {
      throw new HttpException('Strategy not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.responseStrategy.delete({
      where: { id: strategyId },
    });

    return { status: 'deleted', message: 'Strategy deleted successfully' };
  }
}
