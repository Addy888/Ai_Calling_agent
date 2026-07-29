import { IsString, IsEmail, IsOptional, IsBoolean, IsUrl, Length, Matches, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// Helper: treat empty strings as absent (undefined) so @IsOptional validators are skipped
const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null ? undefined : value;

// Company Administrator DTO
export class CompanyAdministratorDto {
  @ApiProperty({ description: 'Admin full name', example: 'John Doe' })
  @IsString()
  @Length(2, 200)
  fullName: string;

  @ApiProperty({ description: 'Admin email', example: 'admin@acmecorp.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ description: 'Admin password', example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ description: 'Confirm password', example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  confirmPassword: string;

  @ApiPropertyOptional({ description: 'Force password change on first login', example: true })
  @IsOptional()
  @IsBoolean()
  forcePasswordChange?: boolean;

  @ApiPropertyOptional({ description: 'Send welcome email', example: true })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean;
}

// Updated Company DTO with Administrator
export class CreateCompanyDto {
  // Section 1: Company Information
  @ApiProperty({ description: 'Company name', example: 'Acme Corp' })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ description: 'Company email', example: 'contact@acmecorp.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Company phone number', example: '+1-555-0123' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Company website', example: 'https://acmecorp.com' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl({}, { message: 'Website must be a valid URL (e.g. https://example.com)' })
  website?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Company logo path' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Company status', example: 'ACTIVE' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Subscription plan', example: 'BASIC' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  subscriptionPlan?: string;

  // Section 2: Company Administrator
  @ApiProperty({ description: 'Company administrator details', type: CompanyAdministratorDto })
  @ValidateNested()
  @Type(() => CompanyAdministratorDto)
  administrator: CompanyAdministratorDto;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company name', example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @ApiPropertyOptional({ description: 'Company email', example: 'contact@acmecorp.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Company phone number', example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Company website', example: 'https://acmecorp.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Company status', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Company active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CompanyQueryDto {
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

export interface CompanyResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  status: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    users: number;
    campaigns: number;
    contacts: number;
  };
}

export interface CompanyListResponse {
  companies: CompanyResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}