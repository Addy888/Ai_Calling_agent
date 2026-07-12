import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationState } from '../dto/conversation-session.dto';

export enum GreetingType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  NEW_CUSTOMER = 'NEW_CUSTOMER',
  RETURNING_CUSTOMER = 'RETURNING_CUSTOMER',
  LANGUAGE_BASED = 'LANGUAGE_BASED',
  CUSTOM = 'CUSTOM',
}

@Injectable()
export class GreetingManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async processGreeting(sessionId: string, customerInput: string, context?: any) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { greeting: null, nextAction: 'ERROR' };
    }

    const greetingType = this.determineGreetingType(session, context);
    const greeting = await this.getGreeting(session.companyId, greetingType, session.language);

    return {
      greeting,
      greetingType,
      nextAction: 'PROCEED_TO_INTRODUCTION',
    };
  }

  private determineGreetingType(session: any, context?: any): GreetingType {
    const hour = new Date().getHours();

    if (session.contactId && context?.isReturning) {
      return GreetingType.RETURNING_CUSTOMER;
    }

    if (hour >= 5 && hour < 12) {
      return GreetingType.MORNING;
    }

    if (hour >= 12 && hour < 17) {
      return GreetingType.AFTERNOON;
    }

    if (hour >= 17 && hour < 22) {
      return GreetingType.EVENING;
    }

    return GreetingType.NEW_CUSTOMER;
  }

  async getGreeting(companyId: string, greetingType: GreetingType, language: string = 'en'): Promise<string> {
    const template = await this.prisma.greetingTemplate.findFirst({
      where: {
        companyId,
        greetingType,
        language,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }],
    });

    if (template) {
      return template.template;
    }

    return this.getDefaultGreeting(greetingType, language);
  }

  private getDefaultGreeting(greetingType: GreetingType, language: string): string {
    const greetings: Record<GreetingType, Record<string, string>> = {
      [GreetingType.MORNING]: {
        en: 'Good morning! How are you doing today?',
        es: '¡Buenos días! ¿Cómo está usted hoy?',
        hi: 'सुप्रभात! आज आप कैसे हैं?',
      },
      [GreetingType.AFTERNOON]: {
        en: 'Good afternoon! How are you today?',
        es: '¡Buenas tardes! ¿Cómo está usted?',
        hi: 'शुभ दोपहर! आप कैसे हैं?',
      },
      [GreetingType.EVENING]: {
        en: 'Good evening! How are you doing?',
        es: '¡Buenas noches! ¿Cómo está?',
        hi: 'शुभ संध्या! आप कैसे हैं?',
      },
      [GreetingType.NEW_CUSTOMER]: {
        en: 'Hello! Thank you for taking my call. How are you today?',
        es: '¡Hola! Gracias por atender mi llamada. ¿Cómo está usted hoy?',
        hi: 'नमस्ते! मेरी कॉल लेने के लिए धन्यवाद। आज आप कैसे हैं?',
      },
      [GreetingType.RETURNING_CUSTOMER]: {
        en: 'Hello again! It\'s great to speak with you. How have you been?',
        es: '¡Hola de nuevo! Es un placer hablar con usted. ¿Cómo ha estado?',
        hi: 'फिर से नमस्ते! आपसे बात करके अच्छा लगा। आप कैसे रहे?',
      },
      [GreetingType.LANGUAGE_BASED]: {
        en: 'Hello! How can I help you today?',
        es: '¡Hola! ¿Cómo puedo ayudarle hoy?',
        hi: 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूं?',
      },
      [GreetingType.CUSTOM]: {
        en: 'Hello! Thank you for your time.',
        es: '¡Hola! Gracias por su tiempo.',
        hi: 'नमस्ते! आपके समय के लिए धन्यवाद।',
      },
    };

    return greetings[greetingType]?.[language] || greetings[greetingType]?.['en'] || 'Hello!';
  }

  async createGreetingTemplate(
    companyId: string,
    greetingType: GreetingType,
    template: string,
    language: string = 'en',
    variables?: any,
  ) {
    return this.prisma.greetingTemplate.create({
      data: {
        companyId,
        greetingType,
        language,
        template,
        variables,
        isDefault: false,
        isActive: true,
        priority: 0,
      },
    });
  }

  async updateGreetingTemplate(templateId: string, template: string, variables?: any) {
    return this.prisma.greetingTemplate.update({
      where: { id: templateId },
      data: {
        template,
        variables,
      },
    });
  }

  async getGreetingTemplates(companyId: string, language?: string) {
    const where: any = { companyId, isActive: true };
    if (language) where.language = language;

    return this.prisma.greetingTemplate.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
