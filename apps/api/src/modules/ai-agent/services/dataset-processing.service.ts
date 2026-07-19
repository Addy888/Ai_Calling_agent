import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  DiarizationResultDto,
  ConversationStructureDto,
  ExtractedEntityDto,
  DetectedIntentDto,
  LeadClassificationDto,
  EntityType,
  IntentType,
  LeadClassificationType,
} from '../dto/dataset.dto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class DatasetProcessingService {
  private readonly logger = new Logger(DatasetProcessingService.name);
  private readonly datasetRoot = path.join(process.cwd(), 'Ai voice Dataset');

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // SPEAKER DIARIZATION
  // ============================================

  async diarizeAudio(datasetRecordId: string): Promise<DiarizationResultDto> {
    this.logger.log(`Diarizing audio for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
      include: { transcript: true },
    });

    if (!dataset || !dataset.transcript) {
      throw new Error('Dataset or transcript not found');
    }

    const segments = (dataset.transcript.segments as any[]) || [];

    // Group segments by speaker
    const speakerSegments: Record<string, any[]> = {};
    let agentSegments = 0;
    let customerSegments = 0;
    let unknownSegments = 0;

    segments.forEach((segment: any) => {
      const speaker = segment.speaker || 'UNKNOWN';

      if (!speakerSegments[speaker]) {
        speakerSegments[speaker] = [];
      }

      speakerSegments[speaker].push(segment);

      // Label speakers as AGENT or CUSTOMER
      // Heuristic: SPEAKER_0 is usually AGENT (first to speak)
      if (speaker === 'SPEAKER_0' || speaker === 'AGENT') {
        agentSegments++;
      } else if (speaker === 'SPEAKER_1' || speaker === 'CUSTOMER') {
        customerSegments++;
      } else {
        unknownSegments++;
      }
    });

    const speakerCount = Object.keys(speakerSegments).length;

    // Create diarization result
    const diarization = await this.prisma.diarization.upsert({
      where: { transcriptId: dataset.transcript.id },
      create: {
        transcriptId: dataset.transcript.id,
        speakers: speakerSegments,
        segments,
        speakerCount,
        agentSegments,
        customerSegments,
        unknownSegments,
        processingTime: 0.5,
      },
      update: {
        speakers: speakerSegments,
        segments,
        speakerCount,
        agentSegments,
        customerSegments,
        unknownSegments,
        processingTime: 0.5,
      },
    });

    // Save diarization to file
    const diarizationPath = path.join(
      this.datasetRoot,
      'diarization',
      `${path.parse(dataset.fileName).name}.json`,
    );
    await fs.writeFile(diarizationPath, JSON.stringify(diarization, null, 2), 'utf-8');

    await this.addLog(
      datasetRecordId,
      'DIARIZATION',
      'INFO',
      `Diarization complete: ${speakerCount} speakers detected`,
      { speakerCount, agentSegments, customerSegments },
    );

    this.logger.log(`Diarization complete for ${datasetRecordId}: ${speakerCount} speakers`);

    return {
      speakerCount,
      segments,
      agentSegments,
      customerSegments,
    };
  }

  // ============================================
  // CONVERSATION PARSING
  // ============================================

  async parseConversation(datasetRecordId: string): Promise<ConversationStructureDto> {
    this.logger.log(`Parsing conversation for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
      include: {
        transcript: {
          include: { diarization: true },
        },
      },
    });

    if (!dataset || !dataset.transcript || !dataset.transcript.diarization) {
      throw new Error('Dataset, transcript, or diarization not found');
    }

    const segments = (dataset.transcript.segments as any[]) || [];

    // Parse conversation messages
    const messages = segments.map((segment: any) => {
      let role = 'UNKNOWN';

      if (segment.speaker === 'SPEAKER_0') {
        role = 'AGENT';
      } else if (segment.speaker === 'SPEAKER_1') {
        role = 'CUSTOMER';
      }

      return {
        role,
        text: segment.text,
        timestamp: segment.start,
        duration: segment.end - segment.start,
        confidence: segment.confidence,
      };
    });

    const messageCount = messages.length;
    const agentMessages = messages.filter((m) => m.role === 'AGENT').length;
    const customerMessages = messages.filter((m) => m.role === 'CUSTOMER').length;

    // Calculate turn count (speaker changes)
    let turnCount = 0;
    let lastRole = '';
    messages.forEach((msg) => {
      if (msg.role !== lastRole && msg.role !== 'UNKNOWN') {
        turnCount++;
        lastRole = msg.role;
      }
    });

    // Create conversation structure
    const conversation = await this.prisma.conversation.upsert({
      where: { datasetRecordId },
      create: {
        datasetRecordId,
        structuredData: { messages },
        messageCount,
        agentMessages,
        customerMessages,
        turnCount,
        averageTurnLength: messageCount > 0 ? turnCount / messageCount : 0,
      },
      update: {
        structuredData: { messages },
        messageCount,
        agentMessages,
        customerMessages,
        turnCount,
        averageTurnLength: messageCount > 0 ? turnCount / messageCount : 0,
      },
    });

    // Save conversation to file
    const conversationPath = path.join(
      this.datasetRoot,
      'conversation_json',
      `${path.parse(dataset.fileName).name}.json`,
    );
    await fs.writeFile(
      conversationPath,
      JSON.stringify({ messages }, null, 2),
      'utf-8',
    );

    await this.addLog(
      datasetRecordId,
      'CONVERSATION_PARSING',
      'INFO',
      `Conversation parsed: ${messageCount} messages, ${turnCount} turns`,
      { messageCount, agentMessages, customerMessages, turnCount },
    );

    this.logger.log(
      `Conversation parsing complete for ${datasetRecordId}: ${messageCount} messages`,
    );

    return {
      messages,
      messageCount,
      agentMessages,
      customerMessages,
      turnCount,
    };
  }

  // ============================================
  // ENTITY EXTRACTION
  // ============================================

  async extractEntities(datasetRecordId: string): Promise<ExtractedEntityDto[]> {
    this.logger.log(`Extracting entities for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
      include: { transcript: true },
    });

    if (!dataset || !dataset.transcript) {
      throw new Error('Dataset or transcript not found');
    }

    const text = dataset.transcript.rawText;
    const entities: ExtractedEntityDto[] = [];

    // Extract phone numbers
    const phonePattern = /\b\d{10}\b/g;
    const phones = text.match(phonePattern) || [];
    phones.forEach((phone) => {
      entities.push({
        entityType: EntityType.PHONE,
        entityValue: phone,
        confidence: 0.95,
        context: this.getContext(text, phone),
        isMasked: false,
      });
    });

    // Extract budget/prices (lakhs, crores)
    const budgetPattern = /\b(\d+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores?)\b/gi;
    const budgets = [...text.matchAll(budgetPattern)];
    budgets.forEach((match) => {
      entities.push({
        entityType: EntityType.BUDGET,
        entityValue: match[0],
        confidence: 0.90,
        context: this.getContext(text, match[0]),
        isMasked: false,
      });
    });

    // Extract property types
    const propertyPattern = /\b(1BHK|2BHK|3BHK|4BHK|villa|apartment|flat|bungalow)\b/gi;
    const properties = [...text.matchAll(propertyPattern)];
    properties.forEach((match) => {
      entities.push({
        entityType: EntityType.PROPERTY,
        entityValue: match[0],
        confidence: 0.85,
        context: this.getContext(text, match[0]),
        isMasked: false,
      });
    });

    // Extract locations (simplified)
    const locationPattern =
      /\b(Mumbai|Delhi|Bangalore|Hyderabad|Chennai|Pune|Kolkata|Ahmedabad|Nanded|Highway|Road)\b/gi;
    const locations = [...text.matchAll(locationPattern)];
    locations.forEach((match) => {
      entities.push({
        entityType: EntityType.LOCATION,
        entityValue: match[0],
        confidence: 0.80,
        context: this.getContext(text, match[0]),
        isMasked: false,
      });
    });

    // Extract loan mentions
    const loanPattern = /\b(loan|finance|financing|EMI|home\s*loan)\b/gi;
    const loans = [...text.matchAll(loanPattern)];
    loans.forEach((match) => {
      entities.push({
        entityType: EntityType.LOAN,
        entityValue: match[0],
        confidence: 0.85,
        context: this.getContext(text, match[0]),
        isMasked: false,
      });
    });

    // Save entities to database
    await this.prisma.extractedEntity.deleteMany({
      where: { datasetRecordId },
    });

    for (const entity of entities) {
      await this.prisma.extractedEntity.create({
        data: {
          datasetRecordId,
          entityType: entity.entityType,
          entityValue: entity.entityValue,
          confidence: entity.confidence,
          context: entity.context,
          isMasked: entity.isMasked,
          maskedValue: entity.maskedValue,
        },
      });
    }

    await this.addLog(
      datasetRecordId,
      'ENTITY_EXTRACTION',
      'INFO',
      `Entity extraction complete: ${entities.length} entities found`,
      { count: entities.length, types: this.groupByType(entities) },
    );

    this.logger.log(`Entity extraction complete for ${datasetRecordId}: ${entities.length} entities`);

    return entities;
  }

  // ============================================
  // INTENT DETECTION
  // ============================================

  async detectIntents(datasetRecordId: string): Promise<DetectedIntentDto[]> {
    this.logger.log(`Detecting intents for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
      include: { transcript: true },
    });

    if (!dataset || !dataset.transcript) {
      throw new Error('Dataset or transcript not found');
    }

    const text = dataset.transcript.rawText.toLowerCase();
    const intents: DetectedIntentDto[] = [];

    // Detect INTERESTED intent
    const interestedPattern =
      /(interested|yes|sure|okay|sounds good|tell me more|want to know)/i;
    if (interestedPattern.test(text)) {
      intents.push({
        intentType: IntentType.INTERESTED,
        confidence: 0.85,
        context: this.getContext(text, 'interested'),
      });
    }

    // Detect NOT_INTERESTED intent
    const notInterestedPattern = /(not interested|no thanks|busy|don't need|already have)/i;
    if (notInterestedPattern.test(text)) {
      intents.push({
        intentType: IntentType.NOT_INTERESTED,
        confidence: 0.90,
        context: this.getContext(text, 'not interested'),
      });
    }

    // Detect CALLBACK intent
    const callbackPattern = /(call back|call later|call tomorrow|call me|callback)/i;
    if (callbackPattern.test(text)) {
      intents.push({
        intentType: IntentType.CALLBACK,
        confidence: 0.88,
        context: this.getContext(text, 'call back'),
      });
    }

    // Detect PRICING intent
    const pricingPattern = /(price|cost|how much|rate|pricing|budget)/i;
    if (pricingPattern.test(text)) {
      intents.push({
        intentType: IntentType.PRICING,
        confidence: 0.92,
        context: this.getContext(text, 'price'),
      });
    }

    // Detect LOAN intent
    const loanPattern = /(loan|finance|financing|EMI|mortgage|bank)/i;
    if (loanPattern.test(text)) {
      intents.push({
        intentType: IntentType.LOAN,
        confidence: 0.87,
        context: this.getContext(text, 'loan'),
      });
    }

    // Detect LOCATION intent
    const locationPattern = /(location|where|address|situated|near)/i;
    if (locationPattern.test(text)) {
      intents.push({
        intentType: IntentType.LOCATION,
        confidence: 0.85,
        context: this.getContext(text, 'location'),
      });
    }

    // Detect SITE_VISIT intent
    const siteVisitPattern = /(site visit|visit|show|see the property|come and see)/i;
    if (siteVisitPattern.test(text)) {
      intents.push({
        intentType: IntentType.SITE_VISIT,
        confidence: 0.90,
        context: this.getContext(text, 'site visit'),
      });
    }

    // Detect BOOKING intent
    const bookingPattern = /(book|booking|reserve|confirm|registration)/i;
    if (bookingPattern.test(text)) {
      intents.push({
        intentType: IntentType.BOOKING,
        confidence: 0.93,
        context: this.getContext(text, 'book'),
      });
    }

    // Detect COMPLAINT intent
    const complaintPattern = /(complaint|problem|issue|unhappy|disappointed)/i;
    if (complaintPattern.test(text)) {
      intents.push({
        intentType: IntentType.COMPLAINT,
        confidence: 0.88,
        context: this.getContext(text, 'complaint'),
      });
    }

    // Detect GENERAL_QUERY intent
    if (intents.length === 0) {
      intents.push({
        intentType: IntentType.GENERAL_QUERY,
        confidence: 0.70,
      });
    }

    // Save intents to database
    await this.prisma.detectedIntent.deleteMany({
      where: { datasetRecordId },
    });

    for (const intent of intents) {
      await this.prisma.detectedIntent.create({
        data: {
          datasetRecordId,
          intentType: intent.intentType,
          confidence: intent.confidence,
          context: intent.context,
        },
      });
    }

    await this.addLog(
      datasetRecordId,
      'INTENT_DETECTION',
      'INFO',
      `Intent detection complete: ${intents.length} intents detected`,
      { count: intents.length, intents: intents.map((i) => i.intentType) },
    );

    this.logger.log(`Intent detection complete for ${datasetRecordId}: ${intents.length} intents`);

    return intents;
  }

  // ============================================
  // LEAD CLASSIFICATION
  // ============================================

  async classifyLead(datasetRecordId: string): Promise<LeadClassificationDto> {
    this.logger.log(`Classifying lead for dataset: ${datasetRecordId}`);

    const dataset = await this.prisma.datasetRecord.findUnique({
      where: { id: datasetRecordId },
      include: {
        intents: true,
        entities: true,
      },
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // Calculate lead score based on intents and entities
    let score = 0;
    const factors: Record<string, any> = {};

    // Check intents
    const intents = dataset.intents.map((i) => i.intentType);

    if (intents.includes('BOOKING')) {
      score += 40;
      factors.booking = true;
    }

    if (intents.includes('SITE_VISIT')) {
      score += 30;
      factors.siteVisit = true;
    }

    if (intents.includes('INTERESTED')) {
      score += 20;
      factors.interested = true;
    }

    if (intents.includes('PRICING')) {
      score += 15;
      factors.pricingQuery = true;
    }

    if (intents.includes('LOAN')) {
      score += 10;
      factors.loanQuery = true;
    }

    if (intents.includes('NOT_INTERESTED')) {
      score -= 50;
      factors.notInterested = true;
    }

    if (intents.includes('CALLBACK')) {
      score += 5;
      factors.callback = true;
    }

    // Check entities
    const entities = dataset.entities.map((e) => e.entityType);

    if (entities.includes('BUDGET')) {
      score += 15;
      factors.budgetMentioned = true;
    }

    if (entities.includes('PROPERTY')) {
      score += 10;
      factors.propertyTypeMentioned = true;
    }

    // Normalize score to 0-1
    const normalizedScore = Math.max(0, Math.min(100, score)) / 100;

    // Classify lead
    let classification: LeadClassificationType;
    let confidence: number;

    if (score >= 70) {
      classification = LeadClassificationType.HOT;
      confidence = 0.90;
    } else if (score >= 50) {
      classification = LeadClassificationType.QUALIFIED;
      confidence = 0.85;
    } else if (score >= 30) {
      classification = LeadClassificationType.WARM;
      confidence = 0.80;
    } else if (score <= 0) {
      classification = LeadClassificationType.REJECTED;
      confidence = 0.88;
    } else {
      classification = LeadClassificationType.COLD;
      confidence = 0.75;
    }

    // Save classification
    await this.prisma.leadClassification.create({
      data: {
        datasetRecordId,
        classification,
        score: normalizedScore,
        confidence,
        factors,
      },
    });

    await this.addLog(
      datasetRecordId,
      'LEAD_CLASSIFICATION',
      'INFO',
      `Lead classified as ${classification} (score: ${normalizedScore.toFixed(2)})`,
      { classification, score: normalizedScore, factors },
    );

    this.logger.log(`Lead classification complete for ${datasetRecordId}: ${classification}`);

    return {
      classification,
      score: normalizedScore,
      confidence,
      factors,
    };
  }

  // ============================================
  // PII MASKING
  // ============================================

  async maskPII(datasetRecordId: string): Promise<void> {
    this.logger.log(`Masking PII for dataset: ${datasetRecordId}`);

    const entities = await this.prisma.extractedEntity.findMany({
      where: { datasetRecordId },
    });

    for (const entity of entities) {
      if (
        entity.entityType === 'PHONE' ||
        entity.entityType === 'NAME' ||
        entity.entityType === 'EMAIL' ||
        entity.entityType === 'ADDRESS'
      ) {
        const maskedValue = this.generateMaskedValue(entity.entityType, entity.entityValue);

        await this.prisma.extractedEntity.update({
          where: { id: entity.id },
          data: {
            isMasked: true,
            maskedValue,
          },
        });
      }
    }

    await this.addLog(
      datasetRecordId,
      'PII_MASKING',
      'INFO',
      'PII masking complete',
      { maskedCount: entities.length },
    );

    this.logger.log(`PII masking complete for ${datasetRecordId}`);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private getContext(text: string, keyword: string, contextLength = 50): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + keyword.length + contextLength);

    return text.substring(start, end).trim();
  }

  private groupByType(entities: ExtractedEntityDto[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    entities.forEach((entity) => {
      grouped[entity.entityType] = (grouped[entity.entityType] || 0) + 1;
    });

    return grouped;
  }

  private generateMaskedValue(entityType: string, value: string): string {
    switch (entityType) {
      case 'PHONE':
        return `**********${value.slice(-2)}`;
      case 'EMAIL':
        const [local, domain] = value.split('@');
        return `${local[0]}***@${domain}`;
      case 'NAME':
        return value
          .split(' ')
          .map((part) => `${part[0]}***`)
          .join(' ');
      case 'ADDRESS':
        return '*** *** ***';
      default:
        return '***';
    }
  }

  private async addLog(
    datasetRecordId: string,
    stage: string,
    level: string,
    message: string,
    details?: any,
  ) {
    await this.prisma.processingLog.create({
      data: {
        datasetRecordId,
        stage,
        level,
        message,
        details,
      },
    });
  }
}
