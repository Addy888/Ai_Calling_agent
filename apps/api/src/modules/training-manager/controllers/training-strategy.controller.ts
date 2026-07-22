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
import { TrainingStrategyService } from '../services/training-strategy.service';
import {
  CreateTrainingStrategyDto,
  UpdateTrainingStrategyDto,
  TrainingStrategyStatus,
} from '../dto/training-strategy.dto';

@ApiTags('Training Strategy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training/strategies')
export class TrainingStrategyController {
  constructor(
    private readonly trainingStrategyService: TrainingStrategyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new training strategy' })
  @ApiResponse({
    status: 201,
    description: 'Training strategy created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createStrategy(
    @Request() req,
    @Body() dto: CreateTrainingStrategyDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.trainingStrategyService.createStrategy(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all training strategies' })
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
    enum: TrainingStrategyStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'strategyType',
    required: false,
    type: String,
    description: 'Filter by strategy type',
  })
  @ApiResponse({
    status: 200,
    description: 'Training strategies retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listStrategies(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TrainingStrategyStatus,
    @Query('strategyType') strategyType?: string,
  ) {
    const companyId = req.user.companyId;
    return this.trainingStrategyService.listStrategies(
      companyId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
      strategyType,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get training strategy statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatistics(@Request() req) {
    const companyId = req.user.companyId;
    return this.trainingStrategyService.getStrategyStatistics(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a training strategy by ID' })
  @ApiResponse({
    status: 200,
    description: 'Training strategy retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training strategy not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStrategy(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.trainingStrategyService.getStrategy(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a training strategy' })
  @ApiResponse({
    status: 200,
    description: 'Training strategy updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Training strategy not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateStrategy(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingStrategyDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.trainingStrategyService.updateStrategy(
      companyId,
      id,
      userId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a training strategy' })
  @ApiResponse({
    status: 204,
    description: 'Training strategy deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Training strategy not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteStrategy(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.trainingStrategyService.deleteStrategy(companyId, id, userId);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate a training strategy' })
  @ApiResponse({
    status: 200,
    description: 'Training strategy validated successfully',
  })
  @ApiResponse({ status: 404, description: 'Training strategy not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateStrategy(@Request() req, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.trainingStrategyService.validateStrategy(companyId, id, userId);
  }
}
