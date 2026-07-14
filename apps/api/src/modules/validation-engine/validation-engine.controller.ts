import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ValidationEngineService } from './validation-engine.service';

@ApiTags('Validation Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('validation')
export class ValidationEngineController {
  constructor(private readonly validationService: ValidationEngineService) {}

  @Post('datasets/:datasetId/coverage')
  @ApiOperation({ summary: 'Calculate dataset coverage' })
  @ApiResponse({ status: 200, description: 'Coverage calculated successfully' })
  calculateCoverage(@CurrentUser() user: any, @Param('datasetId') datasetId: string) {
    return this.validationService.calculateCoverage(user.companyId, datasetId);
  }

  @Post('datasets/:datasetId/quality')
  @ApiOperation({ summary: 'Validate dataset quality' })
  @ApiResponse({ status: 200, description: 'Quality validated successfully' })
  validateDataQuality(@CurrentUser() user: any, @Param('datasetId') datasetId: string) {
    return this.validationService.validateDataQuality(user.companyId, datasetId);
  }

  @Post('readiness-report')
  @ApiOperation({ summary: 'Generate AI readiness report' })
  @ApiResponse({ status: 200, description: 'Readiness report generated successfully' })
  generateReadinessReport(@CurrentUser() user: any) {
    return this.validationService.generateReadinessReport(user.companyId);
  }

  @Get('readiness-report/:versionId')
  @ApiOperation({ summary: 'Get readiness report for specific version' })
  @ApiResponse({ status: 200, description: 'Readiness report retrieved successfully' })
  getReadinessReport(@CurrentUser() user: any, @Param('versionId') versionId: string) {
    return this.validationService.generateReadinessReport(user.companyId, versionId);
  }
}
