import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CampaignExecutionService } from '../calling-pipeline/services/campaign-execution.service';
import { CallOrchestratorService } from '../call-orchestrator/call-orchestrator.service';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Campaign API Service
 * Handles campaign management operations
 */
@Injectable()
export class CampaignApiService {
  private readonly logger = new Logger(CampaignApiService.name);
  private executionMap: Map<string, string> = new Map(); // campaignId -> executionId

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignExecution: CampaignExecutionService,
    private readonly callOrchestrator: CallOrchestratorService,
  ) {}

  /**
   * Create campaign
   */
  async createCampaign(dto: any): Promise<any> {
    this.logger.log(`Creating campaign: ${dto.name}`);

    const campaign = await this.prisma.campaign.create({
      data: {
        companyId: dto.companyId,
        userId: dto.userId,
        name: dto.name,
        description: dto.description,
        scriptId: dto.scriptId,
        voiceId: dto.voiceId,
        promptId: dto.promptId,
        status: 'DRAFT',
        settings: dto.settings || {},
      },
      include: {
        script: true,
        voice: true,
        prompt: true,
      },
    });

    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, dto: any): Promise<any> {
    this.logger.log(`Updating campaign: ${id}`);

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        scriptId: dto.scriptId,
        voiceId: dto.voiceId,
        promptId: dto.promptId,
        status: dto.status,
        settings: dto.settings,
      },
      include: {
        script: true,
        voice: true,
        prompt: true,
      },
    });

    return campaign;
  }

  /**
   * Get campaign
   */
  async getCampaign(id: string): Promise<any> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        script: true,
        voice: true,
        prompt: true,
        _count: {
          select: {
            contacts: true,
            calls: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign not found: ${id}`);
    }

    return campaign;
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(filter?: { companyId?: string; status?: string }): Promise<any[]> {
    const where: any = {};

    if (filter?.companyId) {
      where.companyId = filter.companyId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.campaign.findMany({
      where,
      include: {
        script: true,
        voice: true,
        _count: {
          select: {
            contacts: true,
            calls: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Upload contacts from CSV/Excel
   */
  async uploadContacts(
    campaignId: string,
    file: Express.Multer.File,
  ): Promise<{ success: boolean; imported: number; failed: number }> {
    this.logger.log(`Uploading contacts for campaign: ${campaignId}`);

    // Verify campaign exists
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign not found: ${campaignId}`);
    }

    try {
      // Parse file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      let imported = 0;
      let failed = 0;

      // Process each row
      for (const row of data as any[]) {
        try {
          // Validate required fields
          if (!row.phone && !row.phoneNumber && !row.Phone) {
            failed++;
            continue;
          }

          const phone = row.phone || row.phoneNumber || row.Phone;
          const firstName = row.firstName || row.FirstName || row.first_name || '';
          const lastName = row.lastName || row.LastName || row.last_name || '';
          const email = row.email || row.Email || null;
          const language = row.language || row.Language || 'en';

          // Create contact
          await this.prisma.contact.create({
            data: {
              companyId: campaign.companyId,
              campaignId,
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`.trim() || phone,
              phone,
              email,
              language,
              status: 'ACTIVE',
            },
          });

          imported++;
        } catch (error) {
          this.logger.error(`Failed to import contact: ${error.message}`);
          failed++;
        }
      }

      this.logger.log(`Imported ${imported} contacts, ${failed} failed`);

      return { success: true, imported, failed };
    } catch (error) {
      this.logger.error(`Failed to upload contacts: ${error.message}`);
      throw new BadRequestException(`Failed to parse contact file: ${error.message}`);
    }
  }

  /**
   * Upload script
   */
  async uploadScript(
    campaignId: string,
    file: Express.Multer.File,
  ): Promise<{ success: boolean; scriptId: string }> {
    this.logger.log(`Uploading script for campaign: ${campaignId}`);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign not found: ${campaignId}`);
    }

    try {
      // Extract text content based on file type
      let content = '';

      if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // For DOCX, you'd need a library like mammoth
        // For now, just use plain text
        content = file.buffer.toString('utf-8');
      } else if (file.mimetype === 'application/pdf') {
        // For PDF, you'd need a library like pdf-parse
        // For now, throw error
        throw new BadRequestException('PDF parsing not yet implemented');
      } else {
        throw new BadRequestException('Unsupported file type');
      }

      // Create script
      const script = await this.prisma.script.create({
        data: {
          companyId: campaign.companyId,
          name: `${campaign.name} - Script`,
          content,
          language: 'en',
          status: 'ACTIVE',
        },
      });

      // Link script to campaign
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { scriptId: script.id },
      });

      return { success: true, scriptId: script.id };
    } catch (error) {
      this.logger.error(`Failed to upload script: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start campaign
   */
  async startCampaign(
    campaignId: string,
    options?: { concurrentCalls?: number },
  ): Promise<{ executionId: string; status: string }> {
    this.logger.log(`Starting campaign: ${campaignId}`);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: { select: { contacts: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign not found: ${campaignId}`);
    }

    if (campaign._count.contacts === 0) {
      throw new BadRequestException('Campaign has no contacts');
    }

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    // Create execution
    const execution = await this.campaignExecution.createExecution(campaignId, {
      companyId: campaign.companyId,
      concurrentCalls: options?.concurrentCalls || 5,
    });

    // Store execution mapping
    this.executionMap.set(campaignId, execution.id);

    // Start execution
    await this.campaignExecution.startExecution(execution.id);

    return {
      executionId: execution.id,
      status: 'RUNNING',
    };
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<{ success: boolean }> {
    const executionId = this.executionMap.get(campaignId);

    if (!executionId) {
      throw new NotFoundException('Campaign execution not found');
    }

    await this.campaignExecution.pauseExecution(executionId);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    return { success: true };
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<{ success: boolean }> {
    const executionId = this.executionMap.get(campaignId);

    if (!executionId) {
      throw new NotFoundException('Campaign execution not found');
    }

    await this.campaignExecution.resumeExecution(executionId);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    return { success: true };
  }

  /**
   * Stop campaign
   */
  async stopCampaign(campaignId: string, force: boolean = false): Promise<{ success: boolean }> {
    const executionId = this.executionMap.get(campaignId);

    if (!executionId) {
      throw new NotFoundException('Campaign execution not found');
    }

    await this.campaignExecution.stopExecution(executionId, force);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'COMPLETED' },
    });

    this.executionMap.delete(campaignId);

    return { success: true };
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(campaignId: string): Promise<any> {
    const executionId = this.executionMap.get(campaignId);

    if (!executionId) {
      // Return campaign info without execution
      const campaign = await this.getCampaign(campaignId);
      return {
        campaign,
        execution: null,
      };
    }

    const execution = await this.campaignExecution.getExecutionStatus(executionId);

    return execution;
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const calls = await this.prisma.call.findMany({
      where: { campaignId },
    });

    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status === 'COMPLETED').length;
    const failedCalls = calls.filter(c => c.status === 'FAILED').length;
    const pendingCalls = calls.filter(c => c.status === 'PENDING' || c.status === 'QUEUED').length;

    const totalDuration = calls
      .filter(c => c.duration)
      .reduce((sum, c) => sum + c.duration, 0);

    const avgDuration = completedCalls > 0 ? totalDuration / completedCalls : 0;

    return {
      totalContacts: totalCalls,
      completedCalls,
      failedCalls,
      pendingCalls,
      inProgressCalls: calls.filter(c => c.status === 'IN_PROGRESS').length,
      totalDuration,
      avgDuration: Math.round(avgDuration),
      successRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
    };
  }

  /**
   * Get live calls
   */
  async getLiveCalls(campaignId: string): Promise<any[]> {
    const activeCalls = this.callOrchestrator.getActiveCalls();
    return activeCalls.filter(call => call.campaignId === campaignId);
  }

  /**
   * Get campaign calls
   */
  async getCampaignCalls(
    campaignId: string,
    options: { status?: string; limit?: number; offset?: number },
  ): Promise<any> {
    const where: any = { campaignId };

    if (options.status) {
      where.status = options.status;
    }

    const [calls, total] = await Promise.all([
      this.prisma.call.findMany({
        where,
        include: {
          contact: true,
          transcript: true,
          recording: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.call.count({ where }),
    ]);

    return {
      calls,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
  }

  /**
   * Get call transcript
   */
  async getCallTranscript(callId: string): Promise<any> {
    const transcript = await this.prisma.callTranscript.findUnique({
      where: { callId },
      include: {
        call: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }

    return transcript;
  }

  /**
   * Get call recording
   */
  async getCallRecording(callId: string): Promise<any> {
    const recording = await this.prisma.callRecording.findUnique({
      where: { callId },
      include: {
        call: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  /**
   * Test call
   */
  async testCall(
    campaignId: string,
    dto: { phoneNumber: string; contactName?: string },
  ): Promise<{ callId: string; status: string }> {
    this.logger.log(`Making test call for campaign: ${campaignId}`);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        script: true,
        voice: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Create temporary contact
    const contact = await this.prisma.contact.create({
      data: {
        companyId: campaign.companyId,
        campaignId,
        firstName: dto.contactName || 'Test',
        lastName: 'Contact',
        fullName: dto.contactName || 'Test Contact',
        phone: dto.phoneNumber,
        status: 'ACTIVE',
      },
    });

    // Initiate call
    const result = await this.callOrchestrator.initiateCall({
      campaignId,
      contactId: contact.id,
      companyId: campaign.companyId,
      scriptContent: campaign.script?.content,
      voiceId: campaign.voiceId,
      metadata: {
        isTestCall: true,
      },
    });

    return result;
  }
}
