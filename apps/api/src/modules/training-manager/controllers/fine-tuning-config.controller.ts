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
import { FineTuningConfigService } from '../services/fine-tuning-config.service';
import {
  CreateFineTuningConfigDto,
  UpdateFineTuningConfigDto,
  FineTuningConfigResponseDto,
  FineTuningConfigListResponseDto,
  FineTuningConfigValidationResultDto,
  FineTuningMethod,
  FineTuningConfigStatus,
} from '../dto/fine-tuning-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Fine-Tuning Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training/fine-tuning-configs')
export class FineTuningConfigController {
  constructor(private readonly fineTuningConfigService: FineTuningConfigService) {}

  @Post()
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Create a new fine-tuning configuration' })
  @ApiResponse({
    status: 201,
    description: 'Configuration created successfully',
    type: FineTuningConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Base model or dataset not found' })
  async createConfiguration(
    @Request() req,
    @Body() dto: CreateFineTuningConfigDto,
  ): Promise<FineTuningConfigResponseDto> {
    return this.fineTuningConfigService.createConfiguration(
      req.user.companyId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @Roles('admin', 'manager', 'ai_engineer', 'viewer')
  @ApiOperation({ summary: 'List all fine-tuning configurations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'trainingMethod', required: false, enum: FineTuningMethod })
  @ApiQuery({ name: 'status', required: false, enum: FineTuningConfigStatus })
  @ApiQuery({ name: 'baseModelId', required: false, type: String })
  @ApiQuery({ name: 'datasetId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Configurations retrieved successfully',
    type: FineTuningConfigListResponseDto,
  })
  async listConfigurations(
    @Request() req,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('trainingMethod') trainingMethod?: FineTuningMethod,
    @Query('status') status?: FineTuningConfigStatus,
    @Query('baseModelId') baseModelId?: string,
    @Query('datasetId') datasetId?: string,
    @Query('search') search?: string,
  ): Promise<FineTuningConfigListResponseDto> {
    return this.fineTuningConfigService.listConfigurations(
      req.user.companyId,
      page ? parseInt(page.toString()) : 1,
      pageSize ? parseInt(pageSize.toString()) : 20,
      {
        trainingMethod,
        status,
        baseModelId,
        datasetId,
        search,
      },
    );
  }

  @Get(':id')
  @Roles('admin', 'manager', 'ai_engineer', 'viewer')
  @ApiOperation({ summary: 'Get a specific fine-tuning configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
    type: FineTuningConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfiguration(
    @Request() req,
    @Param('id') id: string,
  ): Promise<FineTuningConfigResponseDto> {
    return this.fineTuningConfigService.getConfiguration(id, req.user.companyId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Update a fine-tuning configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    type: FineTuningConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async updateConfiguration(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateFineTuningConfigDto,
  ): Promise<FineTuningConfigResponseDto> {
    return this.fineTuningConfigService.updateConfiguration(
      id,
      req.user.companyId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a fine-tuning configuration' })
  @ApiResponse({ status: 204, description: 'Configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async deleteConfiguration(@Request() req, @Param('id') id: string): Promise<void> {
    return this.fineTuningConfigService.deleteConfiguration(
      id,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Post(':id/validate')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Validate a fine-tuning configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration validation completed',
    type: FineTuningConfigValidationResultDto,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async validateConfiguration(
    @Request() req,
    @Param('id') id: string,
  ): Promise<FineTuningConfigValidationResultDto> {
    return this.fineTuningConfigService.validateConfiguration(
      id,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Get(':id/audit-logs')
  @Roles('admin', 'manager', 'ai_engineer')
  @ApiOperation({ summary: 'Get audit logs for a configuration' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getAuditLogs(@Request() req, @Param('id') id: string): Promise<any[]> {
    // First verify the configuration exists and belongs to the company
    await this.fineTuningConfigService.getConfiguration(id, req.user.companyId);

    // This would be implemented in the service, but for now return placeholder
    return [];
  }
}
