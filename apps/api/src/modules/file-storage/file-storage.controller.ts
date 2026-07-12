import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { FileStorageService } from './file-storage.service';
import { 
  CreateFileStorageDto, 
  UpdateFileStorageDto, 
  FileStorageFilterDto 
} from './dto/file-storage.dto';

@ApiTags('File Storage')
@ApiBearerAuth()
@Controller('file-storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post()
  @ApiOperation({ summary: 'Create file storage record' })
  @ApiResponse({ status: 201, description: 'File record created successfully' })
  @Permissions('files.create')
  async create(
    @CurrentUser() user: any,
    @Body() createFileStorageDto: CreateFileStorageDto,
  ) {
    return this.fileStorageService.create(user.companyId, user.id, createFileStorageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  @Permissions('files.read')
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
    @Query() filters: FileStorageFilterDto,
  ) {
    return this.fileStorageService.findAll(user.companyId, paginationDto, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage statistics retrieved successfully' })
  @Permissions('files.read')
  async getStorageStatistics(@CurrentUser() user: any) {
    return this.fileStorageService.getStorageStatistics(user.companyId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent uploads' })
  @ApiResponse({ status: 200, description: 'Recent uploads retrieved successfully' })
  @Permissions('files.read')
  async getRecentUploads(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.fileStorageService.getRecentUploads(user.companyId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @Permissions('files.read')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.fileStorageService.findOne(id, user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file record' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @Permissions('files.update')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateFileStorageDto: UpdateFileStorageDto,
  ) {
    return this.fileStorageService.update(id, user.companyId, updateFileStorageDto);
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Increment download count' })
  @ApiResponse({ status: 200, description: 'Download count incremented successfully' })
  @Permissions('files.read')
  async incrementDownloadCount(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.fileStorageService.incrementDownloadCount(id, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @Permissions('files.delete')
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.fileStorageService.remove(id, user.companyId);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old deleted files' })
  @ApiResponse({ status: 200, description: 'Old files cleaned up successfully' })
  @Permissions('files.delete')
  async cleanup(
    @CurrentUser() user: any,
    @Query('daysToKeep') daysToKeep?: number,
  ) {
    return this.fileStorageService.cleanup(user.companyId, daysToKeep);
  }
}