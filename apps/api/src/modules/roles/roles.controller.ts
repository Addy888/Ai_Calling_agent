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
import { RolesService } from './roles.service';
import { 
  CreateRoleDto, 
  UpdateRoleDto, 
  RoleQueryDto,
  AssignPermissionsDto,
  RoleResponse,
  RoleListResponse,
  PermissionMatrixResponse
} from './dto/role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role with this name or slug already exists' })
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @Request() req: any
  ): Promise<RoleResponse> {
    return this.rolesService.create(createRoleDto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async findAll(@Query() query: RoleQueryDto): Promise<RoleListResponse> {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string): Promise<RoleResponse> {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role with this name or slug already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: any
  ): Promise<RoleResponse> {
    return this.rolesService.update(id, updateRoleDto, req.user?.id);
  }

  @Delete(':id')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Delete role (soft delete)' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete role that has users assigned' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.rolesService.remove(id, req.user?.id);
  }

  @Post(':id/assign-permissions')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'One or more permissions not found' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
    @Request() req: any
  ): Promise<RoleResponse> {
    return this.rolesService.assignPermissions(id, assignPermissionsDto.permissionIds, req.user?.id);
  }

  @Delete(':id/permissions/:permissionId')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiResponse({ status: 200, description: 'Permission removed successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string
  ): Promise<RoleResponse> {
    return this.rolesService.removePermission(id, permissionId);
  }

  @Get(':id/permission-matrix')
  @ApiOperation({ summary: 'Get role permission matrix' })
  @ApiResponse({ status: 200, description: 'Permission matrix retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getPermissionMatrix(@Param('id') id: string): Promise<PermissionMatrixResponse> {
    return this.rolesService.getPermissionMatrix(id);
  }

  @Patch(':id/activate')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Activate role' })
  @ApiResponse({ status: 200, description: 'Role activated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async activate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<RoleResponse> {
    return this.rolesService.activate(id, req.user?.id);
  }

  @Patch(':id/deactivate')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Deactivate role' })
  @ApiResponse({ status: 200, description: 'Role deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deactivate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<RoleResponse> {
    return this.rolesService.deactivate(id, req.user?.id);
  }
}