import {
  Controller,
  Post,
  Get,
  Put,
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
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BusinessRuleEngineService } from '../services/business-rule-engine.service';
import {
  CreateBusinessRuleDto,
  UpdateBusinessRuleDto,
  EvaluateBusinessRulesDto,
  BusinessRuleEvaluationSummaryDto,
} from '../dto/business-rule.dto';
import { RuleType } from '@prisma/client';

@ApiTags('Business Rules')
@ApiBearerAuth()
@Controller('business-rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BusinessRuleController {
  constructor(private readonly businessRuleService: BusinessRuleEngineService) {}

  @Post()
  @Permissions('decision:manage')
  @ApiOperation({ summary: 'Create a new business rule' })
  @ApiResponse({ status: 201, description: 'Business rule created successfully' })
  async createRule(
    @CurrentUser() user: any,
    @Body() dto: CreateBusinessRuleDto,
  ) {
    return this.businessRuleService.createRule(user.companyId, user.id, dto);
  }

  @Put(':id')
  @Permissions('decision:manage')
  @ApiOperation({ summary: 'Update a business rule' })
  @ApiResponse({ status: 200, description: 'Business rule updated successfully' })
  async updateRule(
    @CurrentUser() user: any,
    @Param('id') ruleId: string,
    @Body() dto: UpdateBusinessRuleDto,
  ) {
    return this.businessRuleService.updateRule(user.companyId, ruleId, user.id, dto);
  }

  @Delete(':id')
  @Permissions('decision:manage')
  @ApiOperation({ summary: 'Delete a business rule' })
  @ApiResponse({ status: 200, description: 'Business rule deleted successfully' })
  async deleteRule(
    @CurrentUser() user: any,
    @Param('id') ruleId: string,
  ) {
    return this.businessRuleService.deleteRule(user.companyId, ruleId);
  }

  @Get()
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get all business rules' })
  @ApiResponse({ status: 200, description: 'Business rules retrieved successfully' })
  async getRules(
    @CurrentUser() user: any,
    @Query('ruleType') ruleType?: RuleType,
    @Query('category') category?: string,
  ) {
    return this.businessRuleService.getRules(user.companyId, ruleType, category);
  }

  @Get(':id')
  @Permissions('decision:read')
  @ApiOperation({ summary: 'Get a business rule by ID' })
  @ApiResponse({ status: 200, description: 'Business rule retrieved successfully' })
  async getRule(
    @CurrentUser() user: any,
    @Param('id') ruleId: string,
  ) {
    return this.businessRuleService.getRule(user.companyId, ruleId);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @Permissions('decision:evaluate')
  @ApiOperation({ summary: 'Evaluate business rules' })
  @ApiResponse({ status: 200, description: 'Business rules evaluated successfully', type: BusinessRuleEvaluationSummaryDto })
  async evaluateRules(
    @CurrentUser() user: any,
    @Body() dto: EvaluateBusinessRulesDto,
  ): Promise<BusinessRuleEvaluationSummaryDto> {
    return this.businessRuleService.evaluateRules(user.companyId, dto);
  }
}
