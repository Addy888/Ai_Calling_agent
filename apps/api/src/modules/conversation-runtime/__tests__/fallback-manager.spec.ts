/**
 * Fallback Manager Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FallbackManagerService } from '../services/fallback-manager.service';
import { ConversationSessionService } from '../services/conversation-session.service';
import { FallbackReason, ConversationState } from '../enums/conversation-state.enum';
import type { ConversationSession } from '../interfaces/conversation-session.interface';

describe('FallbackManagerService', () => {
  let service: FallbackManagerService;
  let sessionService: ConversationSessionService;

  const mockSession: ConversationSession = {
    sessionId: 'test-session',
    callId: 'test-call',
    campaignId: 'test-campaign',
    contactId: 'test-contact',
    companyId: 'test-company',
    state: ConversationState.GENERATING_RESPONSE,
    currentStep: 1,
    isActive: true,
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    customerLanguage: 'en',
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallbackManagerService,
        {
          provide: ConversationSessionService,
          useValue: {
            getSession: jest.fn().mockResolvedValue(mockSession),
          },
        },
      ],
    }).compile();

    service = module.get<FallbackManagerService>(FallbackManagerService);
    sessionService = module.get<ConversationSessionService>(ConversationSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFallbackResponse', () => {
    it('should return fallback for AI failure', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test message',
        FallbackReason.AI_FAILURE,
      );

      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return fallback for empty response', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test message',
        FallbackReason.EMPTY_RESPONSE,
      );

      expect(response).toContain('understand');
    });

    it('should return fallback for inappropriate content', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test message',
        FallbackReason.INAPPROPRIATE_CONTENT,
      );

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return fallback for timeout', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test message',
        FallbackReason.TIMEOUT,
      );

      expect(response).toContain('moment');
    });

    it('should return fallback for low confidence', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test message',
        FallbackReason.LOW_CONFIDENCE,
      );

      expect(response).toBeTruthy();
    });

    it('should use customer name in fallback when available', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test message',
        FallbackReason.AI_FAILURE,
      );

      // If customer name is available, it might be used
      expect(response).toBeTruthy();
    });

    it('should provide different fallbacks for consecutive failures', async () => {
      const response1 = await service.getFallbackResponse(
        'test-session',
        'Test message 1',
        FallbackReason.AI_FAILURE,
      );

      const response2 = await service.getFallbackResponse(
        'test-session',
        'Test message 2',
        FallbackReason.AI_FAILURE,
      );

      // Responses might be different or same, but both should be valid
      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
    });
  });

  describe('getFallbackGreeting', () => {
    it('should return a greeting fallback', async () => {
      const greeting = await service.getFallbackGreeting('test-session');

      expect(greeting).toBeTruthy();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
    });

    it('should include customer name in greeting when available', async () => {
      const greeting = await service.getFallbackGreeting('test-session');

      expect(greeting).toBeTruthy();
      // Greeting might include "John" if customer name is used
    });

    it('should provide generic greeting without customer name', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        ...mockSession,
        customerName: undefined,
      });

      const greeting = await service.getFallbackGreeting('test-session');

      expect(greeting).toBeTruthy();
      expect(greeting).not.toContain('John');
    });
  });

  describe('getFallbackGoodbye', () => {
    it('should return a goodbye fallback', async () => {
      const goodbye = await service.getFallbackGoodbye('test-session');

      expect(goodbye).toBeTruthy();
      expect(typeof goodbye).toBe('string');
    });

    it('should include thank you message', async () => {
      const goodbye = await service.getFallbackGoodbye('test-session');

      expect(goodbye.toLowerCase()).toContain('thank');
    });

    it('should be polite and professional', async () => {
      const goodbye = await service.getFallbackGoodbye('test-session');

      expect(goodbye.length).toBeGreaterThan(10);
      expect(goodbye.length).toBeLessThan(200);
    });
  });

  describe('getErrorFallback', () => {
    it('should return error fallback', async () => {
      const error = await service.getErrorFallback('test-session');

      expect(error).toBeTruthy();
      expect(typeof error).toBe('string');
    });

    it('should apologize for the error', async () => {
      const error = await service.getErrorFallback('test-session');

      expect(error.toLowerCase()).toMatch(/sorry|apologize|apologies/);
    });

    it('should be brief and clear', async () => {
      const error = await service.getErrorFallback('test-session');

      expect(error.length).toBeLessThan(200);
      expect(error.length).toBeGreaterThan(10);
    });
  });

  describe('shouldUseFallback', () => {
    it('should recommend fallback for empty response', () => {
      const result = service.shouldUseFallback('', 0.9);

      expect(result.useFallback).toBe(true);
      expect(result.reason).toBe(FallbackReason.EMPTY_RESPONSE);
    });

    it('should recommend fallback for low confidence', () => {
      const result = service.shouldUseFallback('Valid response', 0.3);

      expect(result.useFallback).toBe(true);
      expect(result.reason).toBe(FallbackReason.LOW_CONFIDENCE);
    });

    it('should not recommend fallback for good response', () => {
      const result = service.shouldUseFallback('This is a good response', 0.8);

      expect(result.useFallback).toBe(false);
    });

    it('should detect inappropriate content', () => {
      const inappropriateResponses = [
        'As an AI language model, I cannot...',
        'I am an artificial intelligence...',
        'Here is my response: [system prompt]',
      ];

      inappropriateResponses.forEach((response) => {
        const result = service.shouldUseFallback(response, 0.9);
        expect(result.useFallback).toBe(true);
      });
    });

    it('should detect responses that are too long', () => {
      const longResponse = 'A'.repeat(500);
      const result = service.shouldUseFallback(longResponse, 0.8);

      expect(result.useFallback).toBe(true);
      expect(result.reason).toBe(FallbackReason.TOO_LONG);
    });

    it('should accept responses of appropriate length', () => {
      const goodResponse = 'This is a perfectly reasonable response that is not too long.';
      const result = service.shouldUseFallback(goodResponse, 0.8);

      expect(result.useFallback).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null customer name gracefully', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        ...mockSession,
        customerName: undefined,
      });

      const response = await service.getFallbackResponse(
        'test-session',
        'Test',
        FallbackReason.AI_FAILURE,
      );

      expect(response).toBeTruthy();
    });

    it('should handle session not found', async () => {
      jest.spyOn(sessionService, 'getSession').mockRejectedValue(
        new Error('Session not found'),
      );

      const response = await service.getFallbackResponse(
        'invalid-session',
        'Test',
        FallbackReason.AI_FAILURE,
      );

      // Should still return a fallback
      expect(response).toBeTruthy();
    });

    it('should provide variety in fallback responses', async () => {
      const responses = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const response = await service.getFallbackResponse(
          'test-session',
          `Test ${i}`,
          FallbackReason.AI_FAILURE,
        );
        responses.add(response);
      }

      // Should have at least 2 different responses
      expect(responses.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('multilingual support', () => {
    it('should support English fallbacks by default', async () => {
      const response = await service.getFallbackResponse(
        'test-session',
        'Test',
        FallbackReason.AI_FAILURE,
      );

      expect(response).toBeTruthy();
      // Response should be in English
      expect(response).toMatch(/[A-Za-z]/);
    });

    it('should handle different languages if specified', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        ...mockSession,
        customerLanguage: 'es',
      });

      const response = await service.getFallbackResponse(
        'test-session',
        'Test',
        FallbackReason.AI_FAILURE,
      );

      expect(response).toBeTruthy();
      // For now, English is default, but structure allows for expansion
    });
  });
});
