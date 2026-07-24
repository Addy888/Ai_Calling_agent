/**
 * Response Generator Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResponseGeneratorService } from '../services/response-generator.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import {
  ConversationState,
  IntentType,
} from '../enums/conversation-state.enum';
import type { ConversationContext } from '../interfaces/conversation-session.interface';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'This is a mocked AI response',
                },
              },
            ],
            usage: {
              total_tokens: 100,
            },
          }),
        },
      },
    })),
  };
});

describe('ResponseGeneratorService', () => {
  let service: ResponseGeneratorService;
  let promptBuilder: PromptBuilderService;
  let configService: ConfigService;

  const mockContext: ConversationContext = {
    session: {
      sessionId: 'test-session',
      callId: 'test-call',
      campaignId: 'test-campaign',
      contactId: 'test-contact',
      companyId: 'test-company',
      state: ConversationState.GENERATING_RESPONSE,
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
        ResponseGeneratorService,
        {
          provide: PromptBuilderService,
          useValue: {
            buildPrompt: jest.fn().mockResolvedValue({
              system: 'System prompt',
              messages: [],
            }),
            buildGreetingPrompt: jest.fn().mockResolvedValue('Greeting prompt'),
            buildGoodbyePrompt: jest.fn().mockResolvedValue('Goodbye prompt'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-key';
              if (key === 'OPENAI_MODEL') return 'gpt-4';
              if (key === 'OPENAI_TEMPERATURE') return '0.7';
              if (key === 'OPENAI_MAX_TOKENS') return '150';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ResponseGeneratorService>(ResponseGeneratorService);
    promptBuilder = module.get<PromptBuilderService>(PromptBuilderService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    it('should generate a response successfully', async () => {
      const result = await service.generateResponse(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toBe('This is a mocked AI response');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should call prompt builder to build the prompt', async () => {
      await service.generateResponse(mockContext);

      expect(promptBuilder.buildPrompt).toHaveBeenCalledWith(mockContext);
    });

    it('should handle OpenAI errors gracefully', async () => {
      // Mock OpenAI to throw error
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      }));

      const result = await service.generateResponse(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track response generation duration', async () => {
      const result = await service.generateResponse(mockContext);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should include token usage in result', async () => {
      const result = await service.generateResponse(mockContext);

      expect(result.tokens).toBe(100);
    });
  });

  describe('generateGreeting', () => {
    it('should generate a greeting successfully', async () => {
      const result = await service.generateGreeting(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(typeof result.response).toBe('string');
    });

    it('should call prompt builder for greeting', async () => {
      await service.generateGreeting(mockContext);

      expect(promptBuilder.buildGreetingPrompt).toHaveBeenCalledWith(mockContext);
    });

    it('should not mark greeting as ending conversation', async () => {
      const result = await service.generateGreeting(mockContext);

      expect(result.shouldEndConversation).toBe(false);
    });
  });

  describe('generateGoodbye', () => {
    it('should generate goodbye successfully', async () => {
      const result = await service.generateGoodbye(mockContext, 'completed');

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
    });

    it('should mark goodbye as ending conversation', async () => {
      const result = await service.generateGoodbye(mockContext, 'completed');

      expect(result.shouldEndConversation).toBe(true);
    });

    it('should call prompt builder with reason', async () => {
      await service.generateGoodbye(mockContext, 'not_interested');

      expect(promptBuilder.buildGoodbyePrompt).toHaveBeenCalledWith(
        mockContext,
        'not_interested',
      );
    });
  });

  describe('generateSilencePrompt', () => {
    it('should generate silence prompt for first silence', async () => {
      const result = await service.generateSilencePrompt(mockContext, 1);

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.shouldEndConversation).toBe(false);
    });

    it('should suggest ending after multiple silences', async () => {
      const result = await service.generateSilencePrompt(mockContext, 3);

      expect(result.shouldEndConversation).toBe(true);
    });

    it('should generate different prompts for different silence counts', async () => {
      const result1 = await service.generateSilencePrompt(mockContext, 1);
      const result2 = await service.generateSilencePrompt(mockContext, 2);

      expect(result1.response).not.toBe(result2.response);
    });
  });

  describe('detectIntentWithAI', () => {
    it('should detect intent using AI', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'INTERESTED',
                  },
                },
              ],
            }),
          },
        },
      }));

      const result = await service.detectIntentWithAI(
        'I would like to know more',
        mockContext,
      );

      expect(result.intent).toBe(IntentType.INTERESTED);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle various intent responses', async () => {
      const intents = [
        'NOT_INTERESTED',
        'BUSY',
        'CALL_LATER',
        'REQUEST_INFO',
        'GENERAL',
      ];

      for (const intentStr of intents) {
        const OpenAI = require('openai').default;
        OpenAI.mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue({
                choices: [
                  {
                    message: {
                      content: intentStr,
                    },
                  },
                ],
              }),
            },
          },
        }));

        const result = await service.detectIntentWithAI('test message', mockContext);

        expect(Object.values(IntentType)).toContain(result.intent);
      }
    });

    it('should fallback to GENERAL for unknown intent', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'INVALID_INTENT',
                  },
                },
              ],
            }),
          },
        },
      }));

      const result = await service.detectIntentWithAI('test message', mockContext);

      expect(result.intent).toBe(IntentType.GENERAL);
    });
  });

  describe('configuration', () => {
    it('should use configured OpenAI model', async () => {
      await service.generateResponse(mockContext);

      const OpenAI = require('openai').default;
      const mockInstance = new OpenAI();

      expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should use configured temperature', async () => {
      await service.generateResponse(mockContext);

      const OpenAI = require('openai').default;
      const mockInstance = new OpenAI();

      expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        }),
      );
    });

    it('should use configured max tokens', async () => {
      await service.generateResponse(mockContext);

      const OpenAI = require('openai').default;
      const mockInstance = new OpenAI();

      expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 150,
        }),
      );
    });
  });
});
