import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationState } from '../dto/conversation-session.dto';
import { ConversationSessionService } from './conversation-session.service';
import { TimelineService } from './timeline.service';
import { QuestionManagerService } from './question-manager.service';
import { ObjectionHandlerService } from './objection-handler.service';
import { GreetingManagerService } from './greeting-manager.service';
import { ClosingManagerService } from './closing-manager.service';

@Injectable()
export class ConversationFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: ConversationSessionService,
    private readonly timelineService: TimelineService,
    private readonly questionManager: QuestionManagerService,
    private readonly objectionHandler: ObjectionHandlerService,
    private readonly greetingManager: GreetingManagerService,
    private readonly closingManager: ClosingManagerService,
  ) {}

  async processNextStep(sessionId: string, customerInput: string, context?: any) {
    const session = await this.sessionService.findBySessionId(sessionId);

    await this.sessionService.updateActivity(sessionId);

    const currentState = session.currentState as ConversationState;

    let nextState: ConversationState;
    let action: string;
    let data: any = {};

    switch (currentState) {
      case ConversationState.GREETING:
        nextState = ConversationState.INTRODUCTION;
        action = 'PROCEED_TO_INTRODUCTION';
        data = await this.greetingManager.processGreeting(sessionId, customerInput, context);
        break;

      case ConversationState.INTRODUCTION:
        const introResult = await this.handleIntroduction(sessionId, customerInput, context);
        nextState = introResult.nextState;
        action = introResult.action;
        data = introResult.data;
        break;

      case ConversationState.QUALIFICATION:
        const qualificationResult = await this.handleQualification(sessionId, customerInput, context);
        nextState = qualificationResult.nextState;
        action = qualificationResult.action;
        data = qualificationResult.data;
        break;

      case ConversationState.INFORMATION_COLLECTION:
        const collectionResult = await this.handleInformationCollection(sessionId, customerInput, context);
        nextState = collectionResult.nextState;
        action = collectionResult.action;
        data = collectionResult.data;
        break;

      case ConversationState.OBJECTION_HANDLING:
        const objectionResult = await this.objectionHandler.handleObjection(sessionId, customerInput, context);
        nextState = objectionResult.nextState;
        action = objectionResult.action;
        data = objectionResult.data;
        break;

      case ConversationState.KNOWLEDGE_LOOKUP:
        const knowledgeResult = await this.handleKnowledgeLookup(sessionId, customerInput, context);
        nextState = knowledgeResult.nextState;
        action = knowledgeResult.action;
        data = knowledgeResult.data;
        break;

      case ConversationState.CLOSING:
        const closingResult = await this.closingManager.processClosing(sessionId, customerInput, context);
        nextState = closingResult.nextState;
        action = closingResult.action;
        data = closingResult.data;
        break;

      default:
        nextState = currentState;
        action = 'CONTINUE';
        break;
    }

    if (nextState !== currentState) {
      await this.sessionService.updateState(sessionId, {
        newState: nextState,
        reason: `Transitioned from ${currentState} to ${nextState}`,
        triggerType: 'FLOW_CONTROL',
      });
    }

    return {
      sessionId,
      currentState: nextState,
      previousState: currentState,
      action,
      data,
    };
  }

  private async handleIntroduction(sessionId: string, customerInput: string, context: any) {
    const detectedIntent = this.detectIntent(customerInput);

    if (detectedIntent === 'NOT_INTERESTED') {
      return {
        nextState: ConversationState.OBJECTION_HANDLING,
        action: 'HANDLE_OBJECTION',
        data: { intent: detectedIntent },
      };
    }

    return {
      nextState: ConversationState.QUALIFICATION,
      action: 'START_QUALIFICATION',
      data: { intent: detectedIntent },
    };
  }

  private async handleQualification(sessionId: string, customerInput: string, context: any) {
    const nextQuestion = await this.questionManager.getNextQuestion(sessionId, context);

    if (!nextQuestion) {
      return {
        nextState: ConversationState.INFORMATION_COLLECTION,
        action: 'COMPLETE_QUALIFICATION',
        data: { allQuestionsAnswered: true },
      };
    }

    return {
      nextState: ConversationState.QUALIFICATION,
      action: 'ASK_NEXT_QUESTION',
      data: { question: nextQuestion },
    };
  }

  private async handleInformationCollection(sessionId: string, customerInput: string, context: any) {
    const needsKnowledge = this.checkKnowledgeNeeded(customerInput);

    if (needsKnowledge) {
      return {
        nextState: ConversationState.KNOWLEDGE_LOOKUP,
        action: 'SEARCH_KNOWLEDGE',
        data: { query: customerInput },
      };
    }

    return {
      nextState: ConversationState.CLOSING,
      action: 'PROCEED_TO_CLOSING',
      data: {},
    };
  }

  private async handleKnowledgeLookup(sessionId: string, customerInput: string, context: any) {
    return {
      nextState: ConversationState.INFORMATION_COLLECTION,
      action: 'RETURN_TO_COLLECTION',
      data: {},
    };
  }

  private detectIntent(input: string): string {
    const lowerInput = input.toLowerCase();

    if (
      lowerInput.includes('not interested') ||
      lowerInput.includes('no thanks') ||
      lowerInput.includes('not now')
    ) {
      return 'NOT_INTERESTED';
    }

    if (lowerInput.includes('busy') || lowerInput.includes('later')) {
      return 'BUSY';
    }

    if (lowerInput.includes('expensive') || lowerInput.includes('costly') || lowerInput.includes('price')) {
      return 'TOO_EXPENSIVE';
    }

    return 'INTERESTED';
  }

  private checkKnowledgeNeeded(input: string): boolean {
    const lowerInput = input.toLowerCase();
    const knowledgeKeywords = [
      'what is',
      'tell me about',
      'explain',
      'information about',
      'details',
      'pricing',
      'location',
      'features',
    ];

    return knowledgeKeywords.some((keyword) => lowerInput.includes(keyword));
  }

  async getFlowSuggestions(sessionId: string) {
    const session = await this.sessionService.findBySessionId(sessionId);
    const currentState = session.currentState as ConversationState;

    const suggestions: any[] = [];

    switch (currentState) {
      case ConversationState.GREETING:
        suggestions.push({
          action: 'GREET',
          description: 'Send greeting message',
          nextState: ConversationState.INTRODUCTION,
        });
        break;

      case ConversationState.INTRODUCTION:
        suggestions.push(
          {
            action: 'INTRODUCE',
            description: 'Introduce purpose',
            nextState: ConversationState.QUALIFICATION,
          },
          {
            action: 'HANDLE_OBJECTION',
            description: 'Handle objection if raised',
            nextState: ConversationState.OBJECTION_HANDLING,
          },
        );
        break;

      case ConversationState.QUALIFICATION:
        suggestions.push(
          {
            action: 'ASK_QUESTION',
            description: 'Ask next qualification question',
            nextState: ConversationState.QUALIFICATION,
          },
          {
            action: 'COLLECT_INFO',
            description: 'Move to information collection',
            nextState: ConversationState.INFORMATION_COLLECTION,
          },
        );
        break;

      case ConversationState.INFORMATION_COLLECTION:
        suggestions.push(
          {
            action: 'SEARCH_KNOWLEDGE',
            description: 'Search knowledge base',
            nextState: ConversationState.KNOWLEDGE_LOOKUP,
          },
          {
            action: 'PROCEED_CLOSING',
            description: 'Proceed to closing',
            nextState: ConversationState.CLOSING,
          },
        );
        break;

      case ConversationState.CLOSING:
        suggestions.push({
          action: 'COMPLETE',
          description: 'Complete conversation',
          nextState: ConversationState.COMPLETED,
        });
        break;
    }

    return suggestions;
  }

  async getStateHistory(sessionId: string) {
    const session = await this.sessionService.findBySessionId(sessionId);

    return this.prisma.conversationStateTransition.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });
  }
}
