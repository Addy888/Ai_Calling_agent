import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IntentType } from '@prisma/client';
import { DetectIntentDto, IntentDetectionResultDto } from '../dto/intent-detection.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async detectIntent(
    companyId: string,
    dto: DetectIntentDto,
  ): Promise<IntentDetectionResultDto> {
    const startTime = Date.now();

    try {
      const input = dto.rawInput.toLowerCase().trim();

      const { intent, confidence, alternativeIntents } =
        this.analyzeIntent(input, dto.conversationContext);

      const linguisticFeatures = this.extractLinguisticFeatures(input);
      const sentimentScore = this.calculateSentiment(input);

      const result: IntentDetectionResultDto = {
        intent,
        confidence,
        alternativeIntents,
        contextFactors: {
          conversationHistory: dto.conversationContext?.history?.length || 0,
          currentNode: dto.scriptNodeId,
          previousIntent: dto.conversationContext?.previousIntent,
        },
        linguisticFeatures,
        sentimentScore,
        detectionMethod: 'rule-based-nlp',
      };

      this.logger.log(
        `Intent detected: ${intent} with confidence ${confidence.toFixed(2)} in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error detecting intent: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private analyzeIntent(
    input: string,
    context?: Record<string, any>,
  ): {
    intent: IntentType;
    confidence: number;
    alternativeIntents: Array<{ intent: IntentType; confidence: number }>;
  } {
    const patterns = this.getIntentPatterns();
    const matches: Array<{ intent: IntentType; confidence: number; matchCount: number }> = [];

    for (const [intent, keywords] of Object.entries(patterns)) {
      let matchCount = 0;
      let totalKeywords = keywords.length;

      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const baseConfidence = matchCount / totalKeywords;
        const contextBoost = this.getContextBoost(intent as IntentType, context);
        const confidence = Math.min(baseConfidence + contextBoost, 1.0);

        matches.push({
          intent: intent as IntentType,
          confidence,
          matchCount,
        });
      }
    }

    matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.matchCount - a.matchCount;
    });

    if (matches.length === 0) {
      return {
        intent: IntentType.OTHER,
        confidence: 0.5,
        alternativeIntents: [],
      };
    }

    const topIntent = matches[0];
    const alternativeIntents = matches
      .slice(1, 4)
      .map((m) => ({
        intent: m.intent,
        confidence: m.confidence,
      }));

    return {
      intent: topIntent.intent,
      confidence: topIntent.confidence,
      alternativeIntents,
    };
  }

  private getIntentPatterns(): Record<string, string[]> {
    return {
      [IntentType.GREETING]: [
        'hello',
        'hi',
        'hey',
        'good morning',
        'good afternoon',
        'good evening',
        'greetings',
      ],
      [IntentType.GOODBYE]: [
        'bye',
        'goodbye',
        'see you',
        'talk later',
        'have to go',
        'thank you',
        'thanks',
      ],
      [IntentType.INTERESTED]: [
        'interested',
        'yes',
        'want to know',
        'tell me more',
        'sounds good',
        'looking for',
        'need',
        'would like',
      ],
      [IntentType.NOT_INTERESTED]: [
        'not interested',
        'no thanks',
        'not looking',
        'dont want',
        "don't want",
        'not right now',
        'maybe later',
      ],
      [IntentType.CALL_BACK_LATER]: [
        'call back',
        'later',
        'another time',
        'not a good time',
        'busy right now',
        'can you call',
      ],
      [IntentType.BUSY]: [
        'busy',
        'meeting',
        'cant talk',
        "can't talk",
        'in the middle',
        'occupied',
      ],
      [IntentType.WRONG_NUMBER]: [
        'wrong number',
        'wrong person',
        'not the right',
        'dont know',
        "don't know",
        'never contacted',
      ],
      [IntentType.NEED_PRICING]: [
        'price',
        'cost',
        'how much',
        'pricing',
        'rate',
        'fee',
        'charge',
        'budget',
      ],
      [IntentType.NEED_LOCATION]: [
        'where',
        'location',
        'address',
        'area',
        'city',
        'place',
        'site',
      ],
      [IntentType.NEED_DETAILS]: [
        'details',
        'information',
        'more info',
        'explain',
        'tell me about',
        'what is',
        'how does',
      ],
      [IntentType.NEED_HUMAN]: [
        'speak to',
        'talk to',
        'human',
        'person',
        'representative',
        'agent',
        'manager',
        'supervisor',
      ],
      [IntentType.SUPPORT]: [
        'help',
        'support',
        'issue',
        'problem',
        'question',
        'assist',
        'trouble',
      ],
    };
  }

  private getContextBoost(intent: IntentType, context?: Record<string, any>): number {
    if (!context) return 0;

    let boost = 0;

    if (context.previousIntent === intent) {
      boost += 0.1;
    }

    if (context.consecutiveIntent === intent) {
      boost += 0.05;
    }

    if (context.userEngagement === 'high' && intent === IntentType.INTERESTED) {
      boost += 0.1;
    }

    if (context.conversationLength > 5 && intent === IntentType.GOODBYE) {
      boost += 0.05;
    }

    return Math.min(boost, 0.2);
  }

  private extractLinguisticFeatures(input: string): Record<string, any> {
    const words = input.split(/\s+/);
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length,
      hasQuestionMark: input.includes('?'),
      hasExclamation: input.includes('!'),
      startsWithQuestion: /^(who|what|when|where|why|how|is|are|can|could|would|should)/i.test(input),
      hasNegation: /\b(no|not|never|neither|nor|none)\b/i.test(input),
      hasAffirmation: /\b(yes|yeah|sure|okay|ok|definitely|absolutely)\b/i.test(input),
    };
  }

  private calculateSentiment(input: string): number {
    const positiveWords = [
      'yes',
      'good',
      'great',
      'excellent',
      'interested',
      'love',
      'like',
      'want',
      'need',
      'definitely',
      'sure',
      'absolutely',
    ];

    const negativeWords = [
      'no',
      'not',
      'bad',
      'terrible',
      'hate',
      'dislike',
      'never',
      'cant',
      "can't",
      'wont',
      "won't",
      'dont',
      "don't",
    ];

    let score = 0;

    positiveWords.forEach((word) => {
      if (input.includes(word)) score += 0.1;
    });

    negativeWords.forEach((word) => {
      if (input.includes(word)) score -= 0.1;
    });

    return Math.max(-1, Math.min(1, score));
  }

  async saveIntentDetection(
    companyId: string,
    conversationId: string,
    decisionLogId: string,
    dto: DetectIntentDto,
    result: IntentDetectionResultDto,
  ): Promise<void> {
    try {
      await this.prisma.intentDetection.create({
        data: {
          decisionLogId,
          conversationId,
          companyId,
          intent: result.intent,
          confidence: result.confidence,
          rawInput: dto.rawInput,
          processedInput: dto.rawInput.toLowerCase().trim(),
          detectionMethod: result.detectionMethod,
          alternativeIntents: result.alternativeIntents,
          contextFactors: result.contextFactors,
          linguisticFeatures: result.linguisticFeatures,
          sentimentScore: result.sentimentScore,
          metadata: dto.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Error saving intent detection: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  async getIntentStatistics(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const intents = await this.prisma.intentDetection.groupBy({
      by: ['intent'],
      where,
      _count: { id: true },
      _avg: { confidence: true },
    });

    const total = intents.reduce((sum, i) => sum + i._count.id, 0);

    return intents.map((i) => ({
      intent: i.intent,
      count: i._count.id,
      averageConfidence: i._avg.confidence,
      percentage: total > 0 ? (i._count.id / total) * 100 : 0,
    }));
  }
}
