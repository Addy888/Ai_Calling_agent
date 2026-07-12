import { IsString, IsEmail, IsOptional, IsBoolean, IsUrl, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name', example: 'Acme Corp' })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ description: 'Company email', example: 'contact@acmecorp.com' })
  @IsEmail()
  email: string;

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