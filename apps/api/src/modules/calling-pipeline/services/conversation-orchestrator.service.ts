import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationStateService } from './conversation-state.service';
import { AgentExecutionService } from './agent-execution.service';
import { CallSessionService } from './call-session.service';
import { ConversationState, PipelineEvent } from '../enums/call-state.enum';

/**
 * Conversation Orchestrator Service
 * Manages conversation flow and AI responses
 */
@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);

  constructor(
    private readonly conversationState: ConversationStateService,
    private readonly agentExecution: AgentExecutionService,
    private readonly callSession: CallSessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Start conversation with greeting
   */
  async startConversation(sessionId: string): Promise<void> {
    this.logger.log(`Starting conversation: ${sessionId}`);

    try {
      await this.conversationState.transitionState(sessionId, ConversationState.GREETING);

      // Generate greeting
      const greeting = await this.agentExecution.generateGreeting(sessionId);

      // Play greeting (interface)
      await this.playAgentResponse(sessionId, greeting);

      // Transition to listening
      await this.conversationState.transitionState(sessionId, ConversationState.LISTENING);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start conversation: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Process customer input
   */
  async processCustomerInput(sessionId: string, text: string): Promise<void> {
    this.logger.log(`Processing customer input: ${sessionId}`);

    try {
      // Update conversation state
      await this.conversationState.transitionState(sessionId, ConversationState.THINKING);

      // Save customer message to transcript
      await this.callSession.addTranscriptTurn(sessionId, 'customer', text);

      // Emit speech recognized event
      this.eventEmitter.emit(PipelineEvent.SPEECH_RECOGNIZED, {
        sessionId,
        text,
        timestamp: new Date(),
      });

      // Generate AI response
      const response = await this.agentExecution.generateResponse(sessionId, text);

      // Save agent response to transcript
      await this.callSession.addTranscriptTurn(sessionId, 'agent', response);

      // Play response
      await this.playAgentResponse(sessionId, response);

      // Return to listening
      await this.conversationState.transitionState(sessionId, ConversationState.LISTENING);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process customer input: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Handle interruption
   */
  async handleInterruption(sessionId: string): Promise<void> {
    this.logger.log(`Handling interruption: ${sessionId}`);
    await this.conversationState.transitionState(sessionId, ConversationState.HANDLING_INTERRUPTION);
    // Stop current playback
    // Resume listening
  }

  /**
   * Handle silence timeout
   */
  async handleSilence(sessionId: string): Promise<void> {
    this.logger.log(`Handling silence: ${sessionId}`);
    await this.conversationState.transitionState(sessionId, ConversationState.HANDLING_SILENCE);
    
    const prompt = await this.agentExecution.generateSilencePrompt(sessionId);
    await this.playAgentResponse(sessionId, prompt);
  }

  /**
   * End conversation
   */
  async endConversation(sessionId: string): Promise<void> {
    this.logger.log(`Ending conversation: ${sessionId}`);
    
    await this.conversationState.transitionState(sessionId, ConversationState.CLOSING);
    
    const closing = await this.agentExecution.generateClosing(sessionId);
    await this.playAgentResponse(sessionId, closing);
    
    await this.conversationState.transitionState(sessionId, ConversationState.ENDED);
  }

  /**
   * Play agent response (interface)
   */
  private async playAgentResponse(sessionId: string, text: string): Promise<void> {
    this.logger.debug(`Playing agent response: ${sessionId}`);
    
    // TODO: Interface with TTS provider
    // TODO: Interface with telephony provider to play audio
    
    this.eventEmitter.emit(PipelineEvent.RESPONSE_GENERATED, {
      sessionId,
      text,
      timestamp: new Date(),
    });
  }
}
