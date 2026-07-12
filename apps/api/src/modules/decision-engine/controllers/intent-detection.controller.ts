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
import { IntentDetectionService } from '../services/intent-detection.service';
import { DetectIntentDto, IntentDetectionResultDto } from '../dto/intent-detection.dto';

@ApiTags('Intent Detection')
@ApiBearerAuth()
@Controller('intent-detection')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntentDetectionController {
  constructor(private readonly intentDetectionService: IntentDetectionService) {}

  @Post('detect')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Detect intent from conversation input' })
  @ApiResponse({ status: 200, description: 'Intent detected successfully', type: IntentDetectionResultDto })
  async detectIntent(
    @CurrentUser() user: any,
    @Body() dto: DetectIntentDto,
  ): Promise<IntentDetectionResultDto> {
    return this.intentDetectionService.detectIntent(user.companyId, dto);
  }

  @Get('statistics')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get intent detection statistics' })
  @ApiResponse({ status: 200, description: 'Intent statistics retrieved successfully' })
  async getIntentStatistics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.intentDetectionService.getIntentStatistics(user.companyId, start, end);
  }
}
