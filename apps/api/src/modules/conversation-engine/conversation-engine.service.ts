import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechService } from '../speech/speech.service';
import OpenAI from 'openai';

/**
 * Conversation Engine Service
 * Handles the complete conversation flow: STT -> LLM -> TTS
 */
@Injectable()
export class ConversationEngineService {
  private readonly logger = new Logger(ConversationEngineService.name);
  private openai: OpenAI;

  constructor(
    private readonly speechService: SpeechService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('Conversation Engine initialized');
    }
  }

  /**
   * Process customer speech and generate AI response
   */
  async processConversation(input: {
    audioBuffer?: Buffer;
    text?: string;
    conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    script?: string;
    context?: Record<string, any>;
    voiceId?: string;
  }): Promise<{
    transcript?: string;
    response: string;
    audio: Buffer;
    metadata: Record<string, any>;
  }> {
    this.logger.log('Processing conversation');

    const startTime = Date.now();
    let transcript = input.text;

    // Step 1: Speech-to-Text (if audio provided)
    if (input.audioBuffer && !input.text) {
      this.logger.log('Converting speech to text');
      const sttResult = await this.speechService.transcribe(input.audioBuffer, {
        language: input.context?.language || 'en',
      });
      transcript = sttResult.transcript;
      this.logger.log(`Transcript: ${transcript}`);
    }

    if (!transcript) {
      throw new Error('No input text or audio provided');
    }

    // Step 2: Build conversation context
    const messages = [...input.conversationHistory];

    // Add system prompt if script provided
    if (input.script) {
      messages.unshift({
        role: 'system',
        content: `You are an AI calling agent. Follow this script and guidelines:\n\n${input.script}\n\nRespond naturally and conversationally. Keep responses concise (2-3 sentences maximum).`,
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: transcript,
    });

    // Step 3: Generate AI response using LLM
    this.logger.log('Generating AI response');
    const completion = await this.openai.chat.completions.create({
      model: this.configService.get<string>('LLM_MODEL', 'gpt-4-turbo-preview'),
      messages,
      temperature: parseFloat(this.configService.get<string>('LLM_TEMPERATURE', '0.7')),
      max_tokens: parseInt(this.configService.get<string>('LLM_MAX_TOKENS', '500')),
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I did not understand that.';
    this.logger.log(`AI Response: ${response}`);

    // Step 4: Text-to-Speech
    this.logger.log('Converting text to speech');
    const ttsResult = await this.speechService.synthesize(response, {
      voiceId: input.voiceId,
      language: input.context?.language || 'en',
    });

    const processingTime = Date.now() - startTime;

    return {
      transcript,
      response,
      audio: ttsResult.audio,
      metadata: {
        processingTime,
        llmModel: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        sttProvider: this.speechService.getSTTProvider().getName(),
        ttsProvider: this.speechService.getTTSProvider().getName(),
      },
    };
  }

  /**
   * Generate greeting message
   */
  async generateGreeting(input: {
    script?: string;
    contactName?: string;
    voiceId?: string;
    language?: string;
  }): Promise<{
    text: string;
    audio: Buffer;
  }> {
    this.logger.log('Generating greeting');

    // Build greeting prompt
    const systemPrompt = input.script
      ? `You are an AI calling agent. Follow this script:\n\n${input.script}\n\nGenerate a warm, professional greeting to start the call.`
      : 'You are an AI calling agent. Generate a warm, professional greeting to start the call.';

    const userPrompt = input.contactName
      ? `Generate a greeting for ${input.contactName}.`
      : 'Generate a greeting.';

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get<string>('LLM_MODEL', 'gpt-4-turbo-preview'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const greetingText = completion.choices[0]?.message?.content || 'Hello! How can I help you today?';

    // Convert to speech
    const ttsResult = await this.speechService.synthesize(greetingText, {
      voiceId: input.voiceId,
      language: input.language || 'en',
    });

    return {
      text: greetingText,
      audio: ttsResult.audio,
    };
  }

  /**
   * Analyze conversation sentiment
   */
  async analyzeSentiment(transcript: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    keywords: string[];
  }> {
    this.logger.log('Analyzing conversation sentiment');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis assistant. Analyze the sentiment of the given text and respond with JSON: {"sentiment": "positive|negative|neutral", "score": 0-1, "keywords": []}',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0.5,
      keywords: result.keywords || [],
    };
  }

  /**
   * Extract intent from user speech
   */
  async extractIntent(transcript: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
  }> {
    this.logger.log('Extracting intent from transcript');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an intent extraction assistant. Analyze the user\'s intent and respond with JSON: {"intent": "intent_name", "confidence": 0-1, "entities": {}}',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      intent: result.intent || 'unknown',
      confidence: result.confidence || 0.5,
      entities: result.entities || {},
    };
  }

  /**
   * Check if conversation should end
   */
  async shouldEndConversation(
    conversationHistory: Array<{ role: string; content: string }>,
  ): Promise<{
    shouldEnd: boolean;
    reason?: string;
  }> {
    this.logger.log('Checking if conversation should end');

    const recentMessages = conversationHistory.slice(-6);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a conversation flow assistant. Determine if the conversation should end based on the history. Respond with JSON: {"shouldEnd": true|false, "reason": "string"}',
        },
        {
          role: 'user',
          content: `Conversation history:\n${JSON.stringify(recentMessages, null, 2)}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      shouldEnd: result.shouldEnd || false,
      reason: result.reason,
    };
  }
}
