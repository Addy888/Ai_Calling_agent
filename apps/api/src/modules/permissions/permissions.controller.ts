import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { 
  CreatePermissionDto, 
  UpdatePermissionDto, 
  PermissionQueryDto,
  PermissionResponse,
  PermissionListResponse,
  ModulePermissionsResponse
} from './dto/permission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Roles('super-admin')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission with this name or slug already exists' })
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
    @Request() req: any
  ): Promise<PermissionResponse> {
    return this.permissionsService.create(createPermissionDto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all permissions with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findAll(@Query() query: PermissionQueryDto): Promise<PermissionListResponse> {
    return this.permissionsService.findAll(query);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get all permission modules' })
  @ApiResponse({ status: 200, description: 'Modules retrieved successfully' })
  async getAllModules(): Promise<string[]> {
    return this.permissionsService.getAllModules();
  }

  @Get('modules/:module')
  @ApiOperation({ summary: 'Get permissions by module' })
  @ApiResponse({ status: 200, description: 'Module permissions retrieved successfully' })
  async findByModule(@Param('module') module: string): Promise<ModulePermissionsResponse> {
    return this.permissionsService.findByModule(module);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiResponse({ status: 200, description: 'Permission retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOne(@Param('id') id: string): Promise<PermissionResponse> {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Update permission' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 409, description: 'Permission with this name or slug already exists' })
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @Request() req: any
  ): Promise<PermissionResponse> {
    return this.permissionsService.update(id, updatePermissionDto, req.user?.id);
  }

  @Delete(':id')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Delete permission (soft delete)' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete permission that is assigned to roles' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.permissionsService.remove(id, req.user?.id);
  }

  @Post('seed')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Seed default permissions' })
  @ApiResponse({ status: 204, description: 'Default permissions seeded successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async seedDefaultPermissions(): Promise<void> {
    return this.permissionsService.seedDefaultPermissions();
  }
}