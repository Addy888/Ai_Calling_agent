import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModelRegistryService } from './services/model-registry.service';
import {
  CreateModelRegistryDto,
  UpdateModelRegistryDto,
  ModelRegistryQueryDto,
  CreateModelVersionDto,
  ActivateModelDto,
  ArchiveModelDto,
} from './dto/model-registry.dto';

@ApiTags('Model Registry')
@ApiBearerAuth()
@Controller('ai-agent/model-registry')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelRegistryController {
  constructor(private readonly modelRegistryService: ModelRegistryService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Register a new model' })
  @ApiResponse({ status: 201, description: 'Model registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerModel(
    @Body() dto: CreateModelRegistryDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.registerModel(companyId, dto, userId);
  }

  @Get()
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'List all registered models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async listModels(
    @Query() query: ModelRegistryQueryDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    return this.modelRegistryService.listModels(companyId, query);
  }

  @Get('statistics')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get model registry statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.modelRegistryService.getStatistics(companyId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get model details' })
  @ApiResponse({ status: 200, description: 'Model retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getModel(
    @Param('id') modelId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    return this.modelRegistryService.getModel(companyId, modelId);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update model' })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async updateModel(
    @Param('id') modelId: string,
    @Body() dto: UpdateModelRegistryDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.updateModel(companyId, modelId, dto, userId);
  }

  @Patch(':id/activate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Activate model' })
  @ApiResponse({ status: 200, description: 'Model activated successfully' })
  @ApiResponse({ status: 400, description: 'Model already active' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async activateModel(
    @Param('id') modelId: string,
    @Body() dto: ActivateModelDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.activateModel(companyId, modelId, dto, userId);
  }

  @Patch(':id/deactivate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Deactivate model' })
  @ApiResponse({ status: 200, description: 'Model deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Model already inactive' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async deactivateModel(
    @Param('id') modelId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.deactivateModel(companyId, modelId, userId);
  }

  @Patch(':id/archive')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Archive model' })
  @ApiResponse({ status: 200, description: 'Model archived successfully' })
  @ApiResponse({ status: 400, description: 'Model already archived' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async archiveModel(
    @Param('id') modelId: string,
    @Body() dto: ArchiveModelDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.archiveModel(companyId, modelId, dto, userId);
  }

  @Patch(':id/restore')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Restore archived model' })
  @ApiResponse({ status: 200, description: 'Model restored successfully' })
  @ApiResponse({ status: 400, description: 'Only archived models can be restored' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async restoreModel(
    @Param('id') modelId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.restoreModel(companyId, modelId, userId);
  }

  @Post(':id/versions')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create new model version' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async createVersion(
    @Param('id') modelId: string,
    @Body() dto: CreateModelVersionDto,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.modelRegistryService.createVersion(companyId, modelId, dto, userId);
  }

  @Get(':id/versions')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get model version history' })
  @ApiResponse({ status: 200, description: 'Version history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getVersionHistory(
    @Param('id') modelId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    return this.modelRegistryService.getVersionHistory(companyId, modelId);
  }

  @Get(':id/history')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get model history' })
  @ApiResponse({ status: 200, description: 'Model history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getModelHistory(
    @Param('id') modelId: string,
    @Request() req: any,
  ) {
    const companyId = req.user.companyId;
    return this.modelRegistryService.getModelHistory(companyId, modelId);
  }
}
