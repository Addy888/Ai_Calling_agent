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
import { UsersService } from './users.service';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  UserQueryDto,
  AssignRoleDto,
  ChangePasswordDto,
  ResetPasswordDto,
  UserResponse,
  UserListResponse
} from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any
  ): Promise<UserResponse> {
    return this.usersService.create(createUserDto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(
    @Query() query: UserQueryDto,
    @CurrentUser() user: any,
  ): Promise<UserListResponse> {
    const roles: string[] = (user?.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r?.slug || r?.name || '',
    );
    // Non-super-admin users can only see users within their own company
    if (!roles.includes('super-admin') && user?.companyId) {
      query.companyId = user.companyId;
    }
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any
  ): Promise<UserResponse> {
    return this.usersService.update(id, updateUserDto, req.user?.id);
  }

  @Delete(':id')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.usersService.remove(id, req.user?.id);
  }

  @Patch(':id/activate')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<UserResponse> {
    return this.usersService.activate(id, req.user?.id);
  }

  @Patch(':id/deactivate')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<UserResponse> {
    return this.usersService.deactivate(id, req.user?.id);
  }

  @Post(':id/assign-roles')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Request() req: any
  ): Promise<UserResponse> {
    return this.usersService.assignRoles(id, assignRoleDto.roleIds, req.user?.id);
  }

  @Delete(':id/roles/:roleId')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string
  ): Promise<UserResponse> {
    return this.usersService.removeRole(id, roleId);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any
  ): Promise<void> {
    return this.usersService.changePassword(id, changePasswordDto, req.user?.id);
  }

  @Post(':id/reset-password')
  @Roles('super-admin', 'admin')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Request() req: any
  ): Promise<void> {
    return this.usersService.resetPassword(id, resetPasswordDto, req.user?.id);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.getProfile(id);
  }

  @Patch(':id/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponse> {
    return this.usersService.updateProfile(id, updateUserDto);
  }
}
