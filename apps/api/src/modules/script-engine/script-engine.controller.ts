import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScriptEngineService } from './script-engine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateScriptVersionDto,
  CreateScriptNodeDto,
  CreateScriptBranchDto,
  CreateScriptVariableDto,
  ExecuteScriptDto,
  ValidateScriptDto,
  PublishScriptDto,
  PreviewScriptDto,
} from './dto/script-engine.dto';

@ApiTags('Script Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('script-engine')
export class ScriptEngineController {
  constructor(private readonly scriptEngineService: ScriptEngineService) {}

  @Post('versions')
  @ApiOperation({ summary: 'Create script version' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  async createVersion(@Body() dto: CreateScriptVersionDto, @CurrentUser() user: any) {
    return this.scriptEngineService.createVersion(dto, user.userId);
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get script version' })
  @ApiResponse({ status: 200, description: 'Version retrieved successfully' })
  async getVersion(@Param('id') id: string) {
    return this.scriptEngineService.getVersion(id);
  }

  @Put('versions/:id')
  @ApiOperation({ summary: 'Update script version' })
  @ApiResponse({ status: 200, description: 'Version updated successfully' })
  async updateVersion(@Param('id') id: string, @Body() dto: Partial<CreateScriptVersionDto>, @CurrentUser() user: any) {
    return this.scriptEngineService.updateVersion(id, dto, user.userId);
  }

  @Post('versions/:id/publish')
  @ApiOperation({ summary: 'Publish script version' })
  @ApiResponse({ status: 200, description: 'Version published successfully' })
  async publishVersion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.scriptEngineService.publishVersion({ versionId: id }, user.userId);
  }

  @Post('versions/:id/archive')
  @ApiOperation({ summary: 'Archive script version' })
  @ApiResponse({ status: 200, description: 'Version archived successfully' })
  async archiveVersion(@Param('id') id: string) {
    return this.scriptEngineService.archiveVersion(id);
  }

  @Post('versions/:id/clone')
  @ApiOperation({ summary: 'Clone script version' })
  @ApiResponse({ status: 201, description: 'Version cloned successfully' })
  async cloneVersion(@Param('id') id: string, @Body() body: { newVersion: string }, @CurrentUser() user: any) {
    return this.scriptEngineService.cloneVersion(id, body.newVersion, user.userId);
  }

  @Post('versions/validate')
  @ApiOperation({ summary: 'Validate script' })
  @ApiResponse({ status: 200, description: 'Validation completed' })
  async validateScript(@Body() dto: ValidateScriptDto) {
    return this.scriptEngineService.validateScript(dto);
  }

  @Post('versions/execute')
  @ApiOperation({ summary: 'Execute script' })
  @ApiResponse({ status: 200, description: 'Script executed successfully' })
  async executeScript(@Body() dto: ExecuteScriptDto) {
    return this.scriptEngineService.executeScript(dto);
  }

  @Post('versions/preview')
  @ApiOperation({ summary: 'Preview script' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async previewScript(@Body() dto: PreviewScriptDto) {
    return this.scriptEngineService.previewScript(dto);
  }

  @Post('nodes')
  @ApiOperation({ summary: 'Create script node' })
  @ApiResponse({ status: 201, description: 'Node created successfully' })
  async createNode(@Body() dto: CreateScriptNodeDto, @CurrentUser() user: any) {
    return this.scriptEngineService.createNode(dto, user.userId);
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Get script node' })
  @ApiResponse({ status: 200, description: 'Node retrieved successfully' })
  async getNode(@Param('id') id: string) {
    return this.scriptEngineService.getNode(id);
  }

  @Put('nodes/:id')
  @ApiOperation({ summary: 'Update script node' })
  @ApiResponse({ status: 200, description: 'Node updated successfully' })
  async updateNode(@Param('id') id: string, @Body() dto: Partial<CreateScriptNodeDto>, @CurrentUser() user: any) {
    return this.scriptEngineService.updateNode(id, dto, user.userId);
  }

  @Delete('nodes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete script node' })
  @ApiResponse({ status: 204, description: 'Node deleted successfully' })
  async deleteNode(@Param('id') id: string) {
    return this.scriptEngineService.deleteNode(id);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create script branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  async createBranch(@Body() dto: CreateScriptBranchDto, @CurrentUser() user: any) {
    return this.scriptEngineService.createBranch(dto, user.userId);
  }

  @Get('branches/:id')
  @ApiOperation({ summary: 'Get script branch' })
  @ApiResponse({ status: 200, description: 'Branch retrieved successfully' })
  async getBranch(@Param('id') id: string) {
    return this.scriptEngineService.getBranch(id);
  }

  @Put('branches/:id')
  @ApiOperation({ summary: 'Update script branch' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  async updateBranch(@Param('id') id: string, @Body() dto: Partial<CreateScriptBranchDto>, @CurrentUser() user: any) {
    return this.scriptEngineService.updateBranch(id, dto, user.userId);
  }

  @Delete('branches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete script branch' })
  @ApiResponse({ status: 204, description: 'Branch deleted successfully' })
  async deleteBranch(@Param('id') id: string) {
    return this.scriptEngineService.deleteBranch(id);
  }

  @Post('variables')
  @ApiOperation({ summary: 'Create script variable' })
  @ApiResponse({ status: 201, description: 'Variable created successfully' })
  async createVariable(@Body() dto: CreateScriptVariableDto, @CurrentUser() user: any) {
    return this.scriptEngineService.createVariable(dto, user.userId);
  }

  @Get('variables/:id')
  @ApiOperation({ summary: 'Get script variable' })
  @ApiResponse({ status: 200, description: 'Variable retrieved successfully' })
  async getVariable(@Param('id') id: string) {
    return this.scriptEngineService.getVariable(id);
  }

  @Put('variables/:id')
  @ApiOperation({ summary: 'Update script variable' })
  @ApiResponse({ status: 200, description: 'Variable updated successfully' })
  async updateVariable(@Param('id') id: string, @Body() dto: Partial<CreateScriptVariableDto>, @CurrentUser() user: any) {
    return this.scriptEngineService.updateVariable(id, dto, user.userId);
  }

  @Delete('variables/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete script variable' })
  @ApiResponse({ status: 204, description: 'Variable deleted successfully' })
  async deleteVariable(@Param('id') id: string) {
    return this.scriptEngineService.deleteVariable(id);
  }
}
