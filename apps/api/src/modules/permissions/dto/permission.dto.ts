import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name', example: 'Create Users' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'Permission slug', example: 'create-users' })
  @IsString()
  @Length(2, 100)
  slug: string;

  @ApiProperty({ description: 'Module name', example: 'users' })
  @IsString()
  @Length(2, 100)
  module: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Permission status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'Permission name', example: 'Create Users' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Permission slug', example: 'create-users' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  slug?: string;

  @ApiPropertyOptional({ description: 'Module name', example: 'users' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  module?: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Permission status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class PermissionQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by module' })
  @IsOptional()
  @IsString()
  module?: string;

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

export interface PermissionResponse {
  id: string;
  name: string;
  slug: string;
  module: string;
  description?: string;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    roles: number;
  };
}

export interface PermissionListResponse {
  permissions: PermissionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModulePermissionsResponse {
  module: string;
  permissions: PermissionResponse[];
}