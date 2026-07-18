import { Injectable, Logger } from '@nestjs/common';
import { VoiceStudioService } from './voice-studio.service';
import { ConversationRuntimeService } from './conversation-runtime.service';
import { RuntimeEngineService } from './runtime-engine.service';

export interface VoiceGenerationRequest {
  agentId: string;
  sessionId: string;
  text: string;
  language: string;
  gender?: string;
  saveToHistory?: boolean;
}

export interface VoiceGenerationResponse {
  audio: string;
  duration: number;
  format: string;
  voice: {
    id: string;
    name: string;
    language: string;
    gender: string;
  };
  metadata?: Record<string, any>;
}

@Injectable()
export class VoiceBrainIntegrationService {
  private readonly logger = new Logger(VoiceBrainIntegrationService.name);

  constructor(
    private readonly voiceStudioService: VoiceStudioService,
    private readonly conversationRuntime: ConversationRuntimeService,
    private readonly runtimeEngine: RuntimeEngineService,
  ) {}

  async generateVoiceFromAIResponse(
    request: VoiceGenerationRequest,
  ): Promise<VoiceGenerationResponse> {
    this.logger.log(
      `Generating voice for agent ${request.agentId}, session ${request.sessionId}`,
    );

    try {
      const agent = await this.getAgentDetails(request.agentId);
      
      const language = request.language || this.detectLanguage(request.text);
      const gender = request.gender || 'FEMALE';

      const voiceResult = await this.voiceStudioService.generateVoice(
        agent.companyId,
        {
          text: request.text,
          language: language as any,
          gender: gender as any,
          saveToHistory: request.saveToHistory !== false,
        },
      );

      await this.logVoiceGeneration(request, voiceResult);

      return voiceResult;
    } catch (error) {
      this.logger.error(
        `Failed to generate voice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async generateVoiceFromPromptResponse(
    agentId: string,
    sessionId: string,
    promptResponse: string,
    options?: {
      language?: string;
      gender?: string;
      saveToHistory?: boolean;
    },
  ): Promise<VoiceGenerationResponse> {
    return this.generateVoiceFromAIResponse({
      agentId,
      sessionId,
      text: promptResponse,
      language: options?.language || 'en',
      gender: options?.gender,
      saveToHistory: options?.saveToHistory,
    });
  }

  async generateVoiceFromScriptNode(
    agentId: string,
    sessionId: string,
    scriptContent: string,
    variables?: Record<string, any>,
  ): Promise<VoiceGenerationResponse> {
    const processedText = this.processScriptVariables(scriptContent, variables);

    return this.generateVoiceFromAIResponse({
      agentId,
      sessionId,
      text: processedText,
      language: variables?.language || 'en',
      gender: variables?.gender,
      saveToHistory: true,
    });
  }

  async generateVoiceFromConversation(
    agentId: string,
    sessionId: string,
    conversationResponse: string,
  ): Promise<VoiceGenerationResponse> {
    const language = this.detectLanguage(conversationResponse);
    
    return this.generateVoiceFromAIResponse({
      agentId,
      sessionId,
      text: conversationResponse,
      language,
      saveToHistory: true,
    });
  }

  async generateMultiLanguageVoice(
    agentId: string,
    sessionId: string,
    text: string,
    targetLanguages: string[],
  ): Promise<VoiceGenerationResponse[]> {
    const results: VoiceGenerationResponse[] = [];

    for (const language of targetLanguages) {
      try {
        const result = await this.generateVoiceFromAIResponse({
          agentId,
          sessionId,
          text,
          language,
          saveToHistory: true,
        });
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to generate voice for language ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  private processScriptVariables(
    scriptContent: string,
    variables?: Record<string, any>,
  ): string {
    if (!variables) return scriptContent;

    let processedContent = scriptContent;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, String(value));
    });

    return processedContent;
  }

  private detectLanguage(text: string): string {
    const hindiPattern = /[\u0900-\u097F]/;
    const marathiPattern = /[\u0900-\u097F]/;

    if (hindiPattern.test(text)) {
      return 'hi';
    }

    if (marathiPattern.test(text)) {
      return 'mr';
    }

    return 'en';
  }

  private async getAgentDetails(agentId: string): Promise<any> {
    return {
      id: agentId,
      companyId: 'default',
    };
  }

  private async logVoiceGeneration(
    request: VoiceGenerationRequest,
    result: VoiceGenerationResponse,
  ): Promise<void> {
    this.logger.log(
      `Voice generated successfully: ${result.voice.name} (${result.duration}ms)`,
    );
  }

  async previewVoiceForAgent(
    companyId: string,
    text: string,
    language: string,
    gender: string,
  ): Promise<{ audio: string; duration: number; format: string }> {
    const voices = await this.voiceStudioService.getVoices(
      companyId,
      language,
      gender,
    );

    const activeVoice = voices.find((v) => v.isActive);
    if (!activeVoice) {
      throw new Error(
        `No active voice found for ${language} ${gender}`,
      );
    }

    return this.voiceStudioService.generatePreview(companyId, {
      voiceId: activeVoice.id,
      text,
      saveToHistory: false,
    });
  }

  async testVoiceIntegration(
    companyId: string,
  ): Promise<{
    success: boolean;
    voices: any[];
    sampleGeneration?: any;
    error?: string;
  }> {
    try {
      const voices = await this.voiceStudioService.getVoices(companyId);

      if (voices.length === 0) {
        return {
          success: false,
          voices: [],
          error: 'No voices configured',
        };
      }

      const activeVoice = voices.find((v) => v.isActive);
      if (activeVoice) {
        const sampleText = 'Hello, this is a test of the voice integration system.';
        const sampleGeneration = await this.voiceStudioService.generatePreview(
          companyId,
          {
            voiceId: activeVoice.id,
            text: sampleText,
            saveToHistory: false,
          },
        );

        return {
          success: true,
          voices,
          sampleGeneration: {
            voice: activeVoice.name,
            duration: sampleGeneration.duration,
            textLength: sampleText.length,
          },
        };
      }

      return {
        success: true,
        voices,
      };
    } catch (error) {
      return {
        success: false,
        voices: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
