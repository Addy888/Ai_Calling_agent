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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AIAgentService } from './ai-agent.service';
import { SessionManagerService } from './services/session-manager.service';
import { RuntimeEngineService } from './services/runtime-engine.service';
import { ConversationRuntimeService } from './services/conversation-runtime.service';
import { StateManagerService } from './services/state-manager.service';
import { HealthMonitorService } from './services/health-monitor.service';
import { AgentPoolService } from './services/agent-pool.service';
import { MetricsService } from './services/metrics.service';
import { RuntimeLoggingService } from './services/logging.service';
import {
  CreateAIAgentDto,
  UpdateAIAgentDto,
  CreateSessionDto,
  UpdateSessionDto,
  RuntimeConfigurationDto,
  ExecuteConversationTurnDto,
  GetAgentsFilterDto,
  GetSessionsFilterDto,
  RecordHealthCheckDto,
  GetMetricsFilterDto,
} from './dto/ai-agent.dto';

@ApiTags('AI Agent Runtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-agents')
export class AIAgentController {
  constructor(
    private readonly aiAgentService: AIAgentService,
    private readonly sessionManager: SessionManagerService,
    private readonly runtimeEngine: RuntimeEngineService,
    private readonly conversationRuntime: ConversationRuntimeService,
    private readonly stateManager: StateManagerService,
    private readonly healthMonitor: HealthMonitorService,
    private readonly agentPool: AgentPoolService,
    private readonly metricsService: MetricsService,
    private readonly loggingService: RuntimeLoggingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create AI Agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  async createAgent(@Request() req, @Body() dto: CreateAIAgentDto) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.aiAgentService.createAgent(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents' })
  @ApiResponse({ status: 200, description: 'Agents retrieved successfully' })
  async getAgents(@Request() req, @Query() filters: GetAgentsFilterDto) {
    const companyId = req.user.companyId;
    return this.aiAgentService.getAgents(companyId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent retrieved successfully' })
  async getAgentById(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.getAgentById(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  async updateAgent(@Request() req, @Param('id') id: string, @Body() dto: UpdateAIAgentDto) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.aiAgentService.updateAgent(companyId, id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  async deleteAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.deleteAgent(companyId, id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable agent' })
  @ApiResponse({ status: 200, description: 'Agent enabled successfully' })
  async enableAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.enableAgent(companyId, id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable agent' })
  @ApiResponse({ status: 200, description: 'Agent disabled successfully' })
  async disableAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.disableAgent(companyId, id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start agent' })
  @ApiResponse({ status: 200, description: 'Agent started successfully' })
  async startAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.startAgent(companyId, id);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop agent' })
  @ApiResponse({ status: 200, description: 'Agent stopped successfully' })
  async stopAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.stopAgent(companyId, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause agent' })
  @ApiResponse({ status: 200, description: 'Agent paused successfully' })
  async pauseAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.pauseAgent(companyId, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume agent' })
  @ApiResponse({ status: 200, description: 'Agent resumed successfully' })
  async resumeAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.resumeAgent(companyId, id);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart agent' })
  @ApiResponse({ status: 200, description: 'Agent restarted successfully' })
  async restartAgent(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.restartAgent(companyId, id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get agent health' })
  @ApiResponse({ status: 200, description: 'Health retrieved successfully' })
  async getAgentHealth(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.aiAgentService.getAgentHealth(companyId, id);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get agent metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getAgentMetrics(
    @Request() req,
    @Param('id') id: string,
    @Query() filters: GetMetricsFilterDto,
  ) {
    const companyId = req.user.companyId;
    const days = filters.days || 7;
    return this.aiAgentService.getAgentMetrics(companyId, id, days);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Request() req, @Body() dto: CreateSessionDto) {
    const companyId = req.user.companyId;
    return this.sessionManager.createSession(companyId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getSessions(@Request() req, @Query() filters: GetSessionsFilterDto) {
    const companyId = req.user.companyId;
    return this.sessionManager.getSessions(companyId, filters);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async getSession(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.sessionManager.getSession(companyId, sessionId);
  }

  @Put('sessions/:sessionId')
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const companyId = req.user.companyId;
    return this.sessionManager.updateSession(companyId, sessionId, dto);
  }

  @Post('sessions/:sessionId/pause')
  @ApiOperation({ summary: 'Pause session' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  async pauseSession(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.sessionManager.pauseSession(companyId, sessionId);
  }

  @Post('sessions/:sessionId/resume')
  @ApiOperation({ summary: 'Resume session' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  async resumeSession(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.sessionManager.resumeSession(companyId, sessionId);
  }

  @Post('sessions/:sessionId/close')
  @ApiOperation({ summary: 'Close session' })
  @ApiResponse({ status: 200, description: 'Session closed successfully' })
  async closeSession(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.sessionManager.closeSession(companyId, sessionId);
  }

  @Get('sessions/:sessionId/history')
  @ApiOperation({ summary: 'Get session history' })
  @ApiResponse({ status: 200, description: 'Session history retrieved successfully' })
  async getSessionHistory(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.sessionManager.getSessionHistory(companyId, sessionId);
  }

  @Post('sessions/:sessionId/conversation/continue')
  @ApiOperation({ summary: 'Continue conversation' })
  @ApiResponse({ status: 200, description: 'Conversation turn completed' })
  async continueConversation(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() dto: ExecuteConversationTurnDto,
  ) {
    const companyId = req.user.companyId;
    const session = await this.sessionManager.getSession(companyId, sessionId);
    return this.conversationRuntime.continueConversation(
      sessionId,
      session.agentId,
      companyId,
      dto.userInput,
    );
  }

  @Post('sessions/:sessionId/conversation/end')
  @ApiOperation({ summary: 'End conversation' })
  @ApiResponse({ status: 200, description: 'Conversation ended successfully' })
  async endConversation(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.conversationRuntime.endConversation(sessionId, companyId);
  }

  @Get('sessions/:sessionId/conversation/context')
  @ApiOperation({ summary: 'Get conversation context' })
  @ApiResponse({ status: 200, description: 'Conversation context retrieved' })
  async getConversationContext(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.conversationRuntime.getConversationContext(sessionId, companyId);
  }

  @Get('sessions/:sessionId/conversation/summary')
  @ApiOperation({ summary: 'Get conversation summary' })
  @ApiResponse({ status: 200, description: 'Conversation summary retrieved' })
  async getConversationSummary(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.conversationRuntime.getConversationSummary(sessionId, companyId);
  }

  @Get('runtime/configuration')
  @ApiOperation({ summary: 'Get runtime configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getRuntimeConfiguration(@Request() req) {
    const companyId = req.user.companyId;
    return this.aiAgentService.getRuntimeConfiguration(companyId);
  }

  @Put('runtime/configuration')
  @ApiOperation({ summary: 'Update runtime configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateRuntimeConfiguration(@Request() req, @Body() dto: RuntimeConfigurationDto) {
    const companyId = req.user.companyId;
    return this.aiAgentService.updateRuntimeConfiguration(companyId, dto);
  }

  @Get('pool/statistics')
  @ApiOperation({ summary: 'Get agent pool statistics' })
  @ApiResponse({ status: 200, description: 'Pool statistics retrieved' })
  async getPoolStatistics(@Request() req) {
    const companyId = req.user.companyId;
    return this.agentPool.getPoolStatistics(companyId);
  }

  @Get('health/system')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getSystemHealth(@Request() req) {
    const companyId = req.user.companyId;
    return this.healthMonitor.getSystemHealth(companyId);
  }

  @Post(':id/health/check')
  @ApiOperation({ summary: 'Record health check' })
  @ApiResponse({ status: 201, description: 'Health check recorded' })
  async recordHealthCheck(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RecordHealthCheckDto,
  ) {
    const companyId = req.user.companyId;
    return this.healthMonitor.recordHealthCheck(id, companyId, dto);
  }

  @Get(':id/health/metrics')
  @ApiOperation({ summary: 'Get health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics retrieved' })
  async getHealthMetrics(@Request() req, @Param('id') id: string, @Query('days') days?: number) {
    const companyId = req.user.companyId;
    return this.healthMonitor.getHealthMetrics(id, companyId, days || 7);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(
    @Request() req,
    @Param('id') id: string,
    @Query('days') days?: number,
  ) {
    const companyId = req.user.companyId;
    return this.metricsService.getPerformanceMetrics(id, companyId, days || 1);
  }

  @Get(':id/realtime')
  @ApiOperation({ summary: 'Get realtime metrics' })
  @ApiResponse({ status: 200, description: 'Realtime metrics retrieved' })
  async getRealTimeMetrics(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.metricsService.getRealTimeMetrics(id, companyId);
  }

  @Get('metrics/company')
  @ApiOperation({ summary: 'Get company metrics' })
  @ApiResponse({ status: 200, description: 'Company metrics retrieved' })
  async getCompanyMetrics(@Request() req, @Query('days') days?: number) {
    const companyId = req.user.companyId;
    return this.metricsService.getCompanyMetrics(companyId, days || 7);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get runtime logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(
    @Request() req,
    @Query('agentId') agentId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('level') level?: string,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.loggingService.getLogs(companyId, {
      agentId,
      sessionId,
      logLevel: level as any,
      limit,
    });
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get agent logs' })
  @ApiResponse({ status: 200, description: 'Agent logs retrieved' })
  async getAgentLogs(@Request() req, @Param('id') id: string, @Query('limit') limit?: number) {
    const companyId = req.user.companyId;
    return this.loggingService.getAgentLogs(id, companyId, limit || 100);
  }
}
