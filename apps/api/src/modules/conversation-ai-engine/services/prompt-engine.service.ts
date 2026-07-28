/**
 * Prompt Engine Service
 * Dynamic prompt generation with context, memory, and knowledge integration
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PromptEngineService {
  private readonly logger = new Logger(PromptEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async buildPrompt(context: {
    sessionId: string;
    campaignId: string;
    customerMessage: string;
    intent?: any;
    customerEmotion?: string;
    memoryContext?: any;
    knowledgeContext?: any[];
  }): Promise<string> {
    try {
      this.logger.debug('Building conversation prompt');

      // Load system prompt
      const systemPrompt = await this.getSystemPrompt(context.campaignId);

      // Load campaign-specific prompt
      const campaignPrompt = await this.getCampaignPrompt(context.campaignId);

      // Build conversation history
      const conversationHistory = await this.buildConversationHistory(context.sessionId);

      // Build knowledge context
      const knowledgeSection = this.buildKnowledgeSection(context.knowledgeContext);

      // Build memory context
      const memorySection = this.buildMemorySection(context.memoryContext);

      // Compose final prompt
      const prompt = `${systemPrompt}

${campaignPrompt}

${knowledgeSection}

${memorySection}

${conversationHistory}

Customer: ${context.customerMessage}
${context.intent ? `[Intent: ${context.intent.intent}]` : ''}
${context.customerEmotion ? `[Emotion: ${context.customerEmotion}]` : ''}

AI Assistant:`;

      return prompt;
    } catch (error) {
      this.logger.error(`Failed to build prompt: ${error.message}`);
      return this.getFallbackPrompt(context.customerMessage);
    }
  }

  async buildGreetingPrompt(context: {
    sessionId: string;
    campaignId: string;
    contactId: string;
  }): Promise<string> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: context.campaignId },
        select: { name: true, objective: true },
      });

      const contact = await this.prisma.contact.findUnique({
        where: { id: context.contactId },
        select: { firstName: true, lastName: true },
      });

      const prompt = `You are a professional sales representative calling on behalf of ${campaign?.name}.

Objective: ${campaign?.objective}

Customer: ${contact?.firstName} ${contact?.lastName}

Generate a warm, professional greeting to start the conversation. Keep it natural and concise.

Greeting:`;

      return prompt;
    } catch (error) {
      this.logger.error(`Failed to build greeting prompt: ${error.message}`);
      return 'Generate a professional greeting for a sales call.';
    }
  }

  private async getSystemPrompt(campaignId: string): Promise<string> {
    try {
      // Get campaign to find its prompt
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { prompt: true },
      });

      // Use campaign's prompt if configured
      if (campaign?.prompt && campaign.prompt.category === 'SYSTEM') {
        return campaign.prompt.content;
      }

      // Fallback to any SYSTEM prompt for the company
      if (campaign) {
        const systemPrompt = await this.prisma.prompt.findFirst({
          where: {
            companyId: campaign.companyId,
            category: 'SYSTEM',
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (systemPrompt) {
          return systemPrompt.content;
        }
      }

      // Default system prompt
      return `You are an AI sales assistant conducting a phone conversation. You are:
- Professional, friendly, and empathetic
- Clear and concise in your responses
- Focused on understanding customer needs
- Able to handle objections gracefully
- Natural in conversation flow

Key behaviors:
- Listen actively to customer responses
- Ask clarifying questions when needed
- Provide relevant information based on customer needs
- Be honest if you don't know something
- Guide the conversation toward the campaign objective
- Respect customer's time and interest level`;
    } catch (error) {
      this.logger.error(`Failed to load system prompt: ${error.message}`);
      return 'You are a helpful AI assistant.';
    }
  }

  private async getCampaignPrompt(campaignId: string): Promise<string> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { name: true, objective: true, description: true },
      });

      if (!campaign) return '';

      return `
Campaign: ${campaign.name}
Objective: ${campaign.objective}
${campaign.description ? `Description: ${campaign.description}` : ''}
`;
    } catch (error) {
      this.logger.error(`Failed to load campaign prompt: ${error.message}`);
      return '';
    }
  }

  private async buildConversationHistory(sessionId: string): Promise<string> {
    try {
      const messages = await this.prisma.conversationMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 10, // Last 10 messages
        select: {
          role: true,
          content: true,
        },
      });

      if (messages.length === 0) return '';

      const history = messages
        .map(m => `${m.role === 'CUSTOMER' ? 'Customer' : 'AI Assistant'}: ${m.content}`)
        .join('\n');

      return `
Previous conversation:
${history}
`;
    } catch (error) {
      this.logger.error(`Failed to build conversation history: ${error.message}`);
      return '';
    }
  }

  private buildKnowledgeSection(knowledgeContext?: any[]): string {
    if (!knowledgeContext || knowledgeContext.length === 0) {
      return '';
    }

    const knowledgeItems = knowledgeContext
      .map((item, idx) => `[${idx + 1}] ${item.content}`)
      .join('\n');

    return `
Relevant knowledge base information:
${knowledgeItems}
`;
  }

  private buildMemorySection(memoryContext?: any): string {
    if (!memoryContext) return '';

    const items: string[] = [];

    // Add customer history
    if (memoryContext.customer && memoryContext.customer.length > 0) {
      items.push('Previous interactions with this customer:');
      items.push(...memoryContext.customer.map((m: any) => `- ${m.value}`));
    }

    return items.length > 0 ? `\n${items.join('\n')}\n` : '';
  }

  private getFallbackPrompt(customerMessage: string): string {
    return `Customer: ${customerMessage}\n\nAI Assistant:`;
  }
}
