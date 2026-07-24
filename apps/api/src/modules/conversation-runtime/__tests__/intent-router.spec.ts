/**
 * Intent Router Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntentRouterService } from '../services/intent-router.service';
import { ResponseGeneratorService } from '../services/response-generator.service';
import {
  IntentType,
  MessageRole,
  SpeakerType,
  ConversationState,
} from '../enums/conversation-state.enum';
import type { ConversationContext } from '../interfaces/conversation-session.interface';

describe('IntentRouterService', () => {
  let service: IntentRouterService;
  let responseGenerator: ResponseGeneratorService;
  let configService: ConfigService;

  const mockConversationContext: ConversationContext = {
    session: {
      sessionId: 'test-session',
      callId: 'test-call',
      campaignId: 'test-campaign',
      contactId: 'test-contact',
      companyId: 'test-company',
      state: ConversationState.LISTENING,
      currentStep: 1,
      isActive: true,
      conversationHistory: [],
      detectedIntents: [],
      sessionMemory: {
        previousAnswers: [],
        currentStep: 1,
        scriptProgress: 25,
        extractedData: {},
        intentHistory: [],
        custom: {},
      },
      startedAt: new Date(),
      lastActivityAt: new Date(),
      turnCount: 1,
      customerMessageCount: 0,
      aiMessageCount: 0,
      silenceCount: 0,
      metadata: {},
    },
    campaign: {
      name: 'Test Campaign',
      goal: 'Test goal',
    },
    script: {
      content: 'Test script',
      steps: [],
    },
    agent: {
      name: 'Test Agent',
      personality: 'Professional',
      tone: 'friendly',
      language: 'en',
    },
    customer: {
      name: 'John Doe',
      phone: '+1234567890',
      language: 'en',
    },
    memory: {
      previousAnswers: [],
      currentStep: 1,
      scriptProgress: 25,
      extractedData: {},
      intentHistory: [],
      custom: {},
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentRouterService,
        {
          provide: ResponseGeneratorService,
          useValue: {
            detectIntentWithAI: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'USE_AI_INTENT_DETECTION') return 'true';
              if (key === 'OPENAI_API_KEY') return 'test-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<IntentRouterService>(IntentRouterService);
    responseGenerator = module.get<ResponseGeneratorService>(ResponseGeneratorService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectIntent', () => {
    it('should detect INTERESTED intent from positive messages', async () => {
      const result = await service.detectIntent(
        'Yes, I am interested',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.INTERESTED);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect NOT_INTERESTED intent from negative messages', async () => {
      const result = await service.detectIntent(
        'No, I am not interested',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.NOT_INTERESTED);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect BUSY intent', async () => {
      const result = await service.detectIntent(
        'I am busy right now',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.BUSY);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect CALL_LATER intent', async () => {
      const result = await service.detectIntent(
        'Can you call me back tomorrow?',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.CALL_LATER);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect WRONG_NUMBER intent', async () => {
      const result = await service.detectIntent(
        'Sorry, wrong number',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.WRONG_NUMBER);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect REQUEST_INFO intent', async () => {
      const result = await service.detectIntent(
        'Can you tell me more about this?',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.REQUEST_INFO);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect COMPLAINT intent', async () => {
      const result = await service.detectIntent(
        'I have a complaint about your service',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.COMPLAINT);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect GOODBYE intent', async () => {
      const result = await service.detectIntent(
        'Goodbye, have a nice day',
        mockConversationContext,
      );

      expect(result.intent).toBe(IntentType.GOODBYE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should fallback to AI intent detection for unclear messages', async () => {
      jest.spyOn(responseGenerator, 'detectIntentWithAI').mockResolvedValue({
        intent: IntentType.GENERAL,
        confidence: 0.7,
        reasoning: 'AI detected general intent',
      });

      const result = await service.detectIntent(
        'This is a very unclear message',
        mockConversationContext,
      );

      expect(responseGenerator.detectIntentWithAI).toHaveBeenCalled();
      expect(result.intent).toBe(IntentType.GENERAL);
    });

    it('should handle empty messages', async () => {
      const result = await service.detectIntent('', mockConversationContext);

      expect(result.intent).toBe(IntentType.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('rule-based detection', () => {
    it('should detect positive responses', async () => {
      const messages = [
        'yes',
        'sure',
        'okay',
        'sounds good',
        'I agree',
        'that works',
      ];

      for (const message of messages) {
        const result = await service.detectIntent(message, mockConversationContext);
        expect([IntentType.INTERESTED, IntentType.GENERAL]).toContain(result.intent);
      }
    });

    it('should detect negative responses', async () => {
      const messages = [
        'no',
        'no thanks',
        'not interested',
        'nope',
        'I decline',
      ];

      for (const message of messages) {
        const result = await service.detectIntent(message, mockConversationContext);
        expect([IntentType.NOT_INTERESTED, IntentType.GENERAL]).toContain(
          result.intent,
        );
      }
    });
  });

  describe('confidence scoring', () => {
    it('should return high confidence for clear intents', async () => {
      const result = await service.detectIntent(
        'I am definitely interested',
        mockConversationContext,
      );

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should return lower confidence for unclear intents', async () => {
      jest.spyOn(responseGenerator, 'detectIntentWithAI').mockResolvedValue({
        intent: IntentType.GENERAL,
        confidence: 0.5,
      });

      const result = await service.detectIntent(
        'maybe perhaps possibly',
        mockConversationContext,
      );

      expect(result.confidence).toBeLessThan(0.7);
    });
  });
});
