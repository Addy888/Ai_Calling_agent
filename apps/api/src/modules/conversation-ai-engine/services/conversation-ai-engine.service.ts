/**
 * Conversation AI Engine Service
 * Main service facade for the AI conversation engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { WhisperSTTService } from './whisper-stt.service';
import { OllamaLLMService } from './ollama-llm.service';
import { TTSEngineService } from './tts-engine.service';
import { CallSummaryService } from './call-summary.service';
import { AIEngineConfigService } from './ai-engine-config.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { StartConversationDto, TestWhisperDto, TestOllamaDto, TestTTSDto } from '../dto/conversation-ai.dto';

@Injectable()
export class ConversationAIEngineService {
  private readonly logger = new Logger(ConversationAIEngineService.name);

  constructor(
    private readonly orchestrator: ConversationOrchestratorService,
    private readonly whisperService: WhisperSTTService,
    private readonly ollamaService: OllamaLLMService,
    private readonly ttsService: TTSEngineService,
    private readonly summaryService: CallSummaryService,
    private readonly configService: AIEngineConfigService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CONVERSATION LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async startConversation(dto: StartConversationDto) {
    this.logger.log(`Starting conversation for campaign ${dto.campaignId}, contact ${dto.contactId}`);

    try {
      const session = await this.orchestrator.startSession({
        campaignId: dto.campaignId,
        contactId: dto.contactId,
        callId: dto.callId,
        config: dto.config,
      });

      this.eventEmitter.emit('conversation.started', {
        sessionId: session.sessionId,
        campaignId: dto.campaignId,
        contactId: dto.contactId,
      });

      return {
        success: true,
        sessionId: session.sessionId,
        status: 'ACTIVE',
        message: 'Conversation started successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to start conversation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processAudioChunk(sessionId: string, dto: any) {
    try {
      // Delegate to orchestrator which handles the full pipeline
      await this.orchestrator.processAudioChunk(sessionId, dto);

      return {
        success: true,
        message: 'Audio chunk processed',
      };
    } catch (error) {
      this.logger.error(`Failed to process audio chunk: ${error.message}`, error.stack);
      throw error;
    }
  }

  async endConversation(sessionId: string, dto: any) {
    this.logger.log(`Ending conversation ${sessionId}`);

    try {
      const summary = await this.orchestrator.endSession(sessionId, dto);

      this.eventEmitter.emit('conversation.ended', {
        sessionId,
        summary,
      });

      return {
        success: true,
        sessionId,
        summary,
        message: 'Conversation ended successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to end conversation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getConversationState(sessionId: string) {
    try {
      const state = await this.orchestrator.getSessionState(sessionId);
      return {
        success: true,
        sessionId,
        state,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation state: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTranscript(sessionId: string) {
    try {
      const transcript = await this.orchestrator.getTranscript(sessionId);
      return {
        success: true,
        sessionId,
        transcript,
      };
    } catch (error) {
      this.logger.error(`Failed to get transcript: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TESTING & DEBUGGING
  // ═══════════════════════════════════════════════════════════════

  async testWhisperSTT(dto: TestWhisperDto) {
    this.logger.log('Testing Whisper STT service');

    try {
      const audioBuffer = Buffer.from(dto.audioData, 'base64');
      const result = await this.whisperService.transcribe(audioBuffer, {
        language: dto.language,
      });

      return {
        success: true,
        service: 'Whisper STT',
        result,
        latency: result.latency,
      };
    } catch (error) {
      this.logger.error(`Whisper STT test failed: ${error.message}`, error.stack);
      return {
        success: false,
        service: 'Whisper STT',
        error: error.message,
      };
    }
  }

  async testOllamaLLM(dto: TestOllamaDto) {
    this.logger.log('Testing Ollama LLM service');

    try {
      const startTime = Date.now();
      const result = await this.ollamaService.generate({
        prompt: dto.prompt,
        model: dto.model,
        stream: dto.stream || false,
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        service: 'Ollama LLM',
        result,
        latency,
      };
    } catch (error) {
      this.logger.error(`Ollama LLM test failed: ${error.message}`, error.stack);
      return {
        success: false,
        service: 'Ollama LLM',
        error: error.message,
      };
    }
  }

  async testTTS(dto: TestTTSDto) {
    this.logger.log('Testing TTS service');

    try {
      const startTime = Date.now();
      const result = await this.ttsService.synthesize({
        text: dto.text,
        voiceId: dto.voiceId,
        emotion: dto.emotion,
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        service: 'TTS',
        audioData: result.audioData.toString('base64'),
        duration: result.duration,
        latency,
      };
    } catch (error) {
      this.logger.error(`TTS test failed: ${error.message}`, error.stack);
      return {
        success: false,
        service: 'TTS',
        error: error.message,
      };
    }
  }

  async getHealthStatus() {
    try {
      const [whisperHealth, ollamaHealth, ttsHealth] = await Promise.allSettled([
        this.whisperService.healthCheck(),
        this.ollamaService.healthCheck(),
        this.ttsService.healthCheck(),
      ]);

      return {
        success: true,
        services: {
          whisper: whisperHealth.status === 'fulfilled' ? whisperHealth.value : { status: 'ERROR' },
          ollama: ollamaHealth.status === 'fulfilled' ? ollamaHealth.value : { status: 'ERROR' },
          tts: ttsHealth.status === 'fulfilled' ? ttsHealth.value : { status: 'ERROR' },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get health status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMetrics(sessionId?: string) {
    try {
      if (sessionId) {
        return this.performanceMonitor.getSessionMetrics(sessionId);
      } else {
        return this.performanceMonitor.getGlobalMetrics();
      }
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getConversationAnalytics(params: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
  }) {
    try {
      const analytics = await this.performanceMonitor.getAnalytics(params);
      return {
        success: true,
        analytics,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPerformanceAnalytics(params: {
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const analytics = await this.performanceMonitor.getPerformanceAnalytics(params);
      return {
        success: true,
        analytics,
      };
    } catch (error) {
      this.logger.error(`Failed to get performance analytics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
