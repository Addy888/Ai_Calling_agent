import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TrainingReadinessService } from '../services/readiness.service';
import {
  RunReadinessCheckDto,
  GetLatestReadinessDto,
  ReadinessReportResponseDto,
  ReadinessSummaryDto,
  QuickReadinessDto,
} from '../dto/readiness.dto';

@ApiTags('Training Readiness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training/readiness')
export class TrainingReadinessController {
  constructor(private readonly readinessService: TrainingReadinessService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Run comprehensive training readiness check' })
  @ApiResponse({ status: 200, description: 'Readiness check completed', type: ReadinessReportResponseDto })
  async runReadinessCheck(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RunReadinessCheckDto,
  ): Promise<ReadinessReportResponseDto> {
    return this.readinessService.runReadinessCheck(companyId, userId, dto);
  }

  @Get('report/:id')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get readiness report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved', type: ReadinessReportResponseDto })
  async getReportById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') reportId: string,
  ): Promise<ReadinessReportResponseDto> {
    return this.readinessService.getReportById(companyId, reportId);
  }

  @Get('latest')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get latest readiness report' })
  @ApiResponse({ status: 200, description: 'Latest report retrieved', type: ReadinessReportResponseDto })
  async getLatestReport(
    @CurrentUser('companyId') companyId: string,
    @Query() dto: GetLatestReadinessDto,
  ): Promise<ReadinessReportResponseDto | null> {
    return this.readinessService.getLatestReport(companyId, dto);
  }

  @Get('reports')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get all readiness reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved', type: [ReadinessReportResponseDto] })
  async getAllReports(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReadinessReportResponseDto[]> {
    return this.readinessService.getAllReports(companyId);
  }

  @Get('summary')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get readiness summary statistics' })
  @ApiResponse({ status: 200, description: 'Summary retrieved', type: ReadinessSummaryDto })
  async getSummary(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReadinessSummaryDto> {
    return this.readinessService.getSummary(companyId);
  }

  @Delete('report/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete readiness report' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async deleteReport(
    @CurrentUser('companyId') companyId: string,
    @Param('id') reportId: string,
  ): Promise<{ message: string }> {
    return this.readinessService.deleteReport(companyId, reportId);
  }
}
