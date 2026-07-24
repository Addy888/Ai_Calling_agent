/**
 * Conversation Processor Service
 * Core service that processes conversation turns and coordinates all components
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationSessionService } from './conversation-session.service';
import { ResponseGeneratorService } from './response-generator.service';
import { IntentRouterService } from './intent-router.service';
import { PromptBuilderService } from './prompt-builder.service';
import {
  ConversationContext,
  ConversationMessage,
  ResponseGenerationResult,
  ConversationMessageRequest,
} from '../interfaces/conversation-session.interface';
import {
  ConversationState,
  ConversationEvent,
  MessageRole,
  SpeakerType,
  IntentType,
} from '../enums/conversation-state.enum';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ConversationProcessorService {
  private readonly logger = new Logger(ConversationProcessorService.name);

  constructor(
    private readonly sessionService: ConversationSessionService,
    private readonly responseGenerator: ResponseGeneratorService,
    private readonly intentRouter: IntentRouterService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Process incoming customer message
   */
  async processMessage(
    request: ConversationMessageRequest,
  ): Promise<ResponseGenerationResult> {
    const { sessionId, message } = request;

    this.logger.log(`Processing message for session: ${sessionId}`);

    try {
      // Get session
      const session = await this.sessionService.getSession(sessionId);

      // Update state to listening
      await this.sessionService.updateState(sessionId, ConversationState.LISTENING);

      // Add customer message to history
      const customerMessage: ConversationMessage = {
        id: this.generateMessageId(),
        role: MessageRole.USER,
        speaker: SpeakerType.CUSTOMER,
        content: message,
        timestamp: new Date(),
      };

      await this.sessionService.addMessage(sessionId, customerMessage);

      // Emit event
      this.eventEmitter.emit(ConversationEvent.CUSTOMER_SPEECH_RECEIVED, {
        sessionId,
        message,
        timestamp: new Date(),
      });

      // Update state to thinking
      await this.sessionService.updateState(sessionId, ConversationState.THINKING);

      // Detect intent
      const context = await this.buildContext(sessionId, message);
      const intentResult = await this.intentRouter.detectIntent(message, context);

      await this.sessionService.addIntent(
        sessionId,
        intentResult.intent,
        intentResult.confidence,
      );

      this.logger.debug(
        `Intent detected: ${intentResult.intent} (confidence: ${intentResult.confidence})`,
      );

      // Update state to generating response
      await this.sessionService.updateState(
        sessionId,
        ConversationState.GENERATING_RESPONSE,
      );

      // Handle special intents
      if (this.shouldHandleSpecialIntent(intentResult.intent)) {
        return await this.handleSpecialIntent(sessionId, intentResult.intent, context);
      }

      // Generate response
      const responseResult = await this.responseGenerator.generateResponse(context);

      if (!responseResult.success || !responseResult.response) {
        return await this.handleFailedResponse(sessionId, context);
      }

      // Add AI response to history
      const aiMessage: ConversationMessage = {
        id: this.generateMessageId(),
        role: MessageRole.ASSISTANT,
        speaker: SpeakerType.AI,
        content: responseResult.response,
        timestamp: new Date(),
        confidence: responseResult.confidence,
      };

      await this.sessionService.addMessage(sessionId, aiMessage);

      // Update memory
      await this.sessionService.updateMemory(sessionId, {
        lastAIResponse: responseResult.response,
        previousAnswers: [
          ...session.sessionMemory.previousAnswers,
          {
            question: message,
            answer: responseResult.response,
            timestamp: new Date(),
          },
        ].slice(-5), // Keep last 5 Q&A pairs
      });

      // Update state to speaking
      await this.sessionService.updateState(sessionId, ConversationState.SPEAKING);

      // Emit event
      this.eventEmitter.emit(ConversationEvent.RESPONSE_GENERATED, {
        sessionId,
        response: responseResult.response,
        intent: intentResult.intent,
        confidence: responseResult.confidence,
        timestamp: new Date(),
      });

      this.logger.log(
        `Response generated for session ${sessionId}: ${responseResult.response.substring(0, 100)}...`,
      );

      return responseResult;
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);

      // Emit error event
      this.eventEmitter.emit(ConversationEvent.ERROR, {
        sessionId,
        error: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Generate greeting
   */
  async generateGreeting(sessionId: string): Promise<ResponseGenerationResult> {
    this.logger.log(`Generating greeting for session: ${sessionId}`);

    try {
      // Update state
      await this.sessionService.updateState(sessionId, ConversationState.GREETING);

      // Build context
      const context = await this.buildContext(sessionId);

      // Generate greeting
      const greetingResult = await this.responseGenerator.generateGreeting(context);

      if (greetingResult.success) {
        // Add to history
        const greetingMessage: ConversationMessage = {
          id: this.generateMessageId(),
          role: MessageRole.ASSISTANT,
          speaker: SpeakerType.AI,
          content: greetingResult.response,
          timestamp: new Date(),
        };

        await this.sessionService.addMessage(sessionId, greetingMessage);

        // Update memory
        await this.sessionService.updateMemory(sessionId, {
          lastAIResponse: greetingResult.response,
        });

        // Update state to waiting
        await this.sessionService.updateState(sessionId, ConversationState.WAITING);

        // Emit event
        this.eventEmitter.emit(ConversationEvent.GREETING_COMPLETED, {
          sessionId,
          greeting: greetingResult.response,
          timestamp: new Date(),
        });

        this.logger.log(`Greeting generated for session: ${sessionId}`);
      }

      return greetingResult;
    } catch (error) {
      this.logger.error(`Error generating greeting: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate goodbye
   */
  async generateGoodbye(
    sessionId: string,
    reason?: string,
  ): Promise<ResponseGenerationResult> {
    this.logger.log(`Generating goodbye for session: ${sessionId}`);

    try {
      // Build context
      const context = await this.buildContext(sessionId);

      // Generate goodbye
      const goodbyeResult = await this.responseGenerator.generateGoodbye(
        context,
        reason,
      );

      if (goodbyeResult.success) {
        // Add to history
        const goodbyeMessage: ConversationMessage = {
          id: this.generateMessageId(),
          role: MessageRole.ASSISTANT,
          speaker: SpeakerType.AI,
          content: goodbyeResult.response,
          timestamp: new Date(),
        };

        await this.sessionService.addMessage(sessionId, goodbyeMessage);

        this.logger.log(`Goodbye generated for session: ${sessionId}`);
      }

      return goodbyeResult;
    } catch (error) {
      this.logger.error(`Error generating goodbye: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle silence
   */
  async handleSilence(sessionId: string): Promise<ResponseGenerationResult> {
    this.logger.log(`Handling silence for session: ${sessionId}`);

    const session = await this.sessionService.getSession(sessionId);
    await this.sessionService.incrementSilence(sessionId);

    const silenceCount = session.silenceCount + 1;

    // Build context
    const context = await this.buildContext(sessionId);

    // Generate silence prompt
    const silenceResult = await this.responseGenerator.generateSilencePrompt(
      context,
      silenceCount,
    );

    if (silenceResult.success) {
      // Add to history
      const silenceMessage: ConversationMessage = {
        id: this.generateMessageId(),
        role: MessageRole.ASSISTANT,
        speaker: SpeakerType.AI,
        content: silenceResult.response,
        timestamp: new Date(),
      };

      await this.sessionService.addMessage(sessionId, silenceMessage);
    }

    return silenceResult;
  }

  // Private helper methods

  /**
   * Build conversation context
   */
  private async buildContext(
    sessionId: string,
    currentMessage?: string,
  ): Promise<ConversationContext> {
    const session = await this.sessionService.getSession(sessionId);

    // Load campaign data
    const campaign = await this.loadCampaignData(session.campaignId);

    // Load script
    const script = await this.loadScript(session.scriptId);

    // Load AI agent
    const agent = await this.loadAgent(session.agentId);

    // Load customer data
    const customer = await this.loadCustomer(session.contactId);

    // TODO: Load knowledge base context (implement when knowledge base is ready)
    const knowledgeContext = [];

    const context: ConversationContext = {
      session,
      campaign,
      script,
      agent,
      customer,
      knowledgeContext,
      memory: session.sessionMemory,
      currentMessage,
      currentIntent: session.currentIntent,
    };

    return context;
  }

  /**
   * Load campaign data
   */
  private async loadCampaignData(campaignId: string) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      return {
        name: campaign?.name || 'Campaign',
        description: campaign?.description,
        goal: (campaign?.settings as any)?.goal,
        instructions: (campaign?.settings as any)?.instructions,
      };
    } catch (error) {
      this.logger.error(`Failed to load campaign: ${error.message}`);
      return {
        name: 'Campaign',
      };
    }
  }

  /**
   * Load script
   */
  private async loadScript(scriptId?: string) {
    if (!scriptId) {
      return {
        content: '',
        steps: [],
      };
    }

    try {
      const script = await this.prisma.script.findUnique({
        where: { id: scriptId },
      });

      return {
        content: script?.content || '',
        steps: (script as any)?.metadata?.steps || [],
      };
    } catch (error) {
      this.logger.error(`Failed to load script: ${error.message}`);
      return {
        content: '',
        steps: [],
      };
    }
  }

  /**
   * Load AI agent
   */
  private async loadAgent(agentId?: string) {
    if (!agentId) {
      return {
        name: 'AI Assistant',
        personality: 'Professional and friendly',
        tone: 'conversational',
        language: 'en',
      };
    }

    try {
      // TODO: Load from AI agent table when available
      return {
        name: 'AI Assistant',
        personality: 'Professional and friendly',
        tone: 'conversational',
        language: 'en',
      };
    } catch (error) {
      this.logger.error(`Failed to load agent: ${error.message}`);
      return {
        name: 'AI Assistant',
      };
    }
  }

  /**
   * Load customer data
   */
  private async loadCustomer(contactId: string) {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
      });

      return {
        name: contact?.fullName,
        phone: contact?.phone || '',
        language: contact?.language || 'en',
        context: (contact?.tags as any) || {},
        history: [],
      };
    } catch (error) {
      this.logger.error(`Failed to load customer: ${error.message}`);
      return {
        phone: '',
        language: 'en',
      };
    }
  }

  /**
   * Check if intent requires special handling
   */
  private shouldHandleSpecialIntent(intent: IntentType): boolean {
    return [
      IntentType.NOT_INTERESTED,
      IntentType.BUSY,
      IntentType.CALL_LATER,
      IntentType.WRONG_NUMBER,
      IntentType.GOODBYE,
    ].includes(intent);
  }

  /**
   * Handle special intents
   */
  private async handleSpecialIntent(
    sessionId: string,
    intent: IntentType,
    context: ConversationContext,
  ): Promise<ResponseGenerationResult> {
    let reason: string;

    switch (intent) {
      case IntentType.NOT_INTERESTED:
        reason = 'not_interested';
        break;
      case IntentType.BUSY:
      case IntentType.CALL_LATER:
        reason = 'call_later';
        break;
      case IntentType.WRONG_NUMBER:
        reason = 'wrong_number';
        break;
      case IntentType.GOODBYE:
        reason = 'completed';
        break;
      default:
        reason = 'completed';
    }

    return await this.responseGenerator.generateGoodbye(context, reason);
  }

  /**
   * Handle failed response generation
   */
  private async handleFailedResponse(
    sessionId: string,
    context: ConversationContext,
  ): Promise<ResponseGenerationResult> {
    this.logger.warn(`Response generation failed for session: ${sessionId}`);

    // Generate fallback response
    return {
      success: true,
      response: "I apologize, but I'm having trouble understanding. Could you please repeat that?",
      confidence: 0.5,
      duration: 0,
      shouldEndConversation: false,
      metadata: { fallback: true },
    };
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
