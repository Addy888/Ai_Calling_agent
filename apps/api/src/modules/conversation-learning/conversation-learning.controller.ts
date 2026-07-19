import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RecordingAnalysisService } from './services/recording-analysis.service';
import { BehaviorProfileService } from './services/behavior-profile.service';
import { InsightGenerationService } from './services/insight-generation.service';
import { RuleLearningService } from './services/rule-learning.service';
import { ResponseStrategyService } from './services/response-strategy.service';
import { ScriptUnderstandingService } from './services/script-understanding.service';
import { QuestionAnsweringService } from './services/question-answering.service';
import { LearningStatisticsService } from './services/learning-statistics.service';
import {
  UploadRecordingDto,
  AnalyzeRecordingDto,
  UploadScriptDto,
  GetInsightsDto,
  GetPatternsDto,
  GetConversationRulesDto,
  GetResponseStrategiesDto,
  AskQuestionDto,
  ApplyInsightDto,
  CreateConversationRuleDto,
  UpdateConversationRuleDto,
  CreateResponseStrategyDto,
  UpdateResponseStrategyDto,
  GetLearningStatsDto,
} from './dto/conversation-learning.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('conversation-learning')
@UseGuards(JwtAuthGuard)
export class ConversationLearningController {
  constructor(
    private readonly recordingAnalysisService: RecordingAnalysisService,
    private readonly behaviorProfileService: BehaviorProfileService,
    private readonly insightGenerationService: InsightGenerationService,
    private readonly ruleLearningService: RuleLearningService,
    private readonly responseStrategyService: ResponseStrategyService,
    private readonly scriptUnderstandingService: ScriptUnderstandingService,
    private readonly questionAnsweringService: QuestionAnsweringService,
    private readonly learningStatisticsService: LearningStatisticsService,
  ) {}

  @Post('recordings/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './storage/learning-recordings';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `recording-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['.mp3', '.wav', '.m4a', '.mpeg', '.ogg', '.flac'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new HttpException('Invalid file type', HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  async uploadRecording(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadRecordingDto,
    @Request() req,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    return await this.recordingAnalysisService.processRecording(
      file,
      dto,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Post('recordings/:id/analyze')
  async analyzeRecording(@Param('id') id: string, @Body() dto: AnalyzeRecordingDto, @Request() req) {
    return await this.recordingAnalysisService.analyzeRecording(id, req.user.companyId, dto.forceReanalysis);
  }

  @Get('recordings')
  async getRecordings(@Query('status') status: string, @Request() req) {
    return await this.recordingAnalysisService.getRecordings(req.user.companyId, status);
  }

  @Get('recordings/:id')
  async getRecording(@Param('id') id: string, @Request() req) {
    return await this.recordingAnalysisService.getRecordingDetails(id, req.user.companyId);
  }

  @Delete('recordings/:id')
  async deleteRecording(@Param('id') id: string, @Request() req) {
    return await this.recordingAnalysisService.deleteRecording(id, req.user.companyId);
  }

  @Post('scripts/upload')
  async uploadScript(@Body() dto: UploadScriptDto, @Request() req) {
    return await this.scriptUnderstandingService.processScript(dto, req.user.companyId, req.user.userId);
  }

  @Get('scripts')
  async getScripts(@Request() req) {
    return await this.scriptUnderstandingService.getScripts(req.user.companyId);
  }

  @Get('scripts/:id')
  async getScript(@Param('id') id: string, @Request() req) {
    return await this.scriptUnderstandingService.getScriptDetails(id, req.user.companyId);
  }

  @Get('insights')
  async getInsights(@Query() query: GetInsightsDto, @Request() req) {
    return await this.insightGenerationService.getInsights(req.user.companyId, query);
  }

  @Get('insights/:id')
  async getInsight(@Param('id') id: string, @Request() req) {
    return await this.insightGenerationService.getInsightDetails(id, req.user.companyId);
  }

  @Post('insights/:id/apply')
  async applyInsight(@Param('id') id: string, @Body() dto: ApplyInsightDto, @Request() req) {
    return await this.insightGenerationService.applyInsight(id, req.user.companyId, dto.applicationDetails);
  }

  @Get('patterns')
  async getPatterns(@Query() query: GetPatternsDto, @Request() req) {
    return await this.recordingAnalysisService.getPatterns(req.user.companyId, query);
  }

  @Get('patterns/pauses')
  async getPausePatterns(@Query() query: GetPatternsDto, @Request() req) {
    return await this.recordingAnalysisService.getPausePatterns(req.user.companyId, query);
  }

  @Get('patterns/acknowledgements')
  async getAcknowledgements(@Query() query: GetPatternsDto, @Request() req) {
    return await this.recordingAnalysisService.getAcknowledgements(req.user.companyId, query);
  }

  @Get('patterns/turn-taking')
  async getTurnTakingPatterns(@Query() query: GetPatternsDto, @Request() req) {
    return await this.recordingAnalysisService.getTurnTakingPatterns(req.user.companyId, query);
  }

  @Get('patterns/interruptions')
  async getInterruptions(@Query() query: GetPatternsDto, @Request() req) {
    return await this.recordingAnalysisService.getInterruptions(req.user.companyId, query);
  }

  @Get('rules')
  async getConversationRules(@Query() query: GetConversationRulesDto, @Request() req) {
    return await this.ruleLearningService.getRules(req.user.companyId, query);
  }

  @Post('rules')
  async createConversationRule(@Body() dto: CreateConversationRuleDto, @Request() req) {
    return await this.ruleLearningService.createRule(dto, req.user.companyId, req.user.userId);
  }

  @Put('rules/:id')
  async updateConversationRule(
    @Param('id') id: string,
    @Body() dto: UpdateConversationRuleDto,
    @Request() req,
  ) {
    return await this.ruleLearningService.updateRule(id, dto, req.user.companyId, req.user.userId);
  }

  @Delete('rules/:id')
  async deleteConversationRule(@Param('id') id: string, @Request() req) {
    return await this.ruleLearningService.deleteRule(id, req.user.companyId);
  }

  @Get('strategies')
  async getResponseStrategies(@Query() query: GetResponseStrategiesDto, @Request() req) {
    return await this.responseStrategyService.getStrategies(req.user.companyId, query);
  }

  @Post('strategies')
  async createResponseStrategy(@Body() dto: CreateResponseStrategyDto, @Request() req) {
    return await this.responseStrategyService.createStrategy(dto, req.user.companyId, req.user.userId);
  }

  @Put('strategies/:id')
  async updateResponseStrategy(
    @Param('id') id: string,
    @Body() dto: UpdateResponseStrategyDto,
    @Request() req,
  ) {
    return await this.responseStrategyService.updateStrategy(id, dto, req.user.companyId, req.user.userId);
  }

  @Delete('strategies/:id')
  async deleteResponseStrategy(@Param('id') id: string, @Request() req) {
    return await this.responseStrategyService.deleteStrategy(id, req.user.companyId);
  }

  @Get('behavior-profile')
  async getBehaviorProfile(@Request() req) {
    return await this.behaviorProfileService.getProfile(req.user.companyId);
  }

  @Post('behavior-profile/generate')
  async generateBehaviorProfile(@Request() req) {
    return await this.behaviorProfileService.generateProfile(req.user.companyId);
  }

  @Post('question')
  async askQuestion(@Body() dto: AskQuestionDto, @Request() req) {
    return await this.questionAnsweringService.answerQuestion(dto, req.user.companyId);
  }

  @Get('statistics')
  async getLearningStatistics(@Query() query: GetLearningStatsDto, @Request() req) {
    return await this.learningStatisticsService.getStatistics(req.user.companyId, query);
  }

  @Get('statistics/summary')
  async getStatisticsSummary(@Request() req) {
    return await this.learningStatisticsService.getSummary(req.user.companyId);
  }

  @Get('health')
  async getHealthStatus(@Request() req) {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      module: 'conversation-learning',
      companyId: req.user.companyId,
    };
  }
}
