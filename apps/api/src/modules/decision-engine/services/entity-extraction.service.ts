import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EntityType } from '@prisma/client';
import { ExtractEntitiesDto, EntityExtractionResultDto, ExtractedEntitiesDto } from '../dto/entity-extraction.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class EntityExtractionService {
  private readonly logger = new Logger(EntityExtractionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async extractEntities(
    companyId: string,
    dto: ExtractEntitiesDto,
  ): Promise<ExtractedEntitiesDto> {
    const startTime = Date.now();

    try {
      const input = dto.rawInput;
      const entities: EntityExtractionResultDto[] = [];

      entities.push(...this.extractCustomerName(input));
      entities.push(...this.extractLocation(input));
      entities.push(...this.extractBudget(input));
      entities.push(...this.extractPropertyType(input));
      entities.push(...this.extractContact(input));
      entities.push(...this.extractTimeline(input));
      entities.push(...this.extractLanguage(input));

      const filteredEntities = entities.filter((e) => e.confidence >= 0.5);

      const result: ExtractedEntitiesDto = {
        entities: filteredEntities,
        totalEntities: filteredEntities.length,
        averageConfidence:
          filteredEntities.length > 0
            ? filteredEntities.reduce((sum, e) => sum + e.confidence, 0) / filteredEntities.length
            : 0,
        metadata: {
          extractionTime: Date.now() - startTime,
          inputLength: input.length,
        },
      };

      this.logger.log(
        `Extracted ${result.totalEntities} entities with avg confidence ${result.averageConfidence.toFixed(2)} in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error extracting entities: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private extractCustomerName(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];
    const patterns = [
      /(?:my name is|i am|i'm|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:here|speaking)/i,
    ];

    patterns.forEach((pattern) => {
      const match = input.match(pattern);
      if (match) {
        const name = match[1] || match[0];
        results.push({
          entityType: EntityType.CUSTOMER_NAME,
          entityValue: name,
          confidence: 0.85,
          startPosition: input.indexOf(name),
          endPosition: input.indexOf(name) + name.length,
          normalizedValue: this.normalizeName(name),
          extractionMethod: 'regex-pattern',
        });
      }
    });

    return results;
  }

  private extractLocation(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];

    const cities = [
      'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad',
      'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'vadodara',
    ];

    const states = [
      'maharashtra', 'delhi', 'karnataka', 'telangana', 'tamil nadu', 'west bengal',
      'gujarat', 'rajasthan', 'uttar pradesh', 'madhya pradesh', 'andhra pradesh',
    ];

    cities.forEach((city) => {
      if (input.toLowerCase().includes(city)) {
        results.push({
          entityType: EntityType.CITY,
          entityValue: city,
          confidence: 0.9,
          normalizedValue: this.capitalizeWords(city),
          extractionMethod: 'dictionary-lookup',
        });
      }
    });

    states.forEach((state) => {
      if (input.toLowerCase().includes(state)) {
        results.push({
          entityType: EntityType.STATE,
          entityValue: state,
          confidence: 0.9,
          normalizedValue: this.capitalizeWords(state),
          extractionMethod: 'dictionary-lookup',
        });
      }
    });

    return results;
  }

  private extractBudget(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];
    const patterns = [
      /(?:budget|afford|spend|price range|looking at)\s*(?:is|of|around)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\s*(?:lakh|lakhs|cr|crore|crores|k|thousand|million))?)/gi,
      /(?:₹|rs\.?|inr)\s*([\d,]+(?:\s*(?:lakh|lakhs|cr|crore|crores|k|thousand|million))?)/gi,
      /([\d,]+)\s*(?:lakh|lakhs|cr|crore|crores)\b/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        const budget = match[1] || match[0];
        results.push({
          entityType: EntityType.BUDGET,
          entityValue: budget,
          confidence: 0.8,
          startPosition: match.index,
          endPosition: match.index + match[0].length,
          normalizedValue: this.normalizeBudget(budget),
          extractionMethod: 'regex-pattern',
        });
      }
    });

    return results;
  }

  private extractPropertyType(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];
    const propertyTypes = {
      'apartment': ['apartment', 'flat', 'unit'],
      'villa': ['villa', 'bungalow', 'independent house'],
      'penthouse': ['penthouse', 'duplex'],
      'plot': ['plot', 'land', 'site'],
      'commercial': ['commercial', 'office', 'shop', 'showroom'],
    };

    Object.entries(propertyTypes).forEach(([type, keywords]) => {
      keywords.forEach((keyword) => {
        if (input.toLowerCase().includes(keyword)) {
          results.push({
            entityType: EntityType.PROPERTY_TYPE,
            entityValue: keyword,
            confidence: 0.85,
            normalizedValue: type,
            extractionMethod: 'dictionary-lookup',
          });
        }
      });
    });

    return results;
  }

  private extractContact(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];

    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailPattern.exec(input)) !== null) {
      results.push({
        entityType: EntityType.EMAIL,
        entityValue: match[0],
        confidence: 0.95,
        startPosition: match.index,
        endPosition: match.index + match[0].length,
        normalizedValue: match[0].toLowerCase(),
        extractionMethod: 'regex-pattern',
      });
    }

    const phonePattern = /(?:\+?91[-.\s]?)?(?:\d{5}[-.\s]?\d{5}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g;
    while ((match = phonePattern.exec(input)) !== null) {
      results.push({
        entityType: EntityType.PHONE,
        entityValue: match[0],
        confidence: 0.9,
        startPosition: match.index,
        endPosition: match.index + match[0].length,
        normalizedValue: this.normalizePhone(match[0]),
        extractionMethod: 'regex-pattern',
      });
    }

    return results;
  }

  private extractTimeline(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];
    const timelinePatterns = {
      'immediate': ['immediate', 'asap', 'right now', 'urgent', 'this week'],
      '1-3 months': ['1 month', '2 months', '3 months', 'few months', 'couple of months'],
      '3-6 months': ['3 months', '4 months', '5 months', '6 months', 'half year'],
      '6-12 months': ['6 months', 'this year', 'end of year', '12 months'],
      'flexible': ['flexible', 'not sure', 'looking around', 'just checking'],
    };

    Object.entries(timelinePatterns).forEach(([timeline, keywords]) => {
      keywords.forEach((keyword) => {
        if (input.toLowerCase().includes(keyword)) {
          results.push({
            entityType: EntityType.PURCHASE_TIMELINE,
            entityValue: keyword,
            confidence: 0.75,
            normalizedValue: timeline,
            extractionMethod: 'dictionary-lookup',
          });
        }
      });
    });

    return results;
  }

  private extractLanguage(input: string): EntityExtractionResultDto[] {
    const results: EntityExtractionResultDto[] = [];
    const languagePatterns = {
      'hindi': ['hindi', 'हिंदी'],
      'english': ['english'],
      'tamil': ['tamil', 'தமிழ்'],
      'telugu': ['telugu', 'తెలుగు'],
      'kannada': ['kannada', 'ಕನ್ನಡ'],
      'malayalam': ['malayalam', 'മലയാളം'],
      'marathi': ['marathi', 'मराठी'],
      'bengali': ['bengali', 'বাংলা'],
      'gujarati': ['gujarati', 'ગુજરાતી'],
    };

    Object.entries(languagePatterns).forEach(([language, keywords]) => {
      keywords.forEach((keyword) => {
        if (input.toLowerCase().includes(keyword)) {
          results.push({
            entityType: EntityType.PREFERRED_LANGUAGE,
            entityValue: keyword,
            confidence: 0.9,
            normalizedValue: language,
            extractionMethod: 'dictionary-lookup',
          });
        }
      });
    });

    return results;
  }

  private normalizeName(name: string): string {
    return name
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private normalizeBudget(budget: string): string {
    const cleaned = budget.replace(/[,\s]/g, '');
    return cleaned;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[-.\s]/g, '');
  }

  async saveEntityExtractions(
    companyId: string,
    conversationId: string,
    decisionLogId: string,
    entities: EntityExtractionResultDto[],
  ): Promise<void> {
    try {
      await this.prisma.entityExtraction.createMany({
        data: entities.map((entity) => ({
          decisionLogId,
          conversationId,
          companyId,
          entityType: entity.entityType,
          entityValue: entity.entityValue,
          confidence: entity.confidence,
          startPosition: entity.startPosition,
          endPosition: entity.endPosition,
          normalizedValue: entity.normalizedValue,
          extractionMethod: entity.extractionMethod,
          metadata: entity.metadata,
        })),
      });
    } catch (error) {
      this.logger.error(`Error saving entity extractions: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  async getEntityStatistics(
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

    const entities = await this.prisma.entityExtraction.groupBy({
      by: ['entityType'],
      where,
      _count: { id: true },
      _avg: { confidence: true },
    });

    const total = entities.reduce((sum, e) => sum + e._count.id, 0);

    return entities.map((e) => ({
      entityType: e.entityType,
      count: e._count.id,
      averageConfidence: e._avg.confidence,
      percentage: total > 0 ? (e._count.id / total) * 100 : 0,
    }));
  }
}
