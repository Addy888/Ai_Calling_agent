import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { SystemHealthService } from './system-health.service';
import { CreateSystemHealthDto, SystemHealthFilterDto, SystemComponent } from './dto/system-health.dto';

@ApiTags('System Health')
@ApiBearerAuth()
@Controller('system-health')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  @Post()
  @ApiOperation({ summary: 'Create system health record' })
  @ApiResponse({ status: 201, description: 'System health record created successfully' })
  @Permissions('system-health.create')
  async create(@Body() createSystemHealthDto: CreateSystemHealthDto) {
    return this.systemHealthService.create(createSystemHealthDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get system health records' })
  @ApiResponse({ status: 200, description: 'System health records retrieved successfully' })
  @Permissions('system-health.read')
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query() filters: SystemHealthFilterDto,
  ) {
    return this.systemHealthService.findAll(paginationDto, filters);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest system status' })
  @ApiResponse({ status: 200, description: 'Latest system status retrieved successfully' })
  @Permissions('system-health.read')
  async getLatestStatus() {
    return this.systemHealthService.getLatestStatus();
  }

  @Get('overall')
  @ApiOperation({ summary: 'Get overall system health' })
  @ApiResponse({ status: 200, description: 'Overall system health retrieved successfully' })
  @Permissions('system-health.read')
  async getOverallHealth() {
    return this.systemHealthService.getOverallHealth();
  }

  @Post('check')
  @ApiOperation({ summary: 'Perform system health check' })
  @ApiResponse({ status: 200, description: 'System health check completed' })
  @Permissions('system-health.create')
  async checkSystemHealth() {
    return this.systemHealthService.checkSystemHealth();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get system health history' })
  @ApiResponse({ status: 200, description: 'System health history retrieved successfully' })
  @Permissions('system-health.read')
  async getHealthHistory(
    @Query('component') component?: SystemComponent,
    @Query('hours') hours?: number,
  ) {
    return this.systemHealthService.getHealthHistory(component, hours);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get system health statistics' })
  @ApiResponse({ status: 200, description: 'System health statistics retrieved successfully' })
  @Permissions('system-health.read')
  async getHealthStatistics(@Query('days') days?: number) {
    return this.systemHealthService.getHealthStatistics(days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get system health record by ID' })
  @ApiResponse({ status: 200, description: 'System health record retrieved successfully' })
  @Permissions('system-health.read')
  async findOne(@Param('id') id: string) {
    return this.systemHealthService.findOne(id);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old system health records' })
  @ApiResponse({ status: 200, description: 'Old records cleaned up successfully' })
  @Permissions('system-health.delete')
  async cleanup(@Query('daysToKeep') daysToKeep?: number) {
    return this.systemHealthService.cleanup(daysToKeep);
  }
}