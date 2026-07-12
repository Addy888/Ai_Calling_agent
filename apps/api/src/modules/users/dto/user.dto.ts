import { IsString, IsEmail, IsOptional, IsBoolean, IsUUID, Length, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Company ID', example: 'uuid' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @Length(2, 100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @Length(2, 100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'User status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Role IDs to assign' })
  @IsOptional()
  roleIds?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'User status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'User active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by role ID' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: 'firstName' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class AssignRoleDto {
  @ApiProperty({ description: 'Role IDs to assign' })
  roleIds: string[];
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export interface UserResponse {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  status: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
    email: string;
  };
  roles: Array<{
    id: string;
    role: {
      id: string;
      name: string;
      slug: string;
      description?: string;
    };
  }>;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}