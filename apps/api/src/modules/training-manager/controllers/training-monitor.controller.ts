import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TrainingMonitorService } from '../services/training-monitor.service';
import {
  LogLevel,
  TrainingStatusResponse,
} from '../dto/training-monitor.dto';

@ApiTags('Training Monitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training/monitor')
export class TrainingMonitorController {
  constructor(
    private readonly trainingMonitorService: TrainingMonitorService,
  ) {}

  @Get('status/:sessionId')
  @ApiOperation({ summary: 'Get training status with all metrics' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiResponse({
    status: 200,
    description: 'Training status retrieved successfully',
    type: TrainingStatusResponse,
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrainingStatus(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getTrainingStatus(companyId, sessionId);
  }

  @Get('progress/:sessionId')
  @ApiOperation({ summary: 'Get training progress' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiResponse({
    status: 200,
    description: 'Training progress retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrainingProgress(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getTrainingProgress(
      companyId,
      sessionId,
    );
  }

  @Get('metrics/:sessionId')
  @ApiOperation({ summary: 'Get training metrics' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiResponse({
    status: 200,
    description: 'Training metrics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrainingMetrics(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getTrainingMetrics(companyId, sessionId);
  }

  @Get('logs/:sessionId')
  @ApiOperation({ summary: 'Get training logs' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: LogLevel,
    description: 'Filter by log level',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query',
  })
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
    description: 'Logs per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Training logs retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrainingLogs(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Query('level') level?: LogLevel,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getTrainingLogs(
      companyId,
      sessionId,
      level,
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get('timeline/:sessionId')
  @ApiOperation({ summary: 'Get training timeline events' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiResponse({
    status: 200,
    description: 'Timeline events retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeline(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getTimeline(companyId, sessionId);
  }

  @Get('alerts/:sessionId')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAlerts(@Request() req, @Param('sessionId') sessionId: string) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getAlerts(companyId, sessionId);
  }

  @Get('resources/:sessionId')
  @ApiOperation({ summary: 'Get resource usage summary' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiResponse({
    status: 200,
    description: 'Resource usage retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getResourceSummary(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ) {
    const companyId = req.user.companyId;
    return this.trainingMonitorService.getResourceSummary(companyId, sessionId);
  }

  @Post('logs/:sessionId/export')
  @ApiOperation({ summary: 'Export training logs' })
  @ApiParam({ name: 'sessionId', description: 'Training session ID' })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: LogLevel,
    description: 'Filter by log level',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    type: String,
    enum: ['json', 'csv', 'txt'],
    description: 'Export format',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs exported successfully',
  })
  @ApiResponse({ status: 404, description: 'Training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportLogs(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Query('level') level?: LogLevel,
    @Query('search') search?: string,
    @Query('format') format: string = 'json',
    @Res() res?: Response,
  ) {
    const companyId = req.user.companyId;
    const exportData = await this.trainingMonitorService.exportLogs(
      companyId,
      sessionId,
      level,
      search,
      format,
    );

    const filename = `training-logs-${sessionId}-${Date.now()}.${format}`;
    
    res.setHeader('Content-Type', this.getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(exportData);
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'txt':
        return 'text/plain';
      case 'json':
      default:
        return 'application/json';
    }
  }
}
