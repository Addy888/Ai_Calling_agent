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
import { FallbackEngineService } from '../services/fallback-engine.service';
import { TriggerFallbackDto, FallbackExecutionResultDto } from '../dto/fallback.dto';

@ApiTags('Fallback Engine')
@ApiBearerAuth()
@Controller('fallback')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FallbackController {
  constructor(private readonly fallbackService: FallbackEngineService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Trigger fallback mechanism' })
  @ApiResponse({ status: 200, description: 'Fallback triggered successfully', type: FallbackExecutionResultDto })
  async triggerFallback(
    @CurrentUser() user: any,
    @Body() dto: TriggerFallbackDto,
  ): Promise<FallbackExecutionResultDto> {
    return this.fallbackService.triggerFallback(user.companyId, dto);
  }

  @Get('statistics')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get fallback statistics' })
  @ApiResponse({ status: 200, description: 'Fallback statistics retrieved successfully' })
  async getFallbackStatistics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.fallbackService.getFallbackStatistics(user.companyId, start, end);
  }
}
