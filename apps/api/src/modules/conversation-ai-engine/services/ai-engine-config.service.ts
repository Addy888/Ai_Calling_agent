/**
 * AI Engine Configuration Service
 * Manages runtime configuration for the AI conversation engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AIEngineConfig, DEFAULT_AI_ENGINE_CONFIG, UpdateEngineConfigDto } from '../dto/conversation-ai.dto';

@Injectable()
export class AIEngineConfigService {
  private readonly logger = new Logger(AIEngineConfigService.name);
  private configCache = new Map<string, AIEngineConfig>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getConfig(campaignId?: string): Promise<AIEngineConfig> {
    try {
      // Check cache
      const cacheKey = campaignId || 'default';
      if (this.configCache.has(cacheKey)) {
        return this.configCache.get(cacheKey)!;
      }

      // Load from database or use defaults
      let config: AIEngineConfig = { ...DEFAULT_AI_ENGINE_CONFIG };

      if (campaignId) {
        // Load campaign-specific config
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { aiConfig: true },
        });

        if (campaign?.aiConfig) {
          config = this.mergeConfig(config, campaign.aiConfig as any);
        }
      }

      // Override with environment variables
      config = this.applyEnvironmentOverrides(config);

      // Cache config
      this.configCache.set(cacheKey, config);

      return config;
    } catch (error) {
      this.logger.error(`Error loading config: ${error.message}`);
      return DEFAULT_AI_ENGINE_CONFIG;
    }
  }

  async updateConfig(dto: UpdateEngineConfigDto): Promise<AIEngineConfig> {
    try {
      const config = await this.getConfig(dto.campaignId);

      // Apply updates
      if (dto.whisperModel) config.whisper.model = dto.whisperModel;
      if (dto.ollamaModel) config.llm.model = dto.ollamaModel;
      if (dto.ttsVoice) config.tts.voice = dto.ttsVoice;
      if (dto.language) config.conversation.language = dto.language;
      if (dto.temperature !== undefined) config.llm.temperature = dto.temperature;
      if (dto.maxTokens) config.llm.maxTokens = dto.maxTokens;
      if (dto.silenceTimeout) config.conversation.silenceTimeout = dto.silenceTimeout;
      if (dto.interruptTimeout) config.conversation.interruptTimeout = dto.interruptTimeout;
      if (dto.conversationTimeout) config.conversation.conversationTimeout = dto.conversationTimeout;
      if (dto.enableInterruptions !== undefined) config.conversation.enableInterruptions = dto.enableInterruptions;
      if (dto.enableEmotionDetection !== undefined) config.emotion.enabled = dto.enableEmotionDetection;
      if (dto.enableFunctionCalling !== undefined) config.functions.enabled = dto.enableFunctionCalling;

      // Save to database if campaign-specific
      if (dto.campaignId) {
        await this.prisma.campaign.update({
          where: { id: dto.campaignId },
          data: { aiConfig: config as any },
        });
      }

      // Update cache
      const cacheKey = dto.campaignId || 'default';
      this.configCache.set(cacheKey, config);

      this.logger.log(`Configuration updated for ${cacheKey}`);

      return config;
    } catch (error) {
      this.logger.error(`Error updating config: ${error.message}`);
      throw error;
    }
  }

  private mergeConfig(base: AIEngineConfig, override: Partial<AIEngineConfig>): AIEngineConfig {
    return {
      ...base,
      ...override,
      whisper: { ...base.whisper, ...override.whisper },
      llm: { ...base.llm, ...override.llm },
      tts: { ...base.tts, ...override.tts },
      conversation: { ...base.conversation, ...override.conversation },
      memory: { ...base.memory, ...override.memory },
      knowledge: { ...base.knowledge, ...override.knowledge },
      functions: { ...base.functions, ...override.functions },
      emotion: { ...base.emotion, ...override.emotion },
      performance: { ...base.performance, ...override.performance },
    };
  }

  private applyEnvironmentOverrides(config: AIEngineConfig): AIEngineConfig {
    // Whisper
    if (this.configService.get('WHISPER_SERVICE_URL')) {
      config.whisper.serviceUrl = this.configService.get('WHISPER_SERVICE_URL')!;
    }
    if (this.configService.get('WHISPER_MODEL')) {
      config.whisper.model = this.configService.get('WHISPER_MODEL')!;
    }

    // LLM
    if (this.configService.get('OLLAMA_BASE_URL')) {
      config.llm.baseUrl = this.configService.get('OLLAMA_BASE_URL')!;
    }
    if (this.configService.get('OLLAMA_MODEL')) {
      config.llm.model = this.configService.get('OLLAMA_MODEL')!;
    }

    // TTS
    if (this.configService.get('KOKORO_TTS_URL')) {
      config.tts.serviceUrl = this.configService.get('KOKORO_TTS_URL')!;
    }

    return config;
  }

  clearCache(campaignId?: string) {
    if (campaignId) {
      this.configCache.delete(campaignId);
    } else {
      this.configCache.clear();
    }
  }
}
