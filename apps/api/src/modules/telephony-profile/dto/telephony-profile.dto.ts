import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, MaxLength, MinLength } from 'class-validator';
import { TelephonyProvider } from '@prisma/client';

export class CreateTelephonyProfileDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TelephonyProvider)
  provider: TelephonyProvider;

  @IsOptional()
  @IsString()
  gatewayId?: string;

  @IsOptional()
  @IsString()
  simId?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  callerNumber: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTelephonyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TelephonyProvider)
  provider?: TelephonyProvider;

  @IsOptional()
  @IsString()
  gatewayId?: string;

  @IsOptional()
  @IsString()
  simId?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  callerNumber?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TelephonyProfileFilterDto {
  @IsOptional()
  @IsEnum(TelephonyProvider)
  provider?: TelephonyProvider;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  gatewayId?: string;
}
