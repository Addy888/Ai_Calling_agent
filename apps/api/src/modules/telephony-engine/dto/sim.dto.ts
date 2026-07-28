/**
 * SIM Management DTOs
 */

import { IsString, IsNumber, IsOptional, IsBoolean, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSIMDto {
  @ApiProperty({ description: 'Gateway ID' })
  @IsString()
  gatewayId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'SIM phone number' })
  @IsString()
  simNumber: string;

  @ApiProperty({ description: 'Operator name (Jio, Airtel, Vi, BSNL)' })
  @IsString()
  operator: string;

  @ApiProperty({ description: 'Port number on gateway' })
  @IsNumber()
  portNumber: number;

  @ApiPropertyOptional({ description: 'IMSI number' })
  @IsString()
  @IsOptional()
  imsi?: string;

  @ApiPropertyOptional({ description: 'ICCID number' })
  @IsString()
  @IsOptional()
  iccid?: string;

  @ApiPropertyOptional({ description: 'Daily call limit', default: 100 })
  @IsNumber()
  @IsOptional()
  dailyLimit?: number;

  @ApiPropertyOptional({ description: 'Weekly call limit', default: 700 })
  @IsNumber()
  @IsOptional()
  weeklyLimit?: number;

  @ApiPropertyOptional({ description: 'Monthly call limit', default: 3000 })
  @IsNumber()
  @IsOptional()
  monthlyLimit?: number;

  @ApiPropertyOptional({ description: 'Is preferred SIM', default: false })
  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @ApiPropertyOptional({ description: 'Priority (higher = more preferred)', default: 0 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateSIMDto {
  @ApiPropertyOptional({ description: 'SIM phone number' })
  @IsString()
  @IsOptional()
  simNumber?: string;

  @ApiPropertyOptional({ description: 'Operator name' })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiPropertyOptional({ description: 'Daily call limit' })
  @IsNumber()
  @IsOptional()
  dailyLimit?: number;

  @ApiPropertyOptional({ description: 'Weekly call limit' })
  @IsNumber()
  @IsOptional()
  weeklyLimit?: number;

  @ApiPropertyOptional({ description: 'Monthly call limit' })
  @IsNumber()
  @IsOptional()
  monthlyLimit?: number;

  @ApiPropertyOptional({ description: 'Is preferred SIM' })
  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class SIMResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  gatewayId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  simNumber: string;

  @ApiProperty()
  operator: string;

  @ApiProperty()
  portNumber: number;

  @ApiPropertyOptional()
  imsi?: string;

  @ApiPropertyOptional()
  iccid?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  signal?: number;

  @ApiPropertyOptional()
  balance?: number;

  @ApiPropertyOptional()
  lastUsed?: Date;

  @ApiProperty()
  callsToday: number;

  @ApiProperty()
  callsThisWeek: number;

  @ApiProperty()
  callsThisMonth: number;

  @ApiProperty()
  dailyLimit: number;

  @ApiProperty()
  weeklyLimit: number;

  @ApiProperty()
  monthlyLimit: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isPreferred: boolean;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiPropertyOptional()
  usage?: any;

  @ApiPropertyOptional()
  isBusy?: boolean;

  @ApiPropertyOptional()
  gateway?: any;
}

export class SIMStatisticsDto {
  @ApiProperty()
  simId: string;

  @ApiProperty()
  days: number;

  @ApiProperty()
  totalCalls: number;

  @ApiProperty()
  successfulCalls: number;

  @ApiProperty()
  failedCalls: number;

  @ApiProperty()
  successRate: number;

  @ApiProperty()
  totalDuration: number;

  @ApiProperty()
  averageDuration: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  averageCost: number;
}

export class UpdateSignalDto {
  @ApiProperty({ description: 'Signal strength (0-100)' })
  @IsNumber()
  signal: number;
}

export class UpdateBalanceDto {
  @ApiProperty({ description: 'Balance in rupees' })
  @IsNumber()
  balance: number;

  @ApiPropertyOptional({ description: 'Data balance in MB' })
  @IsNumber()
  @IsOptional()
  dataBalance?: number;
}
