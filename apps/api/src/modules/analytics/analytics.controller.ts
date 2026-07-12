import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AnalyticsService } from './analytics.service';
import { 
  CreateAnalyticsDto, 
  AnalyticsFilterDto, 
  DashboardStatsDto, 
  ChartDataDto 
} from './dto/analytics.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Create analytics data' })
  @ApiResponse({ status: 201, description: 'Analytics data created successfully' })
  @Permissions('analytics.create')
  async create(
    @CurrentUser() user: any,
    @Body() createAnalyticsDto: CreateAnalyticsDto,
  ) {
    return this.analyticsService.createAnalytic(user.companyId, createAnalyticsDto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  @Permissions('analytics.read')
  async getDashboardStats(
    @CurrentUser() user: any,
    @Query() filters: DashboardStatsDto,
  ) {
    return this.analyticsService.getDashboardStats(user.companyId, filters);
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get chart data' })
  @ApiResponse({ status: 200, description: 'Chart data retrieved successfully' })
  @Permissions('analytics.read')
  async getChartData(
    @CurrentUser() user: any,
    @Query() params: ChartDataDto,
  ) {
    return this.analyticsService.getChartData(user.companyId, params);
  }

  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  @Permissions('analytics.read')
  async getRecentActivity(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getRecentActivity(user.companyId, limit);
  }

  @Get('campaigns/top')
  @ApiOperation({ summary: 'Get top campaigns' })
  @ApiResponse({ status: 200, description: 'Top campaigns retrieved successfully' })
  @Permissions('analytics.read')
  async getTopCampaigns(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getTopCampaigns(user.companyId, limit);
  }

  @Get('campaigns/stats')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiResponse({ status: 200, description: 'Campaign statistics retrieved successfully' })
  @Permissions('analytics.read')
  async getCampaignStats(@CurrentUser() user: any) {
    return this.analyticsService.getCampaignStats(user.companyId);
  }

  @Get('contacts/stats')
  @ApiOperation({ summary: 'Get contact statistics' })
  @ApiResponse({ status: 200, description: 'Contact statistics retrieved successfully' })
  @Permissions('analytics.read')
  async getContactStats(@CurrentUser() user: any) {
    return this.analyticsService.getContactStats(user.companyId);
  }

  @Get('storage/stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage statistics retrieved successfully' })
  @Permissions('analytics.read')
  async getStorageStats(@CurrentUser() user: any) {
    return this.analyticsService.getStorageStats(user.companyId);
  }
}