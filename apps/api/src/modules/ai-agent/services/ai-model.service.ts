import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AIModelQueryDto } from '../dto/ai-model.dto';
import { AIModelStatus } from '@prisma/client';

@Injectable()
export class AIModelService implements OnModuleInit {
  private readonly logger = new Logger(AIModelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedModels();
  }

  private async seedModels() {
    const count = await this.prisma.aIModel.count();
    if (count > 0) {
      this.logger.log('AI Model library already seeded');
      return;
    }

    this.logger.log('Seeding AI Model library...');

    const models = [
      // OpenAI Models
      {
        name: 'GPT-4',
        provider: 'OpenAI',
        family: 'GPT',
        version: '4.0',
        parameters: '175B',
        contextLength: 8192,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja', 'ar'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 16,
        recommendedVram: 32,
        license: 'Proprietary',
        description: 'Most capable GPT model with advanced reasoning and multilingual support',
        capabilities: ['text-generation', 'conversation', 'code-generation', 'reasoning'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        family: 'GPT',
        version: '4.0-turbo',
        parameters: '175B',
        contextLength: 128000,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja', 'ar'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 16,
        recommendedVram: 32,
        license: 'Proprietary',
        description: 'Optimized GPT-4 with 128K context window and improved performance',
        capabilities: ['text-generation', 'conversation', 'code-generation', 'reasoning', 'long-context'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        family: 'GPT',
        version: '3.5-turbo',
        parameters: '175B',
        contextLength: 16384,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 8,
        recommendedVram: 16,
        license: 'Proprietary',
        description: 'Fast and cost-effective model for most conversational tasks',
        capabilities: ['text-generation', 'conversation', 'code-generation'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Meta Llama Models
      {
        name: 'Llama 3',
        provider: 'Meta',
        family: 'Llama',
        version: '3.0',
        parameters: '70B',
        contextLength: 8192,
        languages: ['en', 'es', 'fr', 'de', 'hi'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 40,
        recommendedVram: 80,
        license: 'Llama 3 Community License',
        description: 'Open-source large language model with strong performance',
        capabilities: ['text-generation', 'conversation', 'reasoning'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'Llama 3.1',
        provider: 'Meta',
        family: 'Llama',
        version: '3.1',
        parameters: '405B',
        contextLength: 128000,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 200,
        recommendedVram: 400,
        license: 'Llama 3 Community License',
        description: 'Largest open-source model with 128K context window',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'long-context'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'Llama 2',
        provider: 'Meta',
        family: 'Llama',
        version: '2.0',
        parameters: '13B',
        contextLength: 4096,
        languages: ['en', 'es', 'fr', 'de'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 8,
        recommendedVram: 16,
        license: 'Llama 2 Community License',
        description: 'Efficient open-source model for general use',
        capabilities: ['text-generation', 'conversation'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Qwen Models
      {
        name: 'Qwen2.5',
        provider: 'Qwen',
        family: 'Qwen',
        version: '2.5',
        parameters: '72B',
        contextLength: 32768,
        languages: ['en', 'zh', 'hi', 'ar', 'es', 'fr'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 40,
        recommendedVram: 80,
        license: 'Apache 2.0',
        description: 'Multilingual model with strong Chinese and English support',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'multilingual'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'Qwen2',
        provider: 'Qwen',
        family: 'Qwen',
        version: '2.0',
        parameters: '7B',
        contextLength: 32768,
        languages: ['en', 'zh', 'hi'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 4,
        recommendedVram: 8,
        license: 'Apache 2.0',
        description: 'Efficient multilingual model for edge deployment',
        capabilities: ['text-generation', 'conversation'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Google Models
      {
        name: 'Gemini Pro',
        provider: 'Google',
        family: 'Gemini',
        version: '1.5',
        parameters: 'Undisclosed',
        contextLength: 1000000,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja', 'ar'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 16,
        recommendedVram: 32,
        license: 'Proprietary',
        description: 'Multi-modal model with 1M context window',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'long-context', 'multimodal'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'Gemma 2',
        provider: 'Google',
        family: 'Gemma',
        version: '2.0',
        parameters: '27B',
        contextLength: 8192,
        languages: ['en', 'es', 'fr', 'de', 'hi'],
        quantizationSupport: ['FP32', 'FP16', 'INT8'],
        minimumVram: 16,
        recommendedVram: 32,
        license: 'Gemma License',
        description: 'Open-source model from Google with strong performance',
        capabilities: ['text-generation', 'conversation', 'reasoning'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Mistral AI Models
      {
        name: 'Mistral Large',
        provider: 'Mistral AI',
        family: 'Mistral',
        version: '2.0',
        parameters: '123B',
        contextLength: 128000,
        languages: ['en', 'es', 'fr', 'de', 'it'],
        quantizationSupport: ['FP32', 'FP16', 'INT8'],
        minimumVram: 80,
        recommendedVram: 160,
        license: 'Mistral Commercial License',
        description: 'Flagship model with exceptional performance',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'code-generation'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'Mixtral 8x7B',
        provider: 'Mistral AI',
        family: 'Mistral',
        version: '1.0',
        parameters: '47B',
        contextLength: 32768,
        languages: ['en', 'es', 'fr', 'de', 'it'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 24,
        recommendedVram: 48,
        license: 'Apache 2.0',
        description: 'Mixture of Experts model with efficient performance',
        capabilities: ['text-generation', 'conversation', 'code-generation'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Microsoft Models
      {
        name: 'Phi-3',
        provider: 'Microsoft',
        family: 'Phi',
        version: '3.0',
        parameters: '14B',
        contextLength: 128000,
        languages: ['en', 'es', 'fr', 'de'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 8,
        recommendedVram: 16,
        license: 'MIT',
        description: 'Small efficient model optimized for edge devices',
        capabilities: ['text-generation', 'conversation', 'reasoning'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // DeepSeek Models
      {
        name: 'DeepSeek-V3',
        provider: 'DeepSeek',
        family: 'DeepSeek',
        version: '3.0',
        parameters: '685B',
        contextLength: 128000,
        languages: ['en', 'zh', 'es', 'fr'],
        quantizationSupport: ['FP32', 'FP16', 'INT8'],
        minimumVram: 400,
        recommendedVram: 800,
        license: 'DeepSeek License',
        description: 'Large-scale model with exceptional code and math capabilities',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'code-generation', 'math'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Anthropic Models
      {
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        family: 'Claude',
        version: '3.5',
        parameters: 'Undisclosed',
        contextLength: 200000,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 16,
        recommendedVram: 32,
        license: 'Proprietary',
        description: 'Advanced model with exceptional reasoning and coding capabilities',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'code-generation', 'long-context'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      {
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        family: 'Claude',
        version: '3.0',
        parameters: 'Undisclosed',
        contextLength: 200000,
        languages: ['en', 'es', 'fr', 'de', 'hi'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 16,
        recommendedVram: 32,
        license: 'Proprietary',
        description: 'Most capable Claude model for complex tasks',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'long-context'],
        status: AIModelStatus.AVAILABLE,
        isActive: true,
      },
      // Coming Soon Models
      {
        name: 'GPT-5',
        provider: 'OpenAI',
        family: 'GPT',
        version: '5.0',
        parameters: 'Undisclosed',
        contextLength: 1000000,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja', 'ar', 'mr'],
        quantizationSupport: ['FP32', 'FP16'],
        minimumVram: 32,
        recommendedVram: 64,
        license: 'Proprietary',
        description: 'Next generation GPT model with enhanced capabilities',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'code-generation', 'multimodal'],
        status: AIModelStatus.COMING_SOON,
        isActive: false,
      },
      {
        name: 'Llama 4',
        provider: 'Meta',
        family: 'Llama',
        version: '4.0',
        parameters: '500B',
        contextLength: 256000,
        languages: ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ja', 'ar'],
        quantizationSupport: ['FP32', 'FP16', 'INT8', 'INT4'],
        minimumVram: 250,
        recommendedVram: 500,
        license: 'Llama 4 Community License',
        description: 'Next generation open-source model from Meta',
        capabilities: ['text-generation', 'conversation', 'reasoning', 'multimodal', 'long-context'],
        status: AIModelStatus.COMING_SOON,
        isActive: false,
      },
    ];

    try {
      await this.prisma.aIModel.createMany({ data: models });
      this.logger.log(`Seeded ${models.length} AI models successfully`);
    } catch (error) {
      this.logger.error('Failed to seed AI models:', error);
    }
  }

  // ============================================
  // MODEL QUERIES
  // ============================================

  async listModels(query: AIModelQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { provider: { contains: query.search } },
        { family: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.family) {
      where.family = query.family;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Language filtering handled via JSON path query
    if (query.language) {
      where.languages = {
        path: '$',
        array_contains: [query.language],
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.aIModel.count({ where }),
      this.prisma.aIModel.findMany({
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

  async getModel(id: string) {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    return model;
  }

  async getProviders() {
    const providers = await this.prisma.aIModel.groupBy({
      by: ['provider'],
      where: { isActive: true },
      _count: { id: true },
    });

    return providers.map((p) => ({
      name: p.provider,
      modelCount: p._count.id,
    }));
  }

  async getFamilies(provider?: string) {
    const where: any = { isActive: true };
    if (provider) {
      where.provider = provider;
    }

    const families = await this.prisma.aIModel.groupBy({
      by: ['family', 'provider'],
      where,
      _count: { id: true },
    });

    return families.map((f) => ({
      family: f.family,
      provider: f.provider,
      modelCount: f._count.id,
    }));
  }

  async getStatistics() {
    const [total, available, comingSoon, experimental] = await Promise.all([
      this.prisma.aIModel.count(),
      this.prisma.aIModel.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.aIModel.count({ where: { status: 'COMING_SOON' } }),
      this.prisma.aIModel.count({ where: { status: 'EXPERIMENTAL' } }),
    ]);

    const providers = await this.getProviders();
    const languages = await this.getSupportedLanguages();

    return {
      total,
      available,
      comingSoon,
      experimental,
      providers: providers.length,
      languages: languages.length,
      providerList: providers,
      languageList: languages,
    };
  }

  async getSupportedLanguages() {
    const models = await this.prisma.aIModel.findMany({
      where: { isActive: true },
      select: { languages: true },
    });

    const languageSet = new Set<string>();
    models.forEach((model) => {
      if (model.languages && Array.isArray(model.languages)) {
        (model.languages as string[]).forEach((lang) => {
          if (typeof lang === 'string') {
            languageSet.add(lang);
          }
        });
      }
    });

    return Array.from(languageSet).sort();
  }
}
