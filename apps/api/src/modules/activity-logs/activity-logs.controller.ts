import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateActivityLogDto, ActivityLogFilterDto } from './dto/activity-log.dto';

@ApiTags('Activity Logs')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create activity log entry' })
  @ApiResponse({ status: 201, description: 'Activity log created successfully' })
  @Permissions('activity-logs.create')
  async create(
    @CurrentUser() user: any,
    @Body() createActivityLogDto: CreateActivityLogDto,
  ) {
    return this.activityLogsService.createFromDto(user.companyId, user.id, createActivityLogDto);
  }

  @Get()
  @Permissions('activity-logs.read')
  @ApiOperation({ summary: 'Get all activity logs with enhanced filtering' })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'ipAddress', required: false })
  @ApiQuery({ name: 'createdAfter', required: false })
  @ApiQuery({ name: 'createdBefore', required: false })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() filters: ActivityLogFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.activityLogsService.findAll(paginationDto, user.companyId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get activity logs statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @Permissions('activity-logs.read')
  async getStatistics(
    @CurrentUser() user: any,
    @Query('days') days?: number,
  ) {
    return this.activityLogsService.getStatistics(user.companyId, days);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  @Permissions('activity-logs.read')
  async getRecentActivity(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogsService.getRecentActivity(user.companyId, limit);
  }

  @Get('module/:module')
  @Permissions('activity-logs.read')
  @ApiOperation({ summary: 'Get activity logs by module' })
  findByModule(
    @Param('module') module: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: any,
  ) {
    return this.activityLogsService.findByModule(user.companyId, module, paginationDto);
  }

  @Get('user/:userId')
  @Permissions('activity-logs.read')
  @ApiOperation({ summary: 'Get activity logs by user' })
  findByUser(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: any,
  ) {
    return this.activityLogsService.findByUser(user.companyId, userId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity log by ID' })
  @ApiResponse({ status: 200, description: 'Activity log retrieved successfully' })
  @Permissions('activity-logs.read')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.activityLogsService.findOne(id, user.companyId);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old activity logs' })
  @ApiResponse({ status: 200, description: 'Old logs cleaned up successfully' })
  @Permissions('activity-logs.delete')
  async cleanup(
    @CurrentUser() user: any,
    @Query('daysToKeep') daysToKeep?: number,
  ) {
    return this.activityLogsService.cleanup(user.companyId, daysToKeep);
  }
}
