import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CampaignApiService } from './campaign-api.service';

/**
 * Campaign API Controller
 * Complete campaign management including creation, execution, and monitoring
 */
@ApiTags('Campaign Management')
@Controller('campaigns')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class CampaignApiController {
  constructor(private readonly campaignService: CampaignApiService) {}

  /**
   * Create a new campaign
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new campaign' })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
  ): Promise<any> {
    return this.campaignService.createCampaign(dto);
  }

  /**
   * Update campaign
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update campaign' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<any> {
    return this.campaignService.updateCampaign(id, dto);
  }

  /**
   * Get campaign by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async getCampaign(@Param('id') id: string): Promise<any> {
    return this.campaignService.getCampaign(id);
  }

  /**
   * Get all campaigns
   */
  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  async getCampaigns(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ): Promise<any[]> {
    return this.campaignService.getCampaigns({ companyId, status });
  }

  /**
   * Upload contacts for campaign
   */
  @Post(':id/contacts/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload contacts CSV/Excel for campaign' })
  async uploadContacts(
    @Param('id') campaignId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; imported: number; failed: number }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.campaignService.uploadContacts(campaignId, file);
  }

  /**
   * Upload script for campaign
   */
  @Post(':id/script/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload script file for campaign' })
  async uploadScript(
    @Param('id') campaignId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; scriptId: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.campaignService.uploadScript(campaignId, file);
  }

  /**
   * Start campaign execution
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start campaign execution' })
  async startCampaign(
    @Param('id') campaignId: string,
    @Body() options?: { concurrentCalls?: number },
  ): Promise<{ executionId: string; status: string }> {
    return this.campaignService.startCampaign(campaignId, options);
  }

  /**
   * Pause campaign
   */
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause campaign execution' })
  async pauseCampaign(
    @Param('id') campaignId: string,
  ): Promise<{ success: boolean }> {
    return this.campaignService.pauseCampaign(campaignId);
  }

  /**
   * Resume campaign
   */
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume campaign execution' })
  async resumeCampaign(
    @Param('id') campaignId: string,
  ): Promise<{ success: boolean }> {
    return this.campaignService.resumeCampaign(campaignId);
  }

  /**
   * Stop campaign
   */
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop campaign execution' })
  async stopCampaign(
    @Param('id') campaignId: string,
    @Body() options?: { force?: boolean },
  ): Promise<{ success: boolean }> {
    return this.campaignService.stopCampaign(campaignId, options?.force);
  }

  /**
   * Get campaign status
   */
  @Get(':id/status')
  @ApiOperation({ summary: 'Get campaign execution status' })
  async getCampaignStatus(@Param('id') campaignId: string): Promise<any> {
    return this.campaignService.getCampaignStatus(campaignId);
  }

  /**
   * Get campaign analytics
   */
  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get campaign analytics' })
  async getCampaignAnalytics(@Param('id') campaignId: string): Promise<any> {
    return this.campaignService.getCampaignAnalytics(campaignId);
  }

  /**
   * Get live calls for campaign
   */
  @Get(':id/live-calls')
  @ApiOperation({ summary: 'Get live calls for campaign' })
  async getLiveCalls(@Param('id') campaignId: string): Promise<any[]> {
    return this.campaignService.getLiveCalls(campaignId);
  }

  /**
   * Get call history for campaign
   */
  @Get(':id/calls')
  @ApiOperation({ summary: 'Get call history for campaign' })
  async getCampaignCalls(
    @Param('id') campaignId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<any> {
    return this.campaignService.getCampaignCalls(campaignId, {
      status,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  /**
   * Get call transcript
   */
  @Get('calls/:callId/transcript')
  @ApiOperation({ summary: 'Get call transcript' })
  async getCallTranscript(@Param('callId') callId: string): Promise<any> {
    return this.campaignService.getCallTranscript(callId);
  }

  /**
   * Get call recording URL
   */
  @Get('calls/:callId/recording')
  @ApiOperation({ summary: 'Get call recording URL' })
  async getCallRecording(@Param('callId') callId: string): Promise<any> {
    return this.campaignService.getCallRecording(callId);
  }

  /**
   * Test call (single contact)
   */
  @Post(':id/test-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make a test call for campaign' })
  async testCall(
    @Param('id') campaignId: string,
    @Body() dto: { phoneNumber: string; contactName?: string },
  ): Promise<{ callId: string; status: string }> {
    return this.campaignService.testCall(campaignId, dto);
  }
}

// DTOs

export class CreateCampaignDto {
  companyId: string;
  userId: string;
  name: string;
  description?: string;
  scriptId?: string;
  voiceId?: string;
  promptId?: string;
  settings?: any;
}

export class UpdateCampaignDto {
  name?: string;
  description?: string;
  scriptId?: string;
  voiceId?: string;
  promptId?: string;
  status?: string;
  settings?: any;
}
