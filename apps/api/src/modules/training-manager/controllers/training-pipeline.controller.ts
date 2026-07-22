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
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TrainingPipelineService } from '../services/training-pipeline.service';
import {
  CreateTrainingPipelineDto,
  UpdateTrainingPipelineDto,
  PrepareTrainingSessionDto,
  EstimateResourcesDto,
  GenerateCheckpointPlanDto,
  QueuePipelineDto,
  TrainingPipelineStatus,
  TrainingPipelineStage,
  PipelineValidationResponseDto,
  PipelineSummaryResponseDto,
  TrainingSessionResponseDto,
  ResourceEstimationDto,
  CheckpointPlanDto,
} from '../dto/training-pipeline.dto';

@ApiTags('Training Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training-pipeline')
export class TrainingPipelineController {
  constructor(private readonly pipelineService: TrainingPipelineService) {}

  @Post()
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Create a new training pipeline' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pipeline created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Training session, dataset, or model not found',
  })
  async createPipeline(
    @CurrentUser() user: any,
    @Body() dto: CreateTrainingPipelineDto,
  ) {
    return this.pipelineService.createPipeline(user.companyId, user.userId, dto);
  }

  @Get()
  @Roles('admin', 'training_manager', 'training_viewer')
  @ApiOperation({ summary: 'Get all training pipelines' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipelines retrieved successfully',
  })
  async getPipelines(
    @CurrentUser() user: any,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: TrainingPipelineStatus,
    @Query('stage') stage?: TrainingPipelineStage,
  ) {
    return this.pipelineService.getPipelines(user.companyId, {
      sessionId,
      status,
      stage,
    });
  }

  @Get(':id')
  @Roles('admin', 'training_manager', 'training_viewer')
  @ApiOperation({ summary: 'Get pipeline by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async getPipelineById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.pipelineService.getPipelineById(user.companyId, id);
  }

  @Get(':id/summary')
  @Roles('admin', 'training_manager', 'training_viewer')
  @ApiOperation({ summary: 'Get pipeline summary with timeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline summary retrieved successfully',
    type: PipelineSummaryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async getPipelineSummary(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<PipelineSummaryResponseDto> {
    return this.pipelineService.getPipelineSummary(user.companyId, id);
  }

  @Put(':id')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Update pipeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async updatePipeline(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingPipelineDto,
  ) {
    return this.pipelineService.updatePipeline(user.companyId, id, user.userId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Delete pipeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async deletePipeline(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.pipelineService.deletePipeline(user.companyId, id, user.userId);
  }

  @Post(':id/cancel')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Cancel pipeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async cancelPipeline(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.pipelineService.cancelPipeline(user.companyId, id, user.userId);
  }

  @Post(':id/validate')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Validate training pipeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline validated successfully',
    type: PipelineValidationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async validatePipeline(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<PipelineValidationResponseDto> {
    return this.pipelineService.validatePipeline(user.companyId, id);
  }

  @Post('prepare-session')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Prepare training session and create pipeline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Training session prepared successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Training session not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  async prepareTrainingSession(
    @CurrentUser() user: any,
    @Body() dto: PrepareTrainingSessionDto,
  ) {
    return this.pipelineService.prepareTrainingSession(user.companyId, user.userId, dto);
  }

  @Post('estimate-resources')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Estimate resources required for training' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resources estimated successfully',
    type: ResourceEstimationDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dataset or model not found',
  })
  async estimateResources(
    @CurrentUser() user: any,
    @Body() dto: EstimateResourcesDto,
  ): Promise<ResourceEstimationDto> {
    return this.pipelineService.estimateResources(user.companyId, dto);
  }

  @Post('generate-checkpoint-plan')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Generate checkpoint plan' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Checkpoint plan generated successfully',
    type: CheckpointPlanDto,
  })
  async generateCheckpointPlan(
    @Body() dto: GenerateCheckpointPlanDto,
  ): Promise<CheckpointPlanDto> {
    return this.pipelineService.generateCheckpointPlan(dto);
  }

  @Post('queue')
  @Roles('admin', 'training_manager')
  @ApiOperation({ summary: 'Queue pipeline for execution' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline queued successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Pipeline not ready for queueing',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  async queuePipeline(
    @CurrentUser() user: any,
    @Body() dto: QueuePipelineDto,
  ) {
    return this.pipelineService.queuePipeline(user.companyId, user.userId, dto);
  }

  @Get('session/:sessionId')
  @Roles('admin', 'training_manager', 'training_viewer')
  @ApiOperation({ summary: 'Get training session with pipelines' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Training session retrieved successfully',
    type: TrainingSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Training session not found',
  })
  async getTrainingSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ): Promise<TrainingSessionResponseDto> {
    return this.pipelineService.getTrainingSession(user.companyId, sessionId);
  }
}
