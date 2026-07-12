import { IsString, IsOptional, IsBoolean, IsArray, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Administrator' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'Role slug', example: 'administrator' })
  @IsString()
  @Length(2, 100)
  slug: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Role status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Permission IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name', example: 'Administrator' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role slug', example: 'administrator' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  slug?: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Role status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Role active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RoleQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class AssignPermissionsDto {
  @ApiProperty({ description: 'Permission IDs to assign' })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export interface RoleResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    id: string;
    permission: {
      id: string;
      name: string;
      slug: string;
      module: string;
      description?: string;
    };
  }>;
  _count?: {
    users: number;
    permissions: number;
  };
}

export interface RoleListResponse {
  roles: RoleResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PermissionMatrixResponse {
  role: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: Array<{
    module: string;
    permissions: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      assigned: boolean;
    }>;
  }>;
}