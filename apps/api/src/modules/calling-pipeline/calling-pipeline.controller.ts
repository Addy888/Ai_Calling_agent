import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CallingPipelineService } from './services/calling-pipeline.service';
import {
  StartCampaignDto,
  PauseCampaignDto,
  ResumeCampaignDto,
  StopCampaignDto,
  StartCallDto,
  EndCallDto,
  ProcessSpeechDto,
  CampaignStatusResponse,
  CallStatusResponse,
  ActiveCallsResponse,
  PipelineStatusResponse,
} from './dto/pipeline.dto';

/**
 * AI Calling Pipeline Controller
 * REST API endpoints for managing AI calling campaigns and calls
 */
@ApiTags('Calling Pipeline')
@Controller('calling')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class CallingPipelineController {
  constructor(private readonly pipelineService: CallingPipelineService) {}

  /**
   * Start a campaign execution
   */
  @Post('start-campaign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a campaign execution' })
  @ApiResponse({
    status: 200,
    description: 'Campaign started successfully',
    type: CampaignStatusResponse,
  })
  async startCampaign(
    @Body() dto: StartCampaignDto,
  ): Promise<CampaignStatusResponse> {
    return this.pipelineService.startCampaign(dto);
  }

  /**
   * Pause a running campaign
   */
  @Post('pause-campaign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a running campaign' })
  @ApiResponse({
    status: 200,
    description: 'Campaign paused successfully',
    type: CampaignStatusResponse,
  })
  async pauseCampaign(
    @Body() dto: PauseCampaignDto,
  ): Promise<CampaignStatusResponse> {
    return this.pipelineService.pauseCampaign(dto);
  }

  /**
   * Resume a paused campaign
   */
  @Post('resume-campaign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused campaign' })
  @ApiResponse({
    status: 200,
    description: 'Campaign resumed successfully',
    type: CampaignStatusResponse,
  })
  async resumeCampaign(
    @Body() dto: ResumeCampaignDto,
  ): Promise<CampaignStatusResponse> {
    return this.pipelineService.resumeCampaign(dto);
  }

  /**
   * Stop a campaign
   */
  @Post('stop-campaign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a campaign execution' })
  @ApiResponse({
    status: 200,
    description: 'Campaign stopped successfully',
    type: CampaignStatusResponse,
  })
  async stopCampaign(
    @Body() dto: StopCampaignDto,
  ): Promise<CampaignStatusResponse> {
    return this.pipelineService.stopCampaign(dto);
  }

  /**
   * Start a single call
   */
  @Post('start-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a single call' })
  @ApiResponse({
    status: 200,
    description: 'Call started successfully',
    type: CallStatusResponse,
  })
  async startCall(@Body() dto: StartCallDto): Promise<CallStatusResponse> {
    return this.pipelineService.startCall(dto);
  }

  /**
   * End a call
   */
  @Post('end-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an active call' })
  @ApiResponse({
    status: 200,
    description: 'Call ended successfully',
    type: CallStatusResponse,
  })
  async endCall(@Body() dto: EndCallDto): Promise<CallStatusResponse> {
    return this.pipelineService.endCall(dto);
  }

  /**
   * Get campaign status
   */
  @Get('campaign/:executionId')
  @ApiOperation({ summary: 'Get campaign execution status' })
  @ApiResponse({
    status: 200,
    description: 'Campaign status retrieved',
    type: CampaignStatusResponse,
  })
  async getCampaignStatus(
    @Param('executionId') executionId: string,
  ): Promise<CampaignStatusResponse> {
    return this.pipelineService.getCampaignStatus(executionId);
  }

  /**
   * Get all campaigns
   */
  @Get('campaigns')
  @ApiOperation({ summary: 'Get all campaign executions' })
  @ApiResponse({
    status: 200,
    description: 'Campaigns retrieved',
    type: [CampaignStatusResponse],
  })
  async getAllCampaigns(
    @Query('companyId') companyId?: string,
  ): Promise<CampaignStatusResponse[]> {
    return this.pipelineService.getAllCampaigns(companyId);
  }

  /**
   * Get call status
   */
  @Get('call/:sessionId')
  @ApiOperation({ summary: 'Get call session status' })
  @ApiResponse({
    status: 200,
    description: 'Call status retrieved',
    type: CallStatusResponse,
  })
  async getCallStatus(
    @Param('sessionId') sessionId: string,
  ): Promise<CallStatusResponse> {
    return this.pipelineService.getCallStatus(sessionId);
  }

  /**
   * Get all active calls
   */
  @Get('active-calls')
  @ApiOperation({ summary: 'Get all active calls' })
  @ApiResponse({
    status: 200,
    description: 'Active calls retrieved',
    type: ActiveCallsResponse,
  })
  async getActiveCalls(): Promise<ActiveCallsResponse> {
    return this.pipelineService.getActiveCalls();
  }

  /**
   * Get pipeline status
   */
  @Get('pipeline')
  @ApiOperation({ summary: 'Get overall pipeline status' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline status retrieved',
    type: PipelineStatusResponse,
  })
  async getPipelineStatus(): Promise<PipelineStatusResponse> {
    return this.pipelineService.getPipelineStatus();
  }

  /**
   * Get call sessions
   */
  @Get('sessions')
  @ApiOperation({ summary: 'Get call sessions' })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved',
    type: [CallStatusResponse],
  })
  async getSessions(
    @Query('campaignId') campaignId?: string,
    @Query('contactId') contactId?: string,
  ): Promise<CallStatusResponse[]> {
    // TODO: Implement session filtering
    return this.pipelineService.getActiveCalls().then(result => result.calls);
  }

  /**
   * Health check
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check for calling pipeline' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline is healthy',
  })
  async health(): Promise<{ status: string; timestamp: Date }> {
    return this.pipelineService.healthCheck();
  }

  /**
   * Process speech input (webhook endpoint for STT providers)
   */
  @Post('webhook/speech')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process speech-to-text result (webhook)' })
  @ApiResponse({
    status: 200,
    description: 'Speech processed successfully',
  })
  async processSpeech(@Body() dto: ProcessSpeechDto): Promise<{ success: boolean }> {
    // TODO: Implement speech processing through call orchestrator
    return { success: true };
  }
}
