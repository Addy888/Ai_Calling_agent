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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CheckpointConfigService } from '../services/checkpoint-config.service';
import {
  CreateCheckpointConfigDto,
  UpdateCheckpointConfigDto,
  CheckpointConfigStatus,
} from '../dto/checkpoint-config.dto';

@ApiTags('Checkpoint Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training/checkpoint-configs')
export class CheckpointConfigController {
  constructor(
    private readonly checkpointConfigService: CheckpointConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new checkpoint configuration' })
  @ApiResponse({
    status: 201,
    description: 'Checkpoint configuration created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConfiguration(
    @Request() req,
    @Body() dto: CreateCheckpointConfigDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.checkpointConfigService.createConfiguration(
      companyId,
      userId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all checkpoint configurations' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CheckpointConfigStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'saveStrategy',
    required: false,
    type: String,
    description: 'Filter by save strategy',
  })
  @ApiResponse({
    status: 200,
    description: 'Checkpoint configurations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listConfigurations(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: CheckpointConfigStatus,
    @Query('saveStrategy') saveStrategy?: string,
  ) {
    const companyId = req.user.companyId;
    return this.checkpointConfigService.listConfigurations(
      companyId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
      saveStrategy,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get checkpoint configuration statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatistics(@Request() req) {
    const companyId = req.user.companyId;
    return this.checkpointConfigService.getStatistics(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a checkpoint configuration by ID' })
  @ApiResponse({
    status: 200,
    description: 'Checkpoint configuration retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Checkpoint configuration not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConfiguration(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.checkpointConfigService.getConfiguration(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a checkpoint configuration' })
  @ApiResponse({
    status: 200,
    description: 'Checkpoint configuration updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Checkpoint configuration not found',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConfiguration(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateCheckpointConfigDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.checkpointConfigService.updateConfiguration(
      companyId,
      id,
      userId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a checkpoint configuration' })
  @ApiResponse({
    status: 204,
    description: 'Checkpoint configuration deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Checkpoint configuration not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteConfiguration(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.checkpointConfigService.deleteConfiguration(
      companyId,
      id,
      userId,
    );
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate a checkpoint configuration' })
  @ApiResponse({
    status: 200,
    description: 'Checkpoint configuration validated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Checkpoint configuration not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateConfiguration(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.checkpointConfigService.validateConfiguration(
      companyId,
      id,
      userId,
    );
  }
}
