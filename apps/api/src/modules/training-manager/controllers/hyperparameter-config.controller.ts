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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HyperparameterConfigService } from '../services/hyperparameter-config.service';
import {
  CreateHyperparameterConfigDto,
  UpdateHyperparameterConfigDto,
  HyperparameterConfigResponseDto,
  HyperparameterConfigListResponseDto,
  ValidationResultDto,
  TrainingProfile,
  HyperparameterConfigStatus,
  ApplyPresetDto,
} from '../dto/hyperparameter-config.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Hyperparameter Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training/hyperparameter-configs')
export class HyperparameterConfigController {
  constructor(private readonly hyperparameterConfigService: HyperparameterConfigService) {}

  @Post()
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Create a new hyperparameter configuration' })
  @ApiResponse({
    status: 201,
    description: 'Configuration created successfully',
    type: HyperparameterConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createConfiguration(
    @Request() req,
    @Body() dto: CreateHyperparameterConfigDto,
  ): Promise<HyperparameterConfigResponseDto> {
    return this.hyperparameterConfigService.createConfiguration(
      req.user.companyId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @Roles('admin', 'manager', 'ai_engineer', 'viewer')
  @ApiOperation({ summary: 'List all hyperparameter configurations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'trainingProfile', required: false, enum: TrainingProfile })
  @ApiQuery({ name: 'status', required: false, enum: HyperparameterConfigStatus })
  @ApiQuery({ name: 'fineTuningConfigId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Configurations retrieved successfully',
    type: HyperparameterConfigListResponseDto,
  })
  async listConfigurations(
    @Request() req,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('trainingProfile') trainingProfile?: TrainingProfile,
    @Query('status') status?: HyperparameterConfigStatus,
    @Query('fineTuningConfigId') fineTuningConfigId?: string,
    @Query('search') search?: string,
  ): Promise<HyperparameterConfigListResponseDto> {
    return this.hyperparameterConfigService.listConfigurations(
      req.user.companyId,
      page ? parseInt(page.toString()) : 1,
      pageSize ? parseInt(pageSize.toString()) : 20,
      {
        trainingProfile,
        status,
        fineTuningConfigId,
        search,
      },
    );
  }

  @Get(':id')
  @Roles('admin', 'manager', 'ai_engineer', 'viewer')
  @ApiOperation({ summary: 'Get a specific hyperparameter configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
    type: HyperparameterConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfiguration(
    @Request() req,
    @Param('id') id: string,
  ): Promise<HyperparameterConfigResponseDto> {
    return this.hyperparameterConfigService.getConfiguration(id, req.user.companyId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Update a hyperparameter configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    type: HyperparameterConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async updateConfiguration(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateHyperparameterConfigDto,
  ): Promise<HyperparameterConfigResponseDto> {
    return this.hyperparameterConfigService.updateConfiguration(
      id,
      req.user.companyId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a hyperparameter configuration' })
  @ApiResponse({ status: 204, description: 'Configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async deleteConfiguration(@Request() req, @Param('id') id: string): Promise<void> {
    return this.hyperparameterConfigService.deleteConfiguration(
      id,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Post(':id/validate')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Validate a hyperparameter configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration validation completed',
    type: ValidationResultDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async validateConfiguration(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ValidationResultDto> {
    return this.hyperparameterConfigService.validateConfiguration(
      id,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Post(':id/apply-preset')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Apply a preset to configuration' })
  @ApiResponse({
    status: 200,
    description: 'Preset applied successfully',
    type: HyperparameterConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async applyPreset(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApplyPresetDto,
  ): Promise<HyperparameterConfigResponseDto> {
    return this.hyperparameterConfigService.applyPreset(
      id,
      req.user.companyId,
      req.user.userId,
      dto,
    );
  }

  @Get(':id/estimate-resources')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Get resource estimation for configuration' })
  @ApiResponse({ status: 200, description: 'Resource estimation calculated' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getResourceEstimation(@Request() req, @Param('id') id: string): Promise<any> {
    const config = await this.hyperparameterConfigService.getConfiguration(
      id,
      req.user.companyId,
    );
    return {
      estimatedTrainingTime: config.estimatedTrainingTime,
      estimatedGpuMemory: config.estimatedGpuMemory,
      estimatedRamUsage: config.estimatedRamUsage,
      estimatedCheckpointSize: config.estimatedCheckpointSize,
      estimatedStorageRequired: config.estimatedStorageRequired,
    };
  }
}
