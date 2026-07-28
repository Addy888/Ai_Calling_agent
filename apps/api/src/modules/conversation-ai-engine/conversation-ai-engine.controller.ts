/**
 * Conversation AI Engine Controller
 * REST API endpoints for AI conversation management
 */

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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConversationAIEngineService } from './services/conversation-ai-engine.service';
import { AIEngineConfigService } from './services/ai-engine-config.service';
import { CallSummaryService } from './services/call-summary.service';

// DTOs
import {
  StartConversationDto,
  SendAudioChunkDto,
  EndConversationDto,
  GetConversationStateDto,
  UpdateEngineConfigDto,
  TestWhisperDto,
  TestOllamaDto,
  TestTTSDto,
} from './dto/conversation-ai.dto';

@ApiTags('Conversation AI Engine')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conversation-ai-engine')
export class ConversationAIEngineController {
  constructor(
    private readonly aiEngineService: ConversationAIEngineService,
    private readonly configService: AIEngineConfigService,
    private readonly summaryService: CallSummaryService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CONVERSATION LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  @Post('conversations/start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start new AI conversation session' })
  @ApiResponse({ status: 201, description: 'Conversation started successfully' })
  async startConversation(@Body() dto: StartConversationDto) {
    return this.aiEngineService.startConversation(dto);
  }

  @Post('conversations/:sessionId/audio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send audio chunk for processing' })
  @ApiResponse({ status: 200, description: 'Audio chunk processed' })
  async sendAudioChunk(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendAudioChunkDto,
  ) {
    return this.aiEngineService.processAudioChunk(sessionId, dto);
  }

  @Post('conversations/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End conversation session' })
  @ApiResponse({ status: 200, description: 'Conversation ended successfully' })
  async endConversation(
    @Param('sessionId') sessionId: string,
    @Body() dto: EndConversationDto,
  ) {
    return this.aiEngineService.endConversation(sessionId, dto);
  }

  @Get('conversations/:sessionId/state')
  @ApiOperation({ summary: 'Get current conversation state' })
  @ApiResponse({ status: 200, description: 'Conversation state retrieved' })
  async getConversationState(@Param('sessionId') sessionId: string) {
    return this.aiEngineService.getConversationState(sessionId);
  }

  @Get('conversations/:sessionId/transcript')
  @ApiOperation({ summary: 'Get conversation transcript' })
  @ApiResponse({ status: 200, description: 'Transcript retrieved' })
  async getTranscript(@Param('sessionId') sessionId: string) {
    return this.aiEngineService.getTranscript(sessionId);
  }

  @Get('conversations/:sessionId/summary')
  @ApiOperation({ summary: 'Get conversation summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  async getSummary(@Param('sessionId') sessionId: string) {
    return this.summaryService.getCallSummary(sessionId);
  }

  // ─────────────────────────────────────────────────────────────
  // ENGINE CONFIGURATION
  // ─────────────────────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get AI engine configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig(@Query('campaignId') campaignId?: string) {
    return this.configService.getConfig(campaignId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update AI engine configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(@Body() dto: UpdateEngineConfigDto) {
    return this.configService.updateConfig(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // TESTING & DEBUGGING
  // ─────────────────────────────────────────────────────────────

  @Post('test/whisper')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Whisper STT service' })
  @ApiResponse({ status: 200, description: 'Whisper test completed' })
  async testWhisper(@Body() dto: TestWhisperDto) {
    return this.aiEngineService.testWhisperSTT(dto);
  }

  @Post('test/ollama')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Ollama LLM service' })
  @ApiResponse({ status: 200, description: 'Ollama test completed' })
  async testOllama(@Body() dto: TestOllamaDto) {
    return this.aiEngineService.testOllamaLLM(dto);
  }

  @Post('test/tts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test TTS service' })
  @ApiResponse({ status: 200, description: 'TTS test completed' })
  async testTTS(@Body() dto: TestTTSDto) {
    return this.aiEngineService.testTTS(dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get AI engine health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getHealth() {
    return this.aiEngineService.getHealthStatus();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get AI engine performance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  async getMetrics(@Query('sessionId') sessionId?: string) {
    return this.aiEngineService.getMetrics(sessionId);
  }

  // ─────────────────────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────────────────────

  @Get('analytics/conversations')
  @ApiOperation({ summary: 'Get conversation analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getConversationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.aiEngineService.getConversationAnalytics({
      startDate,
      endDate,
      campaignId,
    });
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get AI engine performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance analytics retrieved' })
  async getPerformanceAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiEngineService.getPerformanceAnalytics({
      startDate,
      endDate,
    });
  }
}
