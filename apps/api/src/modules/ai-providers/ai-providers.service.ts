import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import {
  CreateAIProviderDto,
  UpdateAIProviderDto,
  CreateAIProviderConfigDto,
  UpdateAIProviderConfigDto,
} from './dto/ai-provider.dto';

@Injectable()
export class AIProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async createProvider(userId: string, data: CreateAIProviderDto) {
    const provider = await this.prisma.aIProvider.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });

    return {
      success: true,
      data: provider,
      message: 'AI provider created successfully',
    };
  }

  async findAllProviders(paginationDto: PaginationDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.aIProvider.findMany({
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.aIProvider.count(),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(providers, total, page, limit),
    };
  }

  async findOneProvider(id: string) {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
      include: {
        configs: {
          select: {
            id: true,
            companyId: true,
            modelName: true,
            temperature: true,
            maxTokens: true,
            isDefault: true,
            isActive: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    return {
      success: true,
      data: provider,
    };
  }

  async updateProvider(id: string, userId: string, data: UpdateAIProviderDto) {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    const updatedProvider = await this.prisma.aIProvider.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    return {
      success: true,
      data: updatedProvider,
      message: 'AI provider updated successfully',
    };
  }

  async removeProvider(id: string) {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
      include: {
        configs: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    if (provider.configs.length > 0) {
      throw new BadRequestException('Cannot delete provider with existing configurations');
    }

    await this.prisma.aIProvider.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'AI provider deleted successfully',
    };
  }

  async createConfig(companyId: string, userId: string, data: CreateAIProviderConfigDto) {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id: data.providerId },
    });

    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    if (data.isDefault) {
      await this.prisma.aIProviderConfig.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    const config = await this.prisma.aIProviderConfig.create({
      data: {
        ...data,
        companyId,
        createdBy: userId,
      },
      include: {
        provider: true,
      },
    });

    return {
      success: true,
      data: config,
      message: 'AI provider configuration created successfully',
    };
  }

  async findAllConfigs(companyId: string) {
    const configs = await this.prisma.aIProviderConfig.findMany({
      where: { companyId },
      include: {
        provider: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      success: true,
      data: configs,
    };
  }

  async findOneConfig(id: string, companyId: string) {
    const config = await this.prisma.aIProviderConfig.findFirst({
      where: { id, companyId },
      include: {
        provider: true,
      },
    });

    if (!config) {
      throw new NotFoundException('AI provider configuration not found');
    }

    return {
      success: true,
      data: config,
    };
  }

  async getDefaultConfig(companyId: string) {
    const config = await this.prisma.aIProviderConfig.findFirst({
      where: {
        companyId,
        isDefault: true,
        isActive: true,
      },
      include: {
        provider: true,
      },
    });

    if (!config) {
      throw new NotFoundException('No default AI provider configuration found');
    }

    return {
      success: true,
      data: config,
    };
  }

  async updateConfig(id: string, companyId: string, userId: string, data: UpdateAIProviderConfigDto) {
    const config = await this.prisma.aIProviderConfig.findFirst({
      where: { id, companyId },
    });

    if (!config) {
      throw new NotFoundException('AI provider configuration not found');
    }

    if (data.isDefault && !config.isDefault) {
      await this.prisma.aIProviderConfig.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }

    const updatedConfig = await this.prisma.aIProviderConfig.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        provider: true,
      },
    });

    return {
      success: true,
      data: updatedConfig,
      message: 'AI provider configuration updated successfully',
    };
  }

  async removeConfig(id: string, companyId: string) {
    const config = await this.prisma.aIProviderConfig.findFirst({
      where: { id, companyId },
    });

    if (!config) {
      throw new NotFoundException('AI provider configuration not found');
    }

    if (config.isDefault) {
      throw new BadRequestException('Cannot delete default AI provider configuration');
    }

    await this.prisma.aIProviderConfig.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'AI provider configuration deleted successfully',
    };
  }

  async setDefaultConfig(id: string, companyId: string) {
    const config = await this.prisma.aIProviderConfig.findFirst({
      where: { id, companyId },
    });

    if (!config) {
      throw new NotFoundException('AI provider configuration not found');
    }

    await this.prisma.aIProviderConfig.updateMany({
      where: { companyId },
      data: { isDefault: false },
    });

    const updatedConfig = await this.prisma.aIProviderConfig.update({
      where: { id },
      data: { isDefault: true },
      include: {
        provider: true,
      },
    });

    return {
      success: true,
      data: updatedConfig,
      message: 'Default AI provider configuration set successfully',
    };
  }
}
