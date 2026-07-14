import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EvaluationEngineService } from './services/evaluation-engine.service';
import {
  EvaluateConversationDto,
  EvaluationReportDto,
  UpdateEvaluationConfigurationDto,
  EvaluationConfigurationDto,
  EvaluationAnalyticsDto,
} from './dto/evaluation.dto';

@ApiTags('Evaluation')
@ApiBearerAuth()
@Controller('evaluation')
@UseGuards(JwtAuthGuard)
export class EvaluationController {
  constructor(
    private readonly evaluationEngineService: EvaluationEngineService,
  ) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation evaluated successfully' })
  async evaluateConversation(
    @Body() dto: EvaluateConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.evaluationEngineService.evaluateConversation(
      dto.conversationId,
      dto.sessionId,
      user.companyId,
    );
  }

  @Get('report/:conversationId')
  @ApiOperation({ summary: 'Get evaluation report' })
  @ApiResponse({ status: 200, description: 'Evaluation report retrieved' })
  async getEvaluationReport(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.evaluationEngineService.getEvaluationReport(
      conversationId,
      user.companyId,
    );
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get evaluation analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getEvaluationAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.evaluationEngineService.getEvaluationAnalytics(
      user.companyId,
      start,
      end,
    );
  }

  @Get('configuration')
  @ApiOperation({ summary: 'Get evaluation configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getEvaluationConfiguration(@CurrentUser() user: any) {
    return this.evaluationEngineService.getEvaluationConfiguration(
      user.companyId,
    );
  }

  @Put('configuration')
  @ApiOperation({ summary: 'Update evaluation configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateEvaluationConfiguration(
    @Body() dto: UpdateEvaluationConfigurationDto,
    @CurrentUser() user: any,
  ) {
    return this.evaluationEngineService.updateEvaluationConfiguration(
      user.companyId,
      dto,
    );
  }
}
