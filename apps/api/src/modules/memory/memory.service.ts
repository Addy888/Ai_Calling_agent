import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateConversationMemoryDto,
  UpdateConversationMemoryDto,
  CreateCustomerMemoryDto,
  UpdateCustomerMemoryDto,
  CreateSessionMemoryDto,
  UpdateSessionMemoryDto,
  CreateMemorySnapshotDto,
  UpdateMemoryConfigurationDto,
  GetCustomerContextDto,
  RestoreConversationDto,
  LeadStatus,
} from './dto/memory.dto';

@Injectable()
export class MemoryService {
  constructor(private prisma: PrismaService) {}

  async createConversationMemory(dto: CreateConversationMemoryDto) {
    const existing = await this.prisma.conversationMemory.findUnique({
      where: { sessionId: dto.sessionId },
    });

    if (existing) {
      throw new BadRequestException('Conversation memory already exists for this session');
    }

    const memory = await this.prisma.conversationMemory.create({
      data: {
        ...dto,
        lastActivityTime: new Date(),
      },
      include: {
        customerMemory: true,
      },
    });

    await this.createMemoryHistory({
      conversationId: memory.id,
      action: 'CREATED',
      entityType: 'CONVERSATION_MEMORY',
      entityId: memory.id,
      newValue: memory,
    });

    return memory;
  }

  async updateConversationMemory(sessionId: string, dto: UpdateConversationMemoryDto) {
    const existing = await this.prisma.conversationMemory.findUnique({
      where: { sessionId },
    });

    if (!existing) {
      throw new NotFoundException('Conversation memory not found');
    }

    const updated = await this.prisma.conversationMemory.update({
      where: { sessionId },
      data: {
        ...dto,
        lastActivityTime: new Date(),
      },
      include: {
        customerMemory: true,
      },
    });

    await this.createMemoryHistory({
      conversationId: updated.id,
      action: 'UPDATED',
      entityType: 'CONVERSATION_MEMORY',
      entityId: updated.id,
      previousValue: existing,
      newValue: updated,
    });

    return updated;
  }

  async getConversationMemory(sessionId: string) {
    const memory = await this.prisma.conversationMemory.findUnique({
      where: { sessionId },
      include: {
        customerMemory: true,
        history: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!memory) {
      throw new NotFoundException('Conversation memory not found');
    }

    return memory;
  }

  async deleteConversationMemory(sessionId: string) {
    const memory = await this.prisma.conversationMemory.findUnique({
      where: { sessionId },
    });

    if (!memory) {
      throw new NotFoundException('Conversation memory not found');
    }

    await this.prisma.conversationMemory.delete({
      where: { sessionId },
    });

    return { success: true, message: 'Conversation memory deleted' };
  }

  async clearSession(sessionId: string) {
    const memory = await this.prisma.conversationMemory.findUnique({
      where: { sessionId },
    });

    if (!memory) {
      throw new NotFoundException('Conversation memory not found');
    }

    await this.prisma.conversationMemory.update({
      where: { sessionId },
      data: {
        isActive: false,
        sessionEndTime: new Date(),
      },
    });

    await this.prisma.sessionMemory.updateMany({
      where: { sessionId },
      data: {
        conversationFinished: true,
      },
    });

    return { success: true, message: 'Session cleared' };
  }

  async createCustomerMemory(dto: CreateCustomerMemoryDto) {
    const existing = await this.prisma.customerMemory.findUnique({
      where: { conversationId: dto.conversationId },
    });

    if (existing) {
      throw new BadRequestException('Customer memory already exists for this conversation');
    }

    const memory = await this.prisma.customerMemory.create({
      data: dto,
    });

    await this.createMemoryHistory({
      conversationId: dto.conversationId,
      action: 'CREATED',
      entityType: 'CUSTOMER_MEMORY',
      entityId: memory.id,
      newValue: memory,
    });

    return memory;
  }

  async updateCustomerMemory(conversationId: string, dto: UpdateCustomerMemoryDto) {
    const existing = await this.prisma.customerMemory.findUnique({
      where: { conversationId },
    });

    if (!existing) {
      throw new NotFoundException('Customer memory not found');
    }

    const updated = await this.prisma.customerMemory.update({
      where: { conversationId },
      data: {
        ...dto,
        totalInteractions: existing.totalInteractions + 1,
      },
    });

    await this.createMemoryHistory({
      conversationId,
      action: 'UPDATED',
      entityType: 'CUSTOMER_MEMORY',
      entityId: updated.id,
      previousValue: existing,
      newValue: updated,
      changes: this.getChanges(existing, updated),
    });

    return updated;
  }

  async getCustomerMemory(conversationId: string) {
    const memory = await this.prisma.customerMemory.findUnique({
      where: { conversationId },
    });

    if (!memory) {
      throw new NotFoundException('Customer memory not found');
    }

    return memory;
  }

  async getCustomerMemoryByContact(companyId: string, contactId: string) {
    const memories = await this.prisma.customerMemory.findMany({
      where: {
        companyId,
        contactId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    return memories[0] || null;
  }

  async getCustomerMemoryByPhone(companyId: string, phoneNumber: string) {
    const memories = await this.prisma.customerMemory.findMany({
      where: {
        companyId,
        phoneNumber,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    return memories[0] || null;
  }

  async createSessionMemory(dto: CreateSessionMemoryDto) {
    const existing = await this.prisma.sessionMemory.findUnique({
      where: { sessionId: dto.sessionId },
    });

    if (existing) {
      throw new BadRequestException('Session memory already exists');
    }

    const memory = await this.prisma.sessionMemory.create({
      data: dto,
    });

    return memory;
  }

  async updateSessionMemory(sessionId: string, dto: UpdateSessionMemoryDto) {
    const existing = await this.prisma.sessionMemory.findUnique({
      where: { sessionId },
    });

    if (!existing) {
      throw new NotFoundException('Session memory not found');
    }

    const updated = await this.prisma.sessionMemory.update({
      where: { sessionId },
      data: dto,
    });

    return updated;
  }

  async getSessionMemory(sessionId: string) {
    const memory = await this.prisma.sessionMemory.findUnique({
      where: { sessionId },
    });

    if (!memory) {
      throw new NotFoundException('Session memory not found');
    }

    return memory;
  }

  async createMemorySnapshot(dto: CreateMemorySnapshotDto) {
    const conversation = await this.prisma.conversationMemory.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const snapshot = await this.prisma.memorySnapshot.create({
      data: dto,
    });

    return snapshot;
  }

  async getMemorySnapshots(conversationId: string, limit = 50) {
    const snapshots = await this.prisma.memorySnapshot.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return snapshots;
  }

  async getMemoryHistory(conversationId: string, limit = 100) {
    const history = await this.prisma.memoryHistory.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return history;
  }

  async createMemoryHistory(data: {
    conversationId: string;
    action: string;
    entityType: string;
    entityId?: string;
    previousValue?: any;
    newValue?: any;
    changes?: any;
    metadata?: any;
  }) {
    return this.prisma.memoryHistory.create({
      data,
    });
  }

  async getMemoryConfiguration(companyId: string) {
    let config = await this.prisma.memoryConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.memoryConfiguration.create({
        data: {
          companyId,
          sessionTimeout: 1800,
          maxHistoryLength: 100,
          enableAutoSave: true,
          autoSaveInterval: 30,
          retentionDays: 90,
          enableCompression: true,
          compressionThreshold: 1000,
          enableEncryption: false,
        },
      });
    }

    return config;
  }

  async updateMemoryConfiguration(companyId: string, dto: UpdateMemoryConfigurationDto) {
    const existing = await this.getMemoryConfiguration(companyId);

    const updated = await this.prisma.memoryConfiguration.update({
      where: { companyId },
      data: dto,
    });

    return updated;
  }

  async getCustomerContext(dto: GetCustomerContextDto) {
    const { companyId, contactId, phoneNumber, sessionId } = dto;

    let conversationMemory = null;
    let customerMemory = null;
    let sessionMemory = null;

    if (sessionId) {
      conversationMemory = await this.prisma.conversationMemory.findUnique({
        where: { sessionId },
        include: {
          customerMemory: true,
        },
      });

      if (conversationMemory) {
        customerMemory = conversationMemory.customerMemory;
      }

      sessionMemory = await this.prisma.sessionMemory.findUnique({
        where: { sessionId },
      });
    }

    if (!customerMemory && contactId) {
      customerMemory = await this.getCustomerMemoryByContact(companyId, contactId);
    }

    if (!customerMemory && phoneNumber) {
      customerMemory = await this.getCustomerMemoryByPhone(companyId, phoneNumber);
    }

    const previousConversations = customerMemory
      ? await this.prisma.conversationMemory.findMany({
          where: {
            companyId,
            contactId: customerMemory.contactId,
          },
          orderBy: {
            sessionStartTime: 'desc',
          },
          take: 5,
          include: {
            customerMemory: true,
          },
        })
      : [];

    return {
      conversationMemory,
      customerMemory,
      sessionMemory,
      previousConversations,
      context: this.buildContext(conversationMemory, customerMemory, sessionMemory),
    };
  }

  async restoreConversation(dto: RestoreConversationDto) {
    const { companyId, sessionId, contactId, phoneNumber } = dto;

    let customerMemory = null;

    if (contactId) {
      customerMemory = await this.getCustomerMemoryByContact(companyId, contactId);
    } else if (phoneNumber) {
      customerMemory = await this.getCustomerMemoryByPhone(companyId, phoneNumber);
    }

    if (!customerMemory) {
      throw new NotFoundException('No previous conversation found for this customer');
    }

    const previousConversation = await this.prisma.conversationMemory.findFirst({
      where: {
        companyId,
        contactId: customerMemory.contactId,
      },
      orderBy: {
        sessionStartTime: 'desc',
      },
      include: {
        customerMemory: true,
        history: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!previousConversation) {
      throw new NotFoundException('No previous conversation found');
    }

    const newConversation = await this.createConversationMemory({
      sessionId,
      companyId,
      contactId: customerMemory.contactId,
      currentLanguage: customerMemory.preferredLanguage || 'en',
      conversationState: previousConversation.conversationState,
      metadata: {
        restoredFrom: previousConversation.id,
        restoredAt: new Date(),
      },
    });

    const restoredCustomerMemory = await this.createCustomerMemory({
      conversationId: newConversation.id,
      companyId,
      contactId: customerMemory.contactId,
      customerName: customerMemory.customerName,
      phoneNumber: customerMemory.phoneNumber,
      email: customerMemory.email,
      city: customerMemory.city,
      state: customerMemory.state,
      country: customerMemory.country,
      preferredLanguage: customerMemory.preferredLanguage,
      budget: customerMemory.budget,
      propertyType: customerMemory.propertyType,
      interests: customerMemory.interests,
      previousInterests: customerMemory.interests,
      leadStatus: customerMemory.leadStatus,
      qualification: customerMemory.qualification,
      previousSummary: customerMemory.previousSummary,
      salesNotes: customerMemory.salesNotes,
      customerPreferences: customerMemory.customerPreferences,
      lastConversationDate: customerMemory.lastConversationDate,
      lastFollowupDate: customerMemory.lastFollowupDate,
      nextFollowupDate: customerMemory.nextFollowupDate,
    });

    return {
      conversation: newConversation,
      customerMemory: restoredCustomerMemory,
      previousConversation,
      restoredContext: this.buildContext(newConversation, restoredCustomerMemory, null),
    };
  }

  async mergeMemory(sourceSessionId: string, targetSessionId: string) {
    const source = await this.getConversationMemory(sourceSessionId);
    const target = await this.getConversationMemory(targetSessionId);

    const mergedState = {
      ...(typeof target.conversationState === 'object' && target.conversationState !== null ? target.conversationState : {}),
      ...(typeof source.conversationState === 'object' && source.conversationState !== null ? source.conversationState : {}),
    };

    const updated = await this.updateConversationMemory(targetSessionId, {
      conversationState: mergedState,
      metadata: {
        ...(target.metadata as any),
        mergedFrom: sourceSessionId,
        mergedAt: new Date(),
      },
    });

    if (source.customerMemory && target.customerMemory) {
      const mergedInterests = {
        ...((target.customerMemory.interests as any) || {}),
        ...((source.customerMemory.interests as any) || {}),
      };

      await this.updateCustomerMemory(target.id, {
        interests: mergedInterests,
        previousInterests: target.customerMemory.interests,
        salesNotes: [target.customerMemory.salesNotes, source.customerMemory.salesNotes]
          .filter(Boolean)
          .join('\n\n---\n\n'),
      });
    }

    return updated;
  }

  private buildContext(conversationMemory: any, customerMemory: any, sessionMemory: any) {
    const context = {
      session: {
        id: conversationMemory?.sessionId,
        startTime: conversationMemory?.sessionStartTime,
        lastActivity: conversationMemory?.lastActivityTime,
        currentNodeId: conversationMemory?.currentNodeId,
        currentIntent: conversationMemory?.currentIntent,
        language: conversationMemory?.currentLanguage || 'en',
        isActive: conversationMemory?.isActive,
      },
      customer: customerMemory
        ? {
            name: customerMemory.customerName,
            phone: customerMemory.phoneNumber,
            email: customerMemory.email,
            location: {
              city: customerMemory.city,
              state: customerMemory.state,
              country: customerMemory.country,
            },
            preferences: {
              language: customerMemory.preferredLanguage,
              budget: customerMemory.budget,
              propertyType: customerMemory.propertyType,
            },
            interests: customerMemory.interests,
            previousInterests: customerMemory.previousInterests,
            leadStatus: customerMemory.leadStatus,
            qualification: customerMemory.qualification,
            previousSummary: customerMemory.previousSummary,
            salesNotes: customerMemory.salesNotes,
            totalInteractions: customerMemory.totalInteractions,
            lastConversation: customerMemory.lastConversationDate,
            nextFollowup: customerMemory.nextFollowupDate,
          }
        : null,
      conversationState: sessionMemory
        ? {
            greetingCompleted: sessionMemory.greetingCompleted,
            qualificationCompleted: sessionMemory.qualificationCompleted,
            budgetCollected: sessionMemory.budgetCollected,
            locationCollected: sessionMemory.locationCollected,
            projectSuggested: sessionMemory.projectSuggested,
            closingCompleted: sessionMemory.closingCompleted,
            conversationFinished: sessionMemory.conversationFinished,
            currentStep: sessionMemory.currentStep,
            collectedData: sessionMemory.collectedData,
            conversationFlow: sessionMemory.conversationFlow,
          }
        : null,
      metadata: conversationMemory?.metadata,
    };

    return context;
  }

  private getChanges(oldValue: any, newValue: any) {
    const changes: any = {};

    Object.keys(newValue).forEach((key) => {
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changes[key] = {
          old: oldValue[key],
          new: newValue[key],
        };
      }
    });

    return changes;
  }

  async cleanupExpiredSessions(companyId: string) {
    const config = await this.getMemoryConfiguration(companyId);
    const expirationTime = new Date(Date.now() - config.sessionTimeout * 1000);

    const expiredSessions = await this.prisma.conversationMemory.findMany({
      where: {
        companyId,
        isActive: true,
        lastActivityTime: {
          lt: expirationTime,
        },
      },
    });

    for (const session of expiredSessions) {
      await this.clearSession(session.sessionId);
    }

    return {
      success: true,
      cleanedCount: expiredSessions.length,
      message: `Cleaned up ${expiredSessions.length} expired sessions`,
    };
  }

  async getActiveConversations(companyId: string) {
    return this.prisma.conversationMemory.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        customerMemory: true,
      },
      orderBy: {
        lastActivityTime: 'desc',
      },
    });
  }

  async getConversationsByContact(companyId: string, contactId: string) {
    return this.prisma.conversationMemory.findMany({
      where: {
        companyId,
        contactId,
      },
      include: {
        customerMemory: true,
      },
      orderBy: {
        sessionStartTime: 'desc',
      },
    });
  }

  async getLeadsByStatus(companyId: string, leadStatus: LeadStatus) {
    return this.prisma.customerMemory.findMany({
      where: {
        companyId,
        leadStatus,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getCustomerTimeline(companyId: string, contactId: string) {
    const conversations = await this.getConversationsByContact(companyId, contactId);

    const timeline = [];

    for (const conversation of conversations) {
      const history = await this.getMemoryHistory(conversation.id);
      const snapshots = await this.getMemorySnapshots(conversation.id);

      timeline.push({
        conversation,
        history,
        snapshots,
      });
    }

    return timeline;
  }
}
