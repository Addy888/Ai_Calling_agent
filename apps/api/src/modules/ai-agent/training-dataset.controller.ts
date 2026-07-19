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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TrainingDatasetService } from './services/training-dataset.service';
import {
  CreateTrainingDatasetDto,
  UpdateTrainingDatasetDto,
  ValidateDatasetDto,
  DatasetQueryDto,
  PreviewDatasetDto,
} from './dto/training-dataset.dto';

@ApiTags('Training Datasets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-agent/training-datasets')
export class TrainingDatasetController {
  constructor(private readonly trainingDatasetService: TrainingDatasetService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create new training dataset' })
  @ApiResponse({ status: 201, description: 'Dataset created successfully' })
  async createDataset(@Request() req, @Body() dto: CreateTrainingDatasetDto) {
    return this.trainingDatasetService.createDataset(req.user.companyId, dto);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'List all training datasets' })
  @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
  async listDatasets(@Request() req, @Query() query: DatasetQueryDto) {
    return this.trainingDatasetService.listDatasets(req.user.companyId, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get dataset details' })
  @ApiResponse({ status: 200, description: 'Dataset retrieved successfully' })
  async getDataset(@Request() req, @Param('id') id: string) {
    return this.trainingDatasetService.getDataset(req.user.companyId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update dataset' })
  @ApiResponse({ status: 200, description: 'Dataset updated successfully' })
  async updateDataset(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingDatasetDto,
  ) {
    return this.trainingDatasetService.updateDataset(req.user.companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete dataset' })
  @ApiResponse({ status: 200, description: 'Dataset deleted successfully' })
  async deleteDataset(@Request() req, @Param('id') id: string) {
    return this.trainingDatasetService.deleteDataset(req.user.companyId, id);
  }

  @Get(':id/preview')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Preview dataset samples' })
  @ApiResponse({ status: 200, description: 'Dataset preview retrieved successfully' })
  async previewDataset(
    @Request() req,
    @Param('id') id: string,
    @Query() query: PreviewDatasetDto,
  ) {
    return this.trainingDatasetService.previewDataset(req.user.companyId, id, query);
  }

  @Post(':id/validate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Validate dataset' })
  @ApiResponse({ status: 200, description: 'Dataset validation completed' })
  async validateDataset(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ValidateDatasetDto,
  ) {
    return this.trainingDatasetService.validateDataset(req.user.companyId, id, dto);
  }

  @Get(':id/statistics')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get dataset statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Request() req, @Param('id') id: string) {
    return this.trainingDatasetService.getDatasetStatistics(req.user.companyId, id);
  }

  @Post(':id/training-config')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Save training configuration' })
  @ApiResponse({ status: 200, description: 'Configuration saved successfully' })
  async saveTrainingConfig(@Request() req, @Param('id') id: string, @Body() config: any) {
    return this.trainingDatasetService.saveTrainingConfiguration(req.user.companyId, id, config);
  }

  @Get(':id/training-config')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get training configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getTrainingConfig(@Request() req, @Param('id') id: string) {
    return this.trainingDatasetService.getTrainingConfiguration(req.user.companyId, id);
  }
}
