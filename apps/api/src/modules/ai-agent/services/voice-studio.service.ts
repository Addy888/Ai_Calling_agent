import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { KokoroTTSProvider } from './kokoro-tts.provider';
import {
  CreateVoiceProviderDto,
  CreateVoiceLibraryDto,
  UpdateVoiceLibraryDto,
  VoiceConfigurationDto,
  VoicePreviewDto,
  VoiceGenerationDto,
  VoiceHistoryQueryDto,
  VoiceLanguage,
  VoiceGender,
} from '../dto/voice-studio.dto';
import { IVoiceProvider } from './voice-provider.interface';

@Injectable()
export class VoiceStudioService {
  private readonly logger = new Logger(VoiceStudioService.name);
  private providers: Map<string, IVoiceProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly kokoroProvider: KokoroTTSProvider,
  ) {
    this.initializeProviders();
  }

  private async initializeProviders() {
    this.logger.log('Initializing Voice Providers...');
    
    await this.kokoroProvider.initialize({});
    this.providers.set('KOKORO_TTS', this.kokoroProvider);
    
    this.logger.log('Voice Providers initialized successfully');
  }

  async createProvider(dto: CreateVoiceProviderDto) {
    return this.prisma.voiceProvider.create({
      data: {
        name: dto.name,
        type: dto.type,
        apiEndpoint: dto.apiEndpoint,
        metadata: dto.metadata,
        isActive: true,
      },
    });
  }

  async getProviders() {
    return this.prisma.voiceProvider.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProvider(id: string) {
    const provider = await this.prisma.voiceProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Voice provider not found');
    }

    return provider;
  }

  async createVoice(companyId: string, dto: CreateVoiceLibraryDto) {
    const provider = await this.prisma.voiceProvider.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider) {
      throw new NotFoundException('Voice provider not found');
    }

    const existing = await this.prisma.voiceLibrary.findUnique({
      where: {
        companyId_language_gender: {
          companyId,
          language: dto.language,
          gender: dto.gender,
        },
      },
    });

    if (existing && dto.isActive) {
      await this.prisma.voiceLibrary.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }

    return this.prisma.voiceLibrary.create({
      data: {
        companyId,
        providerId: dto.providerId,
        name: dto.name,
        language: dto.language,
        gender: dto.gender,
        voiceCode: dto.voiceCode,
        description: dto.description,
        isActive: dto.isActive || false,
        metadata: dto.metadata,
      },
      include: {
        provider: true,
      },
    });
  }

  async getVoices(companyId: string, language?: string, gender?: string) {
    const where: any = { companyId };
    
    if (language) where.language = language;
    if (gender) where.gender = gender;

    return this.prisma.voiceLibrary.findMany({
      where,
      include: {
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVoice(id: string, companyId: string) {
    const voice = await this.prisma.voiceLibrary.findFirst({
      where: { id, companyId },
      include: {
        provider: true,
      },
    });

    if (!voice) {
      throw new NotFoundException('Voice not found');
    }

    return voice;
  }

  async updateVoice(id: string, companyId: string, dto: UpdateVoiceLibraryDto) {
    const voice = await this.getVoice(id, companyId);

    if (dto.isActive) {
      await this.prisma.voiceLibrary.updateMany({
        where: {
          companyId,
          language: voice.language,
          gender: voice.gender,
          id: { not: id },
        },
        data: { isActive: false },
      });
    }

    return this.prisma.voiceLibrary.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
        description: dto.description,
        metadata: dto.metadata,
      },
      include: {
        provider: true,
      },
    });
  }

  async deleteVoice(id: string, companyId: string) {
    const voice = await this.getVoice(id, companyId);
    
    await this.prisma.voiceLibrary.delete({
      where: { id },
    });

    return { message: 'Voice deleted successfully' };
  }

  async setActiveVoice(companyId: string, voiceId: string) {
    const voice = await this.getVoice(voiceId, companyId);

    await this.prisma.voiceLibrary.updateMany({
      where: {
        companyId,
        language: voice.language,
        gender: voice.gender,
        id: { not: voiceId },
      },
      data: { isActive: false },
    });

    return this.prisma.voiceLibrary.update({
      where: { id: voiceId },
      data: { isActive: true },
      include: {
        provider: true,
      },
    });
  }

  async getConfiguration(companyId: string) {
    let config = await this.prisma.voiceConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.voiceConfiguration.create({
        data: {
          companyId,
          speakingSpeed: 1.0,
          pitch: 1.0,
          volume: 1.0,
          pauseBetweenSentences: 300,
          pauseBetweenParagraphs: 600,
          voiceTemperature: 0.7,
        },
      });
    }

    return config;
  }

  async updateConfiguration(companyId: string, dto: VoiceConfigurationDto) {
    const existing = await this.prisma.voiceConfiguration.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.prisma.voiceConfiguration.update({
        where: { companyId },
        data: {
          speakingSpeed: dto.speakingSpeed,
          pitch: dto.pitch,
          volume: dto.volume,
          pauseBetweenSentences: dto.pauseBetweenSentences,
          pauseBetweenParagraphs: dto.pauseBetweenParagraphs,
          voiceTemperature: dto.voiceTemperature,
        },
      });
    }

    return this.prisma.voiceConfiguration.create({
      data: {
        companyId,
        speakingSpeed: dto.speakingSpeed,
        pitch: dto.pitch,
        volume: dto.volume,
        pauseBetweenSentences: dto.pauseBetweenSentences,
        pauseBetweenParagraphs: dto.pauseBetweenParagraphs,
        voiceTemperature: dto.voiceTemperature,
      },
    });
  }

  async generatePreview(companyId: string, dto: VoicePreviewDto) {
    const voice = await this.getVoice(dto.voiceId, companyId);
    const config = await this.getConfiguration(companyId);

    const provider = this.providers.get(voice.provider.type);
    if (!provider) {
      throw new BadRequestException('Voice provider not available');
    }

    const result = await provider.generateSpeech({
      text: dto.text,
      voiceCode: voice.voiceCode,
      language: voice.language,
      speakingSpeed: config.speakingSpeed,
      pitch: config.pitch,
      volume: config.volume,
      pauseBetweenSentences: config.pauseBetweenSentences,
      pauseBetweenParagraphs: config.pauseBetweenParagraphs,
    });

    const audioBase64 = result.audioBuffer.toString('base64');

    if (dto.saveToHistory) {
      await this.prisma.voiceHistory.create({
        data: {
          companyId,
          voiceId: dto.voiceId,
          text: dto.text,
          audioUrl: null,
          duration: result.duration,
          fileSize: result.audioBuffer.length,
          status: 'COMPLETED',
          metadata: result.metadata,
        },
      });
    }

    return {
      audio: audioBase64,
      duration: result.duration,
      format: result.format,
      metadata: result.metadata,
    };
  }

  async generateVoice(companyId: string, dto: VoiceGenerationDto) {
    const voice = await this.prisma.voiceLibrary.findFirst({
      where: {
        companyId,
        language: dto.language,
        gender: dto.gender,
        isActive: true,
      },
      include: {
        provider: true,
      },
    });

    if (!voice) {
      throw new NotFoundException(
        `No active voice found for ${dto.language} ${dto.gender}`
      );
    }

    const config = await this.getConfiguration(companyId);

    const provider = this.providers.get(voice.provider.type);
    if (!provider) {
      throw new BadRequestException('Voice provider not available');
    }

    const result = await provider.generateSpeech({
      text: dto.text,
      voiceCode: voice.voiceCode,
      language: voice.language,
      speakingSpeed: config.speakingSpeed,
      pitch: config.pitch,
      volume: config.volume,
      pauseBetweenSentences: config.pauseBetweenSentences,
      pauseBetweenParagraphs: config.pauseBetweenParagraphs,
    });

    const audioBase64 = result.audioBuffer.toString('base64');

    if (dto.saveToHistory) {
      await this.prisma.voiceHistory.create({
        data: {
          companyId,
          voiceId: voice.id,
          text: dto.text,
          audioUrl: null,
          duration: result.duration,
          fileSize: result.audioBuffer.length,
          status: 'COMPLETED',
          metadata: result.metadata,
        },
      });
    }

    return {
      audio: audioBase64,
      duration: result.duration,
      format: result.format,
      voice: {
        id: voice.id,
        name: voice.name,
        language: voice.language,
        gender: voice.gender,
      },
      metadata: result.metadata,
    };
  }

  async getHistory(companyId: string, query: VoiceHistoryQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    
    if (query.status) where.status = query.status;

    if (query.language || query.gender) {
      where.voice = {};
      if (query.language) where.voice.language = query.language;
      if (query.gender) where.voice.gender = query.gender;
    }

    const [items, total] = await Promise.all([
      this.prisma.voiceHistory.findMany({
        where,
        include: {
          voice: {
            include: {
              provider: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voiceHistory.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAvailableVoices(providerType: string) {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new BadRequestException('Voice provider not available');
    }

    return provider.getAvailableVoices();
  }

  async getProviderHealth(providerType: string) {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new BadRequestException('Voice provider not available');
    }

    const isHealthy = await provider.isHealthy();
    return {
      providerType,
      isHealthy,
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    };
  }
}
