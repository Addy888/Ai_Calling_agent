/**
 * Prompt Builder Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PromptBuilderService } from '../services/prompt-builder.service';
import {
  ConversationState,
  MessageRole,
  SpeakerType,
} from '../enums/conversation-state.enum';
import type { ConversationContext } from '../interfaces/conversation-session.interface';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  const baseContext: ConversationContext = {
    session: {
      sessionId: 'test-session',
      callId: 'test-call',
      campaignId: 'test-campaign',
      contactId: 'test-contact',
      companyId: 'test-company',
      state: ConversationState.THINKING,
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
      name: 'Product Launch Campaign',
      description: 'Promoting new product',
      goal: 'Schedule a demo',
      instructions: 'Be enthusiastic and informative',
    },
    script: {
      content: 'Hello, I am calling about our new product.',
      steps: [
        { step: 1, content: 'Introduce yourself', required: true },
        { step: 2, content: 'Ask about interest', required: true },
        { step: 3, content: 'Schedule demo', required: false },
      ],
    },
    agent: {
      name: 'Sarah',
      personality: 'Professional and friendly',
      tone: 'conversational',
      language: 'en',
      instructions: 'Always be polite and helpful',
    },
    customer: {
      name: 'John Smith',
      phone: '+1234567890',
      language: 'en',
      context: {
        industry: 'Technology',
        company: 'Tech Corp',
      },
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
      providers: [PromptBuilderService],
    }).compile();

    service = module.get<PromptBuilderService>(PromptBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildPrompt', () => {
    it('should build a complete prompt with system and messages', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('messages');
      expect(typeof result.system).toBe('string');
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should include base instructions in system prompt', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result.system).toContain('AI voice agent');
      expect(result.system).toContain('natural');
      expect(result.system).toContain('conversational');
    });

    it('should include agent personality in system prompt', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result.system).toContain('Sarah');
      expect(result.system).toContain('Professional and friendly');
      expect(result.system).toContain('conversational');
    });

    it('should include campaign context in system prompt', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result.system).toContain('Product Launch Campaign');
      expect(result.system).toContain('Schedule a demo');
      expect(result.system).toContain('Be enthusiastic');
    });

    it('should include script in system prompt', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result.system).toContain('Hello, I am calling about our new product');
      expect(result.system).toContain('Introduce yourself');
      expect(result.system).toContain('Ask about interest');
    });

    it('should include customer context in system prompt', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result.system).toContain('John Smith');
      expect(result.system).toContain('John'); // First name
      expect(result.system).toContain('Technology');
      expect(result.system).toContain('Tech Corp');
    });

    it('should include knowledge base context when provided', async () => {
      const contextWithKnowledge: ConversationContext = {
        ...baseContext,
        knowledgeContext: [
          {
            content: 'Our product costs $99/month',
            source: 'pricing.pdf',
            relevance: 0.95,
          },
          {
            content: 'We offer 24/7 support',
            source: 'support.pdf',
            relevance: 0.85,
          },
        ],
      };

      const result = await service.buildPrompt(contextWithKnowledge);

      expect(result.system).toContain('KNOWLEDGE BASE');
      expect(result.system).toContain('$99/month');
      expect(result.system).toContain('24/7 support');
      expect(result.system).toContain('pricing.pdf');
    });

    it('should include memory context', async () => {
      const contextWithMemory: ConversationContext = {
        ...baseContext,
        session: {
          ...baseContext.session,
          sessionMemory: {
            ...baseContext.session.sessionMemory,
            previousAnswers: [
              {
                question: 'Are you interested?',
                answer: 'Yes, tell me more',
                timestamp: new Date(),
              },
            ],
            extractedData: {
              interest: 'high',
              budget: '$100-200',
            },
            lastAIResponse: 'Great! Let me tell you about our pricing.',
          },
        },
        memory: {
          ...baseContext.memory,
          previousAnswers: [
            {
              question: 'Are you interested?',
              answer: 'Yes, tell me more',
              timestamp: new Date(),
            },
          ],
          extractedData: {
            interest: 'high',
            budget: '$100-200',
          },
          lastAIResponse: 'Great! Let me tell you about our pricing.',
        },
      };

      const result = await service.buildPrompt(contextWithMemory);

      expect(result.system).toContain('MEMORY');
      expect(result.system).toContain('Are you interested?');
      expect(result.system).toContain('interest: high');
      expect(result.system).toContain('Great! Let me tell you about our pricing');
    });

    it('should include conversation history in messages', async () => {
      const contextWithHistory: ConversationContext = {
        ...baseContext,
        session: {
          ...baseContext.session,
          conversationHistory: [
            {
              id: 'msg1',
              role: MessageRole.ASSISTANT,
              speaker: SpeakerType.AI,
              content: 'Hello John!',
              timestamp: new Date(),
            },
            {
              id: 'msg2',
              role: MessageRole.USER,
              speaker: SpeakerType.CUSTOMER,
              content: 'Hi there',
              timestamp: new Date(),
            },
          ],
        },
      };

      const result = await service.buildPrompt(contextWithHistory);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('assistant');
      expect(result.messages[0].content).toBe('Hello John!');
      expect(result.messages[1].role).toBe('user');
      expect(result.messages[1].content).toBe('Hi there');
    });

    it('should include current message when provided', async () => {
      const contextWithMessage: ConversationContext = {
        ...baseContext,
        currentMessage: 'Tell me more about pricing',
      };

      const result = await service.buildPrompt(contextWithMessage);

      const lastMessage = result.messages[result.messages.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toBe('Tell me more about pricing');
    });

    it('should limit conversation history to last 10 messages', async () => {
      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? MessageRole.ASSISTANT : MessageRole.USER,
        speaker: i % 2 === 0 ? SpeakerType.AI : SpeakerType.CUSTOMER,
        content: `Message ${i}`,
        timestamp: new Date(),
      }));

      const contextWithLongHistory: ConversationContext = {
        ...baseContext,
        session: {
          ...baseContext.session,
          conversationHistory: longHistory,
        },
      };

      const result = await service.buildPrompt(contextWithLongHistory);

      expect(result.messages.length).toBeLessThanOrEqual(10);
    });
  });

  describe('buildGreetingPrompt', () => {
    it('should build greeting prompt with customer name', async () => {
      const result = await service.buildGreetingPrompt(baseContext);

      expect(result).toContain('greeting');
      expect(result).toContain('John');
      expect(result).toContain('good time to talk');
    });

    it('should build greeting without customer name', async () => {
      const contextWithoutName: ConversationContext = {
        ...baseContext,
        customer: {
          ...baseContext.customer,
          name: undefined,
        },
      };

      const result = await service.buildGreetingPrompt(contextWithoutName);

      expect(result).toContain('greeting');
      expect(result).not.toContain('John');
    });

    it('should mention campaign name in greeting', async () => {
      const result = await service.buildGreetingPrompt(baseContext);

      expect(result).toContain('Product Launch Campaign');
    });
  });

  describe('buildGoodbyePrompt', () => {
    it('should build goodbye prompt for completed conversation', async () => {
      const result = await service.buildGoodbyePrompt(baseContext, 'completed');

      expect(result).toContain('closing');
      expect(result).toContain('Thank');
    });

    it('should build goodbye prompt for not interested', async () => {
      const result = await service.buildGoodbyePrompt(baseContext, 'not_interested');

      expect(result).toContain('Thank');
      expect(result).toContain('good day');
    });

    it('should build goodbye prompt for call later', async () => {
      const result = await service.buildGoodbyePrompt(baseContext, 'call_later');

      expect(result).toContain('call back');
      expect(result).toContain('Thank');
    });

    it('should build generic goodbye prompt without reason', async () => {
      const result = await service.buildGoodbyePrompt(baseContext);

      expect(result).toContain('closing');
      expect(result).toContain('brief');
    });
  });

  describe('edge cases', () => {
    it('should handle missing campaign data', async () => {
      const minimalContext: ConversationContext = {
        ...baseContext,
        campaign: {
          name: 'Test',
        },
      };

      const result = await service.buildPrompt(minimalContext);

      expect(result.system).toBeDefined();
      expect(result.system.length).toBeGreaterThan(0);
    });

    it('should handle missing script', async () => {
      const contextWithoutScript: ConversationContext = {
        ...baseContext,
        script: {
          content: '',
          steps: [],
        },
      };

      const result = await service.buildPrompt(contextWithoutScript);

      expect(result.system).toBeDefined();
      expect(result.system.length).toBeGreaterThan(0);
    });

    it('should handle empty conversation history', async () => {
      const result = await service.buildPrompt(baseContext);

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });
});
