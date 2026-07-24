/**
 * Response Generator Service
 * Generates AI responses using LLM
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import {
  ConversationContext,
  ResponseGenerationResult,
} from '../interfaces/conversation-session.interface';
import { PromptBuilderService } from './prompt-builder.service';
import { IntentType } from '../enums/conversation-state.enum';

@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);
  private _openai: OpenAI | null = null;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
  ) {
    this.model = this.configService.get<string>('LLM_MODEL') || 'gpt-4-turbo-preview';
    this.temperature = parseFloat(
      this.configService.get<string>('LLM_TEMPERATURE') || '0.7',
    );
    this.maxTokens = parseInt(
      this.configService.get<string>('LLM_MAX_TOKENS') || '500',
    );
  }

  private get openai(): OpenAI {
    if (!this._openai) {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured. Please set it in your .env file.');
      }
      this._openai = new OpenAI({ apiKey });
    }
    return this._openai;
  }

  /**
   * Generate response for customer message
   */
  async generateResponse(
    context: ConversationContext,
  ): Promise<ResponseGenerationResult> {
    const startTime = Date.now();

    this.logger.debug(
      `Generating response for session: ${context.session.sessionId}`,
    );

    try {
      // Build prompt
      const { system, messages } = await this.promptBuilder.buildPrompt(context);

      // Call LLM
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          ...messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      const response = completion.choices[0]?.message?.content || '';
      const duration = Date.now() - startTime;

      // Check if conversation should end
      const shouldEndConversation = this.shouldEndConversation(
        response,
        context.currentIntent,
      );

      // Calculate confidence (simplified)
      const confidence = this.calculateConfidence(completion);

      this.logger.debug(
        `Response generated in ${duration}ms: ${response.substring(0, 100)}...`,
      );

      return {
        success: true,
        response: this.cleanResponse(response),
        confidence,
        tokens: completion.usage?.total_tokens,
        duration,
        shouldEndConversation,
        metadata: {
          model: completion.model,
          finishReason: completion.choices[0]?.finish_reason,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to generate response: ${error.message}`);

      return {
        success: false,
        response: '',
        confidence: 0,
        duration,
        shouldEndConversation: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate greeting message
   */
  async generateGreeting(
    context: ConversationContext,
  ): Promise<ResponseGenerationResult> {
    const startTime = Date.now();

    this.logger.debug(`Generating greeting for session: ${context.session.sessionId}`);

    try {
      const greetingPrompt = await this.promptBuilder.buildGreetingPrompt(context);
      const { system } = await this.promptBuilder.buildPrompt(context);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: greetingPrompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const response = completion.choices[0]?.message?.content || '';
      const duration = Date.now() - startTime;

      return {
        success: true,
        response: this.cleanResponse(response),
        confidence: 0.9,
        tokens: completion.usage?.total_tokens,
        duration,
        shouldEndConversation: false,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to generate greeting: ${error.message}`);

      // Fallback greeting
      const customerName = context.customer.name
        ? context.customer.name.split(' ')[0]
        : 'there';

      return {
        success: true,
        response: `Hello ${customerName}! This is ${context.agent.name}. I'm calling regarding ${context.campaign.name}. Is this a good time to talk?`,
        confidence: 0.5,
        duration,
        shouldEndConversation: false,
        metadata: { fallback: true },
      };
    }
  }

  /**
   * Generate goodbye message
   */
  async generateGoodbye(
    context: ConversationContext,
    reason?: string,
  ): Promise<ResponseGenerationResult> {
    const startTime = Date.now();

    this.logger.debug(`Generating goodbye for session: ${context.session.sessionId}`);

    try {
      const goodbyePrompt = await this.promptBuilder.buildGoodbyePrompt(
        context,
        reason,
      );
      const { system } = await this.promptBuilder.buildPrompt(context);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: goodbyePrompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      const response = completion.choices[0]?.message?.content || '';
      const duration = Date.now() - startTime;

      return {
        success: true,
        response: this.cleanResponse(response),
        confidence: 0.9,
        tokens: completion.usage?.total_tokens,
        duration,
        shouldEndConversation: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to generate goodbye: ${error.message}`);

      // Fallback goodbye
      const customerName = context.customer.name
        ? context.customer.name.split(' ')[0]
        : '';

      return {
        success: true,
        response: `Thank you for your time${customerName ? ', ' + customerName : ''}. Have a great day!`,
        confidence: 0.5,
        duration,
        shouldEndConversation: true,
        metadata: { fallback: true },
      };
    }
  }

  /**
   * Generate clarification request
   */
  async generateClarification(
    context: ConversationContext,
  ): Promise<ResponseGenerationResult> {
    const startTime = Date.now();

    const clarificationMessages = [
      "I'm sorry, I didn't quite catch that. Could you please repeat?",
      "Could you say that again? I want to make sure I understand correctly.",
      "I apologize, could you please rephrase that?",
      "I'm having trouble hearing you. Could you speak a bit louder?",
    ];

    const response =
      clarificationMessages[
        Math.floor(Math.random() * clarificationMessages.length)
      ];

    return {
      success: true,
      response,
      confidence: 1.0,
      duration: Date.now() - startTime,
      shouldEndConversation: false,
      metadata: { type: 'clarification' },
    };
  }

  /**
   * Generate silence prompt
   */
  async generateSilencePrompt(
    context: ConversationContext,
    silenceCount: number,
  ): Promise<ResponseGenerationResult> {
    const startTime = Date.now();

    let response: string;

    if (silenceCount === 1) {
      response = "Are you still there? I'd love to continue our conversation.";
    } else if (silenceCount === 2) {
      response =
        "I haven't heard from you. Is everything okay? Should I call back later?";
    } else {
      response =
        "I'll let you go for now. Feel free to call us back if you have any questions. Have a great day!";
    }

    return {
      success: true,
      response,
      confidence: 1.0,
      duration: Date.now() - startTime,
      shouldEndConversation: silenceCount >= 3,
      metadata: { type: 'silence', silenceCount },
    };
  }

  // Private helper methods

  /**
   * Clean response text
   */
  private cleanResponse(response: string): string {
    // Remove quotes
    let cleaned = response.replace(/^["']|["']$/g, '');

    // Remove stage directions [like this]
    cleaned = cleaned.replace(/\[.*?\]/g, '');

    // Remove action descriptions (Action: ...)
    cleaned = cleaned.replace(/\(.*?\)/g, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Check if conversation should end
   */
  private shouldEndConversation(
    response: string,
    intent?: IntentType,
  ): boolean {
    // Check intent
    if (
      intent === IntentType.NOT_INTERESTED ||
      intent === IntentType.GOODBYE ||
      intent === IntentType.WRONG_NUMBER
    ) {
      return true;
    }

    // Check response content
    const endPhrases = [
      'goodbye',
      'have a great day',
      'have a good day',
      'talk to you later',
      'speak with you soon',
      'thank you for your time',
      'thanks for your time',
    ];

    const lowerResponse = response.toLowerCase();
    return endPhrases.some(phrase => lowerResponse.includes(phrase));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(completion: any): number {
    // Simplified confidence calculation
    // In production, you might use logprobs or other metrics

    const finishReason = completion.choices[0]?.finish_reason;

    if (finishReason === 'stop') {
      return 0.9;
    } else if (finishReason === 'length') {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      return models.data
        .filter(m => m.id.includes('gpt'))
        .map(m => m.id)
        .sort();
    } catch (error) {
      this.logger.error(`Failed to fetch models: ${error.message}`);
      return [this.model];
    }
  }
}
