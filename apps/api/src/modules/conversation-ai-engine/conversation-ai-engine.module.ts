/**
 * Conversation AI Engine Module
 * Real-time AI conversation engine for enterprise voice calling
 * 
 * Complete Pipeline:
 * Audio → Whisper STT → Memory → Knowledge → Prompt → Ollama LLM → Emotion → Kokoro TTS → Audio
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { ConversationAIEngineController } from './conversation-ai-engine.controller';

// Gateways
import { ConversationAIEngineGateway } from './conversation-ai-engine.gateway';

// Core Services
import { ConversationAIEngineService } from './services/conversation-ai-engine.service';
import { ConversationOrchestratorService } from './services/conversation-orchestrator.service';
import { AudioStreamManagerService } from './services/audio-stream-manager.service';

// Speech-to-Text (Faster Whisper)
import { WhisperSTTService } from './services/whisper-stt.service';
import { VoiceActivityDetectionService } from './services/voice-activity-detection.service';
import { AudioBufferService } from './services/audio-buffer.service';
import { SilenceDetectionService } from './services/silence-detection.service';
import { LanguageDetectionService } from './services/language-detection.service';

// LLM (Ollama)
import { OllamaLLMService } from './services/ollama-llm.service';
import { StreamingLlmService } from './services/streaming-llm.service';
import { FunctionCallingService } from './services/function-calling.service';
import { ContextWindowService } from './services/context-window.service';

// Memory & Knowledge
import { ConversationMemoryService } from './services/conversation-memory.service';
import { SessionMemoryService } from './services/session-memory.service';
import { CustomerMemoryService } from './services/customer-memory.service';
import { MemoryRetrievalService } from './services/memory-retrieval.service';

// Prompt Engineering
import { PromptEngineService } from './services/prompt-engine.service';
import { DynamicPromptService } from './services/dynamic-prompt.service';
import { PromptTemplateService } from './services/prompt-template.service';

// Conversation Management
import { ConversationFlowService } from './services/conversation-flow.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { InterruptionHandlerService } from './services/interruption-handler.service';
import { ConversationBranchingService } from './services/conversation-branching.service';

// Response Management
import { ResponseGenerationService } from './services/response-generation.service';
import { ResponseValidatorService } from './services/response-validator.service';
import { EmotionEngineService } from './services/emotion-engine.service';

// Text-to-Speech (Kokoro XTTS)
import { TTSEngineService } from './services/tts-engine.service';
import { StreamingTtsService } from './services/streaming-tts.service';
import { VoiceEmotionService } from './services/voice-emotion.service';
import { AudioSynthesisService } from './services/audio-synthesis.service';

// Call Summary & Analytics
import { CallSummaryService } from './services/call-summary.service';
import { LeadScoringService } from './services/lead-scoring.service';
import { ConversationAnalyticsService } from './services/conversation-analytics.service';

// Configuration & Monitoring
import { AIEngineConfigService } from './services/ai-engine-config.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { ErrorHandlerService } from './services/error-handler.service';

// Shared Modules
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MemoryModule } from '../memory/memory.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PromptsModule } from '../prompts/prompts.module';
import { AIAgentModule } from '../ai-agent/ai-agent.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    PrismaModule,
    forwardRef(() => MemoryModule),
    forwardRef(() => KnowledgeModule),
    forwardRef(() => PromptsModule),
    forwardRef(() => AIAgentModule),
  ],
  controllers: [ConversationAIEngineController],
  providers: [
    // Gateway
    ConversationAIEngineGateway,

    // Core Services
    ConversationAIEngineService,
    ConversationOrchestratorService,
    AudioStreamManagerService,

    // Speech-to-Text Pipeline
    WhisperSTTService,
    VoiceActivityDetectionService,
    AudioBufferService,
    SilenceDetectionService,
    LanguageDetectionService,

    // LLM Pipeline
    OllamaLLMService,
    StreamingLlmService,
    FunctionCallingService,
    ContextWindowService,

    // Memory Management
    ConversationMemoryService,
    SessionMemoryService,
    CustomerMemoryService,
    MemoryRetrievalService,

    // Prompt Engineering
    PromptEngineService,
    DynamicPromptService,
    PromptTemplateService,

    // Conversation Management
    ConversationFlowService,
    IntentDetectionService,
    InterruptionHandlerService,
    ConversationBranchingService,

    // Response Management
    ResponseGenerationService,
    ResponseValidatorService,
    EmotionEngineService,

    // Text-to-Speech Pipeline
    TTSEngineService,
    StreamingTtsService,
    VoiceEmotionService,
    AudioSynthesisService,

    // Call Summary & Analytics
    CallSummaryService,
    LeadScoringService,
    ConversationAnalyticsService,

    // Configuration & Monitoring
    AIEngineConfigService,
    PerformanceMonitorService,
    ErrorHandlerService,
  ],
  exports: [
    ConversationAIEngineService,
    ConversationOrchestratorService,
    WhisperSTTService,
    OllamaLLMService,
    ConversationMemoryService,
    PromptEngineService,
    TTSEngineService,
    CallSummaryService,
    ConversationAIEngineGateway,
  ],
})
export class ConversationAIEngineModule {}
