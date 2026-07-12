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
import { DecisionEngineService } from '../services/decision-engine.service';
import { EvaluateDecisionDto, DecisionResultDto, DecisionHistoryQueryDto, DecisionMetricsDto } from '../dto/decision.dto';

@ApiTags('Decision Engine')
@ApiBearerAuth()
@Controller('decision-engine')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DecisionEngineController {
  constructor(private readonly decisionEngineService: DecisionEngineService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Evaluate decision for conversation' })
  @ApiResponse({ status: 200, description: 'Decision evaluated successfully', type: DecisionResultDto })
  async evaluateDecision(
    @CurrentUser() user: any,
    @Body() dto: EvaluateDecisionDto,
  ): Promise<DecisionResultDto> {
    return this.decisionEngineService.evaluateDecision(user.companyId, dto);
  }

  @Get('history')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get decision history' })
  @ApiResponse({ status: 200, description: 'Decision history retrieved successfully' })
  async getDecisionHistory(
    @CurrentUser() user: any,
    @Query() query: DecisionHistoryQueryDto,
  ) {
    return this.decisionEngineService.getDecisionHistory(user.companyId, query);
  }

  @Get('metrics')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get decision metrics' })
  @ApiResponse({ status: 200, description: 'Decision metrics retrieved successfully', type: DecisionMetricsDto })
  async getDecisionMetrics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DecisionMetricsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.decisionEngineService.getDecisionMetrics(user.companyId, start, end);
  }
}
