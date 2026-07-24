import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ReportsService } from './reports.service';
import { 
  CreateReportDto, 
  UpdateReportDto, 
  ReportFilterDto, 
  ExecuteReportDto 
} from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  @Permissions('reports.create')
  async create(
    @CurrentUser() user: any,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.reportsService.create(user.companyId, user.id, createReportDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  @Permissions('reports.read')
  async findAll(
    @CurrentUser() user: any,
    @Query() query: ReportFilterDto,
  ) {
    return this.reportsService.findAll(user.companyId, query, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @Permissions('reports.read')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.reportsService.findOne(id, user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a report' })
  @ApiResponse({ status: 200, description: 'Report updated successfully' })
  @Permissions('reports.update')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, user.companyId, user.id, updateReportDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @Permissions('reports.delete')
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.reportsService.remove(id, user.companyId);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a report' })
  @ApiResponse({ status: 200, description: 'Report executed successfully' })
  @Permissions('reports.execute')
  async execute(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() params: ExecuteReportDto,
  ) {
    return this.reportsService.execute(id, user.companyId, user.id, params);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get report executions' })
  @ApiResponse({ status: 200, description: 'Report executions retrieved successfully' })
  @Permissions('reports.read')
  async getExecutions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.reportsService.getExecutions(id, user.companyId, paginationDto);
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get a specific report execution' })
  @ApiResponse({ status: 200, description: 'Report execution retrieved successfully' })
  @Permissions('reports.read')
  async getExecution(
    @CurrentUser() user: any,
    @Param('executionId') executionId: string,
  ) {
    return this.reportsService.getExecution(executionId, user.companyId);
  }
}