/**
 * Conversation Flow Integration Tests
 * Tests the complete conversation flow from start to end
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConversationRuntimeModule } from '../../conversation-runtime.module';
import { ConversationRuntimeManagerService } from '../../services/conversation-runtime-manager.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ConversationState,
  ConversationEndReason,
} from '../../enums/conversation-state.enum';

describe('Conversation Flow Integration', () => {
  let module: TestingModule;
  let runtimeManager: ConversationRuntimeManagerService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConversationRuntimeModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        campaign: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'campaign-123',
            name: 'Test Campaign',
            description: 'Test Description',
            settings: {
              goal: 'Schedule demo',
              instructions: 'Be professional',
            },
          }),
        },
        script: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'script-123',
            content: 'Hello, I am calling about our product.',
            metadata: {
              steps: [
                { step: 1, content: 'Introduce', required: true },
                { step: 2, content: 'Ask interest', required: true },
              ],
            },
          }),
        },
        contact: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'contact-123',
            fullName: 'John Doe',
            phone: '+1234567890',
            language: 'en',
          }),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
        conversationSession: {
          create: jest.fn().mockResolvedValue({ id: 'db-session-id' }),
        },
        transcriptEntry: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        call: {
          update: jest.fn().mockResolvedValue({}),
        },
        campaignQueue: {
          findFirst: jest.fn().mockResolvedValue({ id: 'queue-id' }),
          update: jest.fn().mockResolvedValue({}),
        },
      })
      .compile();

    runtimeManager = module.get<ConversationRuntimeManagerService>(
      ConversationRuntimeManagerService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Complete Conversation Flow', () => {
    it('should complete a full conversation flow', async () => {
      // 1. Start Conversation
      const startResult = await runtimeManager.startConversation({
        callId: 'call-123',
        campaignId: 'campaign-123',
        contactId: 'contact-123',
        companyId: 'company-123',
        customerPhone: '+1234567890',
        customerName: 'John Doe',
        customerLanguage: 'en',
      });

      expect(startResult.session).toBeDefined();
      expect(startResult.session.state).toBe(ConversationState.WAITING);
      expect(startResult.greeting).toBeDefined();
      expect(startResult.greeting.success).toBe(true);

      const sessionId = startResult.session.sessionId;

      // 2. Process Customer Message
      const message1 = await runtimeManager.processMessage({
        sessionId,
        message: 'Yes, I am interested',
      });

      expect(message1.success).toBe(true);
      expect(message1.response).toBeTruthy();
      expect(message1.confidence).toBeGreaterThan(0);

      // 3. Process Another Message
      const message2 = await runtimeManager.processMessage({
        sessionId,
        message: 'Tell me more about pricing',
      });

      expect(message2.success).toBe(true);
      expect(message2.response).toBeTruthy();

      // 4. End Conversation
      const endResult = await runtimeManager.endConversation({
        sessionId,
        reason: ConversationEndReason.COMPLETED,
      });

      expect(endResult.session.state).toBe(ConversationState.COMPLETED);
      expect(endResult.session.isActive).toBe(false);
      expect(endResult.goodbye).toBeDefined();
    }, 30000);

    it('should handle customer declining', async () => {
      // Start conversation
      const startResult = await runtimeManager.startConversation({
        callId: 'call-456',
        campaignId: 'campaign-123',
        contactId: 'contact-123',
        companyId: 'company-123',
        customerPhone: '+1234567890',
      });

      const sessionId = startResult.session.sessionId;

      // Customer declines
      const response = await runtimeManager.processMessage({
        sessionId,
        message: 'No, I am not interested',
      });

      expect(response.success).toBe(true);
      expect(response.shouldEndConversation).toBe(true);

      // End conversation
      const endResult = await runtimeManager.endConversation({
        sessionId,
        reason: ConversationEndReason.NOT_INTERESTED,
      });

      expect(endResult.session.state).toBe(ConversationState.COMPLETED);
    }, 30000);

    it('should handle silence timeout', async () => {
      // Start conversation
      const startResult = await runtimeManager.startConversation({
        callId: 'call-789',
        campaignId: 'campaign-123',
        contactId: 'contact-123',
        companyId: 'company-123',
        customerPhone: '+1234567890',
      });

      const sessionId = startResult.session.sessionId;

      // Simulate silence
      const silenceResponse1 = await runtimeManager.handleSilenceTimeout(sessionId);
      expect(silenceResponse1.success).toBe(true);
      expect(silenceResponse1.shouldEndConversation).toBe(false);

      // Second silence
      const silenceResponse2 = await runtimeManager.handleSilenceTimeout(sessionId);
      expect(silenceResponse2.success).toBe(true);

      // Third silence - should suggest ending
      const silenceResponse3 = await runtimeManager.handleSilenceTimeout(sessionId);
      expect(silenceResponse3.shouldEndConversation).toBe(true);
    }, 30000);
  });

  describe('Session Management', () => {
    it('should track session statistics', async () => {
      const startResult = await runtimeManager.startConversation({
        callId: 'call-stats',
        campaignId: 'campaign-123',
        contactId: 'contact-123',
        companyId: 'company-123',
        customerPhone: '+1234567890',
      });

      const sessionId = startResult.session.sessionId;

      // Process multiple messages
      await runtimeManager.processMessage({
        sessionId,
        message: 'First message',
      });

      await runtimeManager.processMessage({
        sessionId,
        message: 'Second message',
      });

      await runtimeManager.processMessage({
        sessionId,
        message: 'Third message',
      });

      // Get statistics
      const stats = await runtimeManager.getSessionStatistics(sessionId);

      expect(stats.turnCount).toBeGreaterThan(0);
      expect(stats.customerMessageCount).toBe(3);
      expect(stats.aiMessageCount).toBeGreaterThan(0);
    }, 30000);

    it('should list active sessions', async () => {
      // Start multiple sessions
      await runtimeManager.startConversation({
        callId: 'call-active-1',
        campaignId: 'campaign-123',
        contactId: 'contact-123',
        companyId: 'company-123',
        customerPhone: '+1234567890',
      });

      await runtimeManager.startConversation({
        callId: 'call-active-2',
        campaignId: 'campaign-123',
        contactId: 'contact-456',
        companyId: 'company-123',
        customerPhone: '+1234567891',
      });

      const activeSessions = await runtimeManager.getActiveSessions();

      expect(activeSessions.length).toBeGreaterThanOrEqual(2);
      expect(activeSessions.every((s) => s.isActive)).toBe(true);
    }, 30000);
  });

  describe('Pause and Resume', () => {
    it('should pause and resume conversation', async () => {
      const startResult = await runtimeManager.startConversation({
        callId: 'call-pause',
        campaignId: 'campaign-123',
        contactId: 'contact-123',
        companyId: 'company-123',
        customerPhone: '+1234567890',
      });

      const sessionId = startResult.session.sessionId;

      // Pause
      await runtimeManager.pauseConversation(sessionId);
      const pausedSession = await runtimeManager.getSession(sessionId);
      expect(pausedSession.state).toBe(ConversationState.PAUSED);

      // Resume
      await runtimeManager.resumeConversation(sessionId);
      const resumedSession = await runtimeManager.getSession(sessionId);
      expect(resumedSession.state).toBe(ConversationState.WAITING);
    }, 30000);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await runtimeManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.activeSessions).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });
});
