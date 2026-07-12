import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LeadQualificationService } from '../services/lead-qualification.service';
import { QualifyLeadDto, LeadQualificationResultDto, LeadStatusQueryDto } from '../dto/lead-qualification.dto';

@ApiTags('Lead Qualification')
@ApiBearerAuth()
@Controller('lead-qualification')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadQualificationController {
  constructor(private readonly leadQualificationService: LeadQualificationService) {}

  @Post('qualify')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Qualify a lead' })
  @ApiResponse({ status: 200, description: 'Lead qualified successfully', type: LeadQualificationResultDto })
  async qualifyLead(
    @CurrentUser() user: any,
    @Body() dto: QualifyLeadDto,
  ): Promise<LeadQualificationResultDto> {
    return this.leadQualificationService.qualifyLead(user.companyId, dto);
  }

  @Get('statistics')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get lead qualification statistics' })
  @ApiResponse({ status: 200, description: 'Lead statistics retrieved successfully' })
  async getLeadStatistics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.leadQualificationService.getLeadStatistics(user.companyId, start, end);
  }
}
