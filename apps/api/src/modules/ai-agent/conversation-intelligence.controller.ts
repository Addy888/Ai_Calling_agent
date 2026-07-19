import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConversationIntelligenceService } from './services/conversation-intelligence.service';
import { ConversationAnalyticsService } from './services/conversation-analytics.service';
import { KnowledgeBuilderService } from './services/knowledge-builder.service';
import {
  AnalyzeConversationDto,
  ConversationQueryDto,
  IntentQueryDto,
  ObjectionQueryDto,
  CreateKnowledgeItemDto,
  UpdateKnowledgeItemDto,
  KnowledgeQueryDto,
  QuestionLibraryQueryDto,
  AnalyticsPeriodDto,
} from './dto/conversation-intelligence.dto';

@ApiTags('Conversation Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/conversation-intelligence')
export class ConversationIntelligenceController {
  constructor(
    private readonly intelligenceService: ConversationIntelligenceService,
    private readonly analyticsService: ConversationAnalyticsService,
    private readonly knowledgeService: KnowledgeBuilderService,
  ) {}

  // ============================================
  // ANALYSIS ENDPOINTS
  // ============================================

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze a conversation' })
  @ApiResponse({ status: 201, description: 'Conversation analyzed successfully' })
  async analyzeConversation(@Req() req: any, @Body() dto: AnalyzeConversationDto) {
    const companyId = req.user.companyId;
    return this.intelligenceService.analyzeConversation(companyId, dto);
  }

  @Get('analysis')
  @ApiOperation({ summary: 'List all conversation analyses' })
  @ApiResponse({ status: 200, description: 'Analyses retrieved successfully' })
  async listAnalyses(@Req() req: any, @Query() query: ConversationQueryDto) {
    const companyId = req.user.companyId;
    return this.intelligenceService.listAnalyses(companyId, query);
  }

  @Get('analysis/:id')
  @ApiOperation({ summary: 'Get analysis by ID' })
  @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
  async getAnalysis(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.intelligenceService.getAnalysis(companyId, id);
  }

  @Get('analysis/dataset/:datasetId')
  @ApiOperation({ summary: 'Get analysis by dataset record ID' })
  @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
  async getAnalysisByDataset(@Req() req: any, @Param('datasetId') datasetId: string) {
    const companyId = req.user.companyId;
    return this.intelligenceService.getAnalysisByDataset(companyId, datasetId);
  }

  @Delete('analysis/:id')
  @ApiOperation({ summary: 'Delete analysis' })
  @ApiResponse({ status: 200, description: 'Analysis deleted successfully' })
  async deleteAnalysis(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.intelligenceService.deleteAnalysis(companyId, id);
  }

  // ============================================
  // DASHBOARD & ANALYTICS
  // ============================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboard(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getDashboardStats(companyId);
  }

  @Get('analytics/intent-distribution')
  @ApiOperation({ summary: 'Get intent distribution' })
  @ApiResponse({ status: 200, description: 'Intent distribution retrieved successfully' })
  async getIntentDistribution(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getIntentDistribution(companyId);
  }

  @Get('analytics/objection-distribution')
  @ApiOperation({ summary: 'Get objection distribution' })
  @ApiResponse({ status: 200, description: 'Objection distribution retrieved successfully' })
  async getObjectionDistribution(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getObjectionDistribution(companyId);
  }

  @Get('analytics/lead-distribution')
  @ApiOperation({ summary: 'Get lead distribution' })
  @ApiResponse({ status: 200, description: 'Lead distribution retrieved successfully' })
  async getLeadDistribution(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getLeadDistribution(companyId);
  }

  @Get('analytics/trends')
  @ApiOperation({ summary: 'Get conversation trends' })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  async getConversationTrends(@Req() req: any, @Query() query: AnalyticsPeriodDto) {
    const companyId = req.user.companyId;
    return this.analyticsService.getConversationTrends(companyId, query);
  }

  @Get('analytics/success-rate')
  @ApiOperation({ summary: 'Get success rate' })
  @ApiResponse({ status: 200, description: 'Success rate retrieved successfully' })
  async getSuccessRate(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getSuccessRate(companyId);
  }

  @Get('analytics/quality-distribution')
  @ApiOperation({ summary: 'Get quality score distribution' })
  @ApiResponse({ status: 200, description: 'Quality distribution retrieved successfully' })
  async getQualityDistribution(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getQualityDistribution(companyId);
  }

  @Get('analytics/emotion-distribution')
  @ApiOperation({ summary: 'Get emotion distribution' })
  @ApiResponse({ status: 200, description: 'Emotion distribution retrieved successfully' })
  async getEmotionDistribution(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getEmotionDistribution(companyId);
  }

  // ============================================
  // BEST RESPONSES
  // ============================================

  @Get('responses/best-greeting')
  @ApiOperation({ summary: 'Get best greeting responses' })
  @ApiResponse({ status: 200, description: 'Best greetings retrieved successfully' })
  async getBestGreetings(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getBestResponses(companyId, 'GREETING');
  }

  @Get('responses/best-objection-handling')
  @ApiOperation({ summary: 'Get best objection handling responses' })
  @ApiResponse({ status: 200, description: 'Best objection handling retrieved successfully' })
  async getBestObjectionHandling(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getBestResponses(companyId, 'OBJECTION_HANDLING');
  }

  @Get('responses/best-closing')
  @ApiOperation({ summary: 'Get best closing responses' })
  @ApiResponse({ status: 200, description: 'Best closings retrieved successfully' })
  async getBestClosings(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getBestResponses(companyId, 'CLOSING');
  }

  @Get('responses/best-introduction')
  @ApiOperation({ summary: 'Get best introduction responses' })
  @ApiResponse({ status: 200, description: 'Best introductions retrieved successfully' })
  async getBestIntroductions(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getBestResponses(companyId, 'INTRODUCTION');
  }

  @Get('responses/best-follow-up')
  @ApiOperation({ summary: 'Get best follow-up responses' })
  @ApiResponse({ status: 200, description: 'Best follow-ups retrieved successfully' })
  async getBestFollowUps(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.analyticsService.getBestResponses(companyId, 'FOLLOW_UP');
  }

  // ============================================
  // KNOWLEDGE BASE
  // ============================================

  @Post('knowledge')
  @ApiOperation({ summary: 'Create knowledge item' })
  @ApiResponse({ status: 201, description: 'Knowledge item created successfully' })
  async createKnowledgeItem(@Req() req: any, @Body() dto: CreateKnowledgeItemDto) {
    const companyId = req.user.companyId;
    return this.knowledgeService.createKnowledgeItem(companyId, dto, req.user.email);
  }

  @Get('knowledge')
  @ApiOperation({ summary: 'List knowledge items' })
  @ApiResponse({ status: 200, description: 'Knowledge items retrieved successfully' })
  async listKnowledgeItems(@Req() req: any, @Query() query: KnowledgeQueryDto) {
    const companyId = req.user.companyId;
    return this.knowledgeService.listKnowledgeItems(companyId, query);
  }

  @Get('knowledge/search')
  @ApiOperation({ summary: 'Search knowledge base' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchKnowledge(@Req() req: any, @Query('q') query: string, @Query('limit') limit?: number) {
    const companyId = req.user.companyId;
    return this.knowledgeService.searchKnowledge(companyId, query, limit);
  }

  @Get('knowledge/stats')
  @ApiOperation({ summary: 'Get knowledge statistics' })
  @ApiResponse({ status: 200, description: 'Knowledge stats retrieved successfully' })
  async getKnowledgeStats(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.knowledgeService.getKnowledgeStats(companyId);
  }

  @Get('knowledge/:id')
  @ApiOperation({ summary: 'Get knowledge item by ID' })
  @ApiResponse({ status: 200, description: 'Knowledge item retrieved successfully' })
  async getKnowledgeItem(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.knowledgeService.getKnowledgeItem(companyId, id);
  }

  @Put('knowledge/:id')
  @ApiOperation({ summary: 'Update knowledge item' })
  @ApiResponse({ status: 200, description: 'Knowledge item updated successfully' })
  async updateKnowledgeItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeItemDto,
  ) {
    const companyId = req.user.companyId;
    return this.knowledgeService.updateKnowledgeItem(companyId, id, dto);
  }

  @Delete('knowledge/:id')
  @ApiOperation({ summary: 'Delete knowledge item' })
  @ApiResponse({ status: 200, description: 'Knowledge item deleted successfully' })
  async deleteKnowledgeItem(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.knowledgeService.deleteKnowledgeItem(companyId, id);
  }

  // ============================================
  // QUESTION LIBRARY
  // ============================================

  @Get('questions')
  @ApiOperation({ summary: 'List questions' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  async listQuestions(@Req() req: any, @Query() query: QuestionLibraryQueryDto) {
    const companyId = req.user.companyId;
    return this.knowledgeService.listQuestions(companyId, query);
  }

  @Get('questions/frequent')
  @ApiOperation({ summary: 'Get frequently asked questions' })
  @ApiResponse({ status: 200, description: 'Frequent questions retrieved successfully' })
  async getFrequentQuestions(@Req() req: any, @Query('limit') limit?: number) {
    const companyId = req.user.companyId;
    return this.knowledgeService.getFrequentQuestions(companyId, limit);
  }

  @Get('questions/stats')
  @ApiOperation({ summary: 'Get question statistics' })
  @ApiResponse({ status: 200, description: 'Question stats retrieved successfully' })
  async getQuestionStats(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.knowledgeService.getQuestionStats(companyId);
  }

  @Get('questions/by-type/:type')
  @ApiOperation({ summary: 'Get questions by type' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  async getQuestionsByType(
    @Req() req: any,
    @Param('type') type: string,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.knowledgeService.getQuestionsByType(companyId, type, limit);
  }
}
