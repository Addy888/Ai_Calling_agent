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
import { VoiceStudioService } from './services/voice-studio.service';
import { VoiceBrainIntegrationService, VoiceGenerationResponse } from './services/voice-brain-integration.service';
import {
  CreateVoiceProviderDto,
  CreateVoiceLibraryDto,
  UpdateVoiceLibraryDto,
  VoiceConfigurationDto,
  VoicePreviewDto,
  VoiceGenerationDto,
  VoiceHistoryQueryDto,
  SetActiveVoiceDto,
} from './dto/voice-studio.dto';

@ApiTags('Voice Studio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/voice-studio')
export class VoiceStudioController {
  constructor(
    private readonly voiceStudioService: VoiceStudioService,
    private readonly voiceBrainIntegration: VoiceBrainIntegrationService,
  ) {}

  @Post('providers')
  @ApiOperation({ summary: 'Create voice provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  async createProvider(@Body() dto: CreateVoiceProviderDto) {
    return this.voiceStudioService.createProvider(dto);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get all voice providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProviders() {
    return this.voiceStudioService.getProviders();
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get voice provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  async getProvider(@Param('id') id: string) {
    return this.voiceStudioService.getProvider(id);
  }

  @Get('providers/:type/available-voices')
  @ApiOperation({ summary: 'Get available voices from provider' })
  @ApiResponse({ status: 200, description: 'Available voices retrieved' })
  async getAvailableVoices(@Param('type') type: string) {
    return this.voiceStudioService.getAvailableVoices(type);
  }

  @Get('providers/:type/health')
  @ApiOperation({ summary: 'Check provider health' })
  @ApiResponse({ status: 200, description: 'Provider health status' })
  async getProviderHealth(@Param('type') type: string) {
    return this.voiceStudioService.getProviderHealth(type);
  }

  @Post('voices')
  @ApiOperation({ summary: 'Create voice in library' })
  @ApiResponse({ status: 201, description: 'Voice created successfully' })
  async createVoice(@Req() req: any, @Body() dto: CreateVoiceLibraryDto) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.createVoice(companyId, dto);
  }

  @Get('voices')
  @ApiOperation({ summary: 'Get voice library' })
  @ApiResponse({ status: 200, description: 'Voices retrieved successfully' })
  async getVoices(
    @Req() req: any,
    @Query('language') language?: string,
    @Query('gender') gender?: string,
  ) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.getVoices(companyId, language, gender);
  }

  @Get('voices/:id')
  @ApiOperation({ summary: 'Get voice by ID' })
  @ApiResponse({ status: 200, description: 'Voice retrieved successfully' })
  async getVoice(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.getVoice(id, companyId);
  }

  @Put('voices/:id')
  @ApiOperation({ summary: 'Update voice' })
  @ApiResponse({ status: 200, description: 'Voice updated successfully' })
  async updateVoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVoiceLibraryDto,
  ) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.updateVoice(id, companyId, dto);
  }

  @Delete('voices/:id')
  @ApiOperation({ summary: 'Delete voice' })
  @ApiResponse({ status: 200, description: 'Voice deleted successfully' })
  async deleteVoice(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.deleteVoice(id, companyId);
  }

  @Post('voices/set-active')
  @ApiOperation({ summary: 'Set active voice for language and gender' })
  @ApiResponse({ status: 200, description: 'Active voice set successfully' })
  async setActiveVoice(@Req() req: any, @Body() dto: SetActiveVoiceDto) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.setActiveVoice(companyId, dto.voiceId);
  }

  @Get('configuration')
  @ApiOperation({ summary: 'Get voice configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getConfiguration(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.getConfiguration(companyId);
  }

  @Put('configuration')
  @ApiOperation({ summary: 'Update voice configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateConfiguration(@Req() req: any, @Body() dto: VoiceConfigurationDto) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.updateConfiguration(companyId, dto);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Generate voice preview' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async generatePreview(@Req() req: any, @Body() dto: VoicePreviewDto) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.generatePreview(companyId, dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate voice from text' })
  @ApiResponse({ status: 200, description: 'Voice generated successfully' })
  async generateVoice(@Req() req: any, @Body() dto: VoiceGenerationDto) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.generateVoice(companyId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get voice generation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getHistory(@Req() req: any, @Query() query: VoiceHistoryQueryDto) {
    const companyId = req.user.companyId;
    return this.voiceStudioService.getHistory(companyId, query);
  }

  @Post('integration/test')
  @ApiOperation({ summary: 'Test voice integration with AI brain' })
  @ApiResponse({ status: 200, description: 'Integration test completed' })
  async testIntegration(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.voiceBrainIntegration.testVoiceIntegration(companyId);
  }

  @Post('integration/generate-from-prompt')
  @ApiOperation({ summary: 'Generate voice from prompt response' })
  @ApiResponse({ status: 200, description: 'Voice generated from prompt' })
  async generateFromPrompt(
    @Req() req: any,
    @Body()
    body: {
      agentId: string;
      sessionId: string;
      promptResponse: string;
      language?: string;
      gender?: string;
    },
  ): Promise<VoiceGenerationResponse> {
    return this.voiceBrainIntegration.generateVoiceFromPromptResponse(
      body.agentId,
      body.sessionId,
      body.promptResponse,
      {
        language: body.language,
        gender: body.gender,
        saveToHistory: true,
      },
    );
  }
}
