/**
 * Conversation Memory Service
 * Adapter for the existing MemoryModule to manage conversation context
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface MemoryContext {
  shortTerm: any[];
  session: any[];
  customer: any[];
}

@Injectable()
export class ConversationMemoryService {
  private readonly logger = new Logger(ConversationMemoryService.name);
  private sessionMemories = new Map<string, any[]>();

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async initializeSession(sessionId: string, context: {
    campaignId: string;
    contactId: string;
    callId: string;
  }) {
    this.logger.log(`Initializing memory for session ${sessionId}`);

    try {
      // Initialize in-memory storage
      this.sessionMemories.set(sessionId, []);

      // Load customer history if exists
      const customerHistory = await this.loadCustomerHistory(context.contactId);
      
      // Store initial context
      await this.storeMemory(sessionId, {
        type: 'SESSION',
        key: 'initialized',
        value: JSON.stringify(context),
      });

      return { success: true, customerHistory };
    } catch (error) {
      this.logger.error(`Failed to initialize session memory: ${error.message}`);
      throw error;
    }
  }

  async retrieveContext(sessionId: string): Promise<MemoryContext> {
    try {
      // Get all memories for this session
      const memories = await this.prisma.conversationMemoryItem.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Organize by type
      const context: MemoryContext = {
        shortTerm: memories.filter(m => m.type === 'SHORT_TERM'),
        session: memories.filter(m => m.type === 'SESSION'),
        customer: memories.filter(m => m.type === 'CUSTOMER'),
      };

      return context;
    } catch (error) {
      this.logger.error(`Failed to retrieve context: ${error.message}`);
      return { shortTerm: [], session: [], customer: [] };
    }
  }

  async updateContext(sessionId: string, data: {
    customerMessage: string;
    aiResponse: string;
    intent?: any;
    emotion?: string;
  }) {
    try {
      // Store customer message
      await this.storeMemory(sessionId, {
        type: 'SHORT_TERM',
        key: 'customer_message',
        value: data.customerMessage,
      });

      // Store AI response
      await this.storeMemory(sessionId, {
        type: 'SHORT_TERM',
        key: 'ai_response',
        value: data.aiResponse,
      });

      // Store intent if detected
      if (data.intent) {
        await this.storeMemory(sessionId, {
          type: 'SESSION',
          key: 'intent',
          value: JSON.stringify(data.intent),
        });
      }

      // Store emotion if detected
      if (data.emotion) {
        await this.storeMemory(sessionId, {
          type: 'SESSION',
          key: 'emotion',
          value: data.emotion,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to update context: ${error.message}`);
    }
  }

  private async storeMemory(sessionId: string, data: {
    type: 'SHORT_TERM' | 'SESSION' | 'CUSTOMER' | 'CONTEXT';
    key: string;
    value: string;
    ttl?: number;
  }) {
    try {
      await this.prisma.conversationMemoryItem.create({
        data: {
          sessionId,
          type: data.type,
          key: data.key,
          value: data.value,
          ttl: data.ttl,
          expiresAt: data.ttl ? new Date(Date.now() + data.ttl * 1000) : null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store memory: ${error.message}`);
    }
  }

  private async loadCustomerHistory(contactId: string): Promise<any[]> {
    try {
      // Load previous conversations with this customer
      const previousSessions = await this.prisma.conversationSession.findMany({
        where: {
          contactId,
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          intent: true,
          leadScore: true,
          summary: true,
          emotion: true,
          createdAt: true,
        },
      });

      return previousSessions;
    } catch (error) {
      this.logger.error(`Failed to load customer history: ${error.message}`);
      return [];
    }
  }

  async cleanup(sessionId: string) {
    try {
      this.sessionMemories.delete(sessionId);
      
      // Optionally cleanup old short-term memories
      await this.prisma.conversationMemoryItem.deleteMany({
        where: {
          sessionId,
          type: 'SHORT_TERM',
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to cleanup memory: ${error.message}`);
    }
  }
}
