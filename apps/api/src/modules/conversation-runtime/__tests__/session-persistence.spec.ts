/**
 * Session Persistence Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionPersistenceService } from '../services/session-persistence.service';
import { ConversationSessionService } from '../services/conversation-session.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConversationState,
  MessageRole,
  SpeakerType,
  IntentType,
  ConversationEndReason,
} from '../enums/conversation-state.enum';
import type { ConversationSession } from '../interfaces/conversation-session.interface';

describe('SessionPersistenceService', () => {
  let service: SessionPersistenceService;
  let sessionService: ConversationSessionService;
  let prisma: PrismaService;

  const mockSession: ConversationSession = {
    sessionId: 'test-session-123',
    callId: 'call-456',
    campaignId: 'campaign-789',
    contactId: 'contact-012',
    companyId: 'company-345',
    agentId: 'agent-678',
    scriptId: 'script-901',
    state: ConversationState.COMPLETED,
    currentStep: 5,
    isActive: false,
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    customerLanguage: 'en',
    conversationHistory: [
      {
        id: 'msg1',
        role: MessageRole.ASSISTANT,
        speaker: SpeakerType.AI,
        content: 'Hello John!',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg2',
        role: MessageRole.USER,
        speaker: SpeakerType.CUSTOMER,
        content: 'Hi there',
        timestamp: new Date('2024-01-01T10:00:05Z'),
        intent: IntentType.GENERAL,
        confidence: 0.8,
      },
    ],
    detectedIntents: [IntentType.GENERAL, IntentType.INTERESTED],
    currentIntent: IntentType.INTERESTED,
    sessionMemory: {
      previousAnswers: [
        {
          question: 'Are you interested?',
          answer: 'Yes',
          timestamp: new Date('2024-01-01T10:00:10Z'),
        },
      ],
      currentStep: 5,
      scriptProgress: 80,
      extractedData: {
        interest: 'high',
        budget: '$100-200',
      },
      intentHistory: [
        {
          intent: IntentType.GENERAL,
          confidence: 0.8,
          timestamp: new Date('2024-01-01T10:00:05Z'),
        },
      ],
      custom: {
        notes: 'Very interested customer',
      },
    },
    startedAt: new Date('2024-01-01T10:00:00Z'),
    lastActivityAt: new Date('2024-01-01T10:05:00Z'),
    endedAt: new Date('2024-01-01T10:05:30Z'),
    duration: 330, // 5.5 minutes in seconds
    turnCount: 10,
    customerMessageCount: 5,
    aiMessageCount: 5,
    silenceCount: 1,
    metadata: {
      source: 'test',
    },
    endReason: ConversationEndReason.COMPLETED,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionPersistenceService,
        {
          provide: ConversationSessionService,
          useValue: {
            getSession: jest.fn().mockResolvedValue(mockSession),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((callback) => callback(prisma)),
            conversationSession: {
              create: jest.fn().mockResolvedValue({ id: 'session-db-id' }),
            },
            transcriptEntry: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            call: {
              update: jest.fn().mockResolvedValue({}),
            },
            campaignQueue: {
              findFirst: jest.fn().mockResolvedValue({ id: 'queue-id' }),
              update: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SessionPersistenceService>(SessionPersistenceService);
    sessionService = module.get<ConversationSessionService>(ConversationSessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('persistSession', () => {
    it('should persist session successfully', async () => {
      const result = await service.persistSession('test-session-123');

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session-123');
    });

    it('should fetch session from session service', async () => {
      await service.persistSession('test-session-123');

      expect(sessionService.getSession).toHaveBeenCalledWith('test-session-123');
    });

    it('should create conversation session in database', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'test-session-123',
            callId: 'call-456',
            campaignId: 'campaign-789',
            contactId: 'contact-012',
            state: ConversationState.COMPLETED,
          }),
        }),
      );
    });

    it('should create transcript entries for all messages', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.transcriptEntry.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              sessionId: 'test-session-123',
              speaker: SpeakerType.AI,
              content: 'Hello John!',
            }),
            expect.objectContaining({
              sessionId: 'test-session-123',
              speaker: SpeakerType.CUSTOMER,
              content: 'Hi there',
            }),
          ]),
        }),
      );
    });

    it('should update call record with session data', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.call.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'call-456' },
          data: expect.objectContaining({
            conversationSessionId: expect.any(String),
            duration: 330,
            transcriptGenerated: true,
          }),
        }),
      );
    });

    it('should update campaign queue with conversation data', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.campaignQueue.update).toHaveBeenCalled();
    });

    it('should use database transaction', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle session not found', async () => {
      jest.spyOn(sessionService, 'getSession').mockRejectedValue(
        new Error('Session not found'),
      );

      const result = await service.persistSession('invalid-session');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(prisma, '$transaction').mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.persistSession('test-session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should persist session memory correctly', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionMemory: expect.objectContaining({
              previousAnswers: expect.any(Array),
              extractedData: expect.objectContaining({
                interest: 'high',
                budget: '$100-200',
              }),
            }),
          }),
        }),
      );
    });

    it('should persist conversation statistics', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            turnCount: 10,
            customerMessageCount: 5,
            aiMessageCount: 5,
            silenceCount: 1,
          }),
        }),
      );
    });

    it('should persist detected intents', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectedIntents: [IntentType.GENERAL, IntentType.INTERESTED],
            currentIntent: IntentType.INTERESTED,
          }),
        }),
      );
    });

    it('should persist timestamps correctly', async () => {
      await service.persistSession('test-session-123');

      expect(prisma.conversationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startedAt: expect.any(Date),
            endedAt: expect.any(Date),
            duration: 330,
          }),
        }),
      );
    });
  });

  describe('persistTranscript', () => {
    it('should persist transcript entries', async () => {
      const result = await service.persistTranscript('test-session-123');

      expect(result.success).toBe(true);
      expect(result.entryCount).toBe(2);
    });

    it('should handle empty conversation history', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        ...mockSession,
        conversationHistory: [],
      });

      const result = await service.persistTranscript('test-session-123');

      expect(result.success).toBe(true);
      expect(result.entryCount).toBe(0);
    });
  });

  describe('getPersistedSession', () => {
    it('should retrieve persisted session', async () => {
      const mockDbSession = {
        id: 'db-id',
        sessionId: 'test-session-123',
        callId: 'call-456',
        state: ConversationState.COMPLETED,
      };

      jest.spyOn(prisma.conversationSession as any, 'findUnique').mockResolvedValue(
        mockDbSession,
      );

      const result = await service.getPersistedSession('test-session-123');

      expect(result).toEqual(mockDbSession);
    });

    it('should return null for non-existent session', async () => {
      jest.spyOn(prisma.conversationSession as any, 'findUnique').mockResolvedValue(null);

      const result = await service.getPersistedSession('invalid-session');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session and related data', async () => {
      jest.spyOn(prisma.transcriptEntry as any, 'deleteMany').mockResolvedValue({ count: 2 });
      jest.spyOn(prisma.conversationSession as any, 'delete').mockResolvedValue({});

      const result = await service.deleteSession('test-session-123');

      expect(result.success).toBe(true);
      expect(prisma.transcriptEntry.deleteMany).toHaveBeenCalled();
      expect(prisma.conversationSession.delete).toHaveBeenCalled();
    });
  });
});
