import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationState } from '../dto/conversation-session.dto';

export enum ClosingType {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  FOLLOW_UP = 'FOLLOW_UP',
  APPOINTMENT = 'APPOINTMENT',
  THANK_YOU = 'THANK_YOU',
  CUSTOM = 'CUSTOM',
}

@Injectable()
export class ClosingManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async processClosing(sessionId: string, customerInput: string, context?: any) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { 
        closing: null, 
        nextAction: 'ERROR', 
        nextState: ConversationState.COMPLETED,
        action: 'ERROR',
        data: { error: 'Session not found' }
      };
    }

    const closingType = this.determineClosingType(customerInput, context);
    const closing = await this.getClosing(session.companyId, closingType, session.language);

    return {
      closing,
      closingType,
      nextAction: 'COMPLETE_CONVERSATION',
      nextState: ConversationState.COMPLETED,
      action: 'COMPLETE_CONVERSATION',
      data: { closingType, closing }
    };
  }

  private determineClosingType(customerInput: string, context?: any): ClosingType {
    const lowerInput = customerInput.toLowerCase();

    if (context?.appointmentScheduled) {
      return ClosingType.APPOINTMENT;
    }

    if (context?.followUpScheduled) {
      return ClosingType.FOLLOW_UP;
    }

    if (
      lowerInput.includes('interested') ||
      lowerInput.includes('yes') ||
      lowerInput.includes('sounds good')
    ) {
      return ClosingType.INTERESTED;
    }

    if (
      lowerInput.includes('not interested') ||
      lowerInput.includes('no thanks')
    ) {
      return ClosingType.NOT_INTERESTED;
    }

    return ClosingType.THANK_YOU;
  }

  async getClosing(companyId: string, closingType: ClosingType, language: string = 'en'): Promise<string> {
    const template = await this.prisma.closingTemplate.findFirst({
      where: {
        companyId,
        closingType,
        language,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }],
    });

    if (template) {
      return template.template;
    }

    return this.getDefaultClosing(closingType, language);
  }

  private getDefaultClosing(closingType: ClosingType, language: string): string {
    const closings: Record<ClosingType, Record<string, string>> = {
      [ClosingType.INTERESTED]: {
        en: 'That\'s wonderful! I\'m excited to help you with this. One of our representatives will reach out to you shortly with more details. Thank you for your time!',
        es: '¡Eso es maravilloso! Estoy emocionado de ayudarle con esto. Uno de nuestros representantes se pondrá en contacto con usted pronto con más detalles. ¡Gracias por su tiempo!',
        hi: 'यह बहुत अच्छा है! मैं इसमें आपकी मदद करने के लिए उत्साहित हूं। हमारे प्रतिनिधियों में से एक जल्द ही अधिक विवरण के साथ आपसे संपर्क करेंगे। आपके समय के लिए धन्यवाद!',
      },
      [ClosingType.NOT_INTERESTED]: {
        en: 'I understand. Thank you for your time today. If you change your mind in the future, please feel free to reach out. Have a great day!',
        es: 'Entiendo. Gracias por su tiempo hoy. Si cambia de opinión en el futuro, no dude en comunicarse. ¡Que tenga un gran día!',
        hi: 'मैं समझता हूं। आज आपके समय के लिए धन्यवाद। यदि भविष्य में आप अपना विचार बदलते हैं, तो कृपया संपर्क करें। आपका दिन शुभ हो!',
      },
      [ClosingType.FOLLOW_UP]: {
        en: 'Perfect! I\'ve noted your preferred follow-up time. I\'ll make sure to call you back then. Thank you for your time today!',
        es: '¡Perfecto! He anotado su hora de seguimiento preferida. Me aseguraré de llamarle entonces. ¡Gracias por su tiempo hoy!',
        hi: 'बिल्कुल सही! मैंने आपका पसंदीदा फॉलो-अप समय नोट कर लिया है। मैं तब आपको फिर से कॉल करना सुनिश्चित करूंगा। आज आपके समय के लिए धन्यवाद!',
      },
      [ClosingType.APPOINTMENT]: {
        en: 'Excellent! Your appointment has been scheduled. You\'ll receive a confirmation shortly. Thank you and we look forward to meeting you!',
        es: '¡Excelente! Su cita ha sido programada. Recibirá una confirmación en breve. ¡Gracias y esperamos conocerle!',
        hi: 'बहुत बढ़िया! आपकी अपॉइंटमेंट शेड्यूल हो गई है। आपको जल्द ही पुष्टि प्राप्त होगी। धन्यवाद और हम आपसे मिलने के लिए उत्सुक हैं!',
      },
      [ClosingType.THANK_YOU]: {
        en: 'Thank you so much for your time today. If you have any questions in the future, please don\'t hesitate to reach out. Have a wonderful day!',
        es: 'Muchas gracias por su tiempo hoy. Si tiene alguna pregunta en el futuro, no dude en comunicarse. ¡Que tenga un día maravilloso!',
        hi: 'आज आपके समय के लिए बहुत-बहुत धन्यवाद। यदि भविष्य में आपके कोई प्रश्न हों, तो कृपया संपर्क करने में संकोच न करें। आपका दिन शुभ हो!',
      },
      [ClosingType.CUSTOM]: {
        en: 'Thank you for your time. Have a great day!',
        es: 'Gracias por su tiempo. ¡Que tenga un gran día!',
        hi: 'आपके समय के लिए धन्यवाद। आपका दिन शुभ हो!',
      },
    };

    return closings[closingType]?.[language] || closings[closingType]?.['en'] || 'Thank you!';
  }

  async createClosingTemplate(
    companyId: string,
    closingType: ClosingType,
    template: string,
    language: string = 'en',
    variables?: any,
  ) {
    return this.prisma.closingTemplate.create({
      data: {
        companyId,
        closingType,
        language,
        template,
        variables,
        isDefault: false,
        isActive: true,
        priority: 0,
      },
    });
  }

  async updateClosingTemplate(templateId: string, template: string, variables?: any) {
    return this.prisma.closingTemplate.update({
      where: { id: templateId },
      data: {
        template,
        variables,
      },
    });
  }

  async getClosingTemplates(companyId: string, language?: string) {
    const where: any = { companyId, isActive: true };
    if (language) where.language = language;

    return this.prisma.closingTemplate.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
