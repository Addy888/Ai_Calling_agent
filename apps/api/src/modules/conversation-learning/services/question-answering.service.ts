import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface QuestionContext {
  question: string;
  language: string;
  sessionContext?: any;
  previousQuestions?: string[];
}

interface Answer {
  answer: string;
  confidence: number;
  sources: string[];
  reasoning: string;
  suggestedFollowUps?: string[];
}

@Injectable()
export class QuestionAnsweringService {
  constructor(private prisma: PrismaService) {}

  /**
   * Answer customer questions using learned knowledge
   * Priority: Knowledge Base > Scripts > Conversation Memory > General Response
   */
  async answerQuestion(dto: any, companyId: string): Promise<Answer> {
    const { question, language = 'en', sessionId, context } = dto;

    // Step 1: Understand the question intent
    const intent = await this.analyzeIntent(question, language);

    // Step 2: Search knowledge base
    const kbAnswer = await this.searchKnowledgeBase(question, intent, companyId, language);
    if (kbAnswer && kbAnswer.confidence > 0.8) {
      return kbAnswer;
    }

    // Step 3: Search uploaded scripts
    const scriptAnswer = await this.searchScripts(question, intent, companyId, language);
    if (scriptAnswer && scriptAnswer.confidence > 0.7) {
      return scriptAnswer;
    }

    // Step 4: Search conversation memory
    const memoryAnswer = await this.searchConversationMemory(
      question,
      intent,
      companyId,
      sessionId,
    );
    if (memoryAnswer && memoryAnswer.confidence > 0.6) {
      return memoryAnswer;
    }

    // Step 5: Use learned response strategies
    const strategyAnswer = await this.applyResponseStrategy(question, intent, companyId);
    if (strategyAnswer) {
      return strategyAnswer;
    }

    // Step 6: Fallback to general response
    return this.generateFallbackResponse(question, intent, language);
  }

  /**
   * Analyze question intent to understand what customer is asking
   */
  private async analyzeIntent(question: string, language: string): Promise<any> {
    const lowerQuestion = question.toLowerCase();

    let category = 'GENERAL';
    let subCategory = null;
    let keywords: string[] = [];
    let questionType = 'OPEN';

    // Detect question type
    if (lowerQuestion.includes('what') || lowerQuestion.includes('kya')) {
      questionType = 'WHAT';
    } else if (lowerQuestion.includes('when') || lowerQuestion.includes('kab')) {
      questionType = 'WHEN';
    } else if (lowerQuestion.includes('where') || lowerQuestion.includes('kahan')) {
      questionType = 'WHERE';
    } else if (lowerQuestion.includes('how') || lowerQuestion.includes('kaise')) {
      questionType = 'HOW';
    } else if (lowerQuestion.includes('why') || lowerQuestion.includes('kyu')) {
      questionType = 'WHY';
    } else if (
      lowerQuestion.includes('is') ||
      lowerQuestion.includes('are') ||
      lowerQuestion.includes('hai')
    ) {
      questionType = 'YES_NO';
    }

    // Detect category
    if (
      lowerQuestion.includes('price') ||
      lowerQuestion.includes('cost') ||
      lowerQuestion.includes('budget') ||
      lowerQuestion.includes('keemat') ||
      lowerQuestion.includes('daam')
    ) {
      category = 'PRICING';
      keywords.push('price', 'cost', 'budget');
    } else if (
      lowerQuestion.includes('location') ||
      lowerQuestion.includes('area') ||
      lowerQuestion.includes('jagah') ||
      lowerQuestion.includes('sthan')
    ) {
      category = 'LOCATION';
      keywords.push('location', 'area');
    } else if (
      lowerQuestion.includes('amenity') ||
      lowerQuestion.includes('amenities') ||
      lowerQuestion.includes('facility') ||
      lowerQuestion.includes('suvidha')
    ) {
      category = 'AMENITIES';
      keywords.push('amenities', 'facilities');
    } else if (
      lowerQuestion.includes('size') ||
      lowerQuestion.includes('area') ||
      lowerQuestion.includes('sqft') ||
      lowerQuestion.includes('carpet')
    ) {
      category = 'SPECIFICATIONS';
      subCategory = 'SIZE';
      keywords.push('size', 'area', 'sqft');
    } else if (
      lowerQuestion.includes('possession') ||
      lowerQuestion.includes('ready') ||
      lowerQuestion.includes('construction')
    ) {
      category = 'TIMELINE';
      subCategory = 'POSSESSION';
      keywords.push('possession', 'timeline');
    } else if (
      lowerQuestion.includes('payment') ||
      lowerQuestion.includes('emi') ||
      lowerQuestion.includes('loan') ||
      lowerQuestion.includes('bhugtan')
    ) {
      category = 'PAYMENT';
      keywords.push('payment', 'emi', 'loan');
    } else if (
      lowerQuestion.includes('visit') ||
      lowerQuestion.includes('show') ||
      lowerQuestion.includes('dekh')
    ) {
      category = 'SITE_VISIT';
      keywords.push('visit', 'show');
    }

    return {
      originalQuestion: question,
      language,
      category,
      subCategory,
      questionType,
      keywords,
      requiresSpecificInfo: keywords.length > 0,
      timestamp: new Date(),
    };
  }

  /**
   * Search knowledge base for answer
   */
  private async searchKnowledgeBase(
    question: string,
    intent: any,
    companyId: string,
    language: string,
  ): Promise<Answer | null> {
    try {
      // Search in knowledge base entries
      const entries = await this.prisma.knowledgeEntry.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { question: { contains: question } },
            { answer: { contains: question } },
          ],
        },
        take: 5,
        orderBy: { usageCount: 'desc' },
      });

      if (entries.length === 0) return null;

      // Find best match
      let bestMatch = entries[0];
      let bestScore = this.calculateRelevanceScore(question, bestMatch.question, intent.keywords);

      for (const entry of entries) {
        const score = this.calculateRelevanceScore(question, entry.question, intent.keywords);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }

      if (bestScore < 0.4) return null;

      // Update usage count
      await this.prisma.knowledgeEntry.update({
        where: { id: bestMatch.id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });

      return {
        answer: bestMatch.answer,
        confidence: bestScore,
        sources: ['knowledge_base'],
        reasoning: `Found relevant answer in knowledge base (confidence: ${Math.round(bestScore * 100)}%)`,
        suggestedFollowUps: this.generateFollowUpQuestions(intent.category),
      };
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return null;
    }
  }

  /**
   * Search uploaded scripts for answer
   */
  private async searchScripts(
    question: string,
    intent: any,
    companyId: string,
    language: string,
  ): Promise<Answer | null> {
    try {
      // Search in script sections
      const scripts = await this.prisma.conversationScript.findMany({
        where: {
          companyId,
          isActive: true,
          language: { in: [language, 'MIXED', 'MULTILINGUAL'] },
        },
        include: {
          sections: true,
        },
      });

      if (scripts.length === 0) return null;

      let bestSection: any = null;
      let bestScore = 0;

      for (const script of scripts) {
        for (const section of script.sections) {
          // Check if section is relevant to question category
          const sectionRelevance = this.matchScriptSection(section, intent);
          if (sectionRelevance > bestScore) {
            bestScore = sectionRelevance;
            bestSection = section;
          }
        }
      }

      if (!bestSection || bestScore < 0.5) return null;

      // Extract answer from script section
      const answer = this.extractAnswerFromSection(bestSection, intent);

      return {
        answer,
        confidence: bestScore * 0.9, // Slightly lower than KB
        sources: ['script'],
        reasoning: `Found guidance in ${bestSection.sectionType} section of conversation script`,
        suggestedFollowUps: this.generateFollowUpQuestions(intent.category),
      };
    } catch (error) {
      console.error('Error searching scripts:', error);
      return null;
    }
  }

  /**
   * Search conversation memory for similar situations
   */
  private async searchConversationMemory(
    question: string,
    intent: any,
    companyId: string,
    sessionId?: string,
  ): Promise<Answer | null> {
    try {
      // Search in past conversations
      const memories = await this.prisma.conversationMemory.findMany({
        where: {
          companyId,
          isActive: true,
        },
        take: 10,
        orderBy: { lastActivityTime: 'desc' },
      });

      if (memories.length === 0) return null;

      // Find most relevant memory
      let bestMemory: any = null;
      let bestScore = 0;

      for (const memory of memories) {
        const metadata = memory.metadata as any;
        if (metadata?.question) {
          const score = this.calculateRelevanceScore(
            question,
            metadata.question,
            intent.keywords,
          );
          if (score > bestScore) {
            bestScore = score;
            bestMemory = memory;
          }
        }
      }

      if (!bestMemory || bestScore < 0.4) return null;

      const metadata = bestMemory.metadata as any;

      return {
        answer: metadata.answer || metadata.response,
        confidence: bestScore * 0.8, // Lower than scripts
        sources: ['conversation_memory'],
        reasoning: `Similar question was handled successfully in past conversations`,
        suggestedFollowUps: this.generateFollowUpQuestions(intent.category),
      };
    } catch (error) {
      console.error('Error searching conversation memory:', error);
      return null;
    }
  }

  /**
   * Apply learned response strategy
   */
  private async applyResponseStrategy(
    question: string,
    intent: any,
    companyId: string,
  ): Promise<Answer | null> {
    try {
      // Get applicable response strategies
      const strategies = await this.prisma.responseStrategy.findMany({
        where: {
          companyId,
          isActive: true,
          triggerIntent: { contains: intent.category },
        },
        orderBy: { successRate: 'desc' },
        take: 3,
      });

      if (strategies.length === 0) return null;

      const bestStrategy = strategies[0];
      const strategyData = bestStrategy.metadata as any;

      // Generate response based on strategy
      const answer = this.applyStrategyTemplate(strategyData, intent);

      return {
        answer,
        confidence: 0.6,
        sources: ['response_strategy'],
        reasoning: `Applied learned response strategy for ${intent.category}`,
        suggestedFollowUps: strategyData.followUpQuestions || [],
      };
    } catch (error) {
      console.error('Error applying response strategy:', error);
      return null;
    }
  }

  /**
   * Generate fallback response when no good answer found
   */
  private generateFallbackResponse(question: string, intent: any, language: string): Answer {
    const fallbacks = {
      en: {
        PRICING: "That's a great question about pricing. Let me get you the exact details.",
        LOCATION:
          'Regarding the location, I can share comprehensive details about the area and connectivity.',
        AMENITIES:
          'We have excellent amenities. Let me provide you with complete information.',
        SPECIFICATIONS:
          'I can provide you with detailed specifications. Let me gather that information.',
        TIMELINE:
          'For timeline and possession details, let me share the latest project status with you.',
        PAYMENT: 'We have flexible payment plans available. Let me explain the options.',
        SITE_VISIT: "I'd be happy to arrange a site visit for you. When would be convenient?",
        GENERAL: 'That is an important question. Let me ensure I provide you accurate information.',
      },
      hi: {
        PRICING: 'Yeh price ke baare mein bahut accha sawaal hai. Main aapko exact details deta hoon.',
        LOCATION: 'Location ke baare mein main aapko puri jaankari de sakta hoon.',
        AMENITIES: 'Hamare paas bahut acchi suvidhayen hain. Main aapko puri jaankari dunga.',
        SPECIFICATIONS: 'Main aapko detailed specifications de sakta hoon.',
        TIMELINE: 'Timeline aur possession ke liye main aapko latest status batata hoon.',
        PAYMENT: 'Hamare paas flexible payment plans hain. Main options explain karta hoon.',
        SITE_VISIT: 'Main aapke liye site visit arrange kar sakta hoon. Aap kab aa sakte hain?',
        GENERAL: 'Yeh important sawaal hai. Main aapko accurate information dunga.',
      },
    };

    const langFallbacks = fallbacks[language] || fallbacks.en;
    const answer = langFallbacks[intent.category] || langFallbacks.GENERAL;

    return {
      answer,
      confidence: 0.4,
      sources: ['fallback'],
      reasoning:
        'No specific answer found in knowledge base. Using general response pattern.',
      suggestedFollowUps: this.generateFollowUpQuestions(intent.category),
    };
  }

  /**
   * Calculate relevance score between question and potential answer
   */
  private calculateRelevanceScore(
    question: string,
    reference: string,
    keywords: string[],
  ): number {
    const q = question.toLowerCase();
    const r = reference.toLowerCase();

    // Exact match
    if (q === r) return 1.0;

    // Keyword matching
    let keywordScore = 0;
    let keywordMatches = 0;
    for (const keyword of keywords) {
      if (q.includes(keyword) && r.includes(keyword)) {
        keywordMatches++;
      }
    }
    if (keywords.length > 0) {
      keywordScore = keywordMatches / keywords.length;
    }

    // Word overlap
    const qWords = new Set(q.split(/\s+/).filter((w) => w.length > 3));
    const rWords = new Set(r.split(/\s+/).filter((w) => w.length > 3));
    const intersection = new Set([...qWords].filter((w) => rWords.has(w)));
    const overlapScore = qWords.size > 0 ? intersection.size / qWords.size : 0;

    // Combined score
    return keywordScore * 0.6 + overlapScore * 0.4;
  }

  /**
   * Match script section to question intent
   */
  private matchScriptSection(section: any, intent: any): number {
    const sectionType = section.sectionType.toUpperCase();
    const category = intent.category;

    const matches = {
      GREETING: ['GREETING'],
      INTRODUCTION: ['INTRODUCTION', 'GENERAL'],
      QUALIFICATION: ['SPECIFICATIONS', 'GENERAL'],
      BUDGET_COLLECTION: ['PRICING', 'PAYMENT'],
      PROJECT_RECOMMENDATION: ['LOCATION', 'AMENITIES', 'SPECIFICATIONS'],
      OBJECTION_HANDLING: ['PRICING', 'LOCATION', 'TIMELINE'],
      CLOSING: ['CLOSING', 'GENERAL'],
      REFERRAL_REQUEST: ['REFERRAL'],
      SITE_VISIT: ['SITE_VISIT'],
    };

    if (matches[sectionType]?.includes(category)) {
      return 0.8;
    }

    // Partial match based on content
    const content = (section.content || '').toLowerCase();
    const keywordMatches = intent.keywords.filter((k: string) => content.includes(k)).length;
    return intent.keywords.length > 0 ? (keywordMatches / intent.keywords.length) * 0.6 : 0.3;
  }

  /**
   * Extract answer from script section
   */
  private extractAnswerFromSection(section: any, intent: any): string {
    const content = section.content || section.scriptText || '';

    // Try to extract relevant sentences
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);

    // Find sentences containing keywords
    const relevantSentences = sentences.filter((s: string) => {
      const lower = s.toLowerCase();
      return intent.keywords.some((k: string) => lower.includes(k));
    });

    if (relevantSentences.length > 0) {
      return relevantSentences.join('. ').trim() + '.';
    }

    // Return first few sentences if no specific match
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }

  /**
   * Apply strategy template to generate response
   */
  private applyStrategyTemplate(strategyData: any, intent: any): string {
    const template = strategyData.responseTemplate || strategyData.template;

    if (!template) {
      return `I understand your question about ${intent.category.toLowerCase()}. Let me provide you with the relevant information.`;
    }

    // Replace placeholders
    let response = template;
    response = response.replace(/\{category\}/g, intent.category.toLowerCase());
    response = response.replace(/\{questionType\}/g, intent.questionType.toLowerCase());

    return response;
  }

  /**
   * Generate follow-up questions based on category
   */
  private generateFollowUpQuestions(category: string): string[] {
    const followUps: Record<string, string[]> = {
      PRICING: [
        'Would you like to know about payment plans?',
        'Are you interested in any specific unit type?',
        'Should I share details about our current offers?',
      ],
      LOCATION: [
        'Would you like to know about nearby facilities?',
        'Should I tell you about connectivity?',
        'Are you interested in the neighborhood details?',
      ],
      AMENITIES: [
        'Which amenities are most important to you?',
        'Would you like to know about recreational facilities?',
        'Should I explain about the security features?',
      ],
      SPECIFICATIONS: [
        'What unit size are you looking for?',
        'Do you have any specific layout preferences?',
        'Would you like to see the floor plans?',
      ],
      TIMELINE: [
        'Are you looking for ready-to-move-in properties?',
        'What is your preferred possession timeline?',
        'Would you like to know about construction progress?',
      ],
      PAYMENT: [
        'What is your budget range?',
        'Are you considering home loan options?',
        'Would you like to know about our payment schedule?',
      ],
      SITE_VISIT: [
        'When would you prefer to visit?',
        'How many people will be joining you?',
        'Would you like to see multiple properties?',
      ],
    };

    return followUps[category] || [
      'Do you have any other questions?',
      'Would you like more information?',
      'Is there anything specific you want to know?',
    ];
  }
}
