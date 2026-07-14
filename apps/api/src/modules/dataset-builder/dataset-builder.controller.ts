import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DatasetBuilderService } from './dataset-builder.service';
import {
  BuildConversationDatasetDto,
  BuildKnowledgeDatasetDto,
  BuildPromptDatasetDto,
  BuildScriptDatasetDto,
  BuildFAQDatasetDto,
  BuildBusinessRuleDatasetDto,
  BuildEvaluationDatasetDto,
} from './dto/dataset-builder.dto';

@ApiTags('Dataset Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dataset-builder')
export class DatasetBuilderController {
  constructor(private readonly builderService: DatasetBuilderService) {}

  @Post(':datasetId/build-conversation')
  @ApiOperation({ summary: 'Build conversation dataset from session history' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildConversationDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildConversationDatasetDto,
  ) {
    return this.builderService.buildConversationDataset(user.companyId, datasetId, dto);
  }

  @Post(':datasetId/build-knowledge')
  @ApiOperation({ summary: 'Build knowledge dataset from knowledge base' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildKnowledgeDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildKnowledgeDatasetDto,
  ) {
    return this.builderService.buildKnowledgeDataset(user.companyId, datasetId, dto);
  }

  @Post(':datasetId/build-prompt')
  @ApiOperation({ summary: 'Build prompt dataset from prompt library' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildPromptDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildPromptDatasetDto,
  ) {
    return this.builderService.buildPromptDataset(user.companyId, datasetId, dto);
  }

  @Post(':datasetId/build-script')
  @ApiOperation({ summary: 'Build script dataset from approved scripts' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildScriptDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildScriptDatasetDto,
  ) {
    return this.builderService.buildScriptDataset(user.companyId, datasetId, dto);
  }

  @Post(':datasetId/build-faq')
  @ApiOperation({ summary: 'Build FAQ dataset from knowledge base' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildFAQDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildFAQDatasetDto,
  ) {
    return this.builderService.buildFAQDataset(user.companyId, datasetId, dto);
  }

  @Post(':datasetId/build-business-rules')
  @ApiOperation({ summary: 'Build business rules dataset' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildBusinessRuleDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildBusinessRuleDatasetDto,
  ) {
    return this.builderService.buildBusinessRuleDataset(user.companyId, datasetId, dto);
  }

  @Post(':datasetId/build-evaluation')
  @ApiOperation({ summary: 'Build evaluation dataset from evaluation reports' })
  @ApiResponse({ status: 201, description: 'Dataset built successfully' })
  buildEvaluationDataset(
    @CurrentUser() user: any,
    @Param('datasetId') datasetId: string,
    @Body() dto: BuildEvaluationDatasetDto,
  ) {
    return this.builderService.buildEvaluationDataset(user.companyId, datasetId, dto);
  }
}
