import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CompatibilityService } from '../services/compatibility.service';
import {
  RunCompatibilityCheckDto,
  CompatibilityReportResponseDto,
  CompatibilitySummaryDto,
} from '../dto/compatibility.dto';

@ApiTags('Model Compatibility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training/compatibility')
export class CompatibilityController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @Post('check')
  @ApiOperation({ summary: 'Run comprehensive compatibility check' })
  @ApiResponse({
    status: 201,
    description: 'Compatibility check completed',
    type: CompatibilityReportResponseDto,
  })
  async runCompatibilityCheck(
    @CurrentUser() user: any,
    @Body() dto: RunCompatibilityCheckDto,
  ): Promise<CompatibilityReportResponseDto> {
    return this.compatibilityService.runCompatibilityCheck(
      user.companyId,
      user.userId,
      dto,
    );
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get compatibility report by ID' })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
    type: CompatibilityReportResponseDto,
  })
  async getReportById(
    @CurrentUser() user: any,
    @Param('reportId') reportId: string,
  ): Promise<CompatibilityReportResponseDto> {
    return this.compatibilityService.getReportById(user.companyId, reportId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get all compatibility reports' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: [CompatibilityReportResponseDto],
  })
  async getAllReports(@CurrentUser() user: any): Promise<CompatibilityReportResponseDto[]> {
    return this.compatibilityService.getAllReports(user.companyId);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest compatibility report for dataset/model combination' })
  @ApiQuery({ name: 'datasetId', required: true })
  @ApiQuery({ name: 'modelRegistryId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Latest report retrieved successfully',
    type: CompatibilityReportResponseDto,
  })
  async getLatestReport(
    @CurrentUser() user: any,
    @Query('datasetId') datasetId: string,
    @Query('modelRegistryId') modelRegistryId: string,
  ): Promise<CompatibilityReportResponseDto | null> {
    return this.compatibilityService.getLatestReport(
      user.companyId,
      datasetId,
      modelRegistryId,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get compatibility summary statistics' })
  @ApiResponse({
    status: 200,
    description: 'Summary retrieved successfully',
    type: CompatibilitySummaryDto,
  })
  async getCompatibilitySummary(
    @CurrentUser() user: any,
  ): Promise<CompatibilitySummaryDto> {
    return this.compatibilityService.getCompatibilitySummary(user.companyId);
  }

  @Delete('reports/:reportId')
  @ApiOperation({ summary: 'Delete compatibility report' })
  @ApiResponse({
    status: 200,
    description: 'Report deleted successfully',
  })
  async deleteReport(
    @CurrentUser() user: any,
    @Param('reportId') reportId: string,
  ): Promise<{ message: string }> {
    return this.compatibilityService.deleteReport(user.companyId, reportId);
  }
}
