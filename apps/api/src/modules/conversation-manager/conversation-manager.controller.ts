import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConversationSessionService } from './services/conversation-session.service';
import { ConversationFlowService } from './services/conversation-flow.service';
import { TimelineService } from './services/timeline.service';
import { QuestionManagerService } from './services/question-manager.service';
import { ObjectionHandlerService } from './services/objection-handler.service';
import { FollowUpManagerService } from './services/followup-manager.service';
import { SummaryBuilderService } from './services/summary-builder.service';
import {
  CreateConversationSessionDto,
  UpdateConversationStateDto,
  CompleteConversationDto,
  ConversationSessionListDto,
  NextConversationStepDto,
} from './dto/conversation-session.dto';
import { CreateTimelineEventDto, TimelineQueryDto } from './dto/conversation-timeline.dto';
import { CreateQuestionDto, AnswerQuestionDto, NextQuestionDto } from './dto/conversation-question.dto';
import { CreateObjectionDto, ResolveObjectionDto } from './dto/conversation-objection.dto';
import {
  CreateFollowUpDto,
  UpdateFollowUpDto,
  CancelFollowUpDto,
} from './dto/conversation-followup.dto';
import { CreateSummaryDto, UpdateSummaryDto } from './dto/conversation-summary.dto';

@ApiTags('Conversation Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversation-manager')
export class ConversationManagerController {
  constructor(
    private readonly sessionService: ConversationSessionService,
    private readonly flowService: ConversationFlowService,
    private readonly timelineService: TimelineService,
    private readonly questionManager: QuestionManagerService,
    private readonly objectionHandler: ObjectionHandlerService,
    private readonly followUpManager: FollowUpManagerService,
    private readonly summaryBuilder: SummaryBuilderService,
  ) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new conversation session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Body() dto: CreateConversationSessionDto) {
    return this.sessionService.create(dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all conversation sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getSessions(@Query() dto: ConversationSessionListDto) {
    return this.sessionService.findAll(dto);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get conversation session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async getSession(@Param('id') id: string) {
    return this.sessionService.findById(id);
  }

  @Get('sessions/by-session-id/:sessionId')
  @ApiOperation({ summary: 'Get conversation session by session ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async getSessionBySessionId(@Param('sessionId') sessionId: string) {
    return this.sessionService.findBySessionId(sessionId);
  }

  @Put('sessions/:sessionId/state')
  @ApiOperation({ summary: 'Update conversation state' })
  @ApiResponse({ status: 200, description: 'State updated successfully' })
  async updateState(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateConversationStateDto,
  ) {
    return this.sessionService.updateState(sessionId, dto);
  }

  @Post('sessions/:sessionId/next-step')
  @ApiOperation({ summary: 'Process next conversation step' })
  @ApiResponse({ status: 200, description: 'Next step processed successfully' })
  async nextStep(
    @Param('sessionId') sessionId: string,
    @Body() dto: NextConversationStepDto,
  ) {
    return this.flowService.processNextStep(sessionId, dto.customerInput, dto.context);
  }

  @Post('sessions/:sessionId/complete')
  @ApiOperation({ summary: 'Complete conversation session' })
  @ApiResponse({ status: 200, description: 'Session completed successfully' })
  async completeSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: CompleteConversationDto,
  ) {
    return this.sessionService.complete(sessionId, dto);
  }

  @Post('sessions/:sessionId/cancel')
  @ApiOperation({ summary: 'Cancel conversation session' })
  @ApiResponse({ status: 200, description: 'Session cancelled successfully' })
  async cancelSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason: string },
  ) {
    return this.sessionService.cancel(sessionId, body.reason);
  }

  @Get('sessions/:sessionId/stats')
  @ApiOperation({ summary: 'Get conversation session statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getSessionStats(@Param('sessionId') sessionId: string) {
    const [questionStats, objectionStats, timelineStats] = await Promise.all([
      this.questionManager.getQuestionStats(sessionId),
      this.objectionHandler.getObjectionStats(sessionId),
      this.timelineService.getTimelineStats(sessionId),
    ]);

    return {
      questions: questionStats,
      objections: objectionStats,
      timeline: timelineStats,
    };
  }

  @Post('timeline')
  @ApiOperation({ summary: 'Create timeline event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async createTimelineEvent(@Body() dto: CreateTimelineEventDto) {
    return this.timelineService.createEvent(dto);
  }

  @Get('timeline/:sessionId')
  @ApiOperation({ summary: 'Get conversation timeline' })
  @ApiResponse({ status: 200, description: 'Timeline retrieved successfully' })
  async getTimeline(
    @Param('sessionId') sessionId: string,
    @Query() query: TimelineQueryDto,
  ) {
    return this.timelineService.getTimeline(sessionId, query);
  }

  @Get('timeline/:sessionId/stats')
  @ApiOperation({ summary: 'Get timeline statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getTimelineStats(@Param('sessionId') sessionId: string) {
    return this.timelineService.getTimelineStats(sessionId);
  }

  @Post('questions')
  @ApiOperation({ summary: 'Create a question' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionManager.createQuestion(dto);
  }

  @Post('questions/:id/answer')
  @ApiOperation({ summary: 'Answer a question' })
  @ApiResponse({ status: 200, description: 'Question answered successfully' })
  async answerQuestion(
    @Param('id') id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.questionManager.answerQuestion(id, dto);
  }

  @Post('questions/:id/skip')
  @ApiOperation({ summary: 'Skip a question' })
  @ApiResponse({ status: 200, description: 'Question skipped successfully' })
  async skipQuestion(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.questionManager.skipQuestion(id, body.reason);
  }

  @Post('questions/:id/repeat')
  @ApiOperation({ summary: 'Repeat a question' })
  @ApiResponse({ status: 200, description: 'Question repeated successfully' })
  async repeatQuestion(@Param('id') id: string) {
    return this.questionManager.repeatQuestion(id);
  }

  @Get('questions/session/:sessionId')
  @ApiOperation({ summary: 'Get all questions for a session' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  async getQuestions(@Param('sessionId') sessionId: string) {
    return this.questionManager.getQuestionsBySession(sessionId);
  }

  @Get('questions/session/:sessionId/next')
  @ApiOperation({ summary: 'Get next question' })
  @ApiResponse({ status: 200, description: 'Next question retrieved successfully' })
  async getNextQuestion(@Param('sessionId') sessionId: string) {
    return this.questionManager.getNextQuestion(sessionId);
  }

  @Post('questions/session/:sessionId/generate')
  @ApiOperation({ summary: 'Generate dynamic questions' })
  @ApiResponse({ status: 201, description: 'Questions generated successfully' })
  async generateQuestions(
    @Param('sessionId') sessionId: string,
    @Body() context: any,
  ) {
    return this.questionManager.generateDynamicQuestions(sessionId, context);
  }

  @Post('objections')
  @ApiOperation({ summary: 'Create an objection' })
  @ApiResponse({ status: 201, description: 'Objection created successfully' })
  async createObjection(@Body() dto: CreateObjectionDto) {
    return this.objectionHandler.createObjection(dto);
  }

  @Post('objections/:id/resolve')
  @ApiOperation({ summary: 'Resolve an objection' })
  @ApiResponse({ status: 200, description: 'Objection resolved successfully' })
  async resolveObjection(
    @Param('id') id: string,
    @Body() dto: ResolveObjectionDto,
  ) {
    return this.objectionHandler.resolveObjection(id, dto);
  }

  @Get('objections/session/:sessionId')
  @ApiOperation({ summary: 'Get all objections for a session' })
  @ApiResponse({ status: 200, description: 'Objections retrieved successfully' })
  async getObjections(@Param('sessionId') sessionId: string) {
    return this.objectionHandler.getObjectionsBySession(sessionId);
  }

  @Post('objections/detect')
  @ApiOperation({ summary: 'Detect objection from customer input' })
  @ApiResponse({ status: 200, description: 'Objection detected successfully' })
  async detectObjection(@Body() body: { customerInput: string }) {
    return this.objectionHandler.detectObjection(body.customerInput);
  }

  @Post('follow-ups')
  @ApiOperation({ summary: 'Create a follow-up' })
  @ApiResponse({ status: 201, description: 'Follow-up created successfully' })
  async createFollowUp(@Body() dto: CreateFollowUpDto) {
    return this.followUpManager.create(dto);
  }

  @Put('follow-ups/:id')
  @ApiOperation({ summary: 'Update a follow-up' })
  @ApiResponse({ status: 200, description: 'Follow-up updated successfully' })
  async updateFollowUp(
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.followUpManager.update(id, dto);
  }

  @Post('follow-ups/:id/cancel')
  @ApiOperation({ summary: 'Cancel a follow-up' })
  @ApiResponse({ status: 200, description: 'Follow-up cancelled successfully' })
  async cancelFollowUp(
    @Param('id') id: string,
    @Body() dto: CancelFollowUpDto,
  ) {
    return this.followUpManager.cancel(id, dto);
  }

  @Post('follow-ups/:id/complete')
  @ApiOperation({ summary: 'Complete a follow-up' })
  @ApiResponse({ status: 200, description: 'Follow-up completed successfully' })
  async completeFollowUp(@Param('id') id: string) {
    return this.followUpManager.complete(id);
  }

  @Get('follow-ups/:id')
  @ApiOperation({ summary: 'Get follow-up by ID' })
  @ApiResponse({ status: 200, description: 'Follow-up retrieved successfully' })
  async getFollowUp(@Param('id') id: string) {
    return this.followUpManager.findById(id);
  }

  @Get('follow-ups/session/:sessionId')
  @ApiOperation({ summary: 'Get all follow-ups for a session' })
  @ApiResponse({ status: 200, description: 'Follow-ups retrieved successfully' })
  async getFollowUpsBySession(@Param('sessionId') sessionId: string) {
    return this.followUpManager.findBySession(sessionId);
  }

  @Get('follow-ups/company/:companyId/upcoming')
  @ApiOperation({ summary: 'Get upcoming follow-ups' })
  @ApiResponse({ status: 200, description: 'Follow-ups retrieved successfully' })
  async getUpcomingFollowUps(
    @Param('companyId') companyId: string,
    @Query('days') days?: number,
  ) {
    return this.followUpManager.findUpcoming(companyId, days ? parseInt(days.toString()) : 7);
  }

  @Get('follow-ups/company/:companyId/overdue')
  @ApiOperation({ summary: 'Get overdue follow-ups' })
  @ApiResponse({ status: 200, description: 'Follow-ups retrieved successfully' })
  async getOverdueFollowUps(@Param('companyId') companyId: string) {
    return this.followUpManager.findOverdue(companyId);
  }

  @Get('follow-ups/company/:companyId/stats')
  @ApiOperation({ summary: 'Get follow-up statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getFollowUpStats(@Param('companyId') companyId: string) {
    return this.followUpManager.getFollowUpStats(companyId);
  }

  @Post('summaries')
  @ApiOperation({ summary: 'Create conversation summary' })
  @ApiResponse({ status: 201, description: 'Summary created successfully' })
  async createSummary(@Body() dto: CreateSummaryDto) {
    return this.summaryBuilder.create(dto);
  }

  @Post('summaries/:sessionId/generate')
  @ApiOperation({ summary: 'Generate automatic summary' })
  @ApiResponse({ status: 201, description: 'Summary generated successfully' })
  async generateSummary(@Param('sessionId') sessionId: string) {
    return this.summaryBuilder.generateAutoSummary(sessionId);
  }

  @Put('summaries/:sessionId')
  @ApiOperation({ summary: 'Update conversation summary' })
  @ApiResponse({ status: 200, description: 'Summary updated successfully' })
  async updateSummary(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSummaryDto,
  ) {
    return this.summaryBuilder.update(sessionId, dto);
  }

  @Get('summaries/:sessionId')
  @ApiOperation({ summary: 'Get conversation summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getSummary(@Param('sessionId') sessionId: string) {
    return this.summaryBuilder.findBySessionId(sessionId);
  }

  @Get('summaries/company/:companyId')
  @ApiOperation({ summary: 'Get all summaries for company' })
  @ApiResponse({ status: 200, description: 'Summaries retrieved successfully' })
  async getSummariesByCompany(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.summaryBuilder.findByCompany(companyId, limit ? parseInt(limit.toString()) : 20);
  }

  @Get('flow/:sessionId/suggestions')
  @ApiOperation({ summary: 'Get flow suggestions' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved successfully' })
  async getFlowSuggestions(@Param('sessionId') sessionId: string) {
    return this.flowService.getFlowSuggestions(sessionId);
  }

  @Get('flow/:sessionId/history')
  @ApiOperation({ summary: 'Get state history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getStateHistory(@Param('sessionId') sessionId: string) {
    return this.flowService.getStateHistory(sessionId);
  }
}
