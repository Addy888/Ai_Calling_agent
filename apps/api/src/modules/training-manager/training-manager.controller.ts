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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrainingManagerService } from './training-manager.service';
import {
  CreateDatasetDto,
  UpdateDatasetDto,
  CreateDatasetRecordDto,
  ValidateDatasetDto,
  CreateTrainingJobDto,
  DatasetType,
  DatasetStatus,
} from './dto/training.dto';

@ApiTags('Training Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingManagerController {
  constructor(private readonly trainingService: TrainingManagerService) {}

  @Post('datasets')
  @ApiOperation({ summary: 'Create a new training dataset' })
  @ApiResponse({ status: 201, description: 'Dataset created successfully' })
  createDataset(
    @CurrentUser() user: any,
    @Body() dto: CreateDatasetDto,
  ) {
    return this.trainingService.createDataset(user.companyId, user.userId, dto);
  }

  @Get('datasets')
  @ApiOperation({ summary: 'Get all training datasets' })
  @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
  getDatasets(
    @CurrentUser() user: any,
    @Query('datasetType') datasetType?: DatasetType,
    @Query('status') status?: DatasetStatus,
    @Query('category') category?: string,
  ) {
    return this.trainingService.getDatasets(user.companyId, {
      datasetType,
      status,
      category,
    });
  }

  @Get('datasets/stats')
  @ApiOperation({ summary: 'Get dataset statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getDatasetStats(@CurrentUser() user: any) {
    return this.trainingService.getDatasetStats(user.companyId);
  }

  @Get('datasets/:id')
  @ApiOperation({ summary: 'Get dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset retrieved successfully' })
  getDatasetById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainingService.getDatasetById(user.companyId, id);
  }

  @Put('datasets/:id')
  @ApiOperation({ summary: 'Update a dataset' })
  @ApiResponse({ status: 200, description: 'Dataset updated successfully' })
  updateDataset(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateDatasetDto,
  ) {
    return this.trainingService.updateDataset(user.companyId, id, user.userId, dto);
  }

  @Delete('datasets/:id')
  @ApiOperation({ summary: 'Delete a dataset' })
  @ApiResponse({ status: 200, description: 'Dataset deleted successfully' })
  deleteDataset(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainingService.deleteDataset(user.companyId, id);
  }

  @Post('datasets/:id/records')
  @ApiOperation({ summary: 'Add record to dataset' })
  @ApiResponse({ status: 201, description: 'Record added successfully' })
  addDatasetRecord(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateDatasetRecordDto,
  ) {
    return this.trainingService.addDatasetRecord(user.companyId, id, dto);
  }

  @Get('datasets/:id/records')
  @ApiOperation({ summary: 'Get dataset records' })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  getDatasetRecords(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.trainingService.getDatasetRecords(
      user.companyId,
      id,
      page ? parseInt(String(page)) : 1,
      limit ? parseInt(String(limit)) : 50,
    );
  }

  @Post('datasets/:id/validate')
  @ApiOperation({ summary: 'Validate a dataset' })
  @ApiResponse({ status: 200, description: 'Validation started successfully' })
  validateDataset(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ValidateDatasetDto,
  ) {
    return this.trainingService.validateDataset(user.companyId, id, dto);
  }

  @Get('datasets/:id/versions')
  @ApiOperation({ summary: 'Get dataset versions' })
  @ApiResponse({ status: 200, description: 'Versions retrieved successfully' })
  getDatasetVersions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainingService.getDatasetVersions(user.companyId, id);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a training job' })
  @ApiResponse({ status: 201, description: 'Training job created successfully' })
  createTrainingJob(
    @CurrentUser() user: any,
    @Body() dto: CreateTrainingJobDto,
  ) {
    return this.trainingService.createTrainingJob(user.companyId, user.userId, dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get all training jobs' })
  @ApiResponse({ status: 200, description: 'Training jobs retrieved successfully' })
  getTrainingJobs(@CurrentUser() user: any) {
    return this.trainingService.getTrainingJobs(user.companyId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get training job by ID' })
  @ApiResponse({ status: 200, description: 'Training job retrieved successfully' })
  getTrainingJobById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trainingService.getTrainingJobById(user.companyId, id);
  }

  @Get('versions')
  @ApiOperation({ summary: 'Get all training versions' })
  @ApiResponse({ status: 200, description: 'Training versions retrieved successfully' })
  getTrainingVersions(@CurrentUser() user: any) {
    return this.trainingService.getTrainingVersions(user.companyId);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get AI readiness score' })
  @ApiResponse({ status: 200, description: 'Readiness score retrieved successfully' })
  getReadinessScore(@CurrentUser() user: any) {
    return this.trainingService.getReadinessScore(user.companyId);
  }

  @Get('validations')
  @ApiOperation({ summary: 'Get validation reports' })
  @ApiResponse({ status: 200, description: 'Validation reports retrieved successfully' })
  getValidationReports(
    @CurrentUser() user: any,
    @Query('datasetId') datasetId?: string,
  ) {
    return this.trainingService.getValidationReports(user.companyId, datasetId);
  }
}
