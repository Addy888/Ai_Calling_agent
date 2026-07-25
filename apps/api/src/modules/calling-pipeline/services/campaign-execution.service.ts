import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueExecutionService } from './queue-execution.service';
import { CampaignState, PipelineEvent } from '../enums/call-state.enum';
import { CampaignStatusResponse } from '../dto/pipeline.dto';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Campaign Execution Service
 * Manages campaign lifecycle and execution
 */
@Injectable()
export class CampaignExecutionService {
  private readonly logger = new Logger(CampaignExecutionService.name);
  private campaignExecutions: Map<string, CampaignExecution> = new Map();

  constructor(
    private readonly queueExecution: QueueExecutionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new campaign execution
   */
  async createExecution(
    campaignId: string,
    params: {
      companyId: string;
      concurrentCalls: number;
      config?: Record<string, any>;
    },
  ): Promise<CampaignExecution> {
    this.logger.log(`Creating campaign execution for: ${campaignId}`);

    const executionId = this.generateExecutionId();

    // Load campaign data
    const campaignData = await this.loadCampaignData(campaignId);

    // Load contacts for campaign
    const contacts = await this.loadCampaignContacts(campaignId);

    const execution: CampaignExecution = {
      id: executionId,
      campaignId,
      companyId: params.companyId,
      state: CampaignState.IDLE,
      totalContacts: contacts.length,
      processedContacts: 0,
      successfulCalls: 0,
      failedCalls: 0,
      activeCalls: 0,
      startedAt: new Date(),
      completedAt: null,
      pausedAt: null,
      resumedAt: null,
      concurrentCalls: params.concurrentCalls,
      config: params.config || {},
      campaignData,
      contacts,
      contactQueue: [...contacts],
    };

    this.campaignExecutions.set(executionId, execution);

    this.logger.log(`Campaign execution created: ${executionId}`);

    return execution;
  }

  /**
   * Start campaign execution
   */
  async startExecution(executionId: string): Promise<void> {
    this.logger.log(`Starting campaign execution: ${executionId}`);

    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Campaign execution not found: ${executionId}`);
    }

    if (execution.state !== CampaignState.IDLE && execution.state !== CampaignState.PAUSED) {
      throw new Error(`Cannot start campaign in state: ${execution.state}`);
    }

    // Update state
    execution.state = CampaignState.STARTING;

    // Emit event
    this.eventEmitter.emit(PipelineEvent.CAMPAIGN_STARTED, {
      executionId,
      campaignId: execution.campaignId,
      timestamp: new Date(),
    });

    // Transition to running
    execution.state = CampaignState.RUNNING;
    execution.resumedAt = new Date();

    // Start processing contacts
    await this.processNextContacts(executionId);

    this.logger.log(`Campaign execution started: ${executionId}`);
  }

  /**
   * Pause campaign execution
   */
  async pauseExecution(executionId: string, reason?: string): Promise<void> {
    this.logger.log(`Pausing campaign execution: ${executionId}`);

    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Campaign execution not found: ${executionId}`);
    }

    if (execution.state !== CampaignState.RUNNING) {
      throw new Error(`Cannot pause campaign in state: ${execution.state}`);
    }

    execution.state = CampaignState.PAUSED;
    execution.pausedAt = new Date();
    execution.pauseReason = reason;

    this.logger.log(`Campaign execution paused: ${executionId}`);
  }

  /**
   * Resume campaign execution
   */
  async resumeExecution(executionId: string): Promise<void> {
    this.logger.log(`Resuming campaign execution: ${executionId}`);

    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Campaign execution not found: ${executionId}`);
    }

    if (execution.state !== CampaignState.PAUSED) {
      throw new Error(`Cannot resume campaign in state: ${execution.state}`);
    }

    execution.state = CampaignState.RUNNING;
    execution.resumedAt = new Date();

    // Continue processing contacts
    await this.processNextContacts(executionId);

    this.logger.log(`Campaign execution resumed: ${executionId}`);
  }

  /**
   * Stop campaign execution
   */
  async stopExecution(
    executionId: string,
    force: boolean = false,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Stopping campaign execution: ${executionId}, force: ${force}`);

    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Campaign execution not found: ${executionId}`);
    }

    execution.state = CampaignState.STOPPING;

    if (force) {
      // Immediately stop all active calls
      await this.queueExecution.cancelAllCallsForCampaign(executionId);
    } else {
      // Wait for active calls to complete
      await this.queueExecution.stopQueueingForCampaign(executionId);
    }

    execution.state = CampaignState.STOPPED;
    execution.completedAt = new Date();
    execution.stopReason = reason;

    this.logger.log(`Campaign execution stopped: ${executionId}`);
  }

  /**
   * Process next batch of contacts
   */
  private async processNextContacts(executionId: string): Promise<void> {
    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      this.logger.warn(`❌ Execution not found: ${executionId}`);
      return;
    }

    if (execution.state !== CampaignState.RUNNING) {
      this.logger.log(`⏸️  Campaign not running (state: ${execution.state}), skipping contact processing`);
      return;
    }

    // Calculate how many calls to start
    const availableSlots = execution.concurrentCalls - execution.activeCalls;

    this.logger.log(`📊 [CAMPAIGN ${executionId}] Processing contacts:`);
    this.logger.log(`   - Concurrent calls limit: ${execution.concurrentCalls}`);
    this.logger.log(`   - Active calls: ${execution.activeCalls}`);
    this.logger.log(`   - Available slots: ${availableSlots}`);
    this.logger.log(`   - Contacts in queue: ${execution.contactQueue.length}`);

    if (availableSlots <= 0) {
      this.logger.log(`⏳ No available slots. Waiting for calls to complete...`);
      return;
    }

    // Get next contacts from queue
    const contactsToProcess = execution.contactQueue.splice(0, availableSlots);

    if (contactsToProcess.length === 0) {
      this.logger.log(`✅ No more contacts in queue`);
      // Check if campaign is complete
      if (execution.activeCalls === 0) {
        this.logger.log(`🎉 Campaign complete! All contacts processed.`);
        await this.completeCampaign(executionId);
      }
      return;
    }

    this.logger.log(`📞 Starting ${contactsToProcess.length} calls...`);

    // Queue calls for each contact
    for (const contact of contactsToProcess) {
      try {
        this.logger.log(`📞 Queueing call for contact: ${contact.name} (${contact.phoneNumber})`);
        
        await this.queueExecution.queueCall({
          contactId: contact.id,
          campaignId: execution.campaignId,
          agentId: execution.campaignData.agentId || execution.campaignId,
          phoneNumber: contact.phoneNumber,
          context: {
            executionId,
            companyId: execution.companyId,
            contactData: contact,
            scriptContent: execution.campaignData.scriptContent,
            voiceId: execution.campaignData.voiceId,
          },
        });

        execution.activeCalls++;

        this.eventEmitter.emit(PipelineEvent.CONTACT_LOADED, {
          executionId,
          contactId: contact.id,
          timestamp: new Date(),
        });

        this.logger.log(`✅ Call queued successfully for ${contact.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`❌ Failed to queue call for contact ${contact.id}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        execution.failedCalls++;
      }
    }

    this.logger.log(`📊 Campaign status after queuing:`);
    this.logger.log(`   - Active calls: ${execution.activeCalls}`);
    this.logger.log(`   - Remaining in queue: ${execution.contactQueue.length}`);
  }

  /**
   * Handle call completion
   */
  async handleCallCompletion(
    executionId: string,
    success: boolean,
  ): Promise<void> {
    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      return;
    }

    execution.activeCalls--;
    execution.processedContacts++;

    if (success) {
      execution.successfulCalls++;
    } else {
      execution.failedCalls++;
    }

    // Process next contacts if still running
    if (execution.state === CampaignState.RUNNING) {
      await this.processNextContacts(executionId);
    }
  }

  /**
   * Complete campaign
   */
  private async completeCampaign(executionId: string): Promise<void> {
    this.logger.log(`Completing campaign execution: ${executionId}`);

    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      return;
    }

    execution.state = CampaignState.COMPLETED;
    execution.completedAt = new Date();

    this.eventEmitter.emit(PipelineEvent.CAMPAIGN_COMPLETED, {
      executionId,
      campaignId: execution.campaignId,
      totalContacts: execution.totalContacts,
      successfulCalls: execution.successfulCalls,
      failedCalls: execution.failedCalls,
      timestamp: new Date(),
    });

    this.logger.log(`Campaign execution completed: ${executionId}`);
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<CampaignStatusResponse> {
    const execution = this.campaignExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Campaign execution not found: ${executionId}`);
    }

    return {
      executionId: execution.id,
      campaignId: execution.campaignId,
      state: execution.state,
      totalContacts: execution.totalContacts,
      processedContacts: execution.processedContacts,
      successfulCalls: execution.successfulCalls,
      failedCalls: execution.failedCalls,
      activeCalls: execution.activeCalls,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      progressPercentage: (execution.processedContacts / execution.totalContacts) * 100,
    };
  }

  /**
   * Get all executions
   */
  async getAllExecutions(companyId?: string): Promise<CampaignStatusResponse[]> {
    const executions = Array.from(this.campaignExecutions.values());

    const filtered = companyId
      ? executions.filter(e => e.companyId === companyId)
      : executions;

    return Promise.all(
      filtered.map(e => this.getExecutionStatus(e.id))
    );
  }

  /**
   * Get active campaigns count
   */
  async getActiveCampaignsCount(): Promise<number> {
    const executions = Array.from(this.campaignExecutions.values());
    return executions.filter(e => e.state === CampaignState.RUNNING).length;
  }

  // Private helper methods

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadCampaignData(campaignId: string): Promise<any> {
    this.logger.debug(`Loading campaign data: ${campaignId}`);
    
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          script: true,
          voice: true,
          prompt: true,
        },
      });

      if (!campaign) {
        throw new NotFoundException(`Campaign not found: ${campaignId}`);
      }

      // Load associated AI Agent
      const agent = await this.prisma.aIAgent.findFirst({
        where: { campaignId, isEnabled: true },
      });

      let scriptId = agent?.scriptId || campaign.scriptId;
      let scriptContent = campaign.script?.content;

      if (agent?.scriptId && agent.scriptId !== campaign.scriptId) {
        const script = await this.prisma.script.findUnique({
          where: { id: agent.scriptId },
        });
        if (script) {
          scriptContent = script.content;
        }
      }

      return {
        id: campaign.id,
        name: campaign.name,
        agentId: agent?.id,
        scriptId,
        scriptContent,
        voiceId: campaign.voiceId,
        promptId: agent?.promptId || campaign.promptId,
        settings: campaign.settings,
      };
    } catch (error) {
      this.logger.error(`Failed to load campaign data: ${error.message}`);
      throw error;
    }
  }

  private async loadCampaignContacts(campaignId: string): Promise<any[]> {
    this.logger.debug(`Loading contacts for campaign: ${campaignId}`);
    
    try {
      const contacts = await this.prisma.contact.findMany({
        where: {
          campaignId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      this.logger.log(`✅ Loaded ${contacts.length} contacts for campaign ${campaignId}`);

      return contacts.map(contact => ({
        id: contact.id,
        phoneNumber: contact.phone, // Map phone field to phoneNumber
        phone: contact.phone, // Also keep original field
        name: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        fullName: contact.fullName,
        firstName: contact.firstName,
        lastName: contact.lastName,
        language: contact.language,
        metadata: contact.tags,
      }));
    } catch (error) {
      this.logger.error(`Failed to load campaign contacts: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Campaign Execution Interface
 */
interface CampaignExecution {
  id: string;
  campaignId: string;
  companyId: string;
  state: CampaignState;
  totalContacts: number;
  processedContacts: number;
  successfulCalls: number;
  failedCalls: number;
  activeCalls: number;
  startedAt: Date;
  completedAt: Date | null;
  pausedAt: Date | null;
  resumedAt: Date | null;
  concurrentCalls: number;
  config: Record<string, any>;
  campaignData: any;
  contacts: any[];
  contactQueue: any[];
  pauseReason?: string;
  stopReason?: string;
}
