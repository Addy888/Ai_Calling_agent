import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  AnalyzeConversationDto,
  ConversationQueryDto,
  ConversationScoresDto,
  SentimentAnalysisDto,
} from '../dto/conversation-intelligence.dto';

@Injectable()
export class ConversationIntelligenceService {
  private readonly logger = new Logger(ConversationIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // CONVERSATION ANALYSIS
  // ============================================

  async analyzeConversation(companyId: string, dto: AnalyzeConversationDto) {
    this.logger.log(`Analyzing conversation for dataset: ${dto.datasetRecordId}`);

    // Get dataset with conversation data
    const dataset = await this.prisma.datasetRecord.findFirst({
      where: {
        id: dto.datasetRecordId,
        companyId,
        deletedAt: null,
      },
      include: {
        conversation: true,
        transcript: true,
        entities: true,
        intents: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    if (!dataset.conversation) {
      throw new BadRequestException('Conversation data not available. Run conversation parsing first.');
    }

    // Check if analysis already exists
    const existingAnalysis = await this.prisma.datasetConversationAnalysis.findUnique({
      where: { datasetRecordId: dataset.id },
    });

    if (existingAnalysis) {
      this.logger.log(`Analysis already exists, updating: ${existingAnalysis.id}`);
      return this.updateAnalysis(existingAnalysis.id, dataset);
    }

    // Perform comprehensive analysis
    const scores = this.calculateConversationScores(dataset);
    const sentiment = this.analyzeSentiment(dataset);
    const emotion = this.detectDominantEmotion(dataset);
    const quality = this.assessOverallQuality(scores);

    // Create conversation analysis
    const analysis = await this.prisma.datasetConversationAnalysis.create({
      data: {
        datasetRecordId: dataset.id,
        companyId,
        ...scores,
        sentimentLabel: sentiment.sentimentLabel,
        sentimentScore: sentiment.sentimentScore,
        dominantEmotion: emotion,
        overallQuality: quality,
        analysisDetails: {
          messageCount: dataset.conversation.messageCount,
          turnCount: dataset.conversation.turnCount,
          averageTurnLength: dataset.conversation.averageTurnLength,
        },
      },
    });

    // Analyze timeline and phases
    await this.analyzeConversationFlow(analysis.id, dataset);

    // Analyze intents
    await this.analyzeIntents(analysis.id, dataset);

    // Analyze entities
    await this.analyzeEntities(analysis.id, dataset);

    // Detect objections
    await this.detectObjections(analysis.id, dataset);

    // Detect emotions
    await this.detectEmotions(analysis.id, dataset);

    // Calculate lead score
    await this.calculateLeadScore(analysis.id, dataset);

    // Score responses
    await this.scoreResponses(analysis.id, dataset);

    // Build knowledge from conversation
    await this.buildKnowledge(companyId, dataset, analysis);

    // Update question library
    await this.updateQuestionLibrary(companyId, dataset);

    this.logger.log(`Conversation analysis completed: ${analysis.id}`);

    return analysis;
  }

  private async updateAnalysis(analysisId: string, dataset: any) {
    const scores = this.calculateConversationScores(dataset);
    const sentiment = this.analyzeSentiment(dataset);
    const emotion = this.detectDominantEmotion(dataset);
    const quality = this.assessOverallQuality(scores);

    return this.prisma.datasetConversationAnalysis.update({
      where: { id: analysisId },
      data: {
        ...scores,
        sentimentLabel: sentiment.sentimentLabel,
        sentimentScore: sentiment.sentimentScore,
        dominantEmotion: emotion,
        overallQuality: quality,
        analyzedAt: new Date(),
      },
    });
  }

  // ============================================
  // SCORING ALGORITHMS
  // ============================================

  private calculateConversationScores(dataset: any): ConversationScoresDto {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];

    // Professional Score (0-100)
    const professionalScore = this.calculateProfessionalScore(messages);

    // Naturalness Score (0-100)
    const naturalnessScore = this.calculateNaturalnessScore(messages);

    // Confidence Score (0-100)
    const confidenceScore = this.calculateConfidenceScore(messages, dataset.transcript);

    // Sales Score (0-100)
    const salesScore = this.calculateSalesScore(messages, dataset.intents);

    // Closing Score (0-100)
    const closingScore = this.calculateClosingScore(messages);

    // Overall Conversation Score
    const conversationScore = (
      professionalScore * 0.2 +
      naturalnessScore * 0.15 +
      confidenceScore * 0.15 +
      salesScore * 0.3 +
      closingScore * 0.2
    );

    return {
      conversationScore: Math.round(conversationScore * 100) / 100,
      professionalScore: Math.round(professionalScore * 100) / 100,
      naturalnessScore: Math.round(naturalnessScore * 100) / 100,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      salesScore: Math.round(salesScore * 100) / 100,
      closingScore: Math.round(closingScore * 100) / 100,
    };
  }

  private calculateProfessionalScore(messages: any[]): number {
    let score = 100;
    const agentMessages = messages.filter((m) => m.role === 'AGENT' || m.speaker === 'AGENT');

    for (const msg of agentMessages) {
      const text = msg.text || '';
      
      // Deduct points for unprofessional language
      if (/\b(umm|uh|like|you know)\b/i.test(text)) score -= 2;
      if (/\b(basically|actually)\b/gi.test(text)) score -= 1;
      if (text.length < 10) score -= 3; // Too short
      if (text.length > 200) score -= 2; // Too long
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateNaturalnessScore(messages: any[]): number {
    let score = 100;
    const agentMessages = messages.filter((m) => m.role === 'AGENT' || m.speaker === 'AGENT');

    for (const msg of agentMessages) {
      const text = msg.text || '';
      
      // Check for robotic/scripted patterns
      if (/^(hello|hi|good morning|good afternoon|good evening)\s*sir/i.test(text)) score += 5;
      if (/\b(please|thank you|thanks|appreciate)\b/i.test(text)) score += 3;
      
      // Deduct for overly formal/scripted
      if (/as per|kindly|hereby|aforementioned/i.test(text)) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidenceScore(messages: any[], transcript: any): number {
    const confidence = transcript?.confidence || 0.5;
    const agentMessages = messages.filter((m) => m.role === 'AGENT' || m.speaker === 'AGENT');

    let score = confidence * 50; // Base score from transcript confidence

    for (const msg of agentMessages) {
      const text = msg.text || '';
      
      // Confidence indicators
      if (/\b(definitely|certainly|absolutely|sure|confident)\b/i.test(text)) score += 5;
      if (/\b(I think|maybe|perhaps|probably|might)\b/i.test(text)) score -= 3;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateSalesScore(messages: any[], intents: any[]): number {
    let score = 50; // Base score

    // Check for key sales moments
    const interestedIntents = intents.filter((i) => i.entityType === 'INTERESTED');
    const pricingIntents = intents.filter((i) => i.entityType === 'PRICING');
    const bookingIntents = intents.filter((i) => i.entityType === 'BOOKING');

    score += interestedIntents.length * 10;
    score += pricingIntents.length * 5;
    score += bookingIntents.length * 15;

    // Check for sales keywords in agent messages
    const agentMessages = messages.filter((m) => m.role === 'AGENT' || m.speaker === 'AGENT');
    
    for (const msg of agentMessages) {
      const text = msg.text || '';
      if (/\b(budget|price|cost|investment)\b/i.test(text)) score += 2;
      if (/\b(visit|show|demo|presentation)\b/i.test(text)) score += 3;
      if (/\b(special offer|discount|limited)\b/i.test(text)) score += 4;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateClosingScore(messages: any[]): number {
    let score = 0;
    const agentMessages = messages.filter((m) => m.role === 'AGENT' || m.speaker === 'AGENT');
    const lastMessages = agentMessages.slice(-5); // Last 5 messages

    for (const msg of lastMessages) {
      const text = msg.text || '';
      
      // Closing indicators
      if (/\b(book|reserve|confirm|schedule|appointment)\b/i.test(text)) score += 15;
      if (/\b(visit|come|see|show)\b/i.test(text)) score += 10;
      if (/\b(call back|follow up|reach out)\b/i.test(text)) score += 8;
      if (/\b(thank you|thanks|appreciate)\b/i.test(text)) score += 5;
    }

    // Check if conversation has proper closing
    if (lastMessages.length > 0) {
      const lastText = lastMessages[lastMessages.length - 1].text || '';
      if (/\b(goodbye|bye|have a nice day|take care)\b/i.test(lastText)) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ============================================
  // SENTIMENT ANALYSIS
  // ============================================

  private analyzeSentiment(dataset: any): SentimentAnalysisDto {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const customerMessages = messages.filter((m) => m.role === 'CUSTOMER' || m.speaker === 'CUSTOMER');

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const msg of customerMessages) {
      const text = (msg.text || '').toLowerCase();
      
      // Positive indicators
      const positiveWords = [
        'good', 'great', 'excellent', 'perfect', 'wonderful', 'amazing', 
        'interested', 'yes', 'sure', 'definitely', 'appreciate', 'thank'
      ];
      
      // Negative indicators
      const negativeWords = [
        'no', 'not', 'dont', 'never', 'bad', 'poor', 'expensive', 
        'issue', 'problem', 'concern', 'worried', 'disappointed'
      ];

      const positiveMatches = positiveWords.filter((word) => text.includes(word)).length;
      const negativeMatches = negativeWords.filter((word) => text.includes(word)).length;

      if (positiveMatches > negativeMatches) {
        positiveCount++;
      } else if (negativeMatches > positiveMatches) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    }

    const total = customerMessages.length || 1;
    const positiveRatio = positiveCount / total;
    const negativeRatio = negativeCount / total;

    let sentimentLabel = 'NEUTRAL';
    let sentimentScore = 0.5;

    if (positiveRatio > 0.6) {
      sentimentLabel = 'POSITIVE';
      sentimentScore = 0.5 + (positiveRatio * 0.5);
    } else if (negativeRatio > 0.4) {
      sentimentLabel = 'NEGATIVE';
      sentimentScore = 0.5 - (negativeRatio * 0.5);
    }

    return {
      sentimentLabel,
      sentimentScore: Math.max(0, Math.min(1, sentimentScore)),
      details: {
        positiveCount,
        negativeCount,
        neutralCount,
        totalMessages: total,
      },
    };
  }

  // ============================================
  // EMOTION DETECTION
  // ============================================

  private detectDominantEmotion(dataset: any): string {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const customerMessages = messages.filter((m) => m.role === 'CUSTOMER' || m.speaker === 'CUSTOMER');

    const emotionScores = {
      HAPPY: 0,
      NEUTRAL: 0,
      CONFUSED: 0,
      EXCITED: 0,
      INTERESTED: 0,
      FRUSTRATED: 0,
      ANGRY: 0,
      BUSY: 0,
      SILENT: 0,
    };

    for (const msg of customerMessages) {
      const text = (msg.text || '').toLowerCase();
      const textLength = text.length;

      // Happy indicators
      if (/\b(happy|glad|pleased|satisfied|good)\b/i.test(text)) emotionScores.HAPPY += 2;
      
      // Excited indicators
      if (/\b(wow|amazing|great|excellent|fantastic)\b/i.test(text)) emotionScores.EXCITED += 2;
      if (text.includes('!')) emotionScores.EXCITED += 1;
      
      // Interested indicators
      if (/\b(tell me|how|what|when|where|interested|want to know)\b/i.test(text)) emotionScores.INTERESTED += 2;
      
      // Confused indicators
      if (/\b(confused|unclear|don't understand|what do you mean)\b/i.test(text)) emotionScores.CONFUSED += 3;
      
      // Frustrated indicators
      if (/\b(frustrated|annoyed|tired|repeatedly|again)\b/i.test(text)) emotionScores.FRUSTRATED += 3;
      
      // Angry indicators
      if (/\b(angry|upset|furious|ridiculous|terrible)\b/i.test(text)) emotionScores.ANGRY += 4;
      
      // Busy indicators
      if (/\b(busy|hurry|quick|later|call back)\b/i.test(text)) emotionScores.BUSY += 2;
      
      // Silent/Short responses
      if (textLength < 10) emotionScores.SILENT += 1;
      
      // Neutral
      if (textLength > 20 && textLength < 100) emotionScores.NEUTRAL += 1;
    }

    // Find dominant emotion
    let dominantEmotion = 'NEUTRAL';
    let maxScore = emotionScores.NEUTRAL;

    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    }

    return dominantEmotion;
  }

  // ============================================
  // QUALITY ASSESSMENT
  // ============================================

  private assessOverallQuality(scores: ConversationScoresDto): string {
    const avgScore = scores.conversationScore || 0;

    if (avgScore >= 80) return 'EXCELLENT';
    if (avgScore >= 65) return 'GOOD';
    if (avgScore >= 50) return 'AVERAGE';
    if (avgScore >= 35) return 'POOR';
    return 'VERY_POOR';
  }

  // ============================================
  // CONVERSATION FLOW ANALYSIS
  // ============================================

  private async analyzeConversationFlow(analysisId: string, dataset: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];

    const phases = [
      'GREETING',
      'INTRODUCTION',
      'REQUIREMENT_GATHERING',
      'DISCOVERY',
      'PITCH',
      'OBJECTION',
      'NEGOTIATION',
      'CLOSING',
      'FOLLOW_UP',
      'FAREWELL',
    ];

    let sequence = 0;
    const timeline: any[] = [];

    for (const msg of messages) {
      const text = (msg.text || '').toLowerCase();
      const phase = this.detectPhase(text, sequence, messages.length);

      timeline.push({
        analysisId,
        sequence: sequence++,
        phase,
        startTime: msg.timestamp || 0,
        endTime: msg.timestamp || 0,
        duration: 0,
        speaker: msg.role || msg.speaker || 'UNKNOWN',
        text: msg.text || '',
        metadata: msg,
      });
    }

    // Save timeline
    if (timeline.length > 0) {
      await this.prisma.analysisTimeline.createMany({
        data: timeline,
      });
    }
  }

  private detectPhase(text: string, position: number, total: number): string {
    const ratio = position / total;

    // Greeting (first 10%)
    if (ratio < 0.1) {
      if (/\b(hello|hi|good morning|good afternoon|good evening)\b/i.test(text)) {
        return 'GREETING';
      }
    }

    // Introduction (first 20%)
    if (ratio < 0.2) {
      if (/\b(my name is|calling from|represent)\b/i.test(text)) {
        return 'INTRODUCTION';
      }
    }

    // Requirement gathering (20-40%)
    if (ratio >= 0.2 && ratio < 0.4) {
      if (/\b(looking for|need|want|require|budget)\b/i.test(text)) {
        return 'REQUIREMENT_GATHERING';
      }
    }

    // Discovery (30-50%)
    if (ratio >= 0.3 && ratio < 0.5) {
      if (/\b(tell me|what|how|where|when)\b/i.test(text)) {
        return 'DISCOVERY';
      }
    }

    // Pitch (40-60%)
    if (ratio >= 0.4 && ratio < 0.6) {
      if (/\b(we have|we offer|features|benefits|perfect for)\b/i.test(text)) {
        return 'PITCH';
      }
    }

    // Objection (any position)
    if (/\b(but|however|concern|expensive|problem|not sure)\b/i.test(text)) {
      return 'OBJECTION';
    }

    // Negotiation (50-70%)
    if (ratio >= 0.5 && ratio < 0.7) {
      if (/\b(price|discount|offer|deal|special)\b/i.test(text)) {
        return 'NEGOTIATION';
      }
    }

    // Closing (70-90%)
    if (ratio >= 0.7 && ratio < 0.9) {
      if (/\b(book|reserve|visit|appointment|schedule)\b/i.test(text)) {
        return 'CLOSING';
      }
    }

    // Follow-up (80-95%)
    if (ratio >= 0.8 && ratio < 0.95) {
      if (/\b(call back|follow up|reach out|contact)\b/i.test(text)) {
        return 'FOLLOW_UP';
      }
    }

    // Farewell (last 10%)
    if (ratio >= 0.9) {
      if (/\b(goodbye|bye|thank you|have a nice day|take care)\b/i.test(text)) {
        return 'FAREWELL';
      }
    }

    return 'DISCOVERY'; // Default phase
  }

  // ============================================
  // INTENT ANALYSIS
  // ============================================

  private async analyzeIntents(analysisId: string, dataset: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const intents: any[] = [];

    let position = 0;
    for (const msg of messages) {
      const text = (msg.text || '').toLowerCase();
      const detectedIntents = this.detectIntents(text);

      for (const intent of detectedIntents) {
        intents.push({
          analysisId,
          intentType: intent.type,
          confidence: intent.confidence,
          context: msg.text,
          position: position,
          metadata: { message: msg },
        });
      }
      position++;
    }

    // Note: Intent analysis data should be stored in ConversationAnalysis metadata
    // if (intents.length > 0) {
    //   await this.prisma.analysisIntent.createMany({ data: intents });
    // }
  }

  private detectIntents(text: string): Array<{ type: string; confidence: number }> {
    const intents: Array<{ type: string; confidence: number }> = [];

    // INTERESTED
    if (/\b(interested|want|looking for|need|would like)\b/i.test(text)) {
      intents.push({ type: 'INTERESTED', confidence: 0.85 });
    }

    // NOT_INTERESTED
    if (/\b(not interested|don't want|no need|not looking)\b/i.test(text)) {
      intents.push({ type: 'NOT_INTERESTED', confidence: 0.9 });
    }

    // PRICING
    if (/\b(price|cost|expensive|cheap|rate|amount|payment)\b/i.test(text)) {
      intents.push({ type: 'PRICING', confidence: 0.85 });
    }

    // LOAN
    if (/\b(loan|finance|emi|installment|bank)\b/i.test(text)) {
      intents.push({ type: 'LOAN', confidence: 0.9 });
    }

    // CALLBACK
    if (/\b(call back|call later|reach out|contact later)\b/i.test(text)) {
      intents.push({ type: 'CALLBACK', confidence: 0.9 });
    }

    // SITE_VISIT
    if (/\b(visit|see|show|demo|inspection|tour)\b/i.test(text)) {
      intents.push({ type: 'SITE_VISIT', confidence: 0.85 });
    }

    // BOOKING
    if (/\b(book|reserve|confirm|purchase|buy)\b/i.test(text)) {
      intents.push({ type: 'BOOKING', confidence: 0.95 });
    }

    // COMPLAINT
    if (/\b(complaint|issue|problem|concern|unhappy|disappointed)\b/i.test(text)) {
      intents.push({ type: 'COMPLAINT', confidence: 0.85 });
    }

    // SUPPORT
    if (/\b(help|support|assist|guide)\b/i.test(text)) {
      intents.push({ type: 'SUPPORT', confidence: 0.8 });
    }

    // GENERAL_QUESTION
    if (/\b(what|when|where|how|why|who)\b/i.test(text)) {
      intents.push({ type: 'GENERAL_QUESTION', confidence: 0.7 });
    }

    // INFORMATION_REQUEST
    if (/\b(tell me|information|details|more about)\b/i.test(text)) {
      intents.push({ type: 'INFORMATION_REQUEST', confidence: 0.8 });
    }

    // LANGUAGE_CHANGE
    if (/\b(hindi|english|marathi|language)\b/i.test(text)) {
      intents.push({ type: 'LANGUAGE_CHANGE', confidence: 0.9 });
    }

    if (intents.length === 0) {
      intents.push({ type: 'UNKNOWN', confidence: 0.5 });
    }

    return intents;
  }

  // ============================================
  // ENTITY ANALYSIS
  // ============================================

  private async analyzeEntities(analysisId: string, dataset: any) {
    const existingEntities = dataset.entities || [];
    const entities: any[] = [];

    for (const entity of existingEntities) {
      entities.push({
        analysisId,
        entityType: entity.entityType,
        entityValue: entity.entityValue,
        confidence: entity.confidence || 0.8,
        context: entity.context,
        position: 0,
        metadata: entity,
      });
    }

    // Note: Entity analysis data should be stored in ConversationAnalysis metadata
    // if (entities.length > 0) {
    //   await this.prisma.analysisEntity.createMany({ data: entities });
    // }
  }

  // ============================================
  // OBJECTION DETECTION
  // ============================================

  private async detectObjections(analysisId: string, dataset: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const objections: any[] = [];

    let position = 0;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const text = (msg.text || '').toLowerCase();
      const isCustomer = msg.role === 'CUSTOMER' || msg.speaker === 'CUSTOMER';

      if (isCustomer) {
        const detectedObjections = this.detectObjectionTypes(text);

        for (const objection of detectedObjections) {
          // Find agent's response
          const agentResponse = messages
            .slice(i + 1, i + 3)
            .find((m) => m.role === 'AGENT' || m.speaker === 'AGENT');

          objections.push({
            analysisId,
            objectionType: objection.type,
            objectionText: msg.text,
            agentResponse: agentResponse?.text || null,
            wasResolved: this.wasObjectionResolved(agentResponse?.text || '', messages.slice(i + 1)),
            resolutionScore: agentResponse ? this.scoreResolution(agentResponse.text) : 0,
            position: position,
            metadata: { message: msg },
          });
        }
      }
      position++;
    }

    if (objections.length > 0) {
      await this.prisma.analysisObjection.createMany({ data: objections });
    }
  }

  private detectObjectionTypes(text: string): Array<{ type: string }> {
    const objections: Array<{ type: string }> = [];

    if (/\b(expensive|costly|price|too much|high|afford)\b/i.test(text)) {
      objections.push({ type: 'PRICE_OBJECTION' });
    }

    if (/\b(trust|believe|sure|guarantee|reliable)\b/i.test(text)) {
      objections.push({ type: 'TRUST_ISSUE' });
    }

    if (/\b(family|wife|husband|parents|discuss)\b/i.test(text)) {
      objections.push({ type: 'FAMILY_DISCUSSION' });
    }

    if (/\b(time|think|later|decide)\b/i.test(text)) {
      objections.push({ type: 'NEED_TIME' });
    }

    if (/\b(already|purchased|bought|have)\b/i.test(text)) {
      objections.push({ type: 'ALREADY_PURCHASED' });
    }

    if (/\b(loan|finance|bank|approval)\b/i.test(text)) {
      objections.push({ type: 'NEED_LOAN' });
    }

    if (/\b(busy|not now|bad time|later)\b/i.test(text)) {
      objections.push({ type: 'BAD_TIMING' });
    }

    if (/\b(location|far|distance|area)\b/i.test(text)) {
      objections.push({ type: 'LOCATION_CONCERN' });
    }

    if (/\b(other|competitor|comparison|better)\b/i.test(text)) {
      objections.push({ type: 'COMPETITOR_MENTION' });
    }

    if (/\b(not interested|no interest|don't need)\b/i.test(text)) {
      objections.push({ type: 'NO_INTEREST' });
    }

    return objections;
  }

  private wasObjectionResolved(agentResponse: string, followupMessages: any[]): boolean {
    const response = agentResponse.toLowerCase();
    
    // Check agent's response quality
    if (/\b(understand|let me|we can|we have|special|offer)\b/i.test(response)) {
      // Check customer's follow-up
      const customerFollowup = followupMessages
        .find((m) => m.role === 'CUSTOMER' || m.speaker === 'CUSTOMER');
      
      if (customerFollowup) {
        const followupText = (customerFollowup.text || '').toLowerCase();
        if (/\b(okay|sure|good|interested|tell me more)\b/i.test(followupText)) {
          return true;
        }
      }
    }

    return false;
  }

  private scoreResolution(agentResponse: string): number {
    let score = 50;
    const response = agentResponse.toLowerCase();

    if (/\b(understand|appreciate)\b/i.test(response)) score += 10;
    if (/\b(let me|we can|we have)\b/i.test(response)) score += 15;
    if (/\b(special|offer|discount)\b/i.test(response)) score += 10;
    if (/\b(solution|alternative|option)\b/i.test(response)) score += 15;

    return Math.min(100, score);
  }

  // ============================================
  // EMOTION DETECTION
  // ============================================

  private async detectEmotions(analysisId: string, dataset: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const emotions: any[] = [];

    let position = 0;
    for (const msg of messages) {
      const isCustomer = msg.role === 'CUSTOMER' || msg.speaker === 'CUSTOMER';
      if (isCustomer) {
        const detectedEmotions = this.detectEmotionTypes(msg.text || '');

        for (const emotion of detectedEmotions) {
          emotions.push({
            analysisId,
            emotionType: emotion.type,
            intensity: emotion.intensity,
            position: position,
            context: msg.text,
            metadata: { message: msg },
          });
        }
      }
      position++;
    }

    // Note: Emotion analysis data should be stored in ConversationAnalysis metadata
    // if (emotions.length > 0) {
    //   await this.prisma.analysisEmotion.createMany({ data: emotions });
    // }
  }

  private detectEmotionTypes(text: string): Array<{ type: string; intensity: number }> {
    const emotions: Array<{ type: string; intensity: number }> = [];
    const lowerText = text.toLowerCase();

    if (/\b(happy|glad|pleased|satisfied|delighted)\b/i.test(lowerText)) {
      emotions.push({ type: 'HAPPY', intensity: 0.8 });
    }

    if (/\b(confused|unclear|don't understand|what)\b/i.test(lowerText)) {
      emotions.push({ type: 'CONFUSED', intensity: 0.7 });
    }

    if (/\b(excited|wow|amazing|great|excellent)\b/i.test(lowerText)) {
      emotions.push({ type: 'EXCITED', intensity: 0.9 });
    }

    if (/\b(interested|want|looking|tell me)\b/i.test(lowerText)) {
      emotions.push({ type: 'INTERESTED', intensity: 0.8 });
    }

    if (/\b(frustrated|annoyed|tired|repeatedly)\b/i.test(lowerText)) {
      emotions.push({ type: 'FRUSTRATED', intensity: 0.8 });
    }

    if (/\b(angry|upset|furious|ridiculous)\b/i.test(lowerText)) {
      emotions.push({ type: 'ANGRY', intensity: 0.9 });
    }

    if (/\b(busy|hurry|quick|rush)\b/i.test(lowerText)) {
      emotions.push({ type: 'BUSY', intensity: 0.7 });
    }

    if (text.length < 10) {
      emotions.push({ type: 'SILENT', intensity: 0.6 });
    }

    if (emotions.length === 0) {
      emotions.push({ type: 'NEUTRAL', intensity: 0.5 });
    }

    return emotions;
  }

  // ============================================
  // LEAD SCORING
  // ============================================

  private async calculateLeadScore(analysisId: string, dataset: any) {
    const intents = dataset.intents || [];
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    
    let score = 50; // Base score
    const factors: any = {};

    // Positive indicators
    const interestedCount = intents.filter((i: any) => i.entityType === 'INTERESTED').length;
    const bookingCount = intents.filter((i: any) => i.entityType === 'BOOKING').length;
    const siteVisitCount = intents.filter((i: any) => i.entityType === 'SITE_VISIT').length;
    const pricingCount = intents.filter((i: any) => i.entityType === 'PRICING').length;

    score += interestedCount * 10;
    score += bookingCount * 20;
    score += siteVisitCount * 15;
    score += pricingCount * 5;

    factors.interestedCount = interestedCount;
    factors.bookingCount = bookingCount;
    factors.siteVisitCount = siteVisitCount;
    factors.pricingCount = pricingCount;

    // Negative indicators
    const notInterestedCount = intents.filter((i: any) => i.entityType === 'NOT_INTERESTED').length;
    score -= notInterestedCount * 20;
    factors.notInterestedCount = notInterestedCount;

    // Budget mentioned
    const budgetEntities = dataset.entities?.filter((e: any) => e.entityType === 'BUDGET') || [];
    if (budgetEntities.length > 0) {
      score += 10;
      factors.hasBudget = true;
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Determine category
    let leadCategory = 'COLD_LEAD';
    if (score >= 80) leadCategory = 'HOT_LEAD';
    else if (score >= 60) leadCategory = 'WARM_LEAD';
    else if (score >= 50) leadCategory = 'QUALIFIED';
    else if (score < 30) leadCategory = 'REJECTED';

    // Recommended action
    let recommendedAction = 'Follow up in 7 days';
    if (score >= 80) recommendedAction = 'Schedule site visit immediately';
    else if (score >= 60) recommendedAction = 'Follow up within 2 days';
    else if (score < 30) recommendedAction = 'Archive lead';

    // Note: Lead score data should be stored in ConversationAnalysis metadata
    // await this.prisma.analysisLeadScore.create({
    //   data: {
    //     analysisId,
    //     leadCategory,
    //     score,
    //     confidence: 0.85,
    //     factors,
    //     scoringDetails: {
    //       breakdown: factors,
    //       calculatedAt: new Date(),
    //     },
    //     recommendedAction,
    //   },
    // });
  }

  // ============================================
  // RESPONSE SCORING
  // ============================================

  private async scoreResponses(analysisId: string, dataset: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const responses: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isAgent = msg.role === 'AGENT' || msg.speaker === 'AGENT';

      if (isAgent) {
        const responseType = this.classifyResponseType(msg.text || '', i, messages.length);
        const effectiveness = this.scoreResponseEffectiveness(msg, messages, i);
        const customerReaction = this.detectCustomerReaction(messages, i);

        responses.push({
          analysisId,
          responseType,
          agentText: msg.text,
          effectivenessScore: effectiveness,
          customerReaction,
          position: i,
          metadata: { message: msg },
        });
      }
    }

    // Note: Response score data should be stored in ConversationAnalysis metadata
    // if (responses.length > 0) {
    //   await this.prisma.analysisResponseScore.createMany({ data: responses });
    // }
  }

  private classifyResponseType(text: string, position: number, total: number): string {
    const ratio = position / total;
    const lowerText = text.toLowerCase();

    if (ratio < 0.1 && /\b(hello|hi|good morning|good afternoon)\b/i.test(lowerText)) {
      return 'GREETING';
    }

    if (ratio < 0.2 && /\b(my name|calling from|represent)\b/i.test(lowerText)) {
      return 'INTRODUCTION';
    }

    if (/\b(budget|looking for|need|want)\b/i.test(lowerText)) {
      return 'REQUIREMENT_GATHERING';
    }

    if (/\b(but|however|understand|concern)\b/i.test(lowerText)) {
      return 'OBJECTION_HANDLING';
    }

    if (/\b(visit|schedule|book|appointment)\b/i.test(lowerText)) {
      return 'CLOSING';
    }

    if (ratio > 0.8 && /\b(follow up|call back|reach out)\b/i.test(lowerText)) {
      return 'FOLLOW_UP';
    }

    return 'GENERAL_RESPONSE';
  }

  private scoreResponseEffectiveness(msg: any, messages: any[], index: number): number {
    let score = 50;
    const text = (msg.text || '').toLowerCase();

    // Check response quality
    if (text.length > 20 && text.length < 150) score += 10; // Good length
    if (/\b(sir|ma'am|please|thank you)\b/i.test(text)) score += 5; // Polite
    if (/\?/.test(text)) score += 5; // Asks questions

    // Check customer's next response
    const nextCustomerMsg = messages
      .slice(index + 1)
      .find((m) => m.role === 'CUSTOMER' || m.speaker === 'CUSTOMER');

    if (nextCustomerMsg) {
      const nextText = (nextCustomerMsg.text || '').toLowerCase();
      if (/\b(yes|okay|sure|good|interested)\b/i.test(nextText)) score += 20;
      if (/\b(no|not|don't)\b/i.test(nextText)) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private detectCustomerReaction(messages: any[], agentMsgIndex: number): string {
    const nextCustomerMsg = messages
      .slice(agentMsgIndex + 1)
      .find((m) => m.role === 'CUSTOMER' || m.speaker === 'CUSTOMER');

    if (!nextCustomerMsg) return 'NO_RESPONSE';

    const text = (nextCustomerMsg.text || '').toLowerCase();

    if (/\b(yes|okay|sure|good|interested)\b/i.test(text)) return 'POSITIVE';
    if (/\b(no|not|don't|never)\b/i.test(text)) return 'NEGATIVE';
    if (/\b(maybe|think|consider)\b/i.test(text)) return 'NEUTRAL';
    if (/\b(what|how|when|where)\b/i.test(text)) return 'QUESTIONING';

    return 'NEUTRAL';
  }

  // ============================================
  // KNOWLEDGE BUILDING
  // ============================================

  private async buildKnowledge(companyId: string, dataset: any, analysis: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];
    const knowledgeItems: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isCustomer = msg.role === 'CUSTOMER' || msg.speaker === 'CUSTOMER';

      // Look for customer questions
      if (isCustomer && /\?/.test(msg.text)) {
        const agentResponse = messages
          .slice(i + 1, i + 3)
          .find((m) => m.role === 'AGENT' || m.speaker === 'AGENT');

        if (agentResponse) {
          const category = this.categorizeQuestion(msg.text);
          const intent = this.detectIntents(msg.text.toLowerCase())[0]?.type || 'GENERAL_QUESTION';

          knowledgeItems.push({
            companyId,
            category,
            question: msg.text,
            answer: agentResponse.text,
            context: JSON.stringify(messages.slice(Math.max(0, i - 2), i + 3)),
            intent,
            confidence: 0.75,
            usageCount: 1,
            sourceType: 'CONVERSATION',
            sourceId: dataset.id,
            isActive: true,
          });
        }
      }
    }

    // Save knowledge items
    for (const item of knowledgeItems) {
      // Check if similar question exists
      const existing = await this.prisma.knowledgeItem.findFirst({
        where: {
          companyId,
          question: item.question,
        },
      });

      if (existing) {
        // Update usage count
        await this.prisma.knowledgeItem.update({
          where: { id: existing.id },
          data: { usageCount: { increment: 1 } },
        });
      } else {
        // Create new knowledge item
        await this.prisma.knowledgeItem.create({ data: item });
      }
    }
  }

  private categorizeQuestion(question: string): string {
    const lowerQ = question.toLowerCase();

    if (/\b(price|cost|expensive|cheap|rate)\b/i.test(lowerQ)) return 'PRICING';
    if (/\b(location|where|area|address)\b/i.test(lowerQ)) return 'LOCATION';
    if (/\b(size|bhk|area|square|feet)\b/i.test(lowerQ)) return 'SPECIFICATIONS';
    if (/\b(loan|finance|emi|bank)\b/i.test(lowerQ)) return 'FINANCING';
    if (/\b(when|delivery|possession|ready)\b/i.test(lowerQ)) return 'TIMELINE';
    if (/\b(amenities|facilities|features)\b/i.test(lowerQ)) return 'AMENITIES';

    return 'GENERAL';
  }

  // ============================================
  // QUESTION LIBRARY
  // ============================================

  private async updateQuestionLibrary(companyId: string, dataset: any) {
    const conversation = dataset.conversation?.structuredData || { messages: [] };
    const messages = conversation.messages || [];

    for (const msg of messages) {
      if (/\?/.test(msg.text)) {
        const askedBy = msg.role === 'CUSTOMER' || msg.speaker === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';
        const questionType = this.categorizeQuestion(msg.text);

        // Check if question exists
        const existing = await this.prisma.questionLibrary.findFirst({
          where: {
            companyId,
            question: msg.text,
          },
        });

        if (existing) {
          // Update frequency and last asked date
          await this.prisma.questionLibrary.update({
            where: { id: existing.id },
            data: {
              frequency: { increment: 1 },
              lastAskedAt: new Date(),
            },
          });
        } else {
          // Create new question
          await this.prisma.questionLibrary.create({
            data: {
              companyId,
              question: msg.text,
              questionType,
              askedBy,
              frequency: 1,
            },
          });
        }
      }
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getAnalysis(companyId: string, analysisId: string) {
    return this.prisma.datasetConversationAnalysis.findFirst({
      where: {
        id: analysisId,
        companyId,
      },
      include: {
        timeline: true,
        intents: true,
        entities: true,
        objections: true,
        emotions: true,
        leadScore: true,
        responseScores: true,
      },
    });
  }

  async getAnalysisByDataset(companyId: string, datasetRecordId: string) {
    return this.prisma.datasetConversationAnalysis.findFirst({
      where: {
        datasetRecordId,
        companyId,
      },
      include: {
        timeline: true,
        intents: true,
        entities: true,
        objections: true,
        emotions: true,
        leadScore: true,
        responseScores: true,
      },
    });
  }

  async listAnalyses(companyId: string, query: ConversationQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.search) {
      where.datasetRecordId = { contains: query.search };
    }

    if (query.sentimentLabel) {
      where.sentimentLabel = query.sentimentLabel;
    }

    if (query.overallQuality) {
      where.overallQuality = query.overallQuality;
    }

    if (query.minScore !== undefined || query.maxScore !== undefined) {
      where.conversationScore = {};
      if (query.minScore !== undefined) where.conversationScore.gte = query.minScore;
      if (query.maxScore !== undefined) where.conversationScore.lte = query.maxScore;
    }

    const [total, data] = await Promise.all([
      this.prisma.datasetConversationAnalysis.count({ where }),
      this.prisma.datasetConversationAnalysis.findMany({
        where,
        include: {
          timeline: true,
          intents: true,
          entities: true,
          objections: true,
          emotions: true,
          leadScore: true,
          responseScores: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteAnalysis(companyId: string, analysisId: string) {
    const analysis = await this.prisma.datasetConversationAnalysis.findFirst({
      where: { id: analysisId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    await this.prisma.datasetConversationAnalysis.delete({
      where: { id: analysisId },
    });

    return { success: true, message: 'Analysis deleted successfully' };
  }
}

