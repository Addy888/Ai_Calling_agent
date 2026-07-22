import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ModelPackageService } from '../services/model-package.service';
import {
  CreateModelPackageDto,
  UpdateModelPackageDto,
  PrepareExportDto,
  PackageListQueryDto,
} from '../dto/model-package.dto';

@ApiTags('Model Packaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training-manager/packages')
export class ModelPackageController {
  constructor(private readonly packageService: ModelPackageService) {}

  @Post()
  @ApiOperation({ summary: 'Create new model package' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Model or training session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPackage(
    @Request() req,
    @Body() dto: CreateModelPackageDto,
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.packageService.createPackage(companyId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update model package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePackage(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateModelPackageDto,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.updatePackage(companyId, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package by ID' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPackage(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.getPackage(companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List packages with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'exportFormat', required: false })
  @ApiQuery({ name: 'deploymentTarget', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'modelRegistryId', required: false })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listPackages(
    @Request() req,
    @Query() query: PackageListQueryDto,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.listPackages(companyId, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 204, description: 'Package deleted successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePackage(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.deletePackage(companyId, id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate package prerequisites' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Validation completed' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validatePackage(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.validatePackage(companyId, id);
  }

  @Post(':id/prepare-export')
  @ApiOperation({ summary: 'Prepare package for export' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Export prepared successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async prepareExport(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: PrepareExportDto,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.prepareExport(companyId, id, dto);
  }

  @Get(':id/manifest')
  @ApiOperation({ summary: 'Generate package manifest' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Manifest generated successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateManifest(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.generateManifest(companyId, id);
  }

  @Get(':id/metadata')
  @ApiOperation({ summary: 'Generate package metadata' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Metadata generated successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateMetadata(
    @Request() req,
    @Param('id') id: string,
  ) {
    const companyId = req.user.companyId;
    return this.packageService.generateMetadata(companyId, id);
  }
}
