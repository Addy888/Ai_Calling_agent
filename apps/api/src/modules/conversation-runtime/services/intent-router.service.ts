/**
 * Intent Router Service
 * Detects customer intent from their speech
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import {
  IntentDetectionResult,
  ConversationContext,
} from '../interfaces/conversation-session.interface';
import { IntentType } from '../enums/conversation-state.enum';

@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);
  private _openai: OpenAI | null = null;
  private readonly useAIForIntent: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useAIForIntent =
      this.configService.get<string>('USE_AI_INTENT_DETECTION') !== 'false';
  }

  private get openai(): OpenAI {
    if (!this._openai) {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured. Please set it in your .env file.');
      }
      this._openai = new OpenAI({ apiKey });
    }
    return this._openai;
  }

  /**
   * Detect intent from customer message
   */
  async detectIntent(
    message: string,
    context?: ConversationContext,
  ): Promise<IntentDetectionResult> {
    this.logger.debug(`Detecting intent for message: ${message.substring(0, 50)}...`);

    // Try rule-based intent detection first (faster)
    const ruleBasedIntent = this.detectIntentRuleBased(message);

    if (ruleBasedIntent.confidence >= 0.8) {
      this.logger.debug(
        `Rule-based intent detected: ${ruleBasedIntent.intent} (${ruleBasedIntent.confidence})`,
      );
      return ruleBasedIntent;
    }

    // Fall back to AI-based detection for unclear cases
    if (this.useAIForIntent) {
      try {
        return await this.detectIntentAI(message, context);
      } catch (error) {
        this.logger.error(`AI intent detection failed: ${error.message}`);
        return ruleBasedIntent; // Fall back to rule-based
      }
    }

    return ruleBasedIntent;
  }

  /**
   * Rule-based intent detection (fast, pattern matching)
   */
  private detectIntentRuleBased(message: string): IntentDetectionResult {
    const lowerMessage = message.toLowerCase().trim();

    // Positive responses
    if (this.matchesPattern(lowerMessage, this.positivePatterns)) {
      return {
        intent: IntentType.POSITIVE_RESPONSE,
        confidence: 0.9,
        reasoning: 'Matched positive response patterns',
      };
    }

    // Affirmation (yes, sure, okay)
    if (this.matchesPattern(lowerMessage, this.affirmationPatterns)) {
      return {
        intent: IntentType.AFFIRMATION,
        confidence: 0.95,
        reasoning: 'Matched affirmation patterns',
      };
    }

    // Denial (no, nope, not really)
    if (this.matchesPattern(lowerMessage, this.denialPatterns)) {
      return {
        intent: IntentType.DENIAL,
        confidence: 0.95,
        reasoning: 'Matched denial patterns',
      };
    }

    // Not interested
    if (this.matchesPattern(lowerMessage, this.notInterestedPatterns)) {
      return {
        intent: IntentType.NOT_INTERESTED,
        confidence: 0.9,
        reasoning: 'Matched not interested patterns',
      };
    }

    // Interested
    if (this.matchesPattern(lowerMessage, this.interestedPatterns)) {
      return {
        intent: IntentType.INTERESTED,
        confidence: 0.85,
        reasoning: 'Matched interested patterns',
      };
    }

    // Busy
    if (this.matchesPattern(lowerMessage, this.busyPatterns)) {
      return {
        intent: IntentType.BUSY,
        confidence: 0.9,
        reasoning: 'Matched busy patterns',
      };
    }

    // Call later
    if (this.matchesPattern(lowerMessage, this.callLaterPatterns)) {
      return {
        intent: IntentType.CALL_LATER,
        confidence: 0.9,
        reasoning: 'Matched call later patterns',
      };
    }

    // Wrong number
    if (this.matchesPattern(lowerMessage, this.wrongNumberPatterns)) {
      return {
        intent: IntentType.WRONG_NUMBER,
        confidence: 0.95,
        reasoning: 'Matched wrong number patterns',
      };
    }

    // Goodbye
    if (this.matchesPattern(lowerMessage, this.goodbyePatterns)) {
      return {
        intent: IntentType.GOODBYE,
        confidence: 0.9,
        reasoning: 'Matched goodbye patterns',
      };
    }

    // Question (contains question marks or question words)
    if (this.matchesPattern(lowerMessage, this.questionPatterns)) {
      return {
        intent: IntentType.QUESTION,
        confidence: 0.8,
        reasoning: 'Matched question patterns',
      };
    }

    // Request information
    if (this.matchesPattern(lowerMessage, this.requestInfoPatterns)) {
      return {
        intent: IntentType.REQUEST_INFORMATION,
        confidence: 0.85,
        reasoning: 'Matched information request patterns',
      };
    }

    // Complaint
    if (this.matchesPattern(lowerMessage, this.complaintPatterns)) {
      return {
        intent: IntentType.COMPLAINT,
        confidence: 0.8,
        reasoning: 'Matched complaint patterns',
      };
    }

    // FAQ
    if (this.matchesPattern(lowerMessage, this.faqPatterns)) {
      return {
        intent: IntentType.FAQ,
        confidence: 0.75,
        reasoning: 'Matched FAQ patterns',
      };
    }

    // Negative response
    if (this.matchesPattern(lowerMessage, this.negativePatterns)) {
      return {
        intent: IntentType.NEGATIVE_RESPONSE,
        confidence: 0.8,
        reasoning: 'Matched negative response patterns',
      };
    }

    // Default: unknown intent
    return {
      intent: IntentType.UNKNOWN,
      confidence: 0.5,
      reasoning: 'No clear pattern matched',
    };
  }

  /**
   * AI-based intent detection (slower, more accurate for complex cases)
   */
  private async detectIntentAI(
    message: string,
    context?: ConversationContext,
  ): Promise<IntentDetectionResult> {
    const availableIntents = Object.values(IntentType).join(', ');

    const systemPrompt = `You are an intent classifier for a phone conversation. 
Analyze the customer's message and classify it into one of these intents: ${availableIntents}

${context ? `Conversation context: The customer has been talking about ${context.memory.currentTopic || 'the campaign topic'}` : ''}

Respond with a JSON object containing:
- intent: the detected intent
- confidence: a number between 0 and 1
- reasoning: brief explanation

Example response:
{"intent": "interested", "confidence": 0.9, "reasoning": "Customer expressed clear interest"}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Customer message: "${message}"` },
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const parsed = JSON.parse(response);
        return {
          intent: parsed.intent as IntentType,
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || 'AI-detected intent',
          metadata: { model: 'gpt-3.5-turbo' },
        };
      }
    } catch (error) {
      this.logger.error(`AI intent detection error: ${error.message}`);
    }

    // Fallback
    return {
      intent: IntentType.UNKNOWN,
      confidence: 0.5,
      reasoning: 'AI detection failed, returning unknown',
    };
  }

  /**
   * Helper: Check if message matches any pattern
   */
  private matchesPattern(message: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(message));
  }

  // Intent patterns

  private readonly affirmationPatterns = [
    /^(yes|yeah|yep|yup|sure|okay|ok|alright|definitely|absolutely|certainly)$/i,
    /^(yes|yeah|yep|yup|sure|okay|ok)\s*(,|\.|!)?$/i,
  ];

  private readonly denialPatterns = [
    /^(no|nope|nah|not really|not at all)$/i,
    /^(no|nope|nah)\s*(,|\.|!)?$/i,
  ];

  private readonly positivePatterns = [
    /sounds?\s+good/i,
    /sounds?\s+great/i,
    /that'?s?\s+great/i,
    /that'?s?\s+good/i,
    /i'?m?\s+interested/i,
    /tell me more/i,
    /i'?d?\s+like\s+to/i,
    /perfect/i,
    /excellent/i,
  ];

  private readonly negativePatterns = [
    /not\s+interested/i,
    /no\s+thanks/i,
    /don'?t\s+want/i,
    /don'?t\s+need/i,
    /not\s+for\s+me/i,
    /stop\s+calling/i,
    /remove\s+me/i,
    /take\s+me\s+off/i,
  ];

  private readonly notInterestedPatterns = [
    /not\s+interested/i,
    /no\s+interest/i,
    /don'?t\s+want/i,
    /don'?t\s+need/i,
    /not\s+for\s+me/i,
    /no\s+thanks/i,
    /stop\s+calling/i,
    /don'?t\s+call/i,
    /remove.*?(list|number)/i,
    /unsubscribe/i,
  ];

  private readonly interestedPatterns = [
    /interested/i,
    /tell\s+me\s+more/i,
    /sounds?\s+good/i,
    /i'?d?\s+like\s+to\s+know/i,
    /more\s+information/i,
    /more\s+details/i,
    /how\s+does\s+it\s+work/i,
    /what.*?cost/i,
    /what.*?price/i,
  ];

  private readonly busyPatterns = [
    /busy\s+right\s+now/i,
    /i'?m?\s+busy/i,
    /in\s+a\s+meeting/i,
    /can'?t\s+talk\s+now/i,
    /not\s+a\s+good\s+time/i,
    /bad\s+time/i,
    /driving/i,
  ];

  private readonly callLaterPatterns = [
    /call\s+(me\s+)?back/i,
    /call\s+later/i,
    /call\s+another\s+time/i,
    /try\s+again\s+later/i,
    /different\s+time/i,
    /reach\s+out\s+later/i,
  ];

  private readonly wrongNumberPatterns = [
    /wrong\s+number/i,
    /who\s+is\s+this/i,
    /who\s+are\s+you/i,
    /don'?t\s+know\s+you/i,
    /never\s+heard\s+of/i,
    /not\s+(the\s+)?right\s+person/i,
  ];

  private readonly goodbyePatterns = [
    /goodbye/i,
    /bye\s+bye/i,
    /^bye$/i,
    /have\s+a\s+good/i,
    /talk\s+to\s+you\s+later/i,
    /see\s+you/i,
    /take\s+care/i,
  ];

  private readonly questionPatterns = [
    /\?$/,
    /^(what|when|where|who|why|how|can|could|would|is|are|do|does)/i,
  ];

  private readonly requestInfoPatterns = [
    /can\s+you\s+(tell|explain|give|send)/i,
    /what\s+is/i,
    /how\s+does/i,
    /more\s+information/i,
    /more\s+details/i,
    /tell\s+me\s+(more|about)/i,
    /explain/i,
    /information\s+about/i,
  ];

  private readonly complaintPatterns = [
    /complaint/i,
    /not\s+happy/i,
    /disappointed/i,
    /terrible/i,
    /worst/i,
    /poor\s+service/i,
    /issue\s+with/i,
    /problem\s+with/i,
  ];

  private readonly faqPatterns = [
    /how\s+much/i,
    /what.*?cost/i,
    /what.*?price/i,
    /how\s+long/i,
    /when\s+(can|will)/i,
    /where\s+(is|are)/i,
  ];
}
