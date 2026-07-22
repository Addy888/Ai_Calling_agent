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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ModelSelectionService } from '../services/model-selection.service';
import {
  SelectBaseModelDto,
  UpdateModelSelectionDto,
  CompareModelsDto,
  ModelRecommendationRequestDto,
  ModelComparisonResponseDto,
  ModelRecommendationResponseDto,
  SelectedModelResponseDto,
  AvailableModelsResponseDto,
} from '../dto/model-selection.dto';

@ApiTags('Base Model Selection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training/model-selection')
export class ModelSelectionController {
  constructor(private readonly modelSelectionService: ModelSelectionService) {}

  @Get('available-models')
  @ApiOperation({ summary: 'Get all available base models for selection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Available models retrieved successfully',
    type: AvailableModelsResponseDto,
  })
  async getAvailableModels(
    @CurrentUser() user: any,
  ): Promise<AvailableModelsResponseDto> {
    return this.modelSelectionService.getAvailableModels(user.companyId);
  }

  @Post('select')
  @ApiOperation({ summary: 'Select a base model for training' })
  @ApiResponse({ 
    status: 201, 
    description: 'Base model selected successfully',
    type: SelectedModelResponseDto,
  })
  async selectBaseModel(
    @CurrentUser() user: any,
    @Body() dto: SelectBaseModelDto,
  ): Promise<SelectedModelResponseDto> {
    return this.modelSelectionService.selectBaseModel(user.companyId, user.userId, dto);
  }

  @Get('selected')
  @ApiOperation({ summary: 'Get currently selected base model' })
  @ApiResponse({ 
    status: 200, 
    description: 'Selected model retrieved successfully',
    type: SelectedModelResponseDto,
  })
  async getSelectedModel(
    @CurrentUser() user: any,
    @Query('trainingConfigId') trainingConfigId?: string,
  ): Promise<SelectedModelResponseDto | null> {
    return this.modelSelectionService.getSelectedModel(user.companyId, trainingConfigId);
  }

  @Put(':selectionId')
  @ApiOperation({ summary: 'Update model selection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model selection updated successfully',
    type: SelectedModelResponseDto,
  })
  async updateSelection(
    @CurrentUser() user: any,
    @Param('selectionId') selectionId: string,
    @Body() dto: UpdateModelSelectionDto,
  ): Promise<SelectedModelResponseDto> {
    return this.modelSelectionService.updateSelection(
      user.companyId,
      selectionId,
      user.userId,
      dto,
    );
  }

  @Delete(':selectionId')
  @ApiOperation({ summary: 'Remove model selection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model selection removed successfully',
  })
  async removeSelection(
    @CurrentUser() user: any,
    @Param('selectionId') selectionId: string,
  ): Promise<{ message: string }> {
    return this.modelSelectionService.removeSelection(
      user.companyId,
      selectionId,
      user.userId,
    );
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare multiple models' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model comparison completed successfully',
    type: ModelComparisonResponseDto,
  })
  async compareModels(
    @CurrentUser() user: any,
    @Body() dto: CompareModelsDto,
  ): Promise<ModelComparisonResponseDto> {
    return this.modelSelectionService.compareModels(user.companyId, dto);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Get recommended model based on dataset and requirements' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model recommendation generated successfully',
    type: ModelRecommendationResponseDto,
  })
  async getRecommendedModel(
    @CurrentUser() user: any,
    @Body() dto: ModelRecommendationRequestDto,
  ): Promise<ModelRecommendationResponseDto> {
    return this.modelSelectionService.getRecommendedModel(user.companyId, dto);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get model selection audit logs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Audit logs retrieved successfully',
  })
  async getAuditLogs(
    @CurrentUser() user: any,
    @Query('modelId') modelId?: string,
  ) {
    return this.modelSelectionService.getSelectionAuditLogs(user.companyId, modelId);
  }
}
