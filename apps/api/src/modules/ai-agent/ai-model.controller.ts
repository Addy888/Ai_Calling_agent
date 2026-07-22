import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AIModelService } from './services/ai-model.service';
import { AIModelQueryDto } from './dto/ai-model.dto';

@ApiTags('AI Model Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-agent/models')
export class AIModelController {
  constructor(private readonly aiModelService: AIModelService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'List all AI models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async listModels(@Query() query: AIModelQueryDto) {
    return this.aiModelService.listModels(query);
  }

  @Get('statistics')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get model library statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return this.aiModelService.getStatistics();
  }

  @Get('providers')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get all providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProviders() {
    return this.aiModelService.getProviders();
  }

  @Get('families')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get all model families' })
  @ApiResponse({ status: 200, description: 'Families retrieved successfully' })
  async getFamilies(@Query('provider') provider?: string) {
    return this.aiModelService.getFamilies(provider);
  }

  @Get('languages')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get supported languages' })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  async getSupportedLanguages() {
    return this.aiModelService.getSupportedLanguages();
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Get model details' })
  @ApiResponse({ status: 200, description: 'Model retrieved successfully' })
  async getModel(@Param('id') id: string) {
    return this.aiModelService.getModel(id);
  }
}
