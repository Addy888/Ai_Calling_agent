import { IsString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SystemStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  DOWN = 'DOWN',
}

export enum SystemComponent {
  API = 'api',
  DATABASE = 'database',
  STORAGE = 'storage',
  CACHE = 'cache',
  QUEUE = 'queue',
  EMAIL = 'email',
  SMS = 'sms',
  AI_SERVICE = 'ai_service',
  VOICE_SERVICE = 'voice_service',
  TELEPHONY = 'telephony',
}

export class CreateSystemHealthDto {
  @ApiProperty({ description: 'System component', enum: SystemComponent })
  @IsEnum(SystemComponent)
  component: SystemComponent;

  @ApiProperty({ description: 'Component status', enum: SystemStatus })
  @IsEnum(SystemStatus)
  status: SystemStatus;

  @ApiPropertyOptional({ description: 'Component version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Uptime in seconds' })
  @IsOptional()
  @IsNumber()
  uptime?: number;

  @ApiPropertyOptional({ description: 'Memory information' })
  @IsOptional()
  @IsObject()
  memory?: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };

  @ApiPropertyOptional({ description: 'CPU information' })
  @IsOptional()
  @IsObject()
  cpu?: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };

  @ApiPropertyOptional({ description: 'Disk information' })
  @IsOptional()
  @IsObject()
  disk?: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };

  @ApiPropertyOptional({ description: 'Network information' })
  @IsOptional()
  @IsObject()
  network?: {
    bytesIn: number;
    bytesOut: number;
    latency: number;
  };

  @ApiPropertyOptional({ description: 'Database information' })
  @IsOptional()
  @IsObject()
  database?: {
    connections: number;
    maxConnections: number;
    queryTime: number;
  };

  @ApiPropertyOptional({ description: 'Error information' })
  @IsOptional()
  @IsObject()
  errors?: {
    count: number;
    lastError: string;
    lastErrorAt: Date;
  };

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SystemHealthFilterDto {
  @ApiPropertyOptional({ description: 'Component filter', enum: SystemComponent })
  @IsOptional()
  @IsEnum(SystemComponent)
  component?: SystemComponent;

  @ApiPropertyOptional({ description: 'Status filter', enum: SystemStatus })
  @IsOptional()
  @IsEnum(SystemStatus)
  status?: SystemStatus;

  @ApiPropertyOptional({ description: 'Checked after date' })
  @IsOptional()
  checkedAfter?: string;

  @ApiPropertyOptional({ description: 'Checked before date' })
  @IsOptional()
  checkedBefore?: string;
}