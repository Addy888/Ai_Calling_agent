/**
 * Prompt Builder Service
 * Constructs comprehensive prompts for LLM by combining all context
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationContext,
  ConversationSession,
  SessionMemory,
} from '../interfaces/conversation-session.interface';
import { MessageRole, SpeakerType } from '../enums/conversation-state.enum';

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  /**
   * Build complete prompt for LLM
   */
  async buildPrompt(context: ConversationContext): Promise<{
    system: string;
    messages: Array<{ role: string; content: string }>;
  }> {
    this.logger.debug(`Building prompt for session: ${context.session.sessionId}`);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(context);

    // Build conversation messages
    const messages = this.buildConversationMessages(context);

    return {
      system: systemPrompt,
      messages,
    };
  }

  /**
   * Build system prompt with all context
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const parts: string[] = [];

    // 1. Base Instructions
    parts.push(this.getBaseInstructions());

    // 2. AI Agent Personality
    if (context.agent) {
      parts.push(this.getAgentPersonality(context.agent));
    }

    // 3. Campaign Context
    if (context.campaign) {
      parts.push(this.getCampaignContext(context.campaign));
    }

    // 4. Script Instructions
    if (context.script && context.script.content) {
      parts.push(this.getScriptInstructions(context.script));
    }

    // 5. Customer Context
    if (context.customer) {
      parts.push(this.getCustomerContext(context.customer));
    }

    // 6. Knowledge Base Context
    if (context.knowledgeContext && context.knowledgeContext.length > 0) {
      parts.push(this.getKnowledgeContext(context.knowledgeContext));
    }

    // 7. Memory Context
    if (context.memory) {
      parts.push(this.getMemoryContext(context.memory));
    }

    // 8. Current State
    parts.push(this.getCurrentStateContext(context.session));

    // 9. Response Guidelines
    parts.push(this.getResponseGuidelines());

    return parts.filter(p => p.length > 0).join('\n\n');
  }

  /**
   * Base instructions for AI behavior
   */
  private getBaseInstructions(): string {
    return `You are an AI voice agent making a phone call. Your role is to have a natural, helpful conversation while following the provided script and guidelines.

IMPORTANT RULES:
- Speak naturally and conversationally like a real person
- Keep responses concise (1-3 sentences unless more detail is requested)
- Never mention you are an AI unless directly asked
- Stay on topic and guide the conversation toward the campaign goal
- Listen carefully to the customer and respond appropriately
- Be respectful, professional, and empathetic
- Handle objections gracefully
- Use the script as a guide, not a strict template
- Adapt to the customer's responses and tone`;
  }

  /**
   * AI Agent personality and tone
   */
  private getAgentPersonality(agent: {
    name: string;
    personality?: string;
    instructions?: string;
    tone?: string;
    language?: string;
  }): string {
    const parts: string[] = [];

    parts.push(`AI AGENT PROFILE:`);
    parts.push(`Name: ${agent.name}`);

    if (agent.personality) {
      parts.push(`Personality: ${agent.personality}`);
    }

    if (agent.tone) {
      parts.push(`Tone: ${agent.tone}`);
    }

    if (agent.language) {
      parts.push(`Language: ${agent.language}`);
    }

    if (agent.instructions) {
      parts.push(`\nAgent Instructions:\n${agent.instructions}`);
    }

    return parts.join('\n');
  }

  /**
   * Campaign context and goals
   */
  private getCampaignContext(campaign: {
    name: string;
    description?: string;
    goal?: string;
    instructions?: string;
  }): string {
    const parts: string[] = [];

    parts.push(`CAMPAIGN CONTEXT:`);
    parts.push(`Campaign: ${campaign.name}`);

    if (campaign.description) {
      parts.push(`Description: ${campaign.description}`);
    }

    if (campaign.goal) {
      parts.push(`Goal: ${campaign.goal}`);
    }

    if (campaign.instructions) {
      parts.push(`\nCampaign Instructions:\n${campaign.instructions}`);
    }

    return parts.join('\n');
  }

  /**
   * Script instructions
   */
  private getScriptInstructions(script: {
    content: string;
    steps?: Array<{ step: number; content: string; required?: boolean }>;
  }): string {
    const parts: string[] = [];

    parts.push(`CONVERSATION SCRIPT:`);
    parts.push(
      `Follow this script as a guide. You can adapt the exact wording, but cover the key points.`,
    );
    parts.push('');
    parts.push(script.content);

    if (script.steps && script.steps.length > 0) {
      parts.push('');
      parts.push('Script Steps:');
      script.steps.forEach(step => {
        const required = step.required ? ' (REQUIRED)' : '';
        parts.push(`${step.step}. ${step.content}${required}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Customer context
   */
  private getCustomerContext(customer: {
    name?: string;
    phone: string;
    language?: string;
    context?: Record<string, any>;
    history?: any[];
  }): string {
    const parts: string[] = [];

    parts.push(`CUSTOMER INFORMATION:`);

    if (customer.name) {
      parts.push(`Name: ${customer.name}`);
      parts.push(`Address the customer as: ${customer.name.split(' ')[0]}`);
    }

    parts.push(`Phone: ${customer.phone}`);

    if (customer.language) {
      parts.push(`Preferred Language: ${customer.language}`);
    }

    if (customer.context && Object.keys(customer.context).length > 0) {
      parts.push(`\nCustomer Context:`);
      Object.entries(customer.context).forEach(([key, value]) => {
        parts.push(`- ${key}: ${value}`);
      });
    }

    if (customer.history && customer.history.length > 0) {
      parts.push(`\nPrevious Interactions: Customer has ${customer.history.length} previous interaction(s)`);
    }

    return parts.join('\n');
  }

  /**
   * Knowledge base context
   */
  private getKnowledgeContext(
    knowledge: Array<{
      content: string;
      source: string;
      relevance: number;
    }>,
  ): string {
    const parts: string[] = [];

    parts.push(`RELEVANT KNOWLEDGE BASE INFORMATION:`);
    parts.push(
      `Use this information to answer customer questions accurately.`,
    );
    parts.push('');

    knowledge.forEach((item, index) => {
      parts.push(`[${index + 1}] ${item.content}`);
      parts.push(`   Source: ${item.source}`);
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Memory context
   */
  private getMemoryContext(memory: SessionMemory): string {
    const parts: string[] = [];

    parts.push(`CONVERSATION MEMORY:`);

    // Current progress
    parts.push(`Current Step: ${memory.currentStep}`);
    parts.push(`Script Progress: ${memory.scriptProgress}%`);

    // Current topic
    if (memory.currentTopic) {
      parts.push(`Current Topic: ${memory.currentTopic}`);
    }

    // Previous answers
    if (memory.previousAnswers && memory.previousAnswers.length > 0) {
      parts.push(`\nPrevious Q&A:`);
      memory.previousAnswers.slice(-3).forEach(qa => {
        parts.push(`Q: ${qa.question}`);
        parts.push(`A: ${qa.answer}`);
      });
    }

    // Extracted data
    if (memory.extractedData && Object.keys(memory.extractedData).length > 0) {
      parts.push(`\nExtracted Information:`);
      Object.entries(memory.extractedData).forEach(([key, value]) => {
        parts.push(`- ${key}: ${value}`);
      });
    }

    // Last AI response
    if (memory.lastAIResponse) {
      parts.push(`\nYour Last Response: ${memory.lastAIResponse}`);
    }

    return parts.join('\n');
  }

  /**
   * Current state context
   */
  private getCurrentStateContext(session: ConversationSession): string {
    const parts: string[] = [];

    parts.push(`CURRENT CONVERSATION STATE:`);
    parts.push(`State: ${session.state}`);
    parts.push(`Turn: ${session.turnCount}`);

    if (session.currentIntent) {
      parts.push(`Detected Intent: ${session.currentIntent}`);
    }

    if (session.silenceCount > 0) {
      parts.push(`Silence Count: ${session.silenceCount}`);
      if (session.silenceCount >= 2) {
        parts.push(
          `NOTE: Customer has been silent multiple times. Check if they need clarification.`,
        );
      }
    }

    return parts.join('\n');
  }

  /**
   * Response guidelines
   */
  private getResponseGuidelines(): string {
    return `RESPONSE GUIDELINES:
1. Keep responses natural and conversational
2. Use 1-3 sentences unless more detail is needed
3. Ask one question at a time
4. Listen for customer objections and handle them professionally
5. If customer says they're busy, offer to call back later
6. If customer is not interested, thank them politely and end the call
7. If customer has questions, answer them using the knowledge base
8. Stay positive and helpful throughout the conversation
9. Guide the conversation toward the campaign goal
10. End the call gracefully when appropriate

INTENT HANDLING:
- If customer says "yes", "sure", "okay" → Continue with next step
- If customer says "no", "not interested" → Handle objection or end gracefully
- If customer is busy → Offer to call back later
- If wrong number → Apologize and end call
- If customer has questions → Answer using available information

IMPORTANT: Respond ONLY with what you would say out loud. Do not include actions, stage directions, or meta-commentary.`;
  }

  /**
   * Build conversation messages for context
   */
  private buildConversationMessages(
    context: ConversationContext,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // Add recent conversation history (last 10 messages)
    const recentHistory = context.session.conversationHistory.slice(-10);

    recentHistory.forEach(msg => {
      let role: string;

      if (msg.role === MessageRole.SYSTEM) {
        role = 'system';
      } else if (msg.role === MessageRole.USER) {
        role = 'user';
      } else {
        role = 'assistant';
      }

      messages.push({
        role,
        content: msg.content,
      });
    });

    // Add current message if provided
    if (context.currentMessage) {
      messages.push({
        role: 'user',
        content: context.currentMessage,
      });
    }

    return messages;
  }

  /**
   * Build greeting prompt
   */
  async buildGreetingPrompt(context: ConversationContext): Promise<string> {
    const parts: string[] = [];

    parts.push(
      `Generate a warm, natural greeting to start the conversation.`,
    );

    if (context.customer.name) {
      parts.push(`Address ${context.customer.name.split(' ')[0]} by name.`);
    }

    if (context.campaign.name) {
      parts.push(`Mention you're calling about: ${context.campaign.name}`);
    }

    parts.push(`Keep it brief and friendly (1-2 sentences).`);
    parts.push(`Ask if now is a good time to talk.`);

    return parts.join(' ');
  }

  /**
   * Build goodbye prompt
   */
  async buildGoodbyePrompt(
    context: ConversationContext,
    reason?: string,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(`Generate a polite, professional closing message.`);

    if (reason === 'completed') {
      parts.push(`Thank the customer for their time.`);
      parts.push(`Summarize any next steps if applicable.`);
    } else if (reason === 'not_interested') {
      parts.push(`Thank the customer anyway.`);
      parts.push(`Wish them a good day.`);
    } else if (reason === 'call_later') {
      parts.push(`Confirm you'll call back later.`);
      parts.push(`Thank them for their time.`);
    }

    parts.push(`Keep it brief (1-2 sentences).`);

    return parts.join(' ');
  }
}
