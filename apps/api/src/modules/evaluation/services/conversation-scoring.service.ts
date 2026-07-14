import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ScoringResult {
  greetingScore: number;
  conversationFlowScore: number;
  questionQualityScore: number;
  answerRelevanceScore: number;
  closingQualityScore: number;
  customerExperienceScore: number;
  overallScore: number;
  issues: any[];
  strengths: any[];
  weaknesses: any[];
}

@Injectable()
export class ConversationScoringService {
  private readonly logger = new Logger(ConversationScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async scoreConversation(
    conversationId: string,
    sessionId: string,
    companyId: string,
  ): Promise<ScoringResult> {
    this.logger.log(
      `Scoring conversation: ${conversationId} for session: ${sessionId}`,
    );

    const session = await this.prisma.conversationSession.findUnique({
      where: { sessionId },
      include: {
        timeline: true,
        questions: true,
        stateTransitions: true,
        summary: true,
        metrics: true,
      },
    });

    if (!session) {
      throw new Error('Conversation session not found');
    }

    const greetingScore = this.evaluateGreeting(session);
    const conversationFlowScore = this.evaluateConversationFlow(session);
    const questionQualityScore = this.evaluateQuestionQuality(session);
    const answerRelevanceScore = this.evaluateAnswerRelevance(session);
    const closingQualityScore = this.evaluateClosing(session);
    const customerExperienceScore = this.evaluateCustomerExperience(session);

    const overallScore =
      (greetingScore +
        conversationFlowScore +
        questionQualityScore +
        answerRelevanceScore +
        closingQualityScore +
        customerExperienceScore) /
      6;

    const issues = this.identifyIssues(session, {
      greetingScore,
      conversationFlowScore,
      questionQualityScore,
      answerRelevanceScore,
      closingQualityScore,
      customerExperienceScore,
    });

    const strengths = this.identifyStrengths({
      greetingScore,
      conversationFlowScore,
      questionQualityScore,
      answerRelevanceScore,
      closingQualityScore,
      customerExperienceScore,
    });

    const weaknesses = this.identifyWeaknesses({
      greetingScore,
      conversationFlowScore,
      questionQualityScore,
      answerRelevanceScore,
      closingQualityScore,
      customerExperienceScore,
    });

    return {
      greetingScore,
      conversationFlowScore,
      questionQualityScore,
      answerRelevanceScore,
      closingQualityScore,
      customerExperienceScore,
      overallScore,
      issues,
      strengths,
      weaknesses,
    };
  }

  private evaluateGreeting(session: any): number {
    let score = 100;

    const greetingEvents = session.timeline.filter(
      (event: any) => event.eventType === 'GREETING',
    );

    if (greetingEvents.length === 0) {
      score -= 50;
    }

    const firstEvent = session.timeline[0];
    if (firstEvent && firstEvent.eventType !== 'GREETING') {
      score -= 20;
    }

    if (session.startedAt) {
      const greetingDuration = session.timeline
        .filter((e: any) => e.eventType === 'GREETING')
        .reduce((sum: number, e: any) => sum + (e.duration || 0), 0);

      if (greetingDuration > 60000) {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private evaluateConversationFlow(session: any): number {
    let score = 100;

    if (!session.stateTransitions || session.stateTransitions.length === 0) {
      return 50;
    }

    const expectedStates = [
      'GREETING',
      'QUALIFICATION',
      'INFORMATION_COLLECTION',
      'CLOSING',
    ];
    const actualStates = session.stateTransitions.map((t: any) => t.toState);

    const statesCovered = expectedStates.filter((state) =>
      actualStates.includes(state),
    ).length;
    const coverageScore = (statesCovered / expectedStates.length) * 100;

    const backwardTransitions = session.stateTransitions.filter(
      (t: any, index: number) => {
        if (index === 0) return false;
        const fromStateIndex = expectedStates.indexOf(t.fromState);
        const toStateIndex = expectedStates.indexOf(t.toState);
        return toStateIndex < fromStateIndex;
      },
    ).length;

    const transitionPenalty = backwardTransitions * 10;

    score = coverageScore - transitionPenalty;

    return Math.max(0, Math.min(100, score));
  }

  private evaluateQuestionQuality(session: any): number {
    if (!session.questions || session.questions.length === 0) {
      return 50;
    }

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.questions.filter(
      (q: any) => q.wasAnswered,
    ).length;
    const skippedQuestions = session.questions.filter(
      (q: any) => q.wasSkipped,
    ).length;
    const requiredQuestions = session.questions.filter(
      (q: any) => q.isRequired,
    );
    const unansweredRequired = requiredQuestions.filter(
      (q: any) => !q.wasAnswered,
    ).length;

    const answerRate = (answeredQuestions / totalQuestions) * 100;
    const skipPenalty = (skippedQuestions / totalQuestions) * 20;
    const requiredPenalty = unansweredRequired * 15;

    const avgAttempts =
      session.questions.reduce((sum: number, q: any) => sum + q.attemptCount, 0) /
      totalQuestions;
    const attemptPenalty = avgAttempts > 2 ? (avgAttempts - 1) * 5 : 0;

    const score = answerRate - skipPenalty - requiredPenalty - attemptPenalty;

    return Math.max(0, Math.min(100, score));
  }

  private evaluateAnswerRelevance(session: any): number {
    let score = 100;

    const answeredQuestions = session.questions?.filter(
      (q: any) => q.wasAnswered && q.confidenceScore !== null,
    );

    if (!answeredQuestions || answeredQuestions.length === 0) {
      return 60;
    }

    const avgConfidence =
      answeredQuestions.reduce(
        (sum: number, q: any) => sum + (q.confidenceScore || 0),
        0,
      ) / answeredQuestions.length;

    const confidenceScore = avgConfidence * 100;

    const timelineEvents = session.timeline?.filter(
      (e: any) => e.eventType === 'ANSWER_RECEIVED',
    );

    const lowConfidenceCount = answeredQuestions.filter(
      (q: any) => (q.confidenceScore || 0) < 0.5,
    ).length;

    const lowConfidencePenalty = (lowConfidenceCount / answeredQuestions.length) * 30;

    score = confidenceScore - lowConfidencePenalty;

    return Math.max(0, Math.min(100, score));
  }

  private evaluateClosing(session: any): number {
    let score = 100;

    const closingEvents = session.timeline?.filter(
      (e: any) => e.conversationState === 'CLOSING',
    );

    if (!closingEvents || closingEvents.length === 0) {
      score -= 40;
    }

    if (
      session.conversationResult === 'HUNG_UP' ||
      session.conversationResult === 'FAILED'
    ) {
      score -= 30;
    }

    if (session.conversationResult === 'COMPLETED') {
      score += 0;
    }

    if (session.summary?.followUpRequired && !session.followUps?.length) {
      score -= 15;
    }

    if (session.endedAt) {
      const lastEvent = session.timeline[session.timeline.length - 1];
      if (lastEvent && lastEvent.conversationState !== 'CLOSING') {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private evaluateCustomerExperience(session: any): number {
    let score = 100;

    if (session.metrics) {
      const metrics = session.metrics;

      if (metrics.averageResponseTime && metrics.averageResponseTime > 5000) {
        score -= 20;
      }

      if (metrics.completionRate && metrics.completionRate < 0.7) {
        score -= 15;
      }

      const objectionRate =
        metrics.totalObjections / Math.max(1, metrics.totalQuestions);
      if (objectionRate > 0.3) {
        score -= 15;
      }
    }

    const errorEvents = session.timeline?.filter(
      (e: any) => e.eventType === 'ERROR_OCCURRED',
    );
    if (errorEvents && errorEvents.length > 0) {
      score -= errorEvents.length * 10;
    }

    if (session.summary?.customerSentiment === 'NEGATIVE') {
      score -= 25;
    } else if (session.summary?.customerSentiment === 'POSITIVE') {
      score += 0;
    }

    return Math.max(0, Math.min(100, score));
  }

  private identifyIssues(session: any, scores: any): any[] {
    const issues = [];

    if (scores.greetingScore < 70) {
      issues.push({
        type: 'GREETING',
        severity: 'MEDIUM',
        message: 'Greeting was incomplete or missing',
        score: scores.greetingScore,
      });
    }

    if (scores.conversationFlowScore < 70) {
      issues.push({
        type: 'CONVERSATION_FLOW',
        severity: 'HIGH',
        message: 'Conversation flow was not optimal',
        score: scores.conversationFlowScore,
      });
    }

    if (scores.questionQualityScore < 70) {
      issues.push({
        type: 'QUESTION_QUALITY',
        severity: 'HIGH',
        message: 'Question handling needs improvement',
        score: scores.questionQualityScore,
      });
    }

    if (scores.answerRelevanceScore < 70) {
      issues.push({
        type: 'ANSWER_RELEVANCE',
        severity: 'HIGH',
        message: 'Answer relevance and confidence is low',
        score: scores.answerRelevanceScore,
      });
    }

    if (scores.closingQualityScore < 70) {
      issues.push({
        type: 'CLOSING',
        severity: 'MEDIUM',
        message: 'Closing was incomplete or abrupt',
        score: scores.closingQualityScore,
      });
    }

    if (scores.customerExperienceScore < 70) {
      issues.push({
        type: 'CUSTOMER_EXPERIENCE',
        severity: 'HIGH',
        message: 'Customer experience needs improvement',
        score: scores.customerExperienceScore,
      });
    }

    return issues;
  }

  private identifyStrengths(scores: any): any[] {
    const strengths = [];

    if (scores.greetingScore >= 90) {
      strengths.push({
        type: 'GREETING',
        message: 'Excellent greeting execution',
        score: scores.greetingScore,
      });
    }

    if (scores.conversationFlowScore >= 90) {
      strengths.push({
        type: 'CONVERSATION_FLOW',
        message: 'Smooth conversation flow',
        score: scores.conversationFlowScore,
      });
    }

    if (scores.questionQualityScore >= 90) {
      strengths.push({
        type: 'QUESTION_QUALITY',
        message: 'High quality question handling',
        score: scores.questionQualityScore,
      });
    }

    if (scores.answerRelevanceScore >= 90) {
      strengths.push({
        type: 'ANSWER_RELEVANCE',
        message: 'Highly relevant and confident answers',
        score: scores.answerRelevanceScore,
      });
    }

    if (scores.closingQualityScore >= 90) {
      strengths.push({
        type: 'CLOSING',
        message: 'Professional and complete closing',
        score: scores.closingQualityScore,
      });
    }

    if (scores.customerExperienceScore >= 90) {
      strengths.push({
        type: 'CUSTOMER_EXPERIENCE',
        message: 'Outstanding customer experience',
        score: scores.customerExperienceScore,
      });
    }

    return strengths;
  }

  private identifyWeaknesses(scores: any): any[] {
    const weaknesses = [];

    const scoreEntries = [
      { name: 'GREETING', score: scores.greetingScore },
      { name: 'CONVERSATION_FLOW', score: scores.conversationFlowScore },
      { name: 'QUESTION_QUALITY', score: scores.questionQualityScore },
      { name: 'ANSWER_RELEVANCE', score: scores.answerRelevanceScore },
      { name: 'CLOSING', score: scores.closingQualityScore },
      { name: 'CUSTOMER_EXPERIENCE', score: scores.customerExperienceScore },
    ];

    const sorted = scoreEntries.sort((a, b) => a.score - b.score);

    const bottom3 = sorted.slice(0, 3).filter((s) => s.score < 80);

    bottom3.forEach((item) => {
      weaknesses.push({
        type: item.name,
        message: `${item.name.replace(/_/g, ' ')} needs improvement`,
        score: item.score,
      });
    });

    return weaknesses;
  }
}
