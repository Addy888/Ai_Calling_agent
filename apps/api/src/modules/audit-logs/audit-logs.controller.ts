import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto, AuditLogFilterDto } from './dto/audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  @Permissions('audit-logs.create')
  async create(
    @CurrentUser() user: any,
    @Body() createAuditLogDto: CreateAuditLogDto,
  ) {
    return this.auditLogsService.create(user.companyId, user.id, createAuditLogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @Permissions('audit-logs.read')
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
    @Query() filters: AuditLogFilterDto,
  ) {
    return this.auditLogsService.findAll(user.companyId, paginationDto, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get audit logs statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @Permissions('audit-logs.read')
  async getStatistics(
    @CurrentUser() user: any,
    @Query('days') days?: number,
  ) {
    return this.auditLogsService.getStatistics(user.companyId, days);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiResponse({ status: 200, description: 'Entity audit logs retrieved successfully' })
  @Permissions('audit-logs.read')
  async findByEntity(
    @CurrentUser() user: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.auditLogsService.findByEntity(user.companyId, entityType, entityId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @Permissions('audit-logs.read')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.auditLogsService.findOne(id, user.companyId);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old audit logs' })
  @ApiResponse({ status: 200, description: 'Old logs cleaned up successfully' })
  @Permissions('audit-logs.delete')
  async cleanup(
    @CurrentUser() user: any,
    @Query('daysToKeep') daysToKeep?: number,
  ) {
    return this.auditLogsService.cleanup(user.companyId, daysToKeep);
  }
}