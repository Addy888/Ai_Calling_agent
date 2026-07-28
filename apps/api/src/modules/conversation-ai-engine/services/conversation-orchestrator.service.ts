/**
 * Conversation Orchestrator Service
 * Main orchestrator for the complete AI conversation pipeline
 * 
 * Pipeline: Audio → STT → Memory → Knowledge → Prompt → LLM → Response → TTS → Audio
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationAIEngineGateway } from '../conversation-ai-engine.gateway';

// Services
import { AudioStreamManagerService } from './audio-stream-manager.service';
import { WhisperSTTService } from './whisper-stt.service';
import { ConversationMemoryService } from './conversation-memory.service';
import { PromptEngineService } from './prompt-engine.service';
import { OllamaLLMService } from './ollama-llm.service';
import { ResponseGenerationService } from './response-generation.service';
import { TTSEngineService } from './tts-engine.service';
import { CallSummaryService } from './call-summary.service';
import { IntentDetectionService } from './intent-detection.service';
import { EmotionEngineService } from './emotion-engine.service';
import { InterruptionHandlerService } from './interruption-handler.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { AIEngineConfigService } from './ai-engine-config.service';

interface ConversationSession {
  sessionId: string;
  callId: string;
  campaignId: string;
  contactId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startedAt: Date;
  lastActivityAt: Date;
  turnCount: number;
  config: any;
}

@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);
  private activeSessions = new Map<string, ConversationSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: ConversationAIEngineGateway,
    private readonly audioStreamManager: AudioStreamManagerService,
    private readonly whisperService: WhisperSTTService,
    private readonly memoryService: ConversationMemoryService,
    private readonly promptEngine: PromptEngineService,
    private readonly ollamaService: OllamaLLMService,
    private readonly responseGenerator: ResponseGenerationService,
    private readonly ttsService: TTSEngineService,
    private readonly summaryService: CallSummaryService,
    private readonly intentDetection: IntentDetectionService,
    private readonly emotionEngine: EmotionEngineService,
    private readonly interruptionHandler: InterruptionHandlerService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly configService: AIEngineConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async startSession(params: {
    campaignId: string;
    contactId: string;
    callId: string;
    socketId?: string;
    config?: any;
  }) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`Starting conversation session ${sessionId}`);

    try {
      // Get configuration
      const config = await this.configService.getConfig(params.campaignId);

      // Get campaign to obtain companyId
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: params.campaignId },
        select: { companyId: true },
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${params.campaignId}`);
      }

      // Create session in database
      const dbSession = await this.prisma.conversationSession.create({
        data: {
          sessionId,
          companyId: campaign.companyId,
          callId: params.callId,
          campaignId: params.campaignId,
          contactId: params.contactId,
          status: 'ACTIVE',
          language: config.conversation.language,
          startedAt: new Date(),
        },
      });

      // Create in-memory session
      const session: ConversationSession = {
        sessionId,
        callId: params.callId,
        campaignId: params.campaignId,
        contactId: params.contactId,
        status: 'ACTIVE',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        turnCount: 0,
        config,
      };

      this.activeSessions.set(sessionId, session);

      // Initialize memory
      await this.memoryService.initializeSession(sessionId, {
        campaignId: params.campaignId,
        contactId: params.contactId,
        callId: params.callId,
      });

      // Generate greeting
      await this.generateGreeting(sessionId);

      return { sessionId, status: 'ACTIVE' };
    } catch (error) {
      this.logger.error(`Failed to start session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async endSession(sessionId: string, params?: { reason?: string; socketId?: string }) {
    this.logger.log(`Ending conversation session ${sessionId}`);

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Generate call summary
      const summary = await this.summaryService.generateSummary(sessionId);

      // Update session in database
      await this.prisma.conversationSession.update({
        where: { sessionId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
          turnCount: session.turnCount,
          summaryText: JSON.stringify(summary),
          intent: summary.intent,
          leadScore: summary.leadScore,
          emotion: summary.overallEmotion,
        },
      });

      // Cleanup
      this.activeSessions.delete(sessionId);
      await this.memoryService.cleanup(sessionId);

      this.gateway.emitSummaryGenerated(sessionId, summary);

      return summary;
    } catch (error) {
      this.logger.error(`Failed to end session: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN CONVERSATION LOOP
  // ═══════════════════════════════════════════════════════════════

  async processAudioChunk(sessionId: string, audioData: any) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Update last activity
      session.lastActivityAt = new Date();

      // Emit customer speaking event
      this.gateway.emitCustomerSpeaking(sessionId, {});

      // Step 1: Speech-to-Text
      const sttStart = Date.now();
      const transcription = await this.whisperService.transcribe(audioData.audioData, {
        language: session.config.conversation.language,
      });
      const sttLatency = Date.now() - sttStart;

      if (!transcription.text || transcription.text.trim().length === 0) {
        return; // No speech detected
      }

      this.logger.log(`STT (${sttLatency}ms): "${transcription.text}"`);

      // Emit transcript update
      this.gateway.emitTranscriptUpdate(sessionId, {
        speaker: 'CUSTOMER',
        text: transcription.text,
        confidence: transcription.confidence,
        language: transcription.language,
        isFinal: true,
      });

      // Save customer message
      await this.saveMessage(sessionId, {
        role: 'CUSTOMER',
        content: transcription.text,
        language: transcription.language,
        confidence: transcription.confidence,
        sttLatency,
      });

      // Step 2: Detect interruption
      const isInterruption = await this.interruptionHandler.detectInterruption(sessionId);
      if (isInterruption) {
        await this.interruptionHandler.handleInterruption(sessionId);
        this.gateway.emitInterruptionDetected(sessionId);
      }

      // Step 3: Detect intent and emotion
      const [intent, customerEmotion] = await Promise.all([
        this.intentDetection.detectIntent(transcription.text),
        this.emotionEngine.detectEmotion(transcription.text, 'CUSTOMER'),
      ]);

      this.gateway.emitIntentDetected(sessionId, intent);
      this.gateway.emitEmotionDetected(sessionId, { emotion: customerEmotion, confidence: 0.8, source: 'CUSTOMER' });

      // Step 4: Generate AI response
      await this.generateResponse(sessionId, {
        customerMessage: transcription.text,
        intent,
        emotion: customerEmotion,
        sttLatency,
      });

      // Increment turn count
      session.turnCount++;

    } catch (error) {
      this.logger.error(`Error processing audio chunk: ${error.message}`, error.stack);
      this.gateway.emitError(sessionId, {
        message: error.message,
        code: 'PROCESSING_ERROR',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AI RESPONSE GENERATION
  // ═══════════════════════════════════════════════════════════════

  private async generateResponse(sessionId: string, context: {
    customerMessage: string;
    intent: any;
    emotion: string;
    sttLatency: number;
  }) {
    const session = this.activeSessions.get(sessionId);
    const totalStart = Date.now();

    try {
      this.gateway.emitAIThinking(sessionId, { status: 'RETRIEVING_CONTEXT' });

      // Step 1: Retrieve memory and knowledge (parallel)
      const knowledgeStart = Date.now();
      const [memoryContext, knowledgeContext] = await Promise.all([
        this.memoryService.retrieveContext(sessionId),
        this.retrieveKnowledge(sessionId, context.customerMessage),
      ]);
      const knowledgeLatency = Date.now() - knowledgeStart;

      if (knowledgeContext && knowledgeContext.length > 0) {
        this.gateway.emitKnowledgeRetrieved(sessionId, {
          sources: knowledgeContext,
          relevance: knowledgeContext[0]?.score || 0,
        });
      }

      // Step 2: Build prompt
      this.gateway.emitAIThinking(sessionId, { status: 'GENERATING_PROMPT' });
      
      const prompt = await this.promptEngine.buildPrompt({
        sessionId,
        campaignId: session.campaignId,
        customerMessage: context.customerMessage,
        intent: context.intent,
        customerEmotion: context.emotion,
        memoryContext,
        knowledgeContext,
      });

      // Step 3: Generate LLM response (streaming)
      this.gateway.emitAIThinking(sessionId, { status: 'GENERATING_RESPONSE' });
      
      const llmStart = Date.now();
      let firstTokenLatency = 0;
      let responseText = '';
      let tokenCount = 0;

      await this.ollamaService.generateStreaming({
        prompt,
        model: session.config.llm.model,
        temperature: session.config.llm.temperature,
        maxTokens: session.config.llm.maxTokens,
      }, async (chunk) => {
        if (tokenCount === 0) {
          firstTokenLatency = Date.now() - llmStart;
        }
        tokenCount++;
        responseText += chunk;
        
        this.gateway.emitLLMResponding(sessionId, {
          chunk,
          isComplete: false,
        });
      });

      const llmLatency = Date.now() - llmStart;
      
      this.gateway.emitLLMResponding(sessionId, {
        isComplete: true,
      });

      this.logger.log(`LLM (first token: ${firstTokenLatency}ms, total: ${llmLatency}ms): "${responseText.substring(0, 100)}..."`);

      // Step 4: Validate response
      const validatedResponse = await this.responseGenerator.validateAndEnhance(responseText, {
        intent: context.intent,
        emotion: context.emotion,
      });

      // Step 5: Detect AI emotion
      const aiEmotion = await this.emotionEngine.determineResponseEmotion(
        validatedResponse,
        context.emotion,
      );

      // Step 6: Generate speech (streaming)
      this.gateway.emitAIThinking(sessionId, { status: 'SYNTHESIZING_SPEECH' });
      
      const ttsStart = Date.now();
      await this.ttsService.synthesizeStreaming({
        text: validatedResponse,
        voiceId: session.config.tts.voice,
        emotion: aiEmotion,
      }, async (audioChunk) => {
        this.gateway.emitAISpeaking(sessionId, {
          text: validatedResponse,
          audioChunk,
          emotion: aiEmotion,
          isComplete: false,
        });
      });
      
      const ttsLatency = Date.now() - ttsStart;
      const totalLatency = Date.now() - totalStart;

      this.gateway.emitAISpeaking(sessionId, {
        text: validatedResponse,
        emotion: aiEmotion,
        isComplete: true,
      });

      // Save AI message
      await this.saveMessage(sessionId, {
        role: 'AI',
        content: validatedResponse,
        emotion: aiEmotion,
        intent: context.intent.intent,
        sttLatency: context.sttLatency,
        llmLatency,
        ttsLatency,
        totalLatency,
      });

      // Update memory
      await this.memoryService.updateContext(sessionId, {
        customerMessage: context.customerMessage,
        aiResponse: validatedResponse,
        intent: context.intent,
        emotion: aiEmotion,
      });

      // Emit performance metrics
      this.gateway.emitMetrics(sessionId, {
        sttLatency: context.sttLatency,
        llmLatency: firstTokenLatency,
        ttsLatency: ttsLatency,
        totalLatency,
      });

      // Record metrics
      await this.performanceMonitor.recordMetrics(sessionId, {
        sttLatency: context.sttLatency,
        knowledgeLatency,
        llmFirstTokenLatency: firstTokenLatency,
        llmTotalLatency: llmLatency,
        ttsLatency,
        totalLatency,
      });

    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`, error.stack);
      this.gateway.emitError(sessionId, {
        message: 'Failed to generate response',
        details: error.message,
      });
      throw error;
    }
  }

  private async generateGreeting(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    
    try {
      // Build greeting prompt
      const prompt = await this.promptEngine.buildGreetingPrompt({
        sessionId,
        campaignId: session.campaignId,
        contactId: session.contactId,
      });

      // Generate greeting
      const greeting = await this.ollamaService.generate({
        prompt,
        model: session.config.llm.model,
        temperature: 0.7,
      });

      // Synthesize speech
      await this.ttsService.synthesizeStreaming({
        text: greeting.text,
        voiceId: session.config.tts.voice,
        emotion: 'happy',
      }, async (audioChunk) => {
        this.gateway.emitAISpeaking(sessionId, {
          text: greeting.text,
          audioChunk,
          emotion: 'happy',
          isComplete: false,
        });
      });

      this.gateway.emitAISpeaking(sessionId, {
        text: greeting.text,
        emotion: 'happy',
        isComplete: true,
      });

      // Save greeting message
      await this.saveMessage(sessionId, {
        role: 'AI',
        content: greeting.text,
        emotion: 'happy',
      });

    } catch (error) {
      this.logger.error(`Error generating greeting: ${error.message}`, error.stack);
    }
  }

  private async retrieveKnowledge(sessionId: string, query: string) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session.config.knowledge.enabled) {
        return [];
      }

      // TODO: Integrate with KnowledgeModule for RAG
      // This would call the existing knowledge base module
      return [];
    } catch (error) {
      this.logger.error(`Error retrieving knowledge: ${error.message}`);
      return [];
    }
  }

  private async saveMessage(sessionId: string, data: any) {
    try {
      await this.prisma.conversationMessage.create({
        data: {
          sessionId,
          role: data.role,
          content: data.content,
          language: data.language,
          confidence: data.confidence,
          emotion: data.emotion,
          intent: data.intent,
          sttLatency: data.sttLatency,
          llmLatency: data.llmLatency,
          ttsLatency: data.ttsLatency,
          totalLatency: data.totalLatency,
        },
      });
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  async getSessionState(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId,
      status: session.status,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      turnCount: session.turnCount,
    };
  }

  async getTranscript(sessionId: string) {
    const messages = await this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        createdAt: true,
        emotion: true,
        intent: true,
      },
    });

    return messages;
  }
}
