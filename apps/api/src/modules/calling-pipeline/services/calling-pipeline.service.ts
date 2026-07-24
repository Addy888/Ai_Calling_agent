import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallOrchestratorService } from './call-orchestrator.service';
import { CampaignExecutionService } from './campaign-execution.service';
import { QueueExecutionService } from './queue-execution.service';
import { PipelineContextService } from './pipeline-context.service';
import {
  StartCampaignDto,
  PauseCampaignDto,
  ResumeCampaignDto,
  StopCampaignDto,
  StartCallDto,
  EndCallDto,
  CampaignStatusResponse,
  CallStatusResponse,
  ActiveCallsResponse,
  PipelineStatusResponse,
} from '../dto/pipeline.dto';
import { PipelineEvent } from '../enums/call-state.enum';

/**
 * AI Calling Pipeline Service
 * Central brain of the AI Calling Agent
 * Orchestrates the complete calling workflow
 */
@Injectable()
export class CallingPipelineService {
  private readonly logger = new Logger(CallingPipelineService.name);

  constructor(
    private readonly callOrchestrator: CallOrchestratorService,
    private readonly campaignExecution: CampaignExecutionService,
    private readonly queueExecution: QueueExecutionService,
    private readonly pipelineContext: PipelineContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('AI Calling Pipeline initialized');
  }

  /**
   * Start a campaign execution
   */
  async startCampaign(dto: StartCampaignDto): Promise<CampaignStatusResponse> {
    this.logger.log(`Starting campaign: ${dto.campaignId}`);

    try {
      // Create campaign execution
      const execution = await this.campaignExecution.createExecution(
        dto.campaignId,
        {
          companyId: dto.companyId,
          concurrentCalls: dto.concurrentCalls || 1,
          config: dto.config,
        },
      );

      // Emit campaign started event
      this.eventEmitter.emit(PipelineEvent.CAMPAIGN_STARTED, {
        executionId: execution.id,
        campaignId: dto.campaignId,
        timestamp: new Date(),
      });

      // Auto-start if requested
      if (dto.autoStart !== false) {
        await this.campaignExecution.startExecution(execution.id);
      }

      return this.getCampaignStatus(execution.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to start campaign: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to start campaign: ${errorMessage}`);
    }
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(dto: PauseCampaignDto): Promise<CampaignStatusResponse> {
    this.logger.log(`Pausing campaign execution: ${dto.executionId}`);

    try {
      await this.campaignExecution.pauseExecution(dto.executionId, dto.reason);
      return this.getCampaignStatus(dto.executionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to pause campaign: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to pause campaign: ${errorMessage}`);
    }
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(dto: ResumeCampaignDto): Promise<CampaignStatusResponse> {
    this.logger.log(`Resuming campaign execution: ${dto.executionId}`);

    try {
      await this.campaignExecution.resumeExecution(dto.executionId);
      return this.getCampaignStatus(dto.executionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to resume campaign: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to resume campaign: ${errorMessage}`);
    }
  }

  /**
   * Stop a campaign
   */
  async stopCampaign(dto: StopCampaignDto): Promise<CampaignStatusResponse> {
    this.logger.log(`Stopping campaign execution: ${dto.executionId}`);

    try {
      await this.campaignExecution.stopExecution(dto.executionId, dto.force, dto.reason);
      return this.getCampaignStatus(dto.executionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to stop campaign: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to stop campaign: ${errorMessage}`);
    }
  }

  /**
   * Start a single call
   */
  async startCall(dto: StartCallDto): Promise<CallStatusResponse> {
    this.logger.log(`Starting call for contact: ${dto.contactId}`);

    try {
      // Queue the call
      const session = await this.queueExecution.queueCall({
        contactId: dto.contactId,
        campaignId: dto.campaignId,
        agentId: dto.agentId,
        phoneNumber: dto.phoneNumber,
        context: dto.context,
      });

      // Emit call started event
      this.eventEmitter.emit(PipelineEvent.CALL_STARTED, {
        sessionId: session.id,
        contactId: dto.contactId,
        campaignId: dto.campaignId,
        timestamp: new Date(),
      });

      return this.getCallStatus(session.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to start call: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to start call: ${errorMessage}`);
    }
  }

  /**
   * End a call
   */
  async endCall(dto: EndCallDto): Promise<CallStatusResponse> {
    this.logger.log(`Ending call session: ${dto.sessionId}`);

    try {
      await this.callOrchestrator.endCall(dto.sessionId, dto.reason);
      return this.getCallStatus(dto.sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to end call: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to end call: ${errorMessage}`);
    }
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(executionId: string): Promise<CampaignStatusResponse> {
    return this.campaignExecution.getExecutionStatus(executionId);
  }

  /**
   * Get call status
   */
  async getCallStatus(sessionId: string): Promise<CallStatusResponse> {
    return this.callOrchestrator.getCallStatus(sessionId);
  }

  /**
   * Get all active calls
   */
  async getActiveCalls(): Promise<ActiveCallsResponse> {
    const sessions = await this.callOrchestrator.getActiveSessions();
    
    return {
      total: sessions.length,
      calls: sessions,
    };
  }

  /**
   * Get pipeline status
   */
  async getPipelineStatus(): Promise<PipelineStatusResponse> {
    const [
      activeCampaigns,
      activeCalls,
      queuedCalls,
      todayStats,
    ] = await Promise.all([
      this.campaignExecution.getActiveCampaignsCount(),
      this.callOrchestrator.getActiveCallsCount(),
      this.queueExecution.getQueuedCallsCount(),
      this.pipelineContext.getTodayStats(),
    ]);

    return {
      status: 'operational',
      activeCampaigns,
      activeCalls,
      queuedCalls,
      totalCallsToday: todayStats.total,
      successfulCallsToday: todayStats.successful,
      health: {
        stt: 'available',
        tts: 'available',
        telephony: 'available',
        llm: 'available',
      },
    };
  }

  /**
   * Get all campaign executions
   */
  async getAllCampaigns(companyId?: string): Promise<CampaignStatusResponse[]> {
    return this.campaignExecution.getAllExecutions(companyId);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
    };
  }
}
