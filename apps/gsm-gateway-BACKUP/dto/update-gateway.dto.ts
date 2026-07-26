import { IsString, IsNumber, IsOptional, IsIP, IsBoolean, Min, Max } from 'class-validator';

export class UpdateGatewayDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(32)
  totalPorts?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  metadata?: any;
}
