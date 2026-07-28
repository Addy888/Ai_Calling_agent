/**
 * Gateway Management DTOs
 */

import { IsString, IsNumber, IsOptional, IsBoolean, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGatewayDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Gateway name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Gateway IP address' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'Gateway port', default: 5060 })
  @IsNumber()
  port: number;

  @ApiPropertyOptional({ description: 'AMI username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'AMI password' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ description: 'Gateway model (Dinstar, Yeastar, OpenVox, Generic)' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: 'Manufacturer name' })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiProperty({ description: 'Total number of ports' })
  @IsNumber()
  totalPorts: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateGatewayDto {
  @ApiPropertyOptional({ description: 'Gateway name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Gateway IP address' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Gateway port' })
  @IsNumber()
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: 'AMI username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'AMI password' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Gateway status', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'] })
  @IsEnum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ERROR';

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class GatewayResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  port: number;

  @ApiProperty()
  model: string;

  @ApiProperty()
  manufacturer: string;

  @ApiProperty()
  totalPorts: number;

  @ApiProperty()
  activePorts: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  lastSeenAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiPropertyOptional()
  health?: any;

  @ApiPropertyOptional()
  availableSIMs?: number;
}

export class GatewayStatisticsDto {
  @ApiProperty()
  gatewayId: string;

  @ApiProperty()
  days: number;

  @ApiProperty()
  totalChecks: number;

  @ApiProperty()
  onlineChecks: number;

  @ApiProperty()
  uptimePercentage: number;

  @ApiProperty()
  averageActivePorts: number;

  @ApiPropertyOptional()
  averageTemperature?: number;

  @ApiPropertyOptional()
  averageCpuUsage?: number;

  @ApiPropertyOptional()
  averageMemoryUsage?: number;
}
