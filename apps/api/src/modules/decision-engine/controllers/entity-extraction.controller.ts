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
import { EntityExtractionService } from '../services/entity-extraction.service';
import { ExtractEntitiesDto, ExtractedEntitiesDto } from '../dto/entity-extraction.dto';

@ApiTags('Entity Extraction')
@ApiBearerAuth()
@Controller('entity-extraction')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EntityExtractionController {
  constructor(private readonly entityExtractionService: EntityExtractionService) {}

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Extract entities from conversation input' })
  @ApiResponse({ status: 200, description: 'Entities extracted successfully', type: ExtractedEntitiesDto })
  async extractEntities(
    @CurrentUser() user: any,
    @Body() dto: ExtractEntitiesDto,
  ): Promise<ExtractedEntitiesDto> {
    return this.entityExtractionService.extractEntities(user.companyId, dto);
  }

  @Get('statistics')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get entity extraction statistics' })
  @ApiResponse({ status: 200, description: 'Entity statistics retrieved successfully' })
  async getEntityStatistics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.entityExtractionService.getEntityStatistics(user.companyId, start, end);
  }
}
