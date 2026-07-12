import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateObjectionDto, ResolveObjectionDto, ObjectionType } from '../dto/conversation-objection.dto';
import { ConversationState } from '../dto/conversation-session.dto';

@Injectable()
export class ObjectionHandlerService {
  constructor(private readonly prisma: PrismaService) {}

  async createObjection(dto: CreateObjectionDto) {
    return this.prisma.conversationObjection.create({
      data: {
        sessionId: dto.sessionId,
        companyId: dto.companyId,
        objectionType: dto.objectionType,
        objectionText: dto.objectionText,
        conversationState: dto.conversationState,
        detectedIntent: dto.detectedIntent,
        confidenceScore: dto.confidenceScore,
        handlingStrategy: dto.handlingStrategy,
        responseUsed: dto.responseUsed,
        metadata: dto.metadata,
      },
    });
  }

  async resolveObjection(objectionId: string, dto: ResolveObjectionDto) {
    return this.prisma.conversationObjection.update({
      where: { id: objectionId },
      data: {
        wasResolved: dto.wasResolved,
        resolutionNotes: dto.resolutionNotes,
        resolvedAt: dto.wasResolved ? new Date() : null,
        metadata: dto.metadata,
      },
    });
  }

  async detectObjection(customerInput: string): Promise<{
    detected: boolean;
    type?: ObjectionType;
    confidence: number;
    strategy?: string;
  }> {
    const lowerInput = customerInput.toLowerCase();

    if (
      lowerInput.includes('expensive') ||
      lowerInput.includes('costly') ||
      lowerInput.includes('too much') ||
      lowerInput.includes('high price')
    ) {
      return {
        detected: true,
        type: ObjectionType.TOO_EXPENSIVE,
        confidence: 0.85,
        strategy: 'VALUE_PROPOSITION',
      };
    }

    if (lowerInput.includes('think about') || lowerInput.includes('need time') || lowerInput.includes('decide later')) {
      return {
        detected: true,
        type: ObjectionType.NEED_TIME,
        confidence: 0.8,
        strategy: 'CREATE_URGENCY',
      };
    }

    if (
      lowerInput.includes('not interested') ||
      lowerInput.includes('no thanks') ||
      lowerInput.includes('not for me')
    ) {
      return {
        detected: true,
        type: ObjectionType.NOT_INTERESTED,
        confidence: 0.9,
        strategy: 'REFRAME_VALUE',
      };
    }

    if (lowerInput.includes('busy') || lowerInput.includes('not a good time')) {
      return {
        detected: true,
        type: ObjectionType.BUSY,
        confidence: 0.85,
        strategy: 'SCHEDULE_CALLBACK',
      };
    }

    if (lowerInput.includes('call later') || lowerInput.includes('call back')) {
      return {
        detected: true,
        type: ObjectionType.CALL_LATER,
        confidence: 0.9,
        strategy: 'SCHEDULE_CALLBACK',
      };
    }

    if (lowerInput.includes('family') || lowerInput.includes('spouse') || lowerInput.includes('discuss')) {
      return {
        detected: true,
        type: ObjectionType.NEED_FAMILY_DISCUSSION,
        confidence: 0.75,
        strategy: 'PROVIDE_INFO_FOR_DISCUSSION',
      };
    }

    if (lowerInput.includes('more details') || lowerInput.includes('more information') || lowerInput.includes('tell me more')) {
      return {
        detected: true,
        type: ObjectionType.NEED_DETAILS,
        confidence: 0.7,
        strategy: 'PROVIDE_DETAILS',
      };
    }

    if (lowerInput.includes('already bought') || lowerInput.includes('already purchased')) {
      return {
        detected: true,
        type: ObjectionType.ALREADY_PURCHASED,
        confidence: 0.95,
        strategy: 'THANK_AND_CLOSE',
      };
    }

    if (lowerInput.includes('wrong number') || lowerInput.includes('wrong person')) {
      return {
        detected: true,
        type: ObjectionType.WRONG_NUMBER,
        confidence: 0.95,
        strategy: 'APOLOGIZE_AND_CLOSE',
      };
    }

    if (lowerInput.includes('do not call') || lowerInput.includes('don\'t call') || lowerInput.includes('remove')) {
      return {
        detected: true,
        type: ObjectionType.DO_NOT_CALL,
        confidence: 1.0,
        strategy: 'RESPECT_AND_REMOVE',
      };
    }

    return {
      detected: false,
      confidence: 0,
    };
  }

  async handleObjection(sessionId: string, customerInput: string, context?: any) {
    const detection = await this.detectObjection(customerInput);

    if (!detection.detected || !detection.type) {
      return {
        nextState: ConversationState.INFORMATION_COLLECTION,
        action: 'CONTINUE',
        data: { objectionDetected: false },
      };
    }

    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return {
        nextState: ConversationState.CLOSING,
        action: 'ERROR',
        data: { error: 'Session not found' },
      };
    }

    const response = await this.getObjectionResponse(session.companyId, detection.type);

    const objection = await this.createObjection({
      sessionId,
      companyId: session.companyId,
      objectionType: detection.type,
      objectionText: customerInput,
      conversationState: session.currentState as ConversationState,
      detectedIntent: detection.type,
      confidenceScore: detection.confidence,
      handlingStrategy: detection.strategy || 'DEFAULT',
      responseUsed: response,
    });

    if (
      detection.type === ObjectionType.DO_NOT_CALL ||
      detection.type === ObjectionType.WRONG_NUMBER
    ) {
      return {
        nextState: ConversationState.CLOSING,
        action: 'END_CONVERSATION',
        data: {
          objectionDetected: true,
          objection,
          response,
        },
      };
    }

    if (detection.type === ObjectionType.CALL_LATER || detection.type === ObjectionType.BUSY) {
      return {
        nextState: ConversationState.FOLLOW_UP,
        action: 'SCHEDULE_CALLBACK',
        data: {
          objectionDetected: true,
          objection,
          response,
        },
      };
    }

    return {
      nextState: ConversationState.OBJECTION_HANDLING,
      action: 'HANDLE_OBJECTION',
      data: {
        objectionDetected: true,
        objection,
        response,
      },
    };
  }

  async getObjectionResponse(companyId: string, objectionType: ObjectionType): Promise<string> {
    const response = await this.prisma.objectionResponse.findFirst({
      where: {
        companyId,
        objectionType,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { successRate: 'desc' }],
    });

    if (response) {
      await this.prisma.objectionResponse.update({
        where: { id: response.id },
        data: { usageCount: response.usageCount + 1 },
      });
      return response.responseText;
    }

    return this.getDefaultObjectionResponse(objectionType);
  }

  private getDefaultObjectionResponse(objectionType: ObjectionType): string {
    const defaultResponses: Record<ObjectionType, string> = {
      [ObjectionType.TOO_EXPENSIVE]: 'I understand your concern about pricing. Let me explain the value you\'re getting and how it compares to other options.',
      [ObjectionType.NEED_TIME]: 'I completely understand you need time to think. Would it help if I sent you some information to review? When would be a good time to follow up?',
      [ObjectionType.NOT_INTERESTED]: 'I appreciate your honesty. May I ask what specifically doesn\'t interest you? Perhaps there\'s something else that might be a better fit.',
      [ObjectionType.BUSY]: 'I completely understand you\'re busy. When would be a better time for me to call you back?',
      [ObjectionType.CALL_LATER]: 'Of course! When would be the best time to reach you?',
      [ObjectionType.NEED_FAMILY_DISCUSSION]: 'That makes perfect sense. I can send you detailed information to discuss with your family. Would that be helpful?',
      [ObjectionType.NEED_DETAILS]: 'I\'d be happy to provide more details. What specific information are you looking for?',
      [ObjectionType.ALREADY_PURCHASED]: 'Thank you for letting me know. I hope you\'re enjoying your purchase. Have a great day!',
      [ObjectionType.WRONG_NUMBER]: 'I apologize for the inconvenience. Thank you for letting me know. Have a great day!',
      [ObjectionType.DO_NOT_CALL]: 'I understand and apologize for any inconvenience. I\'ll make sure your number is removed from our list immediately.',
      [ObjectionType.OTHER]: 'I understand your concern. Can you tell me more about what\'s on your mind?',
    };

    return defaultResponses[objectionType] || defaultResponses[ObjectionType.OTHER];
  }

  async getObjectionsBySession(sessionId: string) {
    return this.prisma.conversationObjection.findMany({
      where: { sessionId },
      orderBy: { detectedAt: 'asc' },
    });
  }

  async getObjectionStats(sessionId: string) {
    const objections = await this.prisma.conversationObjection.findMany({
      where: { sessionId },
    });

    const byType = objections.reduce((acc, obj) => {
      acc[obj.objectionType] = (acc[obj.objectionType] || 0) + 1;
      return acc;
    }, {} as Record<ObjectionType, number>);

    return {
      total: objections.length,
      resolved: objections.filter((o) => o.wasResolved).length,
      unresolved: objections.filter((o) => !o.wasResolved).length,
      resolutionRate: objections.length > 0 ? (objections.filter((o) => o.wasResolved).length / objections.length) * 100 : 0,
      byType,
    };
  }
}
