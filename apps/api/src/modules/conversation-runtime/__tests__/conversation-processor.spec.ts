/**
 * Conversation Processor Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationProcessorService } from '../services/conversation-processor.service';
import { ConversationSessionService } from '../services/conversation-session.service';
import { ResponseGeneratorService } from '../services/response-generator.service';
import { IntentRouterService } from '../services/intent-router.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConversationState,
  IntentType,
  MessageRole,
  SpeakerType,
} from '../enums/conversation-state.enum';

describe('ConversationProcessorService', () => {
  let service: ConversationProcessorService;
  let sessionService: ConversationSessionService;
  let responseGenerator: ResponseGeneratorService;
  let intentRouter: IntentRouterService;

  const mockSession = {
    sessionId: 'session_123',
    callId: 'call_456',
    campaignId: 'campaign_789',
    contactId: 'contact_101',
    companyId: 'company_202',
    state: ConversationState.WAITING,
    isActive: true,
    conversationHistory: [],
    detectedIntents: [],
    sessionMemory: {
      previousAnswers: [],
      currentStep: 0,
      scriptProgress: 0,
      extractedData: {},
      intentHistory: [],
      custom: {},
    },
    turnCount: 0,
    customerMessageCount: 0,
    aiMessageCount: 0,
    silenceCount: 0,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    metadata: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationProcessorService,
        {
          provide: ConversationSessionService,
          useValue: {
            getSession: jest.fn().mockResolvedValue(mockSession),
            updateState: jest.fn().mockResolvedValue(mockSession),
            addMessage: jest.fn().mockResolvedValue(mockSession),
            addIntent: jest.fn().mockResolvedValue(mockSession),
            updateMemory: jest.fn().mockResolvedValue(mockSession),
            incrementSilence: jest.fn().mockResolvedValue({
              ...mockSession,
              silenceCount: 1,
            }),
          },
        },
        {
          provide: ResponseGeneratorService,
          useValue: {
            generateResponse: jest.fn().mockResolvedValue({
              success: true,
              response: 'That sounds great! Tell me more.',
              confidence: 0.9,
              duration: 1200,
              shouldEndConversation: false,
            }),
            generateGreeting: jest.fn().mockResolvedValue({
              success: true,
              response: 'Hello! How are you today?',
              confidence: 0.95,
              duration: 800,
              shouldEndConversation: false,
            }),
            generateGoodbye: jest.fn().mockResolvedValue({
              success: true,
              response: 'Thank you for your time. Goodbye!',
              confidence: 0.95,
              duration: 600,
              shouldEndConversation: true,
            }),
            generateSilencePrompt: jest.fn().mockResolvedValue({
              success: true,
              response: 'Are you still there?',
              confidence: 1.0,
              duration: 100,
              shouldEndConversation: false,
            }),
          },
        },
        {
          provide: IntentRouterService,
          useValue: {
            detectIntent: jest.fn().mockResolvedValue({
              intent: IntentType.INTERESTED,
              confidence: 0.85,
              reasoning: 'Customer expressed interest',
            }),
          },
        },
        {
          provide: PromptBuilderService,
          useValue: {
            buildPrompt: jest.fn().mockResolvedValue({
              system: 'You are a helpful AI assistant',
              messages: [],
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            campaign: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'campaign_789',
                name: 'Test Campaign',
              }),
            },
            script: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'script_123',
                content: 'Test script content',
              }),
            },
            contact: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'contact_101',
                fullName: 'John Doe',
                phone: '+1234567890',
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ConversationProcessorService>(
      ConversationProcessorService,
    );
    sessionService = module.get<ConversationSessionService>(
      ConversationSessionService,
    );
    responseGenerator = module.get<ResponseGeneratorService>(
      ResponseGeneratorService,
    );
    intentRouter = module.get<IntentRouterService>(IntentRouterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process customer message and generate response', async () => {
      const request = {
        sessionId: 'session_123',
        message: 'I am interested in your product',
      };

      const result = await service.processMessage(request);

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(sessionService.updateState).toHaveBeenCalledWith(
        request.sessionId,
        ConversationState.LISTENING,
      );
      expect(sessionService.addMessage).toHaveBeenCalled();
      expect(intentRouter.detectIntent).toHaveBeenCalledWith(
        request.message,
        expect.any(Object),
      );
      expect(responseGenerator.generateResponse).toHaveBeenCalled();
    });

    it('should detect intent from customer message', async () => {
      const request = {
        sessionId: 'session_123',
        message: 'Not interested',
      };

      jest.spyOn(intentRouter, 'detectIntent').mockResolvedValue({
        intent: IntentType.NOT_INTERESTED,
        confidence: 0.95,
        reasoning: 'Clear rejection',
      });

      await service.processMessage(request);

      expect(sessionService.addIntent).toHaveBeenCalledWith(
        request.sessionId,
        IntentType.NOT_INTERESTED,
        0.95,
      );
    });

    it('should update conversation history', async () => {
      const request = {
        sessionId: 'session_123',
        message: 'Tell me more',
      };

      await service.processMessage(request);

      expect(sessionService.addMessage).toHaveBeenCalledTimes(2); // Customer + AI
      expect(sessionService.updateMemory).toHaveBeenCalled();
    });
  });

  describe('generateGreeting', () => {
    it('should generate greeting for new session', async () => {
      const sessionId = 'session_123';

      const result = await service.generateGreeting(sessionId);

      expect(result.success).toBe(true);
      expect(result.response).toContain('Hello');
      expect(sessionService.updateState).toHaveBeenCalledWith(
        sessionId,
        ConversationState.GREETING,
      );
      expect(sessionService.addMessage).toHaveBeenCalled();
    });

    it('should update state to waiting after greeting', async () => {
      const sessionId = 'session_123';

      await service.generateGreeting(sessionId);

      expect(sessionService.updateState).toHaveBeenCalledWith(
        sessionId,
        ConversationState.WAITING,
      );
    });
  });

  describe('generateGoodbye', () => {
    it('should generate goodbye message', async () => {
      const sessionId = 'session_123';

      const result = await service.generateGoodbye(sessionId);

      expect(result.success).toBe(true);
      expect(result.shouldEndConversation).toBe(true);
      expect(sessionService.addMessage).toHaveBeenCalled();
    });

    it('should generate goodbye with reason', async () => {
      const sessionId = 'session_123';
      const reason = 'not_interested';

      await service.generateGoodbye(sessionId, reason);

      expect(responseGenerator.generateGoodbye).toHaveBeenCalledWith(
        expect.any(Object),
        reason,
      );
    });
  });

  describe('handleSilence', () => {
    it('should handle silence and increment counter', async () => {
      const sessionId = 'session_123';

      const result = await service.handleSilence(sessionId);

      expect(result.success).toBe(true);
      expect(sessionService.incrementSilence).toHaveBeenCalledWith(sessionId);
      expect(responseGenerator.generateSilencePrompt).toHaveBeenCalled();
    });

    it('should add silence message to history', async () => {
      const sessionId = 'session_123';

      await service.handleSilence(sessionId);

      expect(sessionService.addMessage).toHaveBeenCalled();
    });
  });

  describe('buildContext', () => {
    it('should build complete conversation context', async () => {
      const request = {
        sessionId: 'session_123',
        message: 'Test message',
      };

      await service.processMessage(request);

      expect(sessionService.getSession).toHaveBeenCalledWith('session_123');
    });
  });
});
