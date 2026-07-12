import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateQuestionDto, AnswerQuestionDto, QuestionType } from '../dto/conversation-question.dto';
import { ConversationState } from '../dto/conversation-session.dto';

@Injectable()
export class QuestionManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(dto: CreateQuestionDto) {
    return this.prisma.conversationQuestion.create({
      data: {
        sessionId: dto.sessionId,
        companyId: dto.companyId,
        questionId: dto.questionId,
        questionText: dto.questionText,
        questionType: dto.questionType,
        category: dto.category,
        conversationState: dto.conversationState,
        order: dto.order || 0,
        isRequired: dto.isRequired || false,
        wasAsked: true,
        metadata: dto.metadata,
      },
    });
  }

  async answerQuestion(questionId: string, dto: AnswerQuestionDto) {
    const question = await this.prisma.conversationQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.conversationQuestion.update({
      where: { id: questionId },
      data: {
        wasAnswered: true,
        customerAnswer: dto.customerAnswer,
        extractedValue: dto.extractedValue,
        confidenceScore: dto.confidenceScore,
        answeredAt: new Date(),
        metadata: {
          ...(question.metadata as object || {}),
          ...(dto.metadata as object || {}),
        },
      },
    });
  }

  async skipQuestion(questionId: string, reason: string) {
    return this.prisma.conversationQuestion.update({
      where: { id: questionId },
      data: {
        wasSkipped: true,
        metadata: {
          skipReason: reason,
        },
      },
    });
  }

  async getNextQuestion(sessionId: string, context?: any) {
    const questions = await this.prisma.conversationQuestion.findMany({
      where: {
        sessionId,
        wasAnswered: false,
        wasSkipped: false,
      },
      orderBy: { order: 'asc' },
    });

    return questions.length > 0 ? questions[0] : null;
  }

  async getQuestionsBySession(sessionId: string) {
    return this.prisma.conversationQuestion.findMany({
      where: { sessionId },
      orderBy: { askedAt: 'asc' },
    });
  }

  async getQuestionStats(sessionId: string) {
    const questions = await this.prisma.conversationQuestion.findMany({
      where: { sessionId },
    });

    return {
      total: questions.length,
      asked: questions.filter((q) => q.wasAsked).length,
      answered: questions.filter((q) => q.wasAnswered).length,
      skipped: questions.filter((q) => q.wasSkipped).length,
      required: questions.filter((q) => q.isRequired).length,
      requiredAnswered: questions.filter((q) => q.isRequired && q.wasAnswered).length,
      answerRate: questions.length > 0 ? (questions.filter((q) => q.wasAnswered).length / questions.length) * 100 : 0,
    };
  }

  async repeatQuestion(questionId: string) {
    const question = await this.prisma.conversationQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.conversationQuestion.update({
      where: { id: questionId },
      data: {
        attemptCount: question.attemptCount + 1,
        askedAt: new Date(),
      },
    });
  }

  async getPreviousQuestion(sessionId: string, currentQuestionId: string) {
    const questions = await this.prisma.conversationQuestion.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);

    if (currentIndex > 0) {
      return questions[currentIndex - 1];
    }

    return null;
  }

  async generateDynamicQuestions(sessionId: string, context: any) {
    const baseQuestions = [
      {
        questionId: 'q_name',
        questionText: 'May I know your name?',
        questionType: QuestionType.NAME,
        conversationState: ConversationState.QUALIFICATION,
        order: 1,
        isRequired: true,
      },
      {
        questionId: 'q_city',
        questionText: 'Which city are you looking for a property in?',
        questionType: QuestionType.CITY,
        conversationState: ConversationState.QUALIFICATION,
        order: 2,
        isRequired: true,
      },
      {
        questionId: 'q_budget',
        questionText: 'What is your budget range?',
        questionType: QuestionType.BUDGET,
        conversationState: ConversationState.QUALIFICATION,
        order: 3,
        isRequired: true,
      },
      {
        questionId: 'q_property_type',
        questionText: 'What type of property are you interested in?',
        questionType: QuestionType.PROPERTY_TYPE,
        conversationState: ConversationState.QUALIFICATION,
        order: 4,
        isRequired: false,
      },
    ];

    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const questions = [];

    for (const q of baseQuestions) {
      const created = await this.createQuestion({
        sessionId,
        companyId: session.companyId,
        questionId: q.questionId,
        questionText: q.questionText,
        questionType: q.questionType,
        conversationState: q.conversationState,
        order: q.order,
        isRequired: q.isRequired,
      });
      questions.push(created);
    }

    return questions;
  }
}
