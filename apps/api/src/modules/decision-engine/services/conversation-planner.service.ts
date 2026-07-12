import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationActionType, IntentType } from '@prisma/client';
import { PlanConversationDto, ConversationPlanDto, ResponsePlanDto } from '../dto/conversation-planner.dto';
import { getErrorMessage, getErrorStack } from '../utils/error-handler';

@Injectable()
export class ConversationPlannerService {
  private readonly logger = new Logger(ConversationPlannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async planConversation(
    companyId: string,
    dto: PlanConversationDto,
  ): Promise<ConversationPlanDto> {
    const startTime = Date.now();

    try {
      const reasoningSteps: Array<{ step: number; description: string; outcome: string }> = [];

      reasoningSteps.push({
        step: 1,
        description: 'Analyze detected intent',
        outcome: `Intent: ${dto.intent}`,
      });

      const action = this.determineAction(dto.intent, dto.entities, dto.conversationMemory);

      reasoningSteps.push({
        step: 2,
        description: 'Determine conversation action',
        outcome: `Action: ${action}`,
      });

      const actionParameters = this.generateActionParameters(
        action,
        dto.intent,
        dto.entities,
        dto.conversationMemory,
        dto.knowledgeResults,
      );

      reasoningSteps.push({
        step: 3,
        description: 'Generate action parameters',
        outcome: `Parameters generated for ${action}`,
      });

      const { shouldContinue, shouldEndConversation, escalationRequired } =
        this.evaluateConversationFlow(action, dto.intent, dto.conversationMemory);

      reasoningSteps.push({
        step: 4,
        description: 'Evaluate conversation flow',
        outcome: `Continue: ${shouldContinue}, End: ${shouldEndConversation}`,
      });

      const { currentNodeId, nextNodeId } = this.determineScriptNodes(
        dto.currentNodeId,
        action,
        dto.intent,
      );

      const alternativeActions = this.generateAlternativeActions(
        action,
        dto.intent,
        dto.conversationMemory,
      );

      this.logger.log(
        `Conversation planned: ${action} in ${Date.now() - startTime}ms`,
      );

      return {
        action,
        actionParameters,
        shouldContinue,
        shouldEndConversation,
        escalationRequired,
        currentNodeId,
        nextNodeId,
        reasoningSteps,
        alternativeActions,
        metadata: {
          planningTime: Date.now() - startTime,
          intent: dto.intent,
          entityCount: Object.keys(dto.entities || {}).length,
        },
      };
    } catch (error) {
      this.logger.error(`Error planning conversation: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  private determineAction(
    intent: IntentType,
    entities: Record<string, any>,
    memory?: Record<string, any>,
  ): ConversationActionType {
    switch (intent) {
      case IntentType.GREETING:
        return ConversationActionType.CONTINUE_SCRIPT;

      case IntentType.INTERESTED:
        if (!entities.budget) {
          return ConversationActionType.ASK_NEXT_QUESTION;
        }
        return ConversationActionType.CONTINUE_SCRIPT;

      case IntentType.NEED_PRICING:
      case IntentType.NEED_LOCATION:
      case IntentType.NEED_DETAILS:
        return ConversationActionType.SEARCH_KNOWLEDGE;

      case IntentType.NOT_INTERESTED:
      case IntentType.WRONG_NUMBER:
        return ConversationActionType.END_CONVERSATION;

      case IntentType.CALL_BACK_LATER:
      case IntentType.BUSY:
        return ConversationActionType.SCHEDULE_FOLLOW_UP;

      case IntentType.NEED_HUMAN:
        return ConversationActionType.TRANSFER_TO_HUMAN;

      case IntentType.GOODBYE:
        return ConversationActionType.END_CONVERSATION;

      case IntentType.OTHER:
        return ConversationActionType.CLARIFY;

      default:
        return ConversationActionType.CONTINUE_SCRIPT;
    }
  }

  private generateActionParameters(
    action: ConversationActionType,
    intent: IntentType,
    entities: Record<string, any>,
    memory?: Record<string, any>,
    knowledgeResults?: Record<string, any>,
  ): any {
    const parameters: any = {};

    switch (action) {
      case ConversationActionType.ASK_NEXT_QUESTION:
        parameters.question = this.generateNextQuestion(entities, memory);
        break;

      case ConversationActionType.SEARCH_KNOWLEDGE:
        parameters.searchQuery = this.generateSearchQuery(intent, entities);
        break;

      case ConversationActionType.REPEAT_QUESTION:
        parameters.question = memory?.lastQuestion || 'Could you please repeat that?';
        break;

      case ConversationActionType.CLARIFY:
        parameters.clarification = this.generateClarification(intent, entities);
        break;

      case ConversationActionType.CONTINUE_SCRIPT:
        parameters.nodeId = this.getNextScriptNode(memory?.currentNodeId);
        break;

      case ConversationActionType.SCHEDULE_FOLLOW_UP:
        parameters.followUpDate = this.calculateFollowUpDate(intent);
        break;

      case ConversationActionType.TRANSFER_TO_HUMAN:
        parameters.transferReason = 'Customer requested human agent';
        break;
    }

    return parameters;
  }

  private generateNextQuestion(
    entities: Record<string, any>,
    memory?: Record<string, any>,
  ): string {
    if (!entities.budget) {
      return 'budget';
    }
    if (!entities.city && !entities.location) {
      return 'location';
    }
    if (!entities.timeline) {
      return 'timeline';
    }
    if (!entities.propertyType) {
      return 'property_type';
    }
    return 'additional_requirements';
  }

  private generateSearchQuery(intent: IntentType, entities: Record<string, any>): string {
    switch (intent) {
      case IntentType.NEED_PRICING:
        return `pricing ${entities.propertyType || ''} ${entities.location || ''}`.trim();

      case IntentType.NEED_LOCATION:
        return `location ${entities.propertyType || ''} ${entities.city || ''}`.trim();

      case IntentType.NEED_DETAILS:
        return `details ${entities.propertyType || ''} ${entities.projectName || ''}`.trim();

      default:
        return 'general information';
    }
  }

  private generateClarification(intent: IntentType, entities: Record<string, any>): string {
    return `clarify_${intent.toLowerCase()}`;
  }

  private getNextScriptNode(currentNodeId?: string): string {
    if (!currentNodeId) return 'greeting';

    const nodeSequence: Record<string, string> = {
      greeting: 'qualification',
      qualification: 'budget_collection',
      budget_collection: 'location_collection',
      location_collection: 'project_suggestion',
      project_suggestion: 'closing',
      closing: 'goodbye',
    };

    return nodeSequence[currentNodeId] || 'closing';
  }

  private calculateFollowUpDate(intent: IntentType): Date {
    const now = new Date();

    if (intent === IntentType.BUSY) {
      return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    }

    if (intent === IntentType.CALL_BACK_LATER) {
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private evaluateConversationFlow(
    action: ConversationActionType,
    intent: IntentType,
    memory?: Record<string, any>,
  ): {
    shouldContinue: boolean;
    shouldEndConversation: boolean;
    escalationRequired: boolean;
  } {
    const shouldEndConversation = action === ConversationActionType.END_CONVERSATION;
    const escalationRequired = action === ConversationActionType.TRANSFER_TO_HUMAN;
    const shouldContinue = !shouldEndConversation && !escalationRequired;

    return {
      shouldContinue,
      shouldEndConversation,
      escalationRequired,
    };
  }

  private determineScriptNodes(
    currentNodeId?: string,
    action?: ConversationActionType,
    intent?: IntentType,
  ): { currentNodeId?: string; nextNodeId?: string } {
    if (!currentNodeId) {
      return { currentNodeId: 'greeting', nextNodeId: 'qualification' };
    }

    if (action === ConversationActionType.CONTINUE_SCRIPT) {
      return {
        currentNodeId,
        nextNodeId: this.getNextScriptNode(currentNodeId),
      };
    }

    return { currentNodeId };
  }

  private generateAlternativeActions(
    primaryAction: ConversationActionType,
    intent: IntentType,
    memory?: Record<string, any>,
  ): Array<{ action: ConversationActionType; priority: number; reason: string }> {
    const alternatives: Array<{ action: ConversationActionType; priority: number; reason: string }> = [];

    if (primaryAction !== ConversationActionType.CLARIFY) {
      alternatives.push({
        action: ConversationActionType.CLARIFY,
        priority: 2,
        reason: 'If primary action fails, seek clarification',
      });
    }

    if (primaryAction !== ConversationActionType.REPEAT_QUESTION) {
      alternatives.push({
        action: ConversationActionType.REPEAT_QUESTION,
        priority: 3,
        reason: 'If customer did not understand',
      });
    }

    if (primaryAction !== ConversationActionType.CONTINUE_SCRIPT) {
      alternatives.push({
        action: ConversationActionType.CONTINUE_SCRIPT,
        priority: 4,
        reason: 'Fallback to script flow',
      });
    }

    return alternatives;
  }

  async createResponsePlan(
    decisionResult: any,
    conversationPlan: ConversationPlanDto,
    knowledgeContext?: any,
  ): Promise<ResponsePlanDto> {
    const reason = this.generateDecisionReason(decisionResult, conversationPlan);
    const decision = this.generateDecisionSummary(conversationPlan);

    const responsePlan: ResponsePlanDto = {
      reason,
      decision,
      scriptNode: conversationPlan.nextNodeId,
      knowledgeContext: knowledgeContext
        ? {
            sources: knowledgeContext.sources || [],
            relevance: knowledgeContext.relevance || 0,
            content: knowledgeContext.content || '',
          }
        : undefined,
      requiredVariables: this.extractRequiredVariables(conversationPlan),
      nextAction: conversationPlan.action,
      actionPriority: 1,
      instructions: this.generateInstructions(conversationPlan),
      metadata: {
        generatedAt: new Date().toISOString(),
        planType: 'structured-decision',
      },
    };

    return responsePlan;
  }

  private generateDecisionReason(decisionResult: any, plan: ConversationPlanDto): string {
    const reasons: string[] = [];

    reasons.push(`Detected intent: ${decisionResult.intent}`);
    reasons.push(`Confidence: ${(decisionResult.confidence * 100).toFixed(1)}%`);
    reasons.push(`Recommended action: ${plan.action}`);

    if (plan.shouldEndConversation) {
      reasons.push('Conversation should end');
    }

    if (plan.escalationRequired) {
      reasons.push('Escalation required');
    }

    return reasons.join('. ');
  }

  private generateDecisionSummary(plan: ConversationPlanDto): string {
    const action = plan.action.replace(/_/g, ' ').toLowerCase();
    return `Proceed with ${action}`;
  }

  private extractRequiredVariables(plan: ConversationPlanDto): Record<string, any> {
    const variables: Record<string, any> = {
      action: plan.action,
      currentNode: plan.currentNodeId,
      nextNode: plan.nextNodeId,
    };

    if (plan.actionParameters) {
      Object.assign(variables, plan.actionParameters);
    }

    return variables;
  }

  private generateInstructions(plan: ConversationPlanDto): string[] {
    const instructions: string[] = [];

    switch (plan.action) {
      case ConversationActionType.ASK_NEXT_QUESTION:
        instructions.push('Ask the next question in sequence');
        instructions.push('Wait for customer response');
        break;

      case ConversationActionType.SEARCH_KNOWLEDGE:
        instructions.push('Search knowledge base with query');
        instructions.push('Present relevant information');
        break;

      case ConversationActionType.END_CONVERSATION:
        instructions.push('End conversation gracefully');
        instructions.push('Update conversation status');
        break;

      case ConversationActionType.SCHEDULE_FOLLOW_UP:
        instructions.push('Schedule follow-up call');
        instructions.push('Confirm with customer');
        break;

      case ConversationActionType.TRANSFER_TO_HUMAN:
        instructions.push('Prepare transfer to human agent');
        instructions.push('Provide context summary');
        break;

      default:
        instructions.push('Continue with conversation flow');
    }

    return instructions;
  }
}
